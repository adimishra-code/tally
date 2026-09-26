import { Schema, model, Types } from 'mongoose';

export interface IShipmentLine {
  productId: Types.ObjectId;
  shippedQty: number;
}

export interface IShipment {
  _id: Types.ObjectId;
  orgId: Types.ObjectId;
  salesOrderId: Types.ObjectId;
  carrier?: string;
  trackingNumber?: string;
  lines: IShipmentLine[];
  shippedBy: Types.ObjectId;
  shippedAt?: Date;
  createdAt: Date;
}

const shipmentLineSchema = new Schema<IShipmentLine>(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    shippedQty: { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

const shipmentSchema = new Schema<IShipment>(
  {
    orgId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    salesOrderId: { type: Schema.Types.ObjectId, ref: 'SalesOrder', required: true, index: true },
    carrier: { type: String, trim: true, default: 'Standard' },
    trackingNumber: { type: String, trim: true },
    lines: [shipmentLineSchema],
    shippedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    shippedAt: { type: Date, default: Date.now },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

shipmentSchema.index({ orgId: 1, salesOrderId: 1, createdAt: -1 });

export const Shipment = model<IShipment>('Shipment', shipmentSchema);

