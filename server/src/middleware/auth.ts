import { Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import { verifyAccessToken } from '../utils/jwt';
import { Role } from '../types/enums';

export interface AuthRequest extends Request {
  userId: Types.ObjectId;
  orgId: Types.ObjectId;
  userRole: Role;
}

/**
 * Validates JWT access token and injects userId, orgId, userRole into req.
 * All authenticated routes must use this middleware.
 */
export const requireAuth = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'No token provided' });
      return;
    }

    const token = authHeader.substring(7);
    const payload = verifyAccessToken(token);

    (req as AuthRequest).userId = new Types.ObjectId(payload.userId);
    (req as AuthRequest).orgId = new Types.ObjectId(payload.orgId);
    (req as AuthRequest).userRole = payload.role as Role;

    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }
};

/**
 * RBAC middleware: only allows specified roles to proceed.
 * Must be used AFTER requireAuth.
 */
export const requireRole = (...allowedRoles: Role[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const authReq = req as AuthRequest;

    if (!authReq.userRole) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (!allowedRoles.includes(authReq.userRole)) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    next();
  };
};
