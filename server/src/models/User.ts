import { Schema, model, Types } from 'mongoose';
import { Role } from '../types/enums';

export interface IUser {
  _id: Types.ObjectId;
  orgId: Types.ObjectId;
  name: string;
  email: string;
  passwordHash: string;
  role: Role;
  isActive: boolean;
  createdAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    orgId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: Object.values(Role), required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// Email is unique per org, not globally — the same person could belong to two orgs
userSchema.index({ orgId: 1, email: 1 }, { unique: true });

export const User = model<IUser>('User', userSchema);
