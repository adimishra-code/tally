import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { Types } from 'mongoose';
import mongoose from 'mongoose';
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth';
import { Role, SalesOrderStatus, LedgerEntryType } from '../types/enums';
import { SalesOrder } from '../models/SalesOrder';
import { SalesOrderService } from '../services/SalesOrderService';
import { StockLedgerService } from '../services/StockLedgerService';
import { Shipment } from '../models/Shipment';

const router = Router();

const createSOSchema = z.object({
  customerName: z.string().min(1).max(200),
  warehouseId: z.string().regex(/^[0-9a-fA-F]{24}$/),
  lines: z
    .array(
      z.object({
        productId: z.string().regex(/^[0-9a-fA-F]{24}$/),
        orderedQty: z.number().min(1),
      })
    )
    .min(1),
});

const transitionSchema = z.object({
  nextStatus: z.nativeEnum(SalesOrderStatus),
});

const pickSchema = z.object({
  orderId: z.string().regex(/^[0-9a-fA-F]{24}$/),
  lines: z
    .array(
      z.object({
        productId: z.string().regex(/^[0-9a-fA-F]{24}$/),
        pickedQty: z.number().min(1),
        warehouseId: z.string().regex(/^[0-9a-fA-F]{24}$/),
      })
    )
    .min(1),
});

const shipSchema = z.object({
  orderId: z.string().regex(/^[0-9a-fA-F]{24}$/),
  trackingNumber: z.string().optional(),
  carrier: z.string().optional(),
  lines: z
    .array(
      z.object({
        productId: z.string().regex(/^[0-9a-fA-F]{24}$/),
        shippedQty: z.number().min(1),
      })
    )
    .min(1),
});

/**
 * POST /sales-orders - Create a new sales order
 */
