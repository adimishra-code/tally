import { Router, Request, Response } from 'express';
import { z } from 'zod';
import mongoose, { Types } from 'mongoose';
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth';
import { Role, LedgerEntryType } from '../types/enums';
import { StockLedgerService } from '../services/StockLedgerService';
import { AuditLog } from '../models/AuditLog';
import { Product } from '../models/Product';
import { Warehouse } from '../models/Warehouse';

const router = Router();

const adjustStockSchema = z.object({
  productId: z.string().regex(/^[0-9a-fA-F]{24}$/),
  warehouseId: z.string().regex(/^[0-9a-fA-F]{24}$/),
  quantityChange: z.number().refine((val) => val !== 0, {
    message: 'Quantity change cannot be zero',
  }),
  reason: z.string().min(2).max(200),
  binId: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
});

const transferStockSchema = z.object({
  productId: z.string().regex(/^[0-9a-fA-F]{24}$/),
  fromWarehouseId: z.string().regex(/^[0-9a-fA-F]{24}$/),
  toWarehouseId: z.string().regex(/^[0-9a-fA-F]{24}$/),
  quantity: z.number().min(1),
  reason: z.string().max(200).optional(),
});

/**
 * GET /stock/balance/:productId/:warehouseId - Get current stock balance
 */
router.get(
  '/balance/:productId/:warehouseId',
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const authReq = req as AuthRequest;
      const { productId, warehouseId } = req.params;

      if (!Types.ObjectId.isValid(productId) || !Types.ObjectId.isValid(warehouseId)) {
        res.status(400).json({ error: 'Invalid product or warehouse ID' });
        return;
      }

      const balance = await StockLedgerService.getBalance(
        authReq.orgId,
        new Types.ObjectId(productId),
        new Types.ObjectId(warehouseId)
      );

      res.json({ productId, warehouseId, balance });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * GET /stock/history/:productId/:warehouseId - Get stock history (audit trail)
 */
router.get(
  '/history/:productId/:warehouseId',
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const authReq = req as AuthRequest;
      const { productId, warehouseId } = req.params;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;

      if (!Types.ObjectId.isValid(productId) || !Types.ObjectId.isValid(warehouseId)) {
        res.status(400).json({ error: 'Invalid product or warehouse ID' });
        return;
      }

      const history = await StockLedgerService.getHistory(
        authReq.orgId,
        new Types.ObjectId(productId),
        new Types.ObjectId(warehouseId),
        limit
      );

      res.json(history);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * GET /stock/warehouse/:warehouseId - Get all inventory in a warehouse
 */
router.get(
  '/warehouse/:warehouseId',
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const authReq = req as AuthRequest;
      const { warehouseId } = req.params;

      if (!Types.ObjectId.isValid(warehouseId)) {
        res.status(400).json({ error: 'Invalid warehouse ID' });
        return;
      }

      const inventory = await StockLedgerService.getWarehouseInventory(
        authReq.orgId,
        new Types.ObjectId(warehouseId)
      );

      res.json(inventory);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * POST /stock/adjust - Manual stock adjustment (damaged goods, physical count correction)
 */
router.post(
  '/adjust',
  requireAuth,
  requireRole(Role.OWNER, Role.ADMIN, Role.WAREHOUSE_STAFF),
  async (req: Request, res: Response): Promise<void> => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const authReq = req as AuthRequest;
      const data = adjustStockSchema.parse(req.body);

      const productId = new Types.ObjectId(data.productId);
      const warehouseId = new Types.ObjectId(data.warehouseId);

      // Verify product and warehouse exist in this org
      const product = await Product.findOne({ _id: productId, orgId: authReq.orgId }).session(session);
      const warehouse = await Warehouse.findOne({ _id: warehouseId, orgId: authReq.orgId }).session(session);

      if (!product || !warehouse) {
        await session.abortTransaction();
        res.status(404).json({ error: 'Product or Warehouse not found in this organization' });
        return;
      }

      const adjustmentId = new Types.ObjectId();

      await StockLedgerService.record(session, {
        orgId: authReq.orgId,
        productId,
        warehouseId,
        binId: data.binId ? new Types.ObjectId(data.binId) : undefined,
        type: LedgerEntryType.ADJUSTMENT,
        quantityChange: data.quantityChange,
        referenceType: 'Adjustment',
        referenceId: adjustmentId,
        createdBy: authReq.userId,
      });

      await AuditLog.create(
        [
          {
            orgId: authReq.orgId,
            userId: authReq.userId,
            action: 'STOCK_ADJUSTED',
            entityType: 'Product',
            entityId: productId,
            before: {},
            after: {
              warehouseId: warehouse._id,
              quantityChange: data.quantityChange,
              reason: data.reason,
            },
          },
        ],
        { session }
      );

      await session.commitTransaction();

      const newBalance = await StockLedgerService.getBalance(authReq.orgId, productId, warehouseId);
      res.json({
        message: 'Stock adjusted successfully',
        newBalance,
      });
    } catch (error) {
      await session.abortTransaction();

      if (error instanceof z.ZodError) {
        res.status(400).json({ error: 'Validation failed', details: error.errors });
        return;
      }
      if (error instanceof Error) {
        res.status(400).json({ error: error.message });
        return;
      }
      res.status(500).json({ error: 'Internal server error' });
    } finally {
      session.endSession();
    }
  }
);

/**
 * POST /stock/transfer - Transfer stock between warehouses
 */
router.post(
  '/transfer',
  requireAuth,
  requireRole(Role.OWNER, Role.ADMIN, Role.WAREHOUSE_STAFF),
  async (req: Request, res: Response): Promise<void> => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const authReq = req as AuthRequest;
      const data = transferStockSchema.parse(req.body);

      if (data.fromWarehouseId === data.toWarehouseId) {
        await session.abortTransaction();
        res.status(400).json({ error: 'Source and destination warehouses must be different' });
        return;
      }

      const productId = new Types.ObjectId(data.productId);
      const fromWarehouseId = new Types.ObjectId(data.fromWarehouseId);
      const toWarehouseId = new Types.ObjectId(data.toWarehouseId);

      const product = await Product.findOne({ _id: productId, orgId: authReq.orgId }).session(session);
      const fromWarehouse = await Warehouse.findOne({ _id: fromWarehouseId, orgId: authReq.orgId }).session(session);
      const toWarehouse = await Warehouse.findOne({ _id: toWarehouseId, orgId: authReq.orgId }).session(session);

      if (!product || !fromWarehouse || !toWarehouse) {
        await session.abortTransaction();
        res.status(404).json({ error: 'Product or Warehouse not found in this organization' });
        return;
      }

      // Check current stock at source warehouse inside session
      const currentBalance = await StockLedgerService.getBalance(authReq.orgId, productId, fromWarehouseId, session);
      if (currentBalance < data.quantity) {
        await session.abortTransaction();
        res.status(400).json({
          error: `Insufficient stock in source warehouse: available ${currentBalance}, requested ${data.quantity}`,
        });
        return;
      }

      const transferId = new Types.ObjectId();

      // 1. Record TRANSFER_OUT at source warehouse
      await StockLedgerService.record(session, {
        orgId: authReq.orgId,
        productId,
        warehouseId: fromWarehouseId,
        type: LedgerEntryType.TRANSFER_OUT,
        quantityChange: -data.quantity,
        referenceType: 'Transfer',
        referenceId: transferId,
        createdBy: authReq.userId,
      });

      // 2. Record TRANSFER_IN at destination warehouse
      await StockLedgerService.record(session, {
        orgId: authReq.orgId,
        productId,
        warehouseId: toWarehouseId,
        type: LedgerEntryType.TRANSFER_IN,
        quantityChange: data.quantity,
        referenceType: 'Transfer',
        referenceId: transferId,
        createdBy: authReq.userId,
      });

      await AuditLog.create(
        [
          {
            orgId: authReq.orgId,
            userId: authReq.userId,
            action: 'STOCK_TRANSFERRED',
            entityType: 'Product',
            entityId: productId,
            before: { fromWarehouseId, quantity: data.quantity },
            after: { toWarehouseId, quantity: data.quantity, reason: data.reason },
          },
        ],
        { session }
      );

      await session.commitTransaction();

      res.json({
        message: 'Stock transferred successfully',
        quantity: data.quantity,
        fromWarehouse: fromWarehouse.name,
        toWarehouse: toWarehouse.name,
      });
    } catch (error) {
      await session.abortTransaction();

      if (error instanceof z.ZodError) {
        res.status(400).json({ error: 'Validation failed', details: error.errors });
        return;
      }
      if (error instanceof Error) {
        res.status(400).json({ error: error.message });
        return;
      }
      res.status(500).json({ error: 'Internal server error' });
    } finally {
      session.endSession();
    }
  }
);

export default router;

