import { Router, Request, Response } from 'express';
import { Types } from 'mongoose';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { StockLedgerService } from '../services/StockLedgerService';

const router = Router();

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

export default router;
