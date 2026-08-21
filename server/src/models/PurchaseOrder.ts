import { Schema, model, Types } from 'mongoose';
import { PurchaseOrderStatus } from '../types/enums';

interface IPurchaseOrderLine {
  productId: Types.ObjectId;
  orderedQty: number;
  receivedQty: number;
  unitCost: number;
}

export interface IPurchaseOrder {
  _id: Types.ObjectId;
  orgId: Types.ObjectId;
  poNumber: string;
  supplierName: string;
  warehouseId: Types.ObjectId;
  status: PurchaseOrderStatus;
  lines: IPurchaseOrderLine[];
  requiresApprovalAbove: number; // snapshot of org.poApprovalThreshold at creation time
  createdBy: Types.ObjectId;
  approvedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const purchaseOrderLineSchema = new Schema<IPurchaseOrderLine>(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    orderedQty: { type: Number, required: true, min: 1 },
    receivedQty: { type: Number, default: 0, min: 0 },
    unitCost: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const purchaseOrderSchema = new Schema<IPurchaseOrder>(
  {
    orgId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    poNumber: { type: String, required: true },
    supplierName: { type: String, required: true, trim: true },
    warehouseId: { type: Schema.Types.ObjectId, ref: 'Warehouse', required: true },
    status: {
      type: String,
      enum: Object.values(PurchaseOrderStatus),
      default: PurchaseOrderStatus.DRAFT,
    },
    lines: {
      type: [purchaseOrderLineSchema],
      required: true,
      validate: (v: IPurchaseOrderLine[]) => v.length > 0,
    },
    requiresApprovalAbove: { type: Number, required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

purchaseOrderSchema.index({ orgId: 1, poNumber: 1 }, { unique: true });
purchaseOrderSchema.index({ orgId: 1, status: 1 });

export const PurchaseOrder = model<IPurchaseOrder>('PurchaseOrder', purchaseOrderSchema);
