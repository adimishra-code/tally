import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { Types } from 'mongoose';
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth';
import { Role } from '../types/enums';
import { Bin } from '../models/Bin';
import { Warehouse } from '../models/Warehouse';

const router = Router();

const createBinSchema = z.object({
  warehouseId: z.string().regex(/^[0-9a-fA-F]{24}$/),
  code: z.string().min(1).max(50),
  zone: z.string().max(50).optional(),
});

/**
 * GET /bins/warehouse/:warehouseId - List all bins for a warehouse
 */
router.get('/warehouse/:warehouseId', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    const { warehouseId } = req.params;

    if (!Types.ObjectId.isValid(warehouseId)) {
      res.status(400).json({ error: 'Invalid warehouse ID' });
      return;
    }

    const bins = await Bin.find({
      orgId: authReq.orgId,
      warehouseId: new Types.ObjectId(warehouseId),
    }).sort({ code: 1 });

    res.json(bins);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /bins - Create a new bin
 */
router.post(
  '/',
  requireAuth,
  requireRole(Role.OWNER, Role.ADMIN, Role.WAREHOUSE_STAFF),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const authReq = req as AuthRequest;
      const data = createBinSchema.parse(req.body);

      // Verify warehouse exists in org
      const warehouse = await Warehouse.findOne({
        _id: data.warehouseId,
        orgId: authReq.orgId,
      });

      if (!warehouse) {
        res.status(404).json({ error: 'Warehouse not found' });
        return;
      }

      // Check unique code per warehouse
      const existing = await Bin.findOne({
        warehouseId: data.warehouseId,
        code: data.code.toUpperCase(),
      });

      if (existing) {
        res.status(400).json({ error: 'Bin code already exists in this warehouse' });
        return;
      }

      const bin = await Bin.create({
        orgId: authReq.orgId,
        warehouseId: new Types.ObjectId(data.warehouseId),
        code: data.code.toUpperCase(),
        zone: data.zone,
      });

      res.status(201).json(bin);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: 'Validation failed', details: error.errors });
        return;
      }
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * DELETE /bins/:id - Delete a bin
 */
router.delete(
  '/:id',
  requireAuth,
  requireRole(Role.OWNER, Role.ADMIN, Role.WAREHOUSE_STAFF),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const authReq = req as AuthRequest;
      if (!Types.ObjectId.isValid(req.params.id)) {
        res.status(400).json({ error: 'Invalid bin ID' });
        return;
      }

      const bin = await Bin.findOneAndDelete({
        _id: req.params.id,
        orgId: authReq.orgId,
      });

      if (!bin) {
        res.status(404).json({ error: 'Bin not found' });
        return;
      }

      res.json({ message: 'Bin deleted successfully', bin });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

export default router;
