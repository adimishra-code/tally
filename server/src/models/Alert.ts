import { Schema, model, Types } from 'mongoose';

export enum AlertType {
  LOW_STOCK = 'LOW_STOCK',
  EXPIRY_WARNING = 'EXPIRY_WARNING',
  SLA_BREACH = 'SLA_BREACH',
}

export enum AlertStatus {
  ACTIVE = 'ACTIVE',
  ACKNOWLEDGED = 'ACKNOWLEDGED',
  RESOLVED = 'RESOLVED',
}

export interface IAlert {
  _id: Types.ObjectId;
  orgId: Types.ObjectId;
  type: AlertType;
  status: AlertStatus;
  severity: 'low' | 'medium' | 'high';
  message: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
  acknowledgedAt?: Date;
  acknowledgedBy?: Types.ObjectId;
}

const alertSchema = new Schema<IAlert>(
  {
    orgId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    type: { type: String, enum: Object.values(AlertType), required: true },
    status: { type: String, enum: Object.values(AlertStatus), default: AlertStatus.ACTIVE },
    severity: { type: String, enum: ['low', 'medium', 'high'], required: true },
    message: { type: String, required: true },
    metadata: { type: Schema.Types.Mixed, default: {} },
    acknowledgedAt: { type: Date },
    acknowledgedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

alertSchema.index({ orgId: 1, status: 1, createdAt: -1 });
alertSchema.index({ orgId: 1, type: 1, status: 1 });

export const Alert = model<IAlert>('Alert', alertSchema);
