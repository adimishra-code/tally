import { startLowStockWorker, scheduleLowStockCheck } from './lowStockJob';
import { startExpiryCheckWorker, scheduleExpiryCheck } from './expiryCheckJob';
import { startSlaCheckWorker, scheduleSlaCheck } from './slaCheckJob';

export const startAllJobs = async () => {
  console.log('🚀 Starting background jobs...');

  // Start workers
  startLowStockWorker();
  startExpiryCheckWorker();
  startSlaCheckWorker();

  // Schedule recurring jobs
  await scheduleLowStockCheck();
  await scheduleExpiryCheck();
  await scheduleSlaCheck();

  console.log('✅ All background jobs started');
};
