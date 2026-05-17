const Redis = require('ioredis');

let redis;

const createInMemoryStore = () => {
  console.warn('⚠️  Redis not available — using in-memory fallback (OTP still works within session)');
  const store = new Map();
  const timers = new Map();

  return {
    set: async (key, value, exFlag, ttl) => {
      store.set(key, value);
      if (exFlag === 'EX' && ttl) {
        const timer = setTimeout(() => { store.delete(key); timers.delete(key); }, ttl * 1000);
        const existing = timers.get(key);
        if (existing) clearTimeout(existing);
        timers.set(key, timer);
      }
      return 'OK';
    },
    get: async (key) => store.get(key) || null,
    del: async (key) => { store.delete(key); return 1; },
    on:  () => {},
  };
};

try {
  redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    lazyConnect: true,
    connectTimeout: 3000,
    retryStrategy: (times) => {
      if (times > 2) return null;
      return Math.min(times * 200, 1000);
    },
    maxRetriesPerRequest: 1,
  });

  redis.on('connect', () => console.log('✓ Redis connected'));
  redis.on('error', (err) => {
    console.warn(`⚠️  Redis: ${err.message} — falling back to in-memory store`);
    if (redis && redis._events) {
      Object.assign(redis, createInMemoryStore());
    }
  });

  redis.connect().catch(() => {
    Object.assign(redis, createInMemoryStore());
  });

} catch {
  redis = createInMemoryStore();
}

module.exports = redis;
