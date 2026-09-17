import { Types, ClientSession } from 'mongoose';
import { SalesOrder, ISalesOrder } from '../models/SalesOrder';
import { AuditLog } from '../models/AuditLog';
import { SalesOrderStatus, SO_TRANSITIONS, LedgerEntryType } from '../types/enums';
import { broadcastOrderUpdate } from '../utils/socket';
import { StockLedgerService } from './StockLedgerService';

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

    broadcastOrderUpdate(orgId.toString(), {
      type: 'SO',
      orderId: so._id.toString(),
      status: so.status,
      orderNumber: so.orderNumber,
    });

    return so;
  }

  /**
   * Transition SO to a new status.
   * If cancelling an order with picked goods, automatically restocks them to inventory.
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

    const session = await SalesOrder.startSession();
    session.startTransaction();

    try {
      // If cancelling from PICKING status, return all picked items back to warehouse stock
      if (currentStatus === SalesOrderStatus.PICKING && nextStatus === SalesOrderStatus.CANCELLED) {
        for (const line of so.lines) {
          const picked = line.pickedQty || 0;
          if (picked > 0) {
            await StockLedgerService.record(session, {
              orgId: so.orgId,
              productId: line.productId,
              warehouseId: so.warehouseId,
              type: LedgerEntryType.RETURN,
              quantityChange: picked,
              referenceType: 'SalesOrder',
              referenceId: so._id,
              createdBy: userId,
            });
            line.pickedQty = 0;
          }
        }
      }

      const updated = await SalesOrder.findByIdAndUpdate(
        so._id,
        { $set: { status: nextStatus, lines: so.lines } },
        { new: true, session }
      );

      if (!updated) {
        throw new Error('Failed to update sales order');
      }

      await this.logAudit(
        so.orgId,
        userId,
        'SO_TRANSITION',
        so._id,
        { status: currentStatus },
        { status: nextStatus },
        session
      );

      await session.commitTransaction();

      broadcastOrderUpdate(so.orgId.toString(), {
        type: 'SO',
        orderId: so._id.toString(),
        status: nextStatus,
        orderNumber: so.orderNumber,
      });

      return updated;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Update picked quantity for a line with ceiling validation
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

    const currentPicked = line.pickedQty || 0;
    if (currentPicked + pickedQty > line.orderedQty) {
      throw new Error(
        `Cannot pick ${pickedQty} units. Ordered: ${line.orderedQty}, already picked: ${currentPicked}`
      );
    }

    line.pickedQty = currentPicked + pickedQty;

    await SalesOrder.updateOne({ _id: soId }, { $set: { lines: so.lines } }, { session });

    broadcastOrderUpdate(so.orgId.toString(), {
      type: 'SO',
      orderId: so._id.toString(),
      status: so.status,
      orderNumber: so.orderNumber,
    });
  }

  /**
   * Update shipped quantity for a line with picked ceiling validation
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

    const currentShipped = line.shippedQty || 0;
    const currentPicked = line.pickedQty || 0;
    if (currentShipped + shippedQty > currentPicked) {
      throw new Error(
        `Cannot ship ${shippedQty} units. Picked: ${currentPicked}, already shipped: ${currentShipped}`
      );
    }

    line.shippedQty = currentShipped + shippedQty;

    // Check if all lines are fully shipped
    const allShipped = so.lines.every((l) => (l.shippedQty || 0) >= l.orderedQty);
    const anyShipped = so.lines.some((l) => (l.shippedQty || 0) > 0);

    let newStatus = so.status;
    if (allShipped) {
      newStatus = SalesOrderStatus.SHIPPED;
    } else if (anyShipped) {
      newStatus = SalesOrderStatus.PARTIALLY_SHIPPED;
    }

    await SalesOrder.updateOne({ _id: soId }, { $set: { lines: so.lines, status: newStatus } }, { session });

    broadcastOrderUpdate(so.orgId.toString(), {
      type: 'SO',
      orderId: so._id.toString(),
      status: newStatus,
      orderNumber: so.orderNumber,
    });
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
    after: Record<string, unknown>,
    session?: ClientSession
  ): Promise<void> {
    await AuditLog.create(
      [
        {
          orgId,
          userId,
          action,
          entityType: 'SalesOrder',
          entityId,
          before,
          after,
        },
      ],
      session ? { session } : undefined
    );
  }
}
