import { Schema, model, Types } from 'mongoose';
import { LedgerEntryType } from '../types/enums';

/**
 * StockLedgerEntry is the single source of truth for inventory.
 *
 * There is no `quantity` field anywhere else in the system. Current stock
 * for a (product, warehouse) pair is ALWAYS the sum of quantityChange
 * across its ledger entries — never a mutable counter that can drift out
 * of sync with reality.
 *
 * Rules enforced at the service layer (not the schema):
 *   - Entries are write-once. No route may update or delete a ledger entry.
 *   - Every entry is written inside a MongoDB transaction alongside the
 *     document that caused it (PO receipt, order pick, adjustment, etc.),
 *     so stock and its source document can never disagree.
 *   - balanceAfter is computed inside that same transaction, using a
 *     session-scoped read, to make concurrent writes to the same SKU safe.
 */
export interface IStockLedgerEntry {
  _id: Types.ObjectId;
  orgId: Types.ObjectId;
  productId: Types.ObjectId;
  warehouseId: Types.ObjectId;
  binId?: Types.ObjectId;
  type: LedgerEntryType;
  quantityChange: number; // positive = inbound, negative = outbound
  balanceAfter: number; // running balance for (orgId, productId, warehouseId) after this entry
  batchNumber?: string;
  expiryDate?: Date;
  referenceType: 'PurchaseOrder' | 'SalesOrder' | 'Adjustment' | 'Transfer';
  referenceId: Types.ObjectId;
  createdBy: Types.ObjectId;
  createdAt: Date;
}

const stockLedgerEntrySchema = new Schema<IStockLedgerEntry>(
  {
    orgId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    warehouseId: { type: Schema.Types.ObjectId, ref: 'Warehouse', required: true },
    binId: { type: Schema.Types.ObjectId, ref: 'Bin' },
    type: { type: String, enum: Object.values(LedgerEntryType), required: true },
    quantityChange: { type: Number, required: true },
    balanceAfter: { type: Number, required: true },
    batchNumber: { type: String },
    expiryDate: { type: Date },
    referenceType: { type: String, required: true },
    referenceId: { type: Schema.Types.ObjectId, required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// Powers "what's the current balance" and "history for this SKU at this warehouse" queries
stockLedgerEntrySchema.index({ orgId: 1, productId: 1, warehouseId: 1, createdAt: -1 });
stockLedgerEntrySchema.index({ orgId: 1, referenceType: 1, referenceId: 1 });

export const StockLedgerEntry = model<IStockLedgerEntry>('StockLedgerEntry', stockLedgerEntrySchema);
