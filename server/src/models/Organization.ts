import { Schema, model, Types } from 'mongoose';

export interface IOrganization {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  poApprovalThreshold: number; // POs above this value require APPROVED status before being SENT
  createdAt: Date;
}

const organizationSchema = new Schema<IOrganization>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    poApprovalThreshold: { type: Number, required: true, default: 10000 },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const Organization = model<IOrganization>('Organization', organizationSchema);
