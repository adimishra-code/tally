import { Types, ClientSession } from 'mongoose';
import { SalesOrder, ISalesOrder } from '../models/SalesOrder';
import { AuditLog } from '../models/AuditLog';
import { SalesOrderStatus, SO_TRANSITIONS } from '../types/enums';

interface CreateSOParams {
  orgId: Types.ObjectId;
  customerName: string;
  warehouseId: Types.ObjectId;
  lines: Array<{
    productId: Types.ObjectId;
    orderedQty: number;
  }>;
  createdBy: Types.ObjectId;
}

export class SalesOrderService {
  /**
   * Create a new sales order
   */
  static async create(params: CreateSOParams): Promise<ISalesOrder> {
    const { orgId, customerName, warehouseId, lines, createdBy } = params;

    // Generate order number
    const count = await SalesOrder.countDocuments({ orgId });
    const orderNumber = `SO-${String(count + 1).padStart(6, '0')}`;

    const so = await SalesOrder.create({
      orgId,
      orderNumber,
      customerName,
      warehouseId,
      lines,
      createdBy,
      status: SalesOrderStatus.DRAFT,
    });

    await this.logAudit(orgId, createdBy, 'SO_CREATED', so._id, {}, { status: so.status });

    return so;
  }

  /**
   * Transition SO to a new status
   */
  static async transition(
    so: ISalesOrder,
    nextStatus: SalesOrderStatus,
    userId: Types.ObjectId
  ): Promise<ISalesOrder> {
    const currentStatus = so.status;

    // Check if transition is valid
    if (!SO_TRANSITIONS[currentStatus].includes(nextStatus)) {
      throw new Error(
        `Invalid transition from ${currentStatus} to ${nextStatus}. Allowed: ${SO_TRANSITIONS[currentStatus].join(', ')}`
      );
    }

    const updated = await SalesOrder.findByIdAndUpdate(so._id, { $set: { status: nextStatus } }, { new: true });

    if (!updated) {
      throw new Error('Failed to update sales order');
    }

    await this.logAudit(so.orgId, userId, 'SO_TRANSITION', so._id, { status: currentStatus }, { status: nextStatus });

    return updated;
  }

  /**
   * Update picked quantity for a line
   */
  static async updatePickedQty(
    session: ClientSession,
    soId: Types.ObjectId,
    productId: Types.ObjectId,
    pickedQty: number
  ): Promise<void> {
    const so = await SalesOrder.findById(soId).session(session);
    if (!so) {
      throw new Error('Sales order not found');
    }

    const line = so.lines.find((l) => l.productId.equals(productId));
    if (!line) {
      throw new Error('Product not found in sales order');
    }

    line.pickedQty += pickedQty;

    await SalesOrder.updateOne({ _id: soId }, { $set: { lines: so.lines } }, { session });
  }

  /**
   * Update shipped quantity for a line
   */
  static async updateShippedQty(
    session: ClientSession,
    soId: Types.ObjectId,
    productId: Types.ObjectId,
    shippedQty: number
  ): Promise<void> {
    const so = await SalesOrder.findById(soId).session(session);
    if (!so) {
      throw new Error('Sales order not found');
    }

    const line = so.lines.find((l) => l.productId.equals(productId));
    if (!line) {
      throw new Error('Product not found in sales order');
    }

    line.shippedQty += shippedQty;

    // Check if all lines are fully shipped
    const allShipped = so.lines.every((l) => l.shippedQty >= l.orderedQty);
    const anyShipped = so.lines.some((l) => l.shippedQty > 0);

    let newStatus = so.status;
    if (allShipped) {
      newStatus = SalesOrderStatus.SHIPPED;
    } else if (anyShipped) {
      newStatus = SalesOrderStatus.PARTIALLY_SHIPPED;
    }

    await SalesOrder.updateOne({ _id: soId }, { $set: { lines: so.lines, status: newStatus } }, { session });
  }

  /**
   * Log audit entry
   */
  private static async logAudit(
    orgId: Types.ObjectId,
    userId: Types.ObjectId,
    action: string,
    entityId: Types.ObjectId,
    before: Record<string, unknown>,
    after: Record<string, unknown>
  ): Promise<void> {
    await AuditLog.create({
      orgId,
      userId,
      action,
      entityType: 'SalesOrder',
      entityId,
      before,
      after,
    });
  }
}
