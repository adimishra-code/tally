import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { Types } from 'mongoose';
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth';
import { Role } from '../types/enums';
import { Warehouse } from '../models/Warehouse';
import { Bin } from '../models/Bin';

const router = Router();

const createWarehouseSchema = z.object({
  name: z.string().min(2).max(100),
  address: z.string().max(300).optional(),
});

const updateWarehouseSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  address: z.string().max(300).optional(),
  isActive: z.boolean().optional(),
});

/**
 * GET /warehouses - List all warehouses for org
 */
router.get('/', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    const { includeInactive } = req.query;

    const filter: any = { orgId: authReq.orgId };
    if (includeInactive !== 'true') {
      filter.isActive = true;
    }

    const warehouses = await Warehouse.find(filter).sort({ createdAt: -1 });
    res.json(warehouses);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /warehouses/:id - Get single warehouse with bin count
 */
router.get('/:id', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    if (!Types.ObjectId.isValid(req.params.id)) {
      res.status(400).json({ error: 'Invalid warehouse ID' });
      return;
    }

    const warehouse = await Warehouse.findOne({
      _id: req.params.id,
      orgId: authReq.orgId,
    });

    if (!warehouse) {
      res.status(404).json({ error: 'Warehouse not found' });
      return;
    }

    const binCount = await Bin.countDocuments({
      orgId: authReq.orgId,
      warehouseId: warehouse._id,
    });

    res.json({
      ...warehouse.toObject(),
      binCount,
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /warehouses - Create a new warehouse
 */
router.post(
  '/',
  requireAuth,
  requireRole(Role.OWNER, Role.ADMIN, Role.WAREHOUSE_STAFF),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const authReq = req as AuthRequest;
      const data = createWarehouseSchema.parse(req.body);

      const warehouse = await Warehouse.create({
        orgId: authReq.orgId,
        ...data,
      });

      res.status(201).json(warehouse);
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
 * PATCH /warehouses/:id - Update warehouse
 */
router.patch(
  '/:id',
  requireAuth,
  requireRole(Role.OWNER, Role.ADMIN),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const authReq = req as AuthRequest;
      if (!Types.ObjectId.isValid(req.params.id)) {
        res.status(400).json({ error: 'Invalid warehouse ID' });
        return;
      }

      const data = updateWarehouseSchema.parse(req.body);
      const warehouse = await Warehouse.findOneAndUpdate(
        { _id: req.params.id, orgId: authReq.orgId },
        { $set: data },
        { new: true }
      );

      if (!warehouse) {
        res.status(404).json({ error: 'Warehouse not found' });
        return;
      }

      res.json(warehouse);
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
 * DELETE /warehouses/:id - Soft-delete / deactivate warehouse
 */
router.delete(
  '/:id',
  requireAuth,
  requireRole(Role.OWNER, Role.ADMIN),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const authReq = req as AuthRequest;
      if (!Types.ObjectId.isValid(req.params.id)) {
        res.status(400).json({ error: 'Invalid warehouse ID' });
        return;
      }

      const warehouse = await Warehouse.findOneAndUpdate(
        { _id: req.params.id, orgId: authReq.orgId },
        { $set: { isActive: false } },
        { new: true }
      );

      if (!warehouse) {
        res.status(404).json({ error: 'Warehouse not found' });
        return;
      }

      res.json({ message: 'Warehouse deactivated successfully', warehouse });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

export default router;
