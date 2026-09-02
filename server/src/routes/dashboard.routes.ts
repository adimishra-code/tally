import { Router, Request, Response } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { Product } from '../models/Product';
import { Warehouse } from '../models/Warehouse';
import { PurchaseOrder } from '../models/PurchaseOrder';
import { SalesOrder } from '../models/SalesOrder';
import { Alert, AlertStatus } from '../models/Alert';
import { AuditLog } from '../models/AuditLog';

const router = Router();

/**
 * GET /dashboard/summary - Consolidated operational metrics for real-time dashboard
 */
router.get('/summary', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    const orgId = authReq.orgId;

    const [
      totalProducts,
      totalWarehouses,
      purchaseOrders,
      salesOrders,
      activeAlerts,
      recentActivity,
    ] = await Promise.all([
      Product.countDocuments({ orgId, isActive: true }),
      Warehouse.countDocuments({ orgId, isActive: true }),
      PurchaseOrder.find({ orgId }).select('status poNumber supplierName createdAt lines'),
      SalesOrder.find({ orgId }).select('status orderNumber customerName createdAt lines'),
      Alert.find({ orgId, status: AlertStatus.ACTIVE }).sort({ createdAt: -1 }).limit(10),
      AuditLog.find({ orgId })
        .sort({ createdAt: -1 })
        .limit(8)
        .populate('userId', 'name email role'),
    ]);

    // Aggregate PO statuses
    const poStatusCounts: Record<string, number> = {};
    let pendingApprovals = 0;
    let openPOs = 0;

    purchaseOrders.forEach((po) => {
      poStatusCounts[po.status] = (poStatusCounts[po.status] || 0) + 1;
      if (po.status === 'PENDING_APPROVAL') pendingApprovals++;
      if (['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'SENT', 'PARTIALLY_RECEIVED'].includes(po.status)) {
        openPOs++;
      }
    });

    // Aggregate SO statuses
    const soStatusCounts: Record<string, number> = {};
    let openSOs = 0;
    let readyToPick = 0;
    let readyToShip = 0;

    salesOrders.forEach((so) => {
      soStatusCounts[so.status] = (soStatusCounts[so.status] || 0) + 1;
      if (so.status === 'CONFIRMED') readyToPick++;
      if (['PICKING', 'PACKED', 'PARTIALLY_SHIPPED'].includes(so.status)) readyToShip++;
      if (['CONFIRMED', 'PICKING', 'PACKED', 'PARTIALLY_SHIPPED'].includes(so.status)) {
        openSOs++;
      }
    });

    res.json({
      totalProducts,
      totalWarehouses,
      openPOs,
      pendingApprovals,
      openSOs,
      readyToPick,
      readyToShip,
      activeAlertsCount: activeAlerts.length,
      activeAlerts,
      poStatusCounts,
      soStatusCounts,
      recentActivity,
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
