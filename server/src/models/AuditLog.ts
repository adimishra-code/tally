import { Schema, model, Types } from 'mongoose';

/**
 * Append-only, like StockLedgerEntry. Every mutating action a user takes
 * (status transitions, receiving, adjustments, role changes) writes one
 * of these. No update/delete route should ever touch this collection.
 */
export interface IAuditLog {
  _id: Types.ObjectId;
  orgId: Types.ObjectId;
  userId: Types.ObjectId;
  action: string; // e.g. "PO_APPROVED", "STOCK_ADJUSTED", "USER_ROLE_CHANGED"
  entityType: string;
  entityId: Types.ObjectId;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  ip?: string;
  createdAt: Date;
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    orgId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    action: { type: String, required: true },
    entityType: { type: String, required: true },
    entityId: { type: Schema.Types.ObjectId, required: true },
    before: { type: Schema.Types.Mixed },
    after: { type: Schema.Types.Mixed },
    ip: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

auditLogSchema.index({ orgId: 1, entityType: 1, entityId: 1, createdAt: -1 });

export const AuditLog = model<IAuditLog>('AuditLog', auditLogSchema);
