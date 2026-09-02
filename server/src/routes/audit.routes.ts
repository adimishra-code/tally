import { Router, Request, Response } from 'express';
import { Types } from 'mongoose';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { AuditLog } from '../models/AuditLog';

const router = Router();

/**
 * GET /audit/export/csv - Export audit logs to CSV
 */
router.get('/export/csv', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    const { action, entityType, startDate, endDate } = req.query;

    const filter: any = { orgId: authReq.orgId };

    if (action && typeof action === 'string') {
      filter.action = action;
    }
    if (entityType && typeof entityType === 'string') {
      filter.entityType = entityType;
    }
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate && typeof startDate === 'string') {
        filter.createdAt.$gte = new Date(startDate);
      }
      if (endDate && typeof endDate === 'string') {
        filter.createdAt.$lte = new Date(endDate);
      }
    }

    const logs = await AuditLog.find(filter)
      .sort({ createdAt: -1 })
      .limit(1000)
      .populate('userId', 'name email');

    const headers = ['Timestamp', 'Action', 'Entity Type', 'Entity ID', 'User Name', 'User Email', 'Before', 'After'];
    const rows = logs.map((log) => [
      `"${new Date(log.createdAt).toISOString()}"`,
      `"${log.action}"`,
      `"${log.entityType}"`,
      `"${log.entityId}"`,
      `"${(log.userId as any)?.name || 'System'}"`,
      `"${(log.userId as any)?.email || ''}"`,
      `"${JSON.stringify(log.before || {}).replace(/"/g, '""')}"`,
      `"${JSON.stringify(log.after || {}).replace(/"/g, '""')}"`,
    ]);

    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="audit_log_export.csv"');
    res.send(csv);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /audit - List audit logs with pagination & multi-filter support
 */
router.get('/', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    const {
      entityType,
      entityId,
      action,
      userId,
      startDate,
      endDate,
      page = '1',
      limit = '50',
    } = req.query;

    const filter: any = { orgId: authReq.orgId };

    if (entityType && typeof entityType === 'string') {
      filter.entityType = entityType;
    }

    if (entityId && typeof entityId === 'string' && Types.ObjectId.isValid(entityId)) {
      filter.entityId = new Types.ObjectId(entityId);
    }

    if (action && typeof action === 'string') {
      filter.action = action;
    }

    if (userId && typeof userId === 'string' && Types.ObjectId.isValid(userId)) {
      filter.userId = new Types.ObjectId(userId);
    }

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate && typeof startDate === 'string') {
        filter.createdAt.$gte = new Date(startDate);
      }
      if (endDate && typeof endDate === 'string') {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }

    const pageNum = parseInt(page as string) || 1;
    const limitNum = parseInt(limit as string) || 50;
    const skip = (pageNum - 1) * limitNum;

    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate('userId', 'name email role'),
      AuditLog.countDocuments(filter),
    ]);

    res.json({
      logs,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
