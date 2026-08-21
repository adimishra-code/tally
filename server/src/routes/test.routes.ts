import { Router, Response } from 'express';
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth';
import { Role } from '../types/enums';

const router = Router();

/**
 * Test route: requires authentication only
 */
router.get('/protected', requireAuth, (req, res: Response) => {
  const authReq = req as AuthRequest;
  res.json({
    message: 'You are authenticated',
    userId: authReq.userId,
    orgId: authReq.orgId,
    role: authReq.userRole,
  });
});

/**
 * Test route: requires OWNER, ADMIN, or PROCUREMENT role
 */
router.get(
  '/procurement-only',
  requireAuth,
  requireRole(Role.OWNER, Role.ADMIN, Role.PROCUREMENT),
  (req, res: Response) => {
    const authReq = req as AuthRequest;
    res.json({
      message: 'You have procurement+ access',
      role: authReq.userRole,
    });
  }
);

/**
 * Test route: requires OWNER role only
 */
router.get('/owner-only', requireAuth, requireRole(Role.OWNER), (req, res: Response) => {
  const authReq = req as AuthRequest;
  res.json({
    message: 'You are an owner',
    role: authReq.userRole,
  });
});

/**
 * Test cross-org access prevention: try to fetch a warehouse from another org
 */
router.get('/cross-org-test/:warehouseId', requireAuth, async (req, res: Response): Promise<void> => {
  const authReq = req as AuthRequest;
  const { Warehouse } = await import('../models/Warehouse');

  // This query MUST include orgId — never query without it
  const warehouse = await Warehouse.findOne({
    _id: req.params.warehouseId,
    orgId: authReq.orgId, // CRITICAL: org-scoped query
  });

  if (!warehouse) {
    res.status(404).json({ error: 'Warehouse not found or access denied' });
    return;
  }

  res.json({ warehouse });
});

export default router;
