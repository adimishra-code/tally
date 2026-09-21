import http from 'http';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { connectDB } from './config/db';
import { initSocket } from './utils/socket';
import authRoutes from './routes/auth.routes';
import testRoutes from './routes/test.routes';
import productRoutes from './routes/product.routes';
import stockRoutes from './routes/stock.routes';
import purchaseOrderRoutes from './routes/purchaseOrder.routes';
import receivingRoutes from './routes/receiving.routes';
import salesOrderRoutes from './routes/salesOrder.routes';
import alertRoutes from './routes/alert.routes';
import auditRoutes from './routes/audit.routes';
import warehouseRoutes from './routes/warehouse.routes';
import userRoutes from './routes/user.routes';
import binRoutes from './routes/bin.routes';
import organizationRoutes from './routes/organization.routes';
import dashboardRoutes from './routes/dashboard.routes';

import rateLimit from 'express-rate-limit';
import crypto from 'crypto';

dotenv.config();

const app = express();
const httpServer = http.createServer(app);
const PORT = process.env.PORT || 4000;
const allowedOrigins = (process.env.CLIENT_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim());

// Security middleware
app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (
        allowedOrigins.includes(origin) ||
        allowedOrigins.includes('*') ||
        origin.endsWith('.vercel.app')
      ) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    credentials: true,
  })
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request tracing and duration logger
app.use((req, res, next) => {
  const reqId = (req.headers['x-request-id'] as string) || crypto.randomUUID();
  res.setHeader('X-Request-Id', reqId);
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    if (process.env.NODE_ENV !== 'test' && !req.path.startsWith('/health')) {
      const statusColor = res.statusCode >= 400 ? '⚠️' : '✓';
      console.log(`${statusColor} [${req.method}] ${req.path} ${res.statusCode} - ${duration}ms (id: ${reqId.substring(0, 8)})`);
    }
  });

  next();
});

// Global API rate limiter (protects server resources, skips health)
const globalApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 600,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === '/health',
  message: { error: 'Too many requests, please try again later' },
});
app.use('/api', globalApiLimiter);

// Enhanced operational health check
app.get('/health', async (_req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  const mem = process.memoryUsage();

  const isHealthy = dbStatus === 'connected';
  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'healthy' : 'degraded',
    service: 'tally-warehouse-api',
    uptimeSeconds: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
    database: {
      status: dbStatus,
      name: mongoose.connection.name || 'unknown',
    },
    system: {
      memoryRssMb: Math.round(mem.rss / 1024 / 1024),
      memoryHeapUsedMb: Math.round(mem.heapUsed / 1024 / 1024),
      nodeVersion: process.version,
    },
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/test', testRoutes);
app.use('/api/products', productRoutes);
app.use('/api/stock', stockRoutes);
app.use('/api/purchase-orders', purchaseOrderRoutes);
app.use('/api/receiving', receivingRoutes);
app.use('/api/sales-orders', salesOrderRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/warehouses', warehouseRoutes);
app.use('/api/users', userRoutes);
app.use('/api/bins', binRoutes);
app.use('/api/organization', organizationRoutes);
app.use('/api/dashboard', dashboardRoutes);

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

    // Initialize Socket.IO
    initSocket(httpServer);

    // Start background jobs
    const { startAllJobs } = await import('./jobs');
    await startAllJobs();

    httpServer.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    });

    const shutdown = async (signal: string) => {
      console.log(`\nReceived ${signal}. Gracefully shutting down...`);
      httpServer.close(async () => {
        try {
          await mongoose.disconnect();
          console.log('MongoDB disconnected.');
          process.exit(0);
        } catch (err) {
          console.error('Error during shutdown:', err);
          process.exit(1);
        }
      });

      setTimeout(() => {
        console.error('Forced shutdown after timeout.');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

start();
