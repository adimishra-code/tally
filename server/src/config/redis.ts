import Redis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// Connection for BullMQ
export const connection = new Redis(REDIS_URL, {
  maxRetriesPerRequest: null,
  retryStrategy: (times) => Math.min(times * 100, 3000),
  lazyConnect: true,
});

// Connection for general caching/rate limiting
export const redis = new Redis(REDIS_URL, {
  retryStrategy: (times) => Math.min(times * 100, 3000),
  lazyConnect: true,
});

connection.on('connect', () => {
  console.log('✅ Redis connected (BullMQ)');
});

connection.on('error', (err) => {
  console.warn('⚠️ BullMQ Redis connection warning:', err.message);
});

redis.on('connect', () => {
  console.log('✅ Redis connected (Cache/Limiter)');
});

redis.on('error', (err) => {
  console.warn('⚠️ General Redis connection warning:', err.message);
});
