import { Router, Request, Response } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { AuditLog } from '../models/AuditLog';

const router = Router();

/**
 * GET /audit - List audit logs
 */
router.get('/', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    const { entityType, entityId, limit = '50' } = req.query;

    const filter: any = { orgId: authReq.orgId };

    if (entityType && typeof entityType === 'string') {
      filter.entityType = entityType;
    }

    if (entityId && typeof entityId === 'string') {
      filter.entityId = entityId;
    }

    const logs = await AuditLog.find(filter)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit as string))
      .populate('userId', 'name email');

    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
