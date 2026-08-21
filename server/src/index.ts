import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { connectDB } from './config/db';
import authRoutes from './routes/auth.routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

// Security middleware
app.use(helmet());
app.use(cors({ origin: CLIENT_ORIGIN, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRoutes);
import testRoutes from './routes/test.routes';
app.use('/api/test', testRoutes);
import productRoutes from './routes/product.routes';
app.use('/api/products', productRoutes);
import stockRoutes from './routes/stock.routes';
app.use('/api/stock', stockRoutes);
import purchaseOrderRoutes from './routes/purchaseOrder.routes';
app.use('/api/purchase-orders', purchaseOrderRoutes);
import receivingRoutes from './routes/receiving.routes';
app.use('/api/receiving', receivingRoutes);
import salesOrderRoutes from './routes/salesOrder.routes';
app.use('/api/sales-orders', salesOrderRoutes);
import alertRoutes from './routes/alert.routes';
app.use('/api/alerts', alertRoutes);

// Error handling middleware
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  });
});

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

const start = async () => {
  try {
    await connectDB();

    // Start background jobs
    const { startAllJobs } = await import('./jobs');
    await startAllJobs();

    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

start();
