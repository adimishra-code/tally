import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { Types } from 'mongoose';
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth';
import { Role, PurchaseOrderStatus } from '../types/enums';
import { PurchaseOrder } from '../models/PurchaseOrder';
import { PurchaseOrderService } from '../services/PurchaseOrderService';

const router = Router();

const createPOSchema = z.object({
  supplierName: z.string().min(1).max(200),
  warehouseId: z.string().regex(/^[0-9a-fA-F]{24}$/),
  lines: z
    .array(
      z.object({
        productId: z.string().regex(/^[0-9a-fA-F]{24}$/),
        orderedQty: z.number().min(1),
        unitCost: z.number().min(0),
      })
    )
    .min(1),
});

const transitionSchema = z.object({
  nextStatus: z.nativeEnum(PurchaseOrderStatus),
});

/**
 * POST /purchase-orders - Create a new PO
 */
router.post(
  '/',
  requireAuth,
  requireRole(Role.OWNER, Role.ADMIN, Role.PROCUREMENT),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const authReq = req as AuthRequest;
      const data = createPOSchema.parse(req.body);

      const po = await PurchaseOrderService.create({
        orgId: authReq.orgId,
        supplierName: data.supplierName,
        warehouseId: new Types.ObjectId(data.warehouseId),
        lines: data.lines.map((line) => ({
          productId: new Types.ObjectId(line.productId),
          orderedQty: line.orderedQty,
          unitCost: line.unitCost,
        })),
        createdBy: authReq.userId,
      });

      res.status(201).json(po);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: 'Validation failed', details: error.errors });
        return;
      }
      if (error instanceof Error) {
        res.status(400).json({ error: error.message });
        return;
      }
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * GET /purchase-orders - List POs with filters
 */
router.get('/', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    const { status, warehouseId } = req.query;

    const filter: any = { orgId: authReq.orgId };

    if (status && typeof status === 'string') {
      filter.status = status;
    }

    if (warehouseId && typeof warehouseId === 'string' && Types.ObjectId.isValid(warehouseId)) {
      filter.warehouseId = new Types.ObjectId(warehouseId);
    }

    const pos = await PurchaseOrder.find(filter)
      .sort({ createdAt: -1 })
      .populate('createdBy', 'name email')
      .populate('approvedBy', 'name email')
      .populate('warehouseId', 'name');

    res.json(pos);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /purchase-orders/:id - Get single PO
 */
router.get('/:id', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as AuthRequest;

    if (!Types.ObjectId.isValid(req.params.id)) {
      res.status(400).json({ error: 'Invalid PO ID' });
      return;
    }

    const po = await PurchaseOrder.findOne({
      _id: req.params.id,
      orgId: authReq.orgId,
    })
      .populate('createdBy', 'name email')
      .populate('approvedBy', 'name email')
      .populate('warehouseId', 'name')
      .populate('lines.productId', 'sku name unit');

    if (!po) {
      res.status(404).json({ error: 'Purchase order not found' });
      return;
    }

    res.json(po);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /purchase-orders/:id/transition - Transition PO status
 */
router.post(
  '/:id/transition',
  requireAuth,
  requireRole(Role.OWNER, Role.ADMIN, Role.PROCUREMENT),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const authReq = req as AuthRequest;
      const { nextStatus } = transitionSchema.parse(req.body);

      if (!Types.ObjectId.isValid(req.params.id)) {
        res.status(400).json({ error: 'Invalid PO ID' });
        return;
      }

      const po = await PurchaseOrder.findOne({
        _id: req.params.id,
        orgId: authReq.orgId,
      });

      if (!po) {
        res.status(404).json({ error: 'Purchase order not found' });
        return;
      }

      const updatedPO = await PurchaseOrderService.transition(po, nextStatus, authReq.userId, authReq.userRole);

      res.json(updatedPO);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: 'Validation failed', details: error.errors });
        return;
      }
      if (error instanceof Error) {
        res.status(400).json({ error: error.message });
        return;
      }
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

export default router;
