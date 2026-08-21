import { Schema, model, Types } from 'mongoose';
import { SalesOrderStatus } from '../types/enums';

interface ISalesOrderLine {
  productId: Types.ObjectId;
  orderedQty: number;
  pickedQty: number;
  shippedQty: number;
}

export interface ISalesOrder {
  _id: Types.ObjectId;
  orgId: Types.ObjectId;
  orderNumber: string;
  customerName: string;
  warehouseId: Types.ObjectId;
  status: SalesOrderStatus;
  lines: ISalesOrderLine[];
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const salesOrderLineSchema = new Schema<ISalesOrderLine>(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    orderedQty: { type: Number, required: true, min: 1 },
    pickedQty: { type: Number, default: 0, min: 0 },
    shippedQty: { type: Number, default: 0, min: 0 },
  },
  { _id: false }
);

const salesOrderSchema = new Schema<ISalesOrder>(
  {
    orgId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    orderNumber: { type: String, required: true },
    customerName: { type: String, required: true, trim: true },
    warehouseId: { type: Schema.Types.ObjectId, ref: 'Warehouse', required: true },
    status: {
      type: String,
      enum: Object.values(SalesOrderStatus),
      default: SalesOrderStatus.DRAFT,
    },
    lines: {
      type: [salesOrderLineSchema],
      required: true,
      validate: (v: ISalesOrderLine[]) => v.length > 0,
    },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

salesOrderSchema.index({ orgId: 1, orderNumber: 1 }, { unique: true });
salesOrderSchema.index({ orgId: 1, status: 1 });

export const SalesOrder = model<ISalesOrder>('SalesOrder', salesOrderSchema);
