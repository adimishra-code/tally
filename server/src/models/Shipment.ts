import { Schema, model, Types } from 'mongoose';

export interface IShipment {
  _id: Types.ObjectId;
  orgId: Types.ObjectId;
  salesOrderId: Types.ObjectId;
  carrier: string;
  trackingNumber?: string;
  shippedAt?: Date;
  createdAt: Date;
}

const shipmentSchema = new Schema<IShipment>(
  {
    orgId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    salesOrderId: { type: Schema.Types.ObjectId, ref: 'SalesOrder', required: true, index: true },
    carrier: { type: String, required: true, trim: true },
    trackingNumber: { type: String, trim: true },
    shippedAt: { type: Date },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const Shipment = model<IShipment>('Shipment', shipmentSchema);
