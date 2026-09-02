import { Types, ClientSession } from 'mongoose';
import { PurchaseOrder, IPurchaseOrder } from '../models/PurchaseOrder';
import { Organization } from '../models/Organization';
import { AuditLog } from '../models/AuditLog';
import { PurchaseOrderStatus, PO_TRANSITIONS, Role } from '../types/enums';
import { broadcastOrderUpdate } from '../utils/socket';

interface CreatePOParams {
  orgId: Types.ObjectId;
  supplierName: string;
  warehouseId: Types.ObjectId;
  lines: Array<{
    productId: Types.ObjectId;
    orderedQty: number;
    unitCost: number;
  }>;
  createdBy: Types.ObjectId;
}

export class PurchaseOrderService {
  /**
   * Create a new PO, snapshots org.poApprovalThreshold
   */
  static async create(params: CreatePOParams): Promise<IPurchaseOrder> {
    const { orgId, supplierName, warehouseId, lines, createdBy } = params;

    // Fetch org to snapshot approval threshold
    const org = await Organization.findById(orgId);
    if (!org) {
      throw new Error('Organization not found');
    }

    // Generate PO number (simple sequential, could be more sophisticated)
    const count = await PurchaseOrder.countDocuments({ orgId });
    const poNumber = `PO-${String(count + 1).padStart(6, '0')}`;

    const po = await PurchaseOrder.create({
      orgId,
      poNumber,
      supplierName,
      warehouseId,
      status: PurchaseOrderStatus.DRAFT,
      lines: lines.map((line) => ({
        ...line,
        receivedQty: 0,
      })),
      requiresApprovalAbove: org.poApprovalThreshold,
      createdBy,
    });

    await this.logAudit(orgId, createdBy, 'PO_CREATED', po._id, {}, { poNumber, status: po.status });

    broadcastOrderUpdate(orgId.toString(), {
      type: 'PO',
      orderId: po._id.toString(),
      status: po.status,
      orderNumber: po.poNumber,
    });

    return po;
  }

  /**
   * Transition a PO to a new status. Enforces state machine rules.
   */
  static async transition(
    po: IPurchaseOrder,
    nextStatus: PurchaseOrderStatus,
    userId: Types.ObjectId,
    userRole?: Role
  ): Promise<IPurchaseOrder> {
    const currentStatus = po.status;
    const allowed = PO_TRANSITIONS[currentStatus];

    // Check if transition is valid
    if (!allowed || !allowed.includes(nextStatus)) {
      throw new Error(`Invalid transition from ${currentStatus} to ${nextStatus}`);
    }

    // Special logic: DRAFT → PENDING_APPROVAL
    // Check if approval is needed based on total value
    if (currentStatus === PurchaseOrderStatus.DRAFT && nextStatus === PurchaseOrderStatus.PENDING_APPROVAL) {
      const totalValue = this.calculateTotal(po);

      // If under threshold and user has PROCUREMENT+ role, skip straight to APPROVED
      if (
        totalValue <= po.requiresApprovalAbove &&
        (userRole === Role.OWNER || userRole === Role.ADMIN || userRole === Role.PROCUREMENT)
      ) {
        po.status = PurchaseOrderStatus.APPROVED;
        po.approvedBy = userId;
      } else {
        po.status = nextStatus;
      }
    } else if (nextStatus === PurchaseOrderStatus.APPROVED) {
      po.status = nextStatus;
      po.approvedBy = userId;
    } else {
      po.status = nextStatus;
    }

    const updated = await PurchaseOrder.findByIdAndUpdate(
      po._id,
      { $set: { status: po.status, approvedBy: po.approvedBy } },
      { new: true }
    );

    if (!updated) {
      throw new Error('Failed to update purchase order');
    }

    await this.logAudit(po.orgId, userId, 'PO_TRANSITION', po._id, { status: currentStatus }, { status: po.status });

    broadcastOrderUpdate(po.orgId.toString(), {
      type: 'PO',
      orderId: po._id.toString(),
      status: po.status,
      orderNumber: po.poNumber,
    });

    return updated;
  }

  /**
   * Calculate total PO value
   */
  static calculateTotal(po: IPurchaseOrder): number {
    return po.lines.reduce((sum, line) => sum + line.orderedQty * line.unitCost, 0);
  }

  /**
   * Update received quantity for a line (called during receiving)
   */
  static async updateReceivedQty(
    session: ClientSession,
    poId: Types.ObjectId,
    productId: Types.ObjectId,
    receivedQty: number
  ): Promise<void> {
    const po = await PurchaseOrder.findById(poId).session(session);
    if (!po) {
      throw new Error('Purchase order not found');
    }

    const line = po.lines.find((l) => l.productId.equals(productId));
    if (!line) {
      throw new Error('Product not found in PO');
    }

    line.receivedQty += receivedQty;

    // Check if all lines are fully received
    const allReceived = po.lines.every((l) => l.receivedQty >= l.orderedQty);
    const anyReceived = po.lines.some((l) => l.receivedQty > 0);

    if (allReceived) {
      po.status = PurchaseOrderStatus.RECEIVED;
    } else if (anyReceived) {
      po.status = PurchaseOrderStatus.PARTIALLY_RECEIVED;
    }

    await PurchaseOrder.updateOne({ _id: poId }, { $set: { lines: po.lines, status: po.status } }, { session });

    broadcastOrderUpdate(po.orgId.toString(), {
      type: 'PO',
      orderId: po._id.toString(),
      status: po.status,
      orderNumber: po.poNumber,
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
    after: Record<string, unknown>
  ): Promise<void> {
    await AuditLog.create({
      orgId,
      userId,
      action,
      entityType: 'PurchaseOrder',
      entityId,
      before,
      after,
    });
  }
}
