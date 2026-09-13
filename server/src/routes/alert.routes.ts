import { Router, Request, Response } from 'express';
import { Types } from 'mongoose';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { Alert, AlertStatus } from '../models/Alert';
import { broadcastAlert } from '../utils/socket';

const router = Router();

/**
 * GET /alerts - List alerts
 */
router.get('/', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    const { status, type, severity, search } = req.query;

    const filter: any = { orgId: authReq.orgId };

    if (status && typeof status === 'string') {
      filter.status = status;
    }

    if (type && typeof type === 'string') {
      filter.type = type;
    }

    if (severity && typeof severity === 'string') {
      filter.severity = severity;
    }

    if (search && typeof search === 'string' && search.trim()) {
      const term = search.trim();
      filter.$or = [
        { message: { $regex: term, $options: 'i' } },
        { 'metadata.productName': { $regex: term, $options: 'i' } },
        { 'metadata.productSku': { $regex: term, $options: 'i' } },
        { 'metadata.warehouseName': { $regex: term, $options: 'i' } },
        { 'metadata.orderNumber': { $regex: term, $options: 'i' } },
      ];
    }

    const alerts = await Alert.find(filter)
      .sort({ createdAt: -1 })
      .populate('acknowledgedBy', 'name email')
      .limit(150);

    res.json(alerts);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /alerts/export/csv - Export alerts as CSV
 */
router.get('/export/csv', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    const { status, type, severity, search } = req.query;

    const filter: any = { orgId: authReq.orgId };

    if (status && typeof status === 'string' && status !== 'ALL') {
      filter.status = status;
    }

    if (type && typeof type === 'string' && type !== 'ALL') {
      filter.type = type;
    }

    if (severity && typeof severity === 'string' && severity !== 'ALL') {
      filter.severity = severity;
    }

    if (search && typeof search === 'string' && search.trim()) {
      const term = search.trim();
      filter.$or = [
        { message: { $regex: term, $options: 'i' } },
        { 'metadata.productName': { $regex: term, $options: 'i' } },
        { 'metadata.productSku': { $regex: term, $options: 'i' } },
        { 'metadata.warehouseName': { $regex: term, $options: 'i' } },
        { 'metadata.orderNumber': { $regex: term, $options: 'i' } },
      ];
    }

    const alerts = await Alert.find(filter).sort({ createdAt: -1 });

    const headers = ['Type', 'Severity', 'Status', 'Message', 'Warehouse', 'Created At'];
    const rows = alerts.map((a: any) => [
      `"${a.type || ''}"`,
      `"${a.severity || ''}"`,
      `"${a.status || ''}"`,
      `"${(a.message || '').replace(/"/g, '""')}"`,
      `"${(a.metadata?.warehouseName || '').replace(/"/g, '""')}"`,
      `"${a.createdAt ? new Date(a.createdAt).toISOString() : ''}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="alerts_export.csv"');
    res.send(csvContent);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /alerts/acknowledge-all - Acknowledge all active alerts
 */
router.post('/acknowledge-all', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as AuthRequest;

    const result = await Alert.updateMany(
      { orgId: authReq.orgId, status: AlertStatus.ACTIVE },
      {
        $set: {
          status: AlertStatus.ACKNOWLEDGED,
          acknowledgedAt: new Date(),
          acknowledgedBy: authReq.userId,
        },
      }
    );

    res.json({ message: 'All active alerts acknowledged', modifiedCount: result.modifiedCount });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /alerts/resolve-all - Resolve all active and acknowledged alerts
 */
router.post('/resolve-all', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as AuthRequest;

    const result = await Alert.updateMany(
      { orgId: authReq.orgId, status: { $in: [AlertStatus.ACTIVE, AlertStatus.ACKNOWLEDGED] } },
      { $set: { status: AlertStatus.RESOLVED } }
    );

    res.json({ message: 'All alerts marked as resolved', modifiedCount: result.modifiedCount });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /alerts/:id/acknowledge - Acknowledge an alert
 */
router.post('/:id/acknowledge', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as AuthRequest;

    if (!Types.ObjectId.isValid(req.params.id)) {
      res.status(400).json({ error: 'Invalid alert ID' });
      return;
    }

    const alert = await Alert.findOneAndUpdate(
      { _id: req.params.id, orgId: authReq.orgId },
      {
        $set: {
          status: AlertStatus.ACKNOWLEDGED,
          acknowledgedAt: new Date(),
          acknowledgedBy: authReq.userId,
        },
      },
      { new: true }
    );

    if (!alert) {
      res.status(404).json({ error: 'Alert not found' });
      return;
    }

    broadcastAlert(authReq.orgId.toString(), alert);

    res.json(alert);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /alerts/:id/resolve - Resolve an alert
 */
router.post('/:id/resolve', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as AuthRequest;

    if (!Types.ObjectId.isValid(req.params.id)) {
      res.status(400).json({ error: 'Invalid alert ID' });
      return;
    }

    const alert = await Alert.findOneAndUpdate(
      { _id: req.params.id, orgId: authReq.orgId },
      { $set: { status: AlertStatus.RESOLVED } },
      { new: true }
    );

    if (!alert) {
      res.status(404).json({ error: 'Alert not found' });
      return;
    }

    broadcastAlert(authReq.orgId.toString(), alert);

    res.json(alert);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
