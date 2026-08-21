import { Schema, model, Types } from 'mongoose';

export interface IProduct {
  _id: Types.ObjectId;
  orgId: Types.ObjectId;
  sku: string;
  name: string;
  description?: string;
  unit: string; // e.g. "pcs", "kg", "box"
  reorderPoint: number; // trigger a low-stock alert when balance falls to/below this
  reorderQty: number; // suggested quantity to reorder
  costPrice: number;
  sellPrice: number;
  isActive: boolean;
  createdAt: Date;
}

const productSchema = new Schema<IProduct>(
  {
    orgId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    sku: { type: String, required: true, trim: true, uppercase: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    unit: { type: String, required: true, default: 'pcs' },
    reorderPoint: { type: Number, required: true, default: 0, min: 0 },
    reorderQty: { type: Number, required: true, default: 0, min: 0 },
    costPrice: { type: Number, required: true, min: 0 },
    sellPrice: { type: Number, required: true, min: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

productSchema.index({ orgId: 1, sku: 1 }, { unique: true });

export const Product = model<IProduct>('Product', productSchema);
