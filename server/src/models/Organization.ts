import { Schema, model, Types } from 'mongoose';

export interface IOrganization {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  poApprovalThreshold: number; // POs above this value require APPROVED status before being SENT
  currency?: string;
  timezone?: string;
  contactEmail?: string;
  createdAt: Date;
}

const organizationSchema = new Schema<IOrganization>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    poApprovalThreshold: { type: Number, required: true, default: 10000 },
    currency: { type: String, default: 'USD', uppercase: true, trim: true },
    timezone: { type: String, default: 'UTC', trim: true },
    contactEmail: { type: String, trim: true, lowercase: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const Organization = model<IOrganization>('Organization', organizationSchema);
