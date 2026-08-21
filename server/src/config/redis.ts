import Redis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// Connection for BullMQ
export const connection = new Redis(REDIS_URL, {
  maxRetriesPerRequest: null,
});

// Connection for general caching/rate limiting
export const redis = new Redis(REDIS_URL);

connection.on('connect', () => {
  console.log('✅ Redis connected (BullMQ)');
});

connection.on('error', (err) => {
  console.error('Redis connection error:', err);
});
