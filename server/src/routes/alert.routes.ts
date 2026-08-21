import { Router, Request, Response } from 'express';
import { Types } from 'mongoose';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { Alert, AlertStatus } from '../models/Alert';

const router = Router();

/**
 * GET /alerts - List alerts
 */
router.get('/', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    const { status, type, severity } = req.query;

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

    const alerts = await Alert.find(filter)
      .sort({ createdAt: -1 })
      .populate('acknowledgedBy', 'name email')
      .limit(100);

    res.json(alerts);
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

    res.json(alert);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