router.post(
  '/',
  requireAuth,
  requireRole(Role.OWNER, Role.ADMIN, Role.WAREHOUSE_STAFF),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const authReq = req as AuthRequest;
      const data = createSOSchema.parse(req.body);

      const so = await SalesOrderService.create({
        orgId: authReq.orgId,
        customerName: data.customerName,
        warehouseId: new Types.ObjectId(data.warehouseId),
        lines: data.lines.map((line) => ({
          productId: new Types.ObjectId(line.productId),
          orderedQty: line.orderedQty,
        })),
        createdBy: authReq.userId,
      });

      res.status(201).json(so);
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
 * GET /sales-orders/export/csv - Export sales orders as CSV
 */
router.get('/export/csv', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    const { status, warehouseId, search } = req.query;

    const filter: any = { orgId: authReq.orgId };

    if (status && typeof status === 'string') {
      filter.status = status;
    }

    if (warehouseId && typeof warehouseId === 'string' && Types.ObjectId.isValid(warehouseId)) {
      filter.warehouseId = new Types.ObjectId(warehouseId);
    }

    if (search && typeof search === 'string') {
      filter.$or = [
        { orderNumber: { $regex: search, $options: 'i' } },
        { customerName: { $regex: search, $options: 'i' } },
      ];
    }

    const sos = await SalesOrder.find(filter)
      .sort({ createdAt: -1 })
      .populate('warehouseId', 'name')
      .populate('createdBy', 'name email');

    const headers = [
      'Order Number',
      'Customer',
      'Warehouse',
      'Status',
      'Lines Count',
      'Total Items Ordered',
      'Total Items Picked',
      'Total Items Shipped',
      'Created By',
      'Created At',
    ];

    const rows = sos.map((so: any) => {
      const linesCount = so.lines?.length || 0;
      const totalOrdered = so.lines?.reduce((sum: number, l: any) => sum + (l.orderedQty || 0), 0) || 0;
      const totalPicked = so.lines?.reduce((sum: number, l: any) => sum + (l.pickedQty || 0), 0) || 0;
      const totalShipped = so.lines?.reduce((sum: number, l: any) => sum + (l.shippedQty || 0), 0) || 0;

      return [
        `"${so.orderNumber || ''}"`,
        `"${(so.customerName || '').replace(/"/g, '""')}"`,
        `"${so.warehouseId?.name || ''}"`,
        `"${so.status || ''}"`,
        linesCount,
        totalOrdered,
        totalPicked,
        totalShipped,
        `"${so.createdBy?.name || so.createdBy?.email || ''}"`,
        `"${new Date(so.createdAt).toISOString()}"`,
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=sales_orders_${new Date().toISOString().slice(0, 10)}.csv`
    );
    res.status(200).send(csvContent);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /sales-orders - List sales orders
 */
router.get('/', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    const { status, warehouseId, search } = req.query;

    const filter: any = { orgId: authReq.orgId };

    if (status && typeof status === 'string') {
      filter.status = status;
    }

    if (warehouseId && typeof warehouseId === 'string' && Types.ObjectId.isValid(warehouseId)) {
      filter.warehouseId = new Types.ObjectId(warehouseId);
    }

    if (search && typeof search === 'string') {
      filter.$or = [
        { orderNumber: { $regex: search, $options: 'i' } },
        { customerName: { $regex: search, $options: 'i' } },
      ];
    }

    const sos = await SalesOrder.find(filter)
      .sort({ createdAt: -1 })
      .populate('createdBy', 'name email')
      .populate('warehouseId', 'name')
      .populate('lines.productId', 'sku name unit');

    res.json(sos);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /sales-orders/:id - Get single sales order
 */
router.get('/:id', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as AuthRequest;

    if (!Types.ObjectId.isValid(req.params.id)) {
      res.status(400).json({ error: 'Invalid sales order ID' });
      return;
    }

    const so = await SalesOrder.findOne({
      _id: req.params.id,
      orgId: authReq.orgId,
    })
      .populate('createdBy', 'name email')
      .populate('warehouseId', 'name')
      .populate('lines.productId', 'sku name unit');

    if (!so) {
      res.status(404).json({ error: 'Sales order not found' });
      return;
    }

    res.json(so);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /sales-orders/:id/shipments - Get shipments for a sales order
 */
router.get('/:id/shipments', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as AuthRequest;

    if (!Types.ObjectId.isValid(req.params.id)) {
      res.status(400).json({ error: 'Invalid sales order ID' });
      return;
    }

    const shipments = await Shipment.find({
      salesOrderId: req.params.id,
      orgId: authReq.orgId,
    })
      .populate('shippedBy', 'name email')
      .populate('lines.productId', 'sku name unit')
      .sort({ createdAt: -1 });

    res.json(shipments);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /sales-orders/:id/transition - Transition sales order status
 */
router.post(
  '/:id/transition',
  requireAuth,
  requireRole(Role.OWNER, Role.ADMIN, Role.WAREHOUSE_STAFF),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const authReq = req as AuthRequest;
      const { nextStatus } = transitionSchema.parse(req.body);

      if (!Types.ObjectId.isValid(req.params.id)) {
        res.status(400).json({ error: 'Invalid sales order ID' });
        return;
      }

      const so = await SalesOrder.findOne({
        _id: req.params.id,
        orgId: authReq.orgId,
      });

      if (!so) {
        res.status(404).json({ error: 'Sales order not found' });
        return;
      }

      const updatedSO = await SalesOrderService.transition(so, nextStatus, authReq.userId);

      res.json(updatedSO);
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
 * POST /sales-orders/pick - Pick items for an order
 */
router.post(
  '/pick',
  requireAuth,
  requireRole(Role.OWNER, Role.ADMIN, Role.WAREHOUSE_STAFF),
  async (req: Request, res: Response): Promise<void> => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const authReq = req as AuthRequest;
      const data = pickSchema.parse(req.body);

      const orderId = new Types.ObjectId(data.orderId);
      const so = await SalesOrder.findOne({
        _id: orderId,
        orgId: authReq.orgId,
      }).session(session);

      if (!so) {
        await session.abortTransaction();
        res.status(404).json({ error: 'Sales order not found' });
        return;
      }

      if (so.status !== SalesOrderStatus.CONFIRMED) {
        await session.abortTransaction();
        res.status(400).json({ error: `Cannot pick order in ${so.status} status` });
        return;
      }

      // Process each line
      for (const line of data.lines) {
        const productId = new Types.ObjectId(line.productId);
        const warehouseId = new Types.ObjectId(line.warehouseId);

        // Check stock balance
        const balance = await StockLedgerService.getBalance(authReq.orgId, productId, warehouseId, session);

        if (balance < line.pickedQty) {
          await session.abortTransaction();
          res.status(400).json({
            error: `Insufficient stock for product ${line.productId}. Available: ${balance}, Requested: ${line.pickedQty}`,
          });
          return;
        }

        // Write negative ledger entry (outbound)
        await StockLedgerService.record(session, {
          orgId: authReq.orgId,
          productId,
          warehouseId,
          type: LedgerEntryType.ORDER_PICK,
          quantityChange: -line.pickedQty,
          referenceType: 'SalesOrder',
          referenceId: orderId,
          createdBy: authReq.userId,
        });

        // Update SO line picked quantity
        await SalesOrderService.updatePickedQty(session, orderId, productId, line.pickedQty);
      }

      // Transition to PICKING status
      await SalesOrder.updateOne({ _id: orderId }, { $set: { status: SalesOrderStatus.PICKING } }, { session });

      await session.commitTransaction();

      res.json({ message: 'Items picked successfully' });
    } catch (error) {
      await session.abortTransaction();

      if (error instanceof z.ZodError) {
        res.status(400).json({ error: 'Validation failed', details: error.errors });
        return;
      }
      if (error instanceof Error) {
        res.status(400).json({ error: error.message });
        return;
      }
      res.status(500).json({ error: 'Internal server error' });
    } finally {
      session.endSession();
    }
  }
);

/**
 * POST /sales-orders/ship - Ship an order
 */
router.post(
  '/ship',
  requireAuth,
  requireRole(Role.OWNER, Role.ADMIN, Role.WAREHOUSE_STAFF),
  async (req: Request, res: Response): Promise<void> => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const authReq = req as AuthRequest;
      const data = shipSchema.parse(req.body);

      const orderId = new Types.ObjectId(data.orderId);
      const so = await SalesOrder.findOne({
        _id: orderId,
        orgId: authReq.orgId,
      }).session(session);

      if (!so) {
        await session.abortTransaction();
        res.status(404).json({ error: 'Sales order not found' });
        return;
      }

      if (![SalesOrderStatus.PICKING, SalesOrderStatus.PACKED, SalesOrderStatus.PARTIALLY_SHIPPED].includes(so.status)) {
        await session.abortTransaction();
        res.status(400).json({ error: `Cannot ship order in ${so.status} status` });
        return;
      }

      // Create shipment
      const shipment = await Shipment.create(
        [
          {
            orgId: authReq.orgId,
            salesOrderId: orderId,
            trackingNumber: data.trackingNumber,
            carrier: data.carrier,
            lines: data.lines.map((line) => ({
              productId: new Types.ObjectId(line.productId),
              shippedQty: line.shippedQty,
            })),
            shippedBy: authReq.userId,
          },
        ],
        { session }
      );

      // Update SO line shipped quantities
      for (const line of data.lines) {
        const productId = new Types.ObjectId(line.productId);
        await SalesOrderService.updateShippedQty(session, orderId, productId, line.shippedQty);
      }

      await session.commitTransaction();

      res.json({ message: 'Order shipped successfully', shipment: shipment[0] });
    } catch (error) {
      await session.abortTransaction();

      if (error instanceof z.ZodError) {
        res.status(400).json({ error: 'Validation failed', details: error.errors });
        return;
      }
      if (error instanceof Error) {
        res.status(400).json({ error: error.message });
        return;
      }
      res.status(500).json({ error: 'Internal server error' });
    } finally {
      session.endSession();
    }
  }
);

export default router;
