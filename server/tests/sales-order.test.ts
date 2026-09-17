import mongoose, { Types } from 'mongoose';
import { SalesOrderService } from '../src/services/SalesOrderService';
import { StockLedgerService } from '../src/services/StockLedgerService';
import { Organization } from '../src/models/Organization';
import { Product } from '../src/models/Product';
import { Warehouse } from '../src/models/Warehouse';
import { User } from '../src/models/User';
import { SalesOrder } from '../src/models/SalesOrder';
import { StockLedgerEntry } from '../src/models/StockLedgerEntry';
import { AuditLog } from '../src/models/AuditLog';
import { SalesOrderStatus, LedgerEntryType, Role } from '../src/types/enums';

describe('SalesOrderService - Lifecycle & Stock Integrity', () => {
  let orgId: Types.ObjectId;
  let productId: Types.ObjectId;
  let warehouseId: Types.ObjectId;
  let userId: Types.ObjectId;

  beforeAll(async () => {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/tally-test';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }

    const org = await Organization.create({
      name: 'SO Test Org',
      slug: 'so-org-' + Date.now(),
    });
    orgId = org._id;

    const product = await Product.create({
      orgId,
      sku: 'SO-SKU-001',
      name: 'SO Test Product',
      costPrice: 20,
      sellPrice: 40,
    });
    productId = product._id;

    const warehouse = await Warehouse.create({
      orgId,
      name: 'SO Fulfillment Center',
    });
    warehouseId = warehouse._id;

    const user = await User.create({
      orgId,
      name: 'Warehouse Lead',
      email: 'so-lead@test.com',
      passwordHash: 'dummyhash',
      role: Role.WAREHOUSE_STAFF,
    });
    userId = user._id;
  });

  afterAll(async () => {
    await Organization.deleteMany({ _id: orgId });
    await Product.deleteMany({ _id: productId });
    await Warehouse.deleteMany({ _id: warehouseId });
    await User.deleteMany({ _id: userId });
    await SalesOrder.deleteMany({ orgId });
    await StockLedgerEntry.deleteMany({ orgId });
    await AuditLog.deleteMany({ orgId });
    await mongoose.connection.close();
  });

  afterEach(async () => {
    await SalesOrder.deleteMany({ orgId });
    await StockLedgerEntry.deleteMany({ orgId });
  });

  test('creates a draft sales order with orderNumber', async () => {
    const so = await SalesOrderService.create({
      orgId,
      customerName: 'Global Corp',
      warehouseId,
      lines: [{ productId, orderedQty: 10 }],
      createdBy: userId,
    });

    expect(so.status).toBe(SalesOrderStatus.DRAFT);
    expect(so.orderNumber).toMatch(/^SO-\d{6}$/);
    expect(so.customerName).toBe('Global Corp');
  });

  test('enforces state machine transition rules', async () => {
    const so = await SalesOrderService.create({
      orgId,
      customerName: 'Global Corp',
      warehouseId,
      lines: [{ productId, orderedQty: 5 }],
      createdBy: userId,
    });

    // DRAFT -> CONFIRMED
    const confirmed = await SalesOrderService.transition(so, SalesOrderStatus.CONFIRMED, userId);
    expect(confirmed.status).toBe(SalesOrderStatus.CONFIRMED);

    // CONFIRMED -> DELIVERED (invalid, must be picked/shipped first)
    await expect(
      SalesOrderService.transition(confirmed, SalesOrderStatus.DELIVERED, userId)
    ).rejects.toThrow('Invalid transition');
  });

  test('prevents picking more than ordered quantity', async () => {
    const so = await SalesOrderService.create({
      orgId,
      customerName: 'Global Corp',
      warehouseId,
      lines: [{ productId, orderedQty: 5 }],
      createdBy: userId,
    });

    // Try to pick 6 units on an order of 5
    await expect(
      SalesOrderService.updatePickedQty(null as any, so._id, productId, 6)
    ).rejects.toThrow('Cannot pick 6 units');
  });

  test('prevents shipping more than picked quantity', async () => {
    const so = await SalesOrderService.create({
      orgId,
      customerName: 'Global Corp',
      warehouseId,
      lines: [{ productId, orderedQty: 10 }],
      createdBy: userId,
    });

    // Pick 4 units
    await SalesOrderService.updatePickedQty(null as any, so._id, productId, 4);

    // Try to ship 5 units (only 4 picked)
    await expect(
      SalesOrderService.updateShippedQty(null as any, so._id, productId, 5)
    ).rejects.toThrow('Cannot ship 5 units');
  });

  test('restores picked inventory when cancelling an order in PICKING status', async () => {
    // 1. Initial stock receipt of 20 units
    await StockLedgerService.record(null, {
      orgId,
      productId,
      warehouseId,
      type: LedgerEntryType.PO_RECEIPT,
      quantityChange: 20,
      referenceType: 'PurchaseOrder',
      referenceId: new Types.ObjectId(),
      createdBy: userId,
    });

    const balanceInitial = await StockLedgerService.getBalance(orgId, productId, warehouseId);
    expect(balanceInitial).toBe(20);

    // 2. Create and advance SO to PICKING
    const so = await SalesOrderService.create({
      orgId,
      customerName: 'Global Corp',
      warehouseId,
      lines: [{ productId, orderedQty: 8 }],
      createdBy: userId,
    });

    const confirmed = await SalesOrderService.transition(so, SalesOrderStatus.CONFIRMED, userId);
    const picking = await SalesOrderService.transition(confirmed, SalesOrderStatus.PICKING, userId);

    // 3. Pick 6 units (stock deducted)
    await StockLedgerService.record(null, {
      orgId,
      productId,
      warehouseId,
      type: LedgerEntryType.ORDER_PICK,
      quantityChange: -6,
      referenceType: 'SalesOrder',
      referenceId: picking._id,
      createdBy: userId,
    });
    await SalesOrderService.updatePickedQty(null as any, picking._id, productId, 6);

    const balanceAfterPick = await StockLedgerService.getBalance(orgId, productId, warehouseId);
    expect(balanceAfterPick).toBe(14); // 20 - 6

    // 4. Cancel the order
    const updatedPicking = await SalesOrder.findById(picking._id);
    const cancelled = await SalesOrderService.transition(updatedPicking!, SalesOrderStatus.CANCELLED, userId);
    expect(cancelled.status).toBe(SalesOrderStatus.CANCELLED);

    // 5. Verify picked stock was returned to the ledger
    const balanceAfterCancel = await StockLedgerService.getBalance(orgId, productId, warehouseId);
    expect(balanceAfterCancel).toBe(20); // 14 + 6 returned

    const returnEntry = await StockLedgerEntry.findOne({
      orgId,
      productId,
      referenceId: picking._id,
      type: LedgerEntryType.RETURN,
    });
    expect(returnEntry).not.toBeNull();
    expect(returnEntry?.quantityChange).toBe(6);
  });
});
