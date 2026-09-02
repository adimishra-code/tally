import { ClientSession, Types } from 'mongoose';
import { StockLedgerEntry } from '../models/StockLedgerEntry';
import { LedgerEntryType } from '../types/enums';
import { broadcastStockUpdate } from '../utils/socket';

interface RecordEntryParams {
  orgId: Types.ObjectId;
  productId: Types.ObjectId;
  warehouseId: Types.ObjectId;
  type: LedgerEntryType;
  quantityChange: number;
  referenceType: 'PurchaseOrder' | 'SalesOrder' | 'Adjustment' | 'Transfer';
  referenceId: Types.ObjectId;
  createdBy: Types.ObjectId;
  binId?: Types.ObjectId;
  batchNumber?: string;
  expiryDate?: Date;
}

/**
 * StockLedgerService is the ONLY way to write stock ledger entries.
 * Every stock mutation must go through record() inside a MongoDB session/transaction.
 */
export class StockLedgerService {
  /**
   * Record a stock ledger entry inside a transaction.
   * Computes balanceAfter by reading current balance within the session.
   *
   * MUST be called inside a MongoDB session/transaction to prevent race conditions.
   */
  static async record(session: ClientSession, params: RecordEntryParams): Promise<void> {
    const {
      orgId,
      productId,
      warehouseId,
      type,
      quantityChange,
      referenceType,
      referenceId,
      createdBy,
      binId,
      batchNumber,
      expiryDate,
    } = params;

    // Read current balance inside the session (critical for concurrency safety)
    const currentBalance = await this.getBalance(orgId, productId, warehouseId, session);
    const balanceAfter = currentBalance + quantityChange;

    // Prevent negative stock (business rule)
    if (balanceAfter < 0) {
      throw new Error(
        `Insufficient stock: current=${currentBalance}, requested=${Math.abs(quantityChange)}, product=${productId}`
      );
    }

    // Write the ledger entry
    await StockLedgerEntry.create(
      [
        {
          orgId,
          productId,
          warehouseId,
          binId,
          type,
          quantityChange,
          balanceAfter,
          batchNumber,
          expiryDate,
          referenceType,
          referenceId,
          createdBy,
        },
      ],
      { session }
    );

    // Broadcast real-time stock balance change
    broadcastStockUpdate(orgId.toString(), {
      productId: productId.toString(),
      warehouseId: warehouseId.toString(),
      newBalance: balanceAfter,
    });
  }

  /**
   * Get current stock balance for (org, product, warehouse).
   * If session is provided, reads within that transaction (for concurrency safety).
   */
  static async getBalance(
    orgId: Types.ObjectId,
    productId: Types.ObjectId,
    warehouseId: Types.ObjectId,
    session?: ClientSession
  ): Promise<number> {
    const query = StockLedgerEntry.findOne(
      { orgId, productId, warehouseId },
      { balanceAfter: 1 },
      { sort: { createdAt: -1 } }
    );

    if (session) {
      query.session(session);
    }

    const lastEntry = await query.exec();
    return lastEntry?.balanceAfter ?? 0;
  }

  /**
   * Get stock history for a product at a warehouse (audit trail).
   */
  static async getHistory(
    orgId: Types.ObjectId,
    productId: Types.ObjectId,
    warehouseId: Types.ObjectId,
    limit = 50
  ) {
    return StockLedgerEntry.find({ orgId, productId, warehouseId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('createdBy', 'name email')
      .lean();
  }

  /**
   * Get current balances for all products in a warehouse.
   */
  static async getWarehouseInventory(orgId: Types.ObjectId, warehouseId: Types.ObjectId) {
    // Aggregate to get the latest balance for each product
    const result = await StockLedgerEntry.aggregate([
      { $match: { orgId, warehouseId } },
      { $sort: { productId: 1, createdAt: -1 } },
      {
        $group: {
          _id: '$productId',
          balance: { $first: '$balanceAfter' },
          lastUpdated: { $first: '$createdAt' },
        },
      },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'product',
        },
      },
      { $unwind: '$product' },
      {
        $project: {
          productId: '$_id',
          sku: '$product.sku',
          name: '$product.name',
          unit: '$product.unit',
          balance: 1,
          lastUpdated: 1,
        },
      },
    ]);

    return result;
  }
}
