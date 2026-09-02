import { Queue, Worker } from 'bullmq';
import { connection } from '../config/redis';
import { StockLedgerEntry } from '../models/StockLedgerEntry';
import { Alert, AlertType, AlertStatus } from '../models/Alert';
import { broadcastAlert } from '../utils/socket';

export const expiryCheckQueue = new Queue('expiry-check', { connection });

const EXPIRY_WARNING_DAYS = 30; // Alert if expiring within 30 days

export const startExpiryCheckWorker = () => {
  const worker = new Worker(
    'expiry-check',
    async (job) => {
      console.log(`[ExpiryCheckWorker] Processing job ${job.id}`);

      const warningDate = new Date();
      warningDate.setDate(warningDate.getDate() + EXPIRY_WARNING_DAYS);

      // Find all ledger entries with expiry dates within warning window
      const expiringEntries = await StockLedgerEntry.find({
        expiryDate: { $lte: warningDate, $gt: new Date() },
        quantityChange: { $gt: 0 }, // Only inbound entries have meaningful expiry
      })
        .populate('productId', 'sku name')
        .populate('warehouseId', 'name');

      let alertsCreated = 0;

      for (const entry of expiringEntries) {
        // Check if an active alert already exists for this batch
        const existingAlert = await Alert.findOne({
          orgId: entry.orgId,
          type: AlertType.EXPIRY_WARNING,
          status: AlertStatus.ACTIVE,
          'metadata.batchNumber': entry.batchNumber,
        });

        if (!existingAlert && entry.expiryDate) {
          const daysUntilExpiry = Math.ceil(
            (entry.expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
          );

          const alert = await Alert.create({
            orgId: entry.orgId,
            type: AlertType.EXPIRY_WARNING,
            severity: daysUntilExpiry <= 7 ? 'high' : daysUntilExpiry <= 14 ? 'medium' : 'low',
            message: `Product expiring soon: ${(entry.productId as any).name} (Batch: ${entry.batchNumber}) at ${(entry.warehouseId as any).name}. Expires in ${daysUntilExpiry} days`,
            metadata: {
              productId: entry.productId.toString(),
              productSku: (entry.productId as any).sku,
              productName: (entry.productId as any).name,
              warehouseId: entry.warehouseId.toString(),
              warehouseName: (entry.warehouseId as any).name,
              batchNumber: entry.batchNumber,
              expiryDate: entry.expiryDate.toISOString(),
              daysUntilExpiry,
            },
          });
          broadcastAlert(entry.orgId.toString(), alert);
          alertsCreated++;
        }
      }

      console.log(`[ExpiryCheckWorker] Created ${alertsCreated} alerts`);
    },
    { connection }
  );

  worker.on('completed', (job) => {
    console.log(`[ExpiryCheckWorker] Job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    console.error(`[ExpiryCheckWorker] Job ${job?.id} failed:`, err);
  });

  return worker;
};

// Schedule to run daily at 9 AM
export const scheduleExpiryCheck = async () => {
  await expiryCheckQueue.add(
    'check',
    {},
    {
      repeat: {
        pattern: '0 9 * * *', // Daily at 9 AM
      },
    }
  );
  console.log('✅ Expiry check scheduled (daily at 9 AM)');
};
