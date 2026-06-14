require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('redis');
const { createMetrics } = require('../common/metrics');
const setupCron = require('./cron/weeklyReset');

const app = express();
const PORT = process.env.PORT || 3004;
// Use REDIS_URL directly — K8s injects REDIS_PORT=tcp://IP:PORT (service discovery)
// which breaks Number() parsing. REDIS_URL from gnosis-secrets is authoritative.
const REDIS_URL = process.env.REDIS_URL || 'redis://redis:6379';
const { metricsMiddleware, metricsHandler } = createMetrics('xp_service');

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : ['http://localhost:5173', 'http://localhost:3000'];
app.use(cors({ origin: allowedOrigins }));
app.use(express.json());
app.use(metricsMiddleware);

app.get('/health', (req, res) => {
  res.json({ status: "ok", service: "xp-service" });
});

app.get('/metrics', metricsHandler);

console.log(`[xp-service] Redis URL: ${REDIS_URL}`);

const redisClient = createClient({
  url: REDIS_URL,
  socket: {
    reconnectStrategy: (retries) => {
      const delay = Math.min(retries * 100, 3000);
      console.log(`[xp-service] Redis reconnect attempt ${retries} in ${delay}ms`);
      return delay;
    }
  }
});

redisClient.on('error', (err) => {
  console.error('[xp-service] Redis connection error', err);
});

redisClient.on('reconnecting', () => {
  console.log('[xp-service] Redis reconnecting');
});

const startServer = async () => {
  try {
    await redisClient.connect();
    console.log('[xp-service] Connected to Redis');
    
    // Load routes
    const xpRoutes = require('./routes/xp')(redisClient);
    app.use('/xp', xpRoutes);

    // Load cron
    setupCron(redisClient);

    app.listen(PORT, () => {
      console.log(`XP service running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    setTimeout(startServer, 2000);
  }
};

startServer();
