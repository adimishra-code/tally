import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth';
import { Role } from '../types/enums';
import { Organization } from '../models/Organization';
import { AuditLog } from '../models/AuditLog';

const router = Router();

const updateOrgSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  poApprovalThreshold: z.number().min(0).optional(),
});

/**
 * GET /organization - Get organization profile
 */
router.get('/', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    const org = await Organization.findById(authReq.orgId);

    if (!org) {
      res.status(404).json({ error: 'Organization not found' });
      return;
    }

    res.json(org);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PATCH /organization - Update organization profile & approval threshold
 */
router.patch(
  '/',
  requireAuth,
  requireRole(Role.OWNER, Role.ADMIN),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const authReq = req as AuthRequest;
      const data = updateOrgSchema.parse(req.body);

      const previous = await Organization.findById(authReq.orgId);
      if (!previous) {
        res.status(404).json({ error: 'Organization not found' });
        return;
      }

      const org = await Organization.findByIdAndUpdate(
        authReq.orgId,
        { $set: data },
        { new: true }
      );

      if (!org) {
        res.status(404).json({ error: 'Organization not found' });
        return;
      }

      await AuditLog.create({
        orgId: authReq.orgId,
        userId: authReq.userId,
        action: 'ORGANIZATION_UPDATED',
        entityType: 'Organization',
        entityId: org._id,
        before: {
          name: previous.name,
          poApprovalThreshold: previous.poApprovalThreshold,
        },
        after: data,
      });

      res.json(org);
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
