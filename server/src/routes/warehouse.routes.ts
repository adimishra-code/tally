import { Router, Request, Response } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { Warehouse } from '../models/Warehouse';

const router = Router();

/**
 * GET /warehouses - List warehouses
 */
router.get('/', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    const warehouses = await Warehouse.find({ orgId: authReq.orgId, isActive: true });
    res.json(warehouses);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
