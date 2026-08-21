import { Schema, model, Types } from 'mongoose';

export interface IBin {
  _id: Types.ObjectId;
  orgId: Types.ObjectId;
  warehouseId: Types.ObjectId;
  code: string; // e.g. "A-12-03" (aisle-rack-shelf)
  zone?: string;
  createdAt: Date;
}

const binSchema = new Schema<IBin>(
  {
    orgId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    warehouseId: { type: Schema.Types.ObjectId, ref: 'Warehouse', required: true, index: true },
    code: { type: String, required: true, trim: true },
    zone: { type: String, trim: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

binSchema.index({ warehouseId: 1, code: 1 }, { unique: true });

export const Bin = model<IBin>('Bin', binSchema);
