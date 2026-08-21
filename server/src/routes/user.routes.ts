import { Router, Request, Response } from 'express';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth';
import { Role } from '../types/enums';
import { User } from '../models/User';
import { AuditLog } from '../models/AuditLog';

const router = Router();

const createUserSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8).max(100),
  role: z.nativeEnum(Role),
});

const updateUserSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  role: z.nativeEnum(Role).optional(),
  isActive: z.boolean().optional(),
});

/**
 * POST /users - Create a new user (OWNER/ADMIN only)
 */
router.post(
  '/',
  requireAuth,
  requireRole(Role.OWNER, Role.ADMIN),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const authReq = req as AuthRequest;
      const data = createUserSchema.parse(req.body);

      // Check if email already exists in org
      const existing = await User.findOne({ orgId: authReq.orgId, email: data.email });
      if (existing) {
        res.status(400).json({ error: 'Email already exists in this organization' });
        return;
      }

      const passwordHash = await bcrypt.hash(data.password, 12);

      const user = await User.create({
        orgId: authReq.orgId,
        name: data.name,
        email: data.email,
        passwordHash,
        role: data.role,
      });

      await AuditLog.create({
        orgId: authReq.orgId,
        userId: authReq.userId,
        action: 'USER_CREATED',
        entityType: 'User',
        entityId: user._id,
        before: {},
        after: { email: user.email, role: user.role },
      });

      res.status(201).json({
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
      });
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
 * GET /users - List all users in org
 */
router.get('/', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as AuthRequest;

    const users = await User.find({ orgId: authReq.orgId }).select('-passwordHash').sort({ createdAt: -1 });

    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PATCH /users/:id - Update a user (OWNER/ADMIN only)
 */
router.patch(
  '/:id',
  requireAuth,
  requireRole(Role.OWNER, Role.ADMIN),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const authReq = req as AuthRequest;
      const data = updateUserSchema.parse(req.body);

      const user = await User.findOne({ _id: req.params.id, orgId: authReq.orgId });
      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      const before = { name: user.name, role: user.role, isActive: user.isActive };

      const updated = await User.findOneAndUpdate(
        { _id: req.params.id, orgId: authReq.orgId },
        { $set: data },
        { new: true }
      ).select('-passwordHash');

      if (!updated) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      await AuditLog.create({
        orgId: authReq.orgId,
        userId: authReq.userId,
        action: 'USER_UPDATED',
        entityType: 'User',
        entityId: updated._id,
        before,
        after: { name: updated.name, role: updated.role, isActive: updated.isActive },
      });

      res.json(updated);
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
 * DELETE /users/:id - Deactivate a user (OWNER only)
 */
router.delete(
  '/:id',
  requireAuth,
  requireRole(Role.OWNER),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const authReq = req as AuthRequest;

      const user = await User.findOneAndUpdate(
        { _id: req.params.id, orgId: authReq.orgId },
        { $set: { isActive: false } },
        { new: true }
      ).select('-passwordHash');

      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      await AuditLog.create({
        orgId: authReq.orgId,
        userId: authReq.userId,
        action: 'USER_DEACTIVATED',
        entityType: 'User',
        entityId: user._id,
        before: { isActive: true },
        after: { isActive: false },
      });

      res.json({ message: 'User deactivated successfully', user });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

export default router;
