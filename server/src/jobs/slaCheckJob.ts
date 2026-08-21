import { Queue, Worker } from 'bullmq';
import { connection } from '../config/redis';
import { SalesOrder } from '../models/SalesOrder';
import { SalesOrderStatus } from '../types/enums';
import { Alert, AlertType, AlertStatus } from '../models/Alert';

export const slaCheckQueue = new Queue('sla-check', { connection });

const SLA_HOURS = 48; // Alert if order not shipped within 48 hours of confirmation

export const startSlaCheckWorker = () => {
  const worker = new Worker(
    'sla-check',
    async (job) => {
      console.log(`[SlaCheckWorker] Processing job ${job.id}`);

      const slaThreshold = new Date();
      slaThreshold.setHours(slaThreshold.getHours() - SLA_HOURS);

      // Find confirmed orders older than SLA threshold that aren't shipped yet
      const breachedOrders = await SalesOrder.find({
        status: { $in: [SalesOrderStatus.CONFIRMED, SalesOrderStatus.PICKING, SalesOrderStatus.PACKED] },
        createdAt: { $lt: slaThreshold },
      }).populate('warehouseId', 'name');

      let alertsCreated = 0;

      for (const order of breachedOrders) {
        // Check if an active alert already exists for this order
        const existingAlert = await Alert.findOne({
          orgId: order.orgId,
          type: AlertType.SLA_BREACH,
          status: AlertStatus.ACTIVE,
          'metadata.orderId': order._id.toString(),
        });

        if (!existingAlert) {
          const hoursOverdue = Math.floor((Date.now() - order.createdAt.getTime()) / (1000 * 60 * 60)) - SLA_HOURS;

          await Alert.create({
            orgId: order.orgId,
            type: AlertType.SLA_BREACH,
            severity: hoursOverdue >= 24 ? 'high' : 'medium',
            message: `SLA breach: Order ${order.orderNumber} for ${order.customerName} is ${hoursOverdue}h overdue (Status: ${order.status})`,
            metadata: {
              orderId: order._id.toString(),
              orderNumber: order.orderNumber,
              customerName: order.customerName,
              status: order.status,
              warehouseId: order.warehouseId.toString(),
              warehouseName: (order.warehouseId as any).name,
              createdAt: order.createdAt.toISOString(),
              hoursOverdue,
              slaHours: SLA_HOURS,
            },
          });
          alertsCreated++;
        }
      }

      console.log(`[SlaCheckWorker] Created ${alertsCreated} alerts`);
    },
    { connection }
  );

  worker.on('completed', (job) => {
    console.log(`[SlaCheckWorker] Job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    console.error(`[SlaCheckWorker] Job ${job?.id} failed:`, err);
  });

  return worker;
};

// Schedule to run every hour
export const scheduleSlaCheck = async () => {
  await slaCheckQueue.add(
    'check',
    {},
    {
      repeat: {
        pattern: '0 * * * *', // Every hour
      },
    }
  );
  console.log('✅ SLA breach check scheduled (every hour)');
};
