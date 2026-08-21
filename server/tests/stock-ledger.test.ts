import mongoose, { Types } from 'mongoose';
import { StockLedgerService } from '../src/services/StockLedgerService';
import { Organization } from '../src/models/Organization';
import { Product } from '../src/models/Product';
import { Warehouse } from '../src/models/Warehouse';
import { User } from '../src/models/User';
import { StockLedgerEntry } from '../src/models/StockLedgerEntry';
import { LedgerEntryType, Role } from '../src/types/enums';

describe('StockLedgerService - Concurrency Safety', () => {
  let orgId: Types.ObjectId;
  let productId: Types.ObjectId;
  let warehouseId: Types.ObjectId;
  let userId: Types.ObjectId;

  beforeAll(async () => {
    // Connect to test database
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/tally-test';
    await mongoose.connect(mongoUri);

    // Create test data
    const org = await Organization.create({
      name: 'Test Org',
      slug: 'test-org-' + Date.now(),
      poApprovalThreshold: 10000,
    });
    orgId = org._id;

    const product = await Product.create({
      orgId,
      sku: 'TEST-SKU-001',
      name: 'Test Product',
      unit: 'pcs',
      reorderPoint: 10,
      reorderQty: 50,
      costPrice: 10,
      sellPrice: 15,
    });
    productId = product._id;

    const warehouse = await Warehouse.create({
      orgId,
      name: 'Test Warehouse',
    });
    warehouseId = warehouse._id;

    const user = await User.create({
      orgId,
      name: 'Test User',
      email: 'test@example.com',
      passwordHash: 'dummy',
      role: Role.ADMIN,
    });
    userId = user._id;
  });

  afterAll(async () => {
    // Clean up
    await Organization.deleteMany({ _id: orgId });
    await Product.deleteMany({ _id: productId });
    await Warehouse.deleteMany({ _id: warehouseId });
    await User.deleteMany({ _id: userId });
    await StockLedgerEntry.deleteMany({ orgId });
    await mongoose.connection.close();
  });

  afterEach(async () => {
    // Clear ledger entries between tests
    await StockLedgerEntry.deleteMany({ orgId, productId, warehouseId });
  });

  test('sequential writes produce correct balanceAfter', async () => {
    const session1 = await mongoose.startSession();
    session1.startTransaction();

    await StockLedgerService.record(session1, {
      orgId,
      productId,
      warehouseId,
      type: LedgerEntryType.PO_RECEIPT,
      quantityChange: 100,
      referenceType: 'PurchaseOrder',
      referenceId: new Types.ObjectId(),
      createdBy: userId,
    });

    await session1.commitTransaction();
    session1.endSession();

    const balance1 = await StockLedgerService.getBalance(orgId, productId, warehouseId);
    expect(balance1).toBe(100);

    const session2 = await mongoose.startSession();
    session2.startTransaction();

    await StockLedgerService.record(session2, {
      orgId,
      productId,
      warehouseId,
      type: LedgerEntryType.ORDER_PICK,
      quantityChange: -30,
      referenceType: 'SalesOrder',
      referenceId: new Types.ObjectId(),
      createdBy: userId,
    });

    await session2.commitTransaction();
    session2.endSession();

    const balance2 = await StockLedgerService.getBalance(orgId, productId, warehouseId);
    expect(balance2).toBe(70);
  });

  test('concurrent writes to same SKU never produce incorrect balanceAfter', async () => {
    // This is THE critical test for the entire stock ledger design.
    // Two transactions trying to write the same SKU at the same time
    // must produce consistent balanceAfter values.

    // Initial stock: 100 units
    const sessionInit = await mongoose.startSession();
    sessionInit.startTransaction();
    await StockLedgerService.record(sessionInit, {
      orgId,
      productId,
      warehouseId,
      type: LedgerEntryType.PO_RECEIPT,
      quantityChange: 100,
      referenceType: 'PurchaseOrder',
      referenceId: new Types.ObjectId(),
      createdBy: userId,
    });
    await sessionInit.commitTransaction();
    sessionInit.endSession();

    // Two concurrent picks of 10 units each
    const session1 = await mongoose.startSession();
    const session2 = await mongoose.startSession();

    session1.startTransaction();
    session2.startTransaction();

    const write1 = StockLedgerService.record(session1, {
      orgId,
      productId,
      warehouseId,
      type: LedgerEntryType.ORDER_PICK,
      quantityChange: -10,
      referenceType: 'SalesOrder',
      referenceId: new Types.ObjectId(),
      createdBy: userId,
    }).then(() => session1.commitTransaction());

    const write2 = StockLedgerService.record(session2, {
      orgId,
      productId,
      warehouseId,
      type: LedgerEntryType.ORDER_PICK,
      quantityChange: -10,
      referenceType: 'SalesOrder',
      referenceId: new Types.ObjectId(),
      createdBy: userId,
    }).then(() => session2.commitTransaction());

    // Both commits should succeed (MongoDB serializes them)
    await Promise.all([write1, write2]);

    session1.endSession();
    session2.endSession();

    // Final balance must be exactly 80
    const finalBalance = await StockLedgerService.getBalance(orgId, productId, warehouseId);
    expect(finalBalance).toBe(80);

    // Verify the ledger entries are consistent
    const entries = await StockLedgerEntry.find({ orgId, productId, warehouseId }).sort({
      createdAt: 1,
    });

    expect(entries.length).toBe(3); // initial + 2 picks
    expect(entries[0].balanceAfter).toBe(100);
    // The two picks could be in any order, but their balanceAfter values must be consistent
    const balances = entries.slice(1).map((e) => e.balanceAfter);
    expect(balances.sort()).toEqual([80, 90]);
  });

  test('prevents negative stock', async () => {
    // Initial stock: 10 units
    const sessionInit = await mongoose.startSession();
    sessionInit.startTransaction();
    await StockLedgerService.record(sessionInit, {
      orgId,
      productId,
      warehouseId,
      type: LedgerEntryType.PO_RECEIPT,
      quantityChange: 10,
      referenceType: 'PurchaseOrder',
      referenceId: new Types.ObjectId(),
      createdBy: userId,
    });
    await sessionInit.commitTransaction();
    sessionInit.endSession();

    // Try to pick 15 units (should fail)
    const session = await mongoose.startSession();
    session.startTransaction();

    await expect(
      StockLedgerService.record(session, {
        orgId,
        productId,
        warehouseId,
        type: LedgerEntryType.ORDER_PICK,
        quantityChange: -15,
        referenceType: 'SalesOrder',
        referenceId: new Types.ObjectId(),
        createdBy: userId,
      })
    ).rejects.toThrow('Insufficient stock');

    await session.abortTransaction();
    session.endSession();

    // Balance should still be 10
    const balance = await StockLedgerService.getBalance(orgId, productId, warehouseId);
    expect(balance).toBe(10);
  });

  test('getBalance returns 0 for products with no history', async () => {
    const newProductId = new Types.ObjectId();
    const balance = await StockLedgerService.getBalance(orgId, newProductId, warehouseId);
    expect(balance).toBe(0);
  });
});
