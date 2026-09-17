import mongoose, { Types } from 'mongoose';
import { PurchaseOrderService } from '../src/services/PurchaseOrderService';
import { Organization } from '../src/models/Organization';
import { Product } from '../src/models/Product';
import { Warehouse } from '../src/models/Warehouse';
import { User } from '../src/models/User';
import { PurchaseOrder } from '../src/models/PurchaseOrder';
import { AuditLog } from '../src/models/AuditLog';
import { PurchaseOrderStatus, Role } from '../src/types/enums';

describe('PurchaseOrderService - State Machine & Approvals', () => {
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
      name: 'PO Test Org',
      slug: 'po-org-' + Date.now(),
      poApprovalThreshold: 500,
    });
    orgId = org._id;

    const product = await Product.create({
      orgId,
      sku: 'PO-SKU-001',
      name: 'PO Test Product',
      costPrice: 50,
      sellPrice: 100,
    });
    productId = product._id;

    const warehouse = await Warehouse.create({
      orgId,
      name: 'PO Main Warehouse',
    });
    warehouseId = warehouse._id;

    const user = await User.create({
      orgId,
      name: 'Procurement Specialist',
      email: 'po-procure@test.com',
      passwordHash: 'dummyhash',
      role: Role.PROCUREMENT,
    });
    userId = user._id;
  });

  afterAll(async () => {
    await Organization.deleteMany({ _id: orgId });
    await Product.deleteMany({ _id: productId });
    await Warehouse.deleteMany({ _id: warehouseId });
    await User.deleteMany({ _id: userId });
    await PurchaseOrder.deleteMany({ orgId });
    await AuditLog.deleteMany({ orgId });
    await mongoose.connection.close();
  });

  afterEach(async () => {
    await PurchaseOrder.deleteMany({ orgId });
  });

  test('creates a draft PO with sequential poNumber and snapshotted threshold', async () => {
    const po = await PurchaseOrderService.create({
      orgId,
      supplierName: 'Acme Industrial',
      warehouseId,
      lines: [{ productId, orderedQty: 5, unitCost: 50 }],
      createdBy: userId,
    });

    expect(po.status).toBe(PurchaseOrderStatus.DRAFT);
    expect(po.poNumber).toMatch(/^PO-\d{6}$/);
    expect(po.requiresApprovalAbove).toBe(500);
    expect(po.lines[0].receivedQty).toBe(0);
  });

  test('auto-approves PO under threshold when transitioned by PROCUREMENT role', async () => {
    const po = await PurchaseOrderService.create({
      orgId,
      supplierName: 'Acme Industrial',
      warehouseId,
      lines: [{ productId, orderedQty: 4, unitCost: 50 }], // Total = 200 <= 500
      createdBy: userId,
    });

    const transitioned = await PurchaseOrderService.transition(
      po,
      PurchaseOrderStatus.PENDING_APPROVAL,
      userId,
      Role.PROCUREMENT
    );

    expect(transitioned.status).toBe(PurchaseOrderStatus.APPROVED);
    expect(transitioned.approvedBy?.toString()).toBe(userId.toString());
  });

  test('requires approval when PO total exceeds threshold', async () => {
    const po = await PurchaseOrderService.create({
      orgId,
      supplierName: 'Acme Industrial',
      warehouseId,
      lines: [{ productId, orderedQty: 20, unitCost: 50 }], // Total = 1000 > 500
      createdBy: userId,
    });

    const transitioned = await PurchaseOrderService.transition(
      po,
      PurchaseOrderStatus.PENDING_APPROVAL,
      userId,
      Role.PROCUREMENT
    );

    expect(transitioned.status).toBe(PurchaseOrderStatus.PENDING_APPROVAL);

    // Admin approves it
    const approved = await PurchaseOrderService.transition(
      transitioned,
      PurchaseOrderStatus.APPROVED,
      userId,
      Role.ADMIN
    );
    expect(approved.status).toBe(PurchaseOrderStatus.APPROVED);
  });

  test('rejects invalid state transition', async () => {
    const po = await PurchaseOrderService.create({
      orgId,
      supplierName: 'Acme Industrial',
      warehouseId,
      lines: [{ productId, orderedQty: 2, unitCost: 50 }],
      createdBy: userId,
    });

    // DRAFT -> SENT is not allowed
    await expect(
      PurchaseOrderService.transition(po, PurchaseOrderStatus.SENT, userId, Role.PROCUREMENT)
    ).rejects.toThrow('Invalid transition');
  });

  test('updates received quantity and updates status to PARTIALLY_RECEIVED then RECEIVED', async () => {
    const po = await PurchaseOrderService.create({
      orgId,
      supplierName: 'Acme Industrial',
      warehouseId,
      lines: [{ productId, orderedQty: 10, unitCost: 50 }],
      createdBy: userId,
    });

    // Partial receipt
    await PurchaseOrderService.updateReceivedQty(null as any, po._id, productId, 4);

    const updatedPo1 = await PurchaseOrder.findById(po._id);
    expect(updatedPo1?.status).toBe(PurchaseOrderStatus.PARTIALLY_RECEIVED);
    expect(updatedPo1?.lines[0].receivedQty).toBe(4);

    // Remaining receipt
    await PurchaseOrderService.updateReceivedQty(null as any, po._id, productId, 6);

    const updatedPo2 = await PurchaseOrder.findById(po._id);
    expect(updatedPo2?.status).toBe(PurchaseOrderStatus.RECEIVED);
    expect(updatedPo2?.lines[0].receivedQty).toBe(10);
  });
});
