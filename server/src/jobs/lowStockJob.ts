import { Queue, Worker } from 'bullmq';
import { connection } from '../config/redis';
import { Product } from '../models/Product';
import { Warehouse } from '../models/Warehouse';
import { StockLedgerService } from '../services/StockLedgerService';
import { Alert, AlertType, AlertStatus } from '../models/Alert';
import { broadcastAlert } from '../utils/socket';

export const lowStockQueue = new Queue('low-stock-check', { connection });

interface LowStockJobData {
  orgId: string;
}

export const startLowStockWorker = () => {
  const worker = new Worker<LowStockJobData>(
    'low-stock-check',
    async (job) => {
      console.log(`[LowStockWorker] Processing job ${job.id}`);

      const products = await Product.find({ isActive: true });
      const warehouses = await Warehouse.find({ isActive: true });

      let alertsCreated = 0;

      for (const product of products) {
        for (const warehouse of warehouses) {
          if (!product.orgId.equals(warehouse.orgId)) continue;

          const balance = await StockLedgerService.getBalance(product.orgId, product._id, warehouse._id);

          if (balance <= product.reorderPoint) {
            // Check if an active alert already exists
            const existingAlert = await Alert.findOne({
              orgId: product.orgId,
              type: AlertType.LOW_STOCK,
              status: AlertStatus.ACTIVE,
              'metadata.productId': product._id.toString(),
              'metadata.warehouseId': warehouse._id.toString(),
            });

            if (!existingAlert) {
              const alert = await Alert.create({
                orgId: product.orgId,
                type: AlertType.LOW_STOCK,
                severity: balance === 0 ? 'high' : 'medium',
                message: `Low stock alert: ${product.name} (${product.sku}) at ${warehouse.name}. Current: ${balance}, Reorder point: ${product.reorderPoint}`,
                metadata: {
                  productId: product._id.toString(),
                  productSku: product.sku,
                  productName: product.name,
                  warehouseId: warehouse._id.toString(),
                  warehouseName: warehouse.name,
                  currentBalance: balance,
                  reorderPoint: product.reorderPoint,
                  reorderQty: product.reorderQty,
                },
              });
              broadcastAlert(product.orgId.toString(), alert);
              alertsCreated++;
            }
          }
        }
      }

      console.log(`[LowStockWorker] Created ${alertsCreated} alerts`);
    },
    { connection }
  );

  worker.on('completed', (job) => {
    console.log(`[LowStockWorker] Job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    console.error(`[LowStockWorker] Job ${job?.id} failed:`, err);
  });

  return worker;
};

// Schedule the job to run every 30 minutes
export const scheduleLowStockCheck = async () => {
  await lowStockQueue.add(
    'check',
    {},
    {
      repeat: {
        pattern: '*/30 * * * *', // Every 30 minutes
      },
    }
  );
  console.log('✅ Low stock check scheduled (every 30 minutes)');
};
