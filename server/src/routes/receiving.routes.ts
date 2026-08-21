import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { Types } from 'mongoose';
import mongoose from 'mongoose';
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth';
import { Role, LedgerEntryType, PurchaseOrderStatus } from '../types/enums';
import { PurchaseOrder } from '../models/PurchaseOrder';
import { Product } from '../models/Product';
import { StockLedgerService } from '../services/StockLedgerService';
import { PurchaseOrderService } from '../services/PurchaseOrderService';

const router = Router();

const receiveSchema = z.object({
  poId: z.string().regex(/^[0-9a-fA-F]{24}$/),
  lines: z
    .array(
      z.object({
        productId: z.string().regex(/^[0-9a-fA-F]{24}$/),
        receivedQty: z.number().min(1),
        batchNumber: z.string().optional(),
        expiryDate: z.string().datetime().optional(),
        binId: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
      })
    )
    .min(1),
});

const barcodeSchema = z.object({
  barcode: z.string().min(1),
});

/**
 * POST /receiving - Receive goods against a PO
 */
router.post(
  '/',
  requireAuth,
  requireRole(Role.OWNER, Role.ADMIN, Role.WAREHOUSE_STAFF),
  async (req: Request, res: Response): Promise<void> => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const authReq = req as AuthRequest;
      const data = receiveSchema.parse(req.body);

      const poId = new Types.ObjectId(data.poId);
      const po = await PurchaseOrder.findOne({
        _id: poId,
        orgId: authReq.orgId,
      }).session(session);

      if (!po) {
        await session.abortTransaction();
        res.status(404).json({ error: 'Purchase order not found' });
        return;
      }

      // PO must be APPROVED or SENT to receive against
      if (![PurchaseOrderStatus.APPROVED, PurchaseOrderStatus.SENT, PurchaseOrderStatus.PARTIALLY_RECEIVED].includes(po.status)) {
        await session.abortTransaction();
        res.status(400).json({ error: `Cannot receive against PO in ${po.status} status` });
        return;
      }

      const variances: Array<{ productId: string; ordered: number; received: number; variance: number }> = [];

      // Process each line
      for (const line of data.lines) {
        const productId = new Types.ObjectId(line.productId);

        // Find the PO line
        const poLine = po.lines.find((l) => l.productId.equals(productId));
        if (!poLine) {
          await session.abortTransaction();
          res.status(400).json({ error: `Product ${line.productId} not found in PO` });
          return;
        }

        // Check if receiving more than ordered
        const alreadyReceived = poLine.receivedQty;
        const remaining = poLine.orderedQty - alreadyReceived;

        if (line.receivedQty > remaining) {
          variances.push({
            productId: line.productId,
            ordered: remaining,
            received: line.receivedQty,
            variance: line.receivedQty - remaining,
          });
        }

        // Write stock ledger entry
        await StockLedgerService.record(session, {
          orgId: authReq.orgId,
          productId,
          warehouseId: po.warehouseId,
          type: LedgerEntryType.PO_RECEIPT,
          quantityChange: line.receivedQty,
          referenceType: 'PurchaseOrder',
          referenceId: poId,
          createdBy: authReq.userId,
          binId: line.binId ? new Types.ObjectId(line.binId) : undefined,
          batchNumber: line.batchNumber,
          expiryDate: line.expiryDate ? new Date(line.expiryDate) : undefined,
        });

        // Update PO line received quantity
        await PurchaseOrderService.updateReceivedQty(session, poId, productId, line.receivedQty);
      }

      await session.commitTransaction();

      res.json({
        message: 'Goods received successfully',
        variances: variances.length > 0 ? variances : undefined,
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
 * POST /receiving/barcode-lookup - Look up product by barcode/SKU
 */
router.post(
  '/barcode-lookup',
  requireAuth,
  requireRole(Role.OWNER, Role.ADMIN, Role.WAREHOUSE_STAFF),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const authReq = req as AuthRequest;
      const { barcode } = barcodeSchema.parse(req.body);

      const product = await Product.findOne({
        orgId: authReq.orgId,
        sku: barcode.toUpperCase(),
        isActive: true,
      });

      if (!product) {
        res.status(404).json({ error: 'Product not found' });
        return;
      }

      res.json(product);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: 'Validation failed', details: error.errors });
        return;
      }
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

export default router;
