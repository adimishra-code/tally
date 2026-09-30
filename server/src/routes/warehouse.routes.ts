import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { Types } from 'mongoose';
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth';
import { Role } from '../types/enums';
import { Warehouse } from '../models/Warehouse';
import { Bin } from '../models/Bin';
import { AuditLog } from '../models/AuditLog';

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
 * GET /warehouses/export/csv - Export warehouses as CSV
 */
router.get(['/export', '/export/csv'], requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    const { status, search } = req.query;

    const filter: any = { orgId: authReq.orgId };

    if (status === 'ACTIVE') {
      filter.isActive = true;
    } else if (status === 'INACTIVE') {
      filter.isActive = false;
    }

    if (search && typeof search === 'string' && search.trim()) {
      filter.$or = [
        { name: { $regex: search.trim(), $options: 'i' } },
        { address: { $regex: search.trim(), $options: 'i' } },
      ];
    }

    const warehouses = await Warehouse.find(filter).sort({ createdAt: -1 });

    // Aggregate bin counts for each warehouse
    const binCounts = await Bin.aggregate([
      { $match: { orgId: authReq.orgId } },
      { $group: { _id: '$warehouseId', count: { $sum: 1 } } },
    ]);
    const binCountMap = new Map(binCounts.map((b) => [b._id.toString(), b.count]));

    const headers = ['Name', 'Address', 'Status', 'Bins Count', 'Created At'];
    const rows = warehouses.map((wh: any) => [
      `"${(wh.name || '').replace(/"/g, '""')}"`,
      `"${(wh.address || '').replace(/"/g, '""')}"`,
      `"${wh.isActive ? 'Active' : 'Inactive'}"`,
      wh.isActive ? (binCountMap.get(wh._id.toString()) || 0) : 0,
      `"${wh.createdAt ? new Date(wh.createdAt).toISOString().split('T')[0] : ''}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="tally_warehouses_${new Date().toISOString().slice(0, 10)}.csv"`
    );
    res.status(200).send(csvContent);
  } catch (error) {
    console.error('Error exporting warehouses:', error);
    res.status(500).json({ error: 'Internal server error during warehouse export' });
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

      await AuditLog.create({
        orgId: authReq.orgId,
        userId: authReq.userId,
        action: 'WAREHOUSE_CREATED',
        entityType: 'Warehouse',
        entityId: warehouse._id,
        before: {},
        after: { name: warehouse.name, address: warehouse.address },
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

      const previous = await Warehouse.findOne({ _id: req.params.id, orgId: authReq.orgId });
      if (!previous) {
        res.status(404).json({ error: 'Warehouse not found' });
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

      await AuditLog.create({
        orgId: authReq.orgId,
        userId: authReq.userId,
        action: 'WAREHOUSE_UPDATED',
        entityType: 'Warehouse',
        entityId: warehouse._id,
        before: { name: previous.name, address: previous.address, isActive: previous.isActive },
        after: data,
      });

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

      await AuditLog.create({
        orgId: authReq.orgId,
        userId: authReq.userId,
        action: 'WAREHOUSE_DEACTIVATED',
        entityType: 'Warehouse',
        entityId: warehouse._id,
        before: { isActive: true },
        after: { isActive: false },
      });

      res.json({ message: 'Warehouse deactivated successfully', warehouse });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

export default router;
