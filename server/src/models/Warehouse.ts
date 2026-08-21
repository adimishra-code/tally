import { Schema, model, Types } from 'mongoose';

export interface IWarehouse {
  _id: Types.ObjectId;
  orgId: Types.ObjectId;
  name: string;
  address?: string;
  isActive: boolean;
  createdAt: Date;
}

const warehouseSchema = new Schema<IWarehouse>(
  {
    orgId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    name: { type: String, required: true, trim: true },
    address: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const Warehouse = model<IWarehouse>('Warehouse', warehouseSchema);
