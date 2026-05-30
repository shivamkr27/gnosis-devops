require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('redis');
const setupCron = require('./cron/weeklyReset');

const app = express();
const PORT = process.env.PORT || 3004;
const REDIS_HOST = process.env.REDIS_HOST || 'redis';
const REDIS_PORT = Number(process.env.REDIS_PORT || 6379);
const REDIS_URL = process.env.REDIS_URL || `redis://${REDIS_HOST}:${REDIS_PORT}`;

app.use(cors());
app.use(express.json());

// Health endpoint
app.get('/health', (req, res) => {
  res.json({ status: "ok", service: "xp-service" });
});

// Setup Redis
console.log({
  REDIS_HOST: process.env.REDIS_HOST,
  REDIS_PORT: process.env.REDIS_PORT,
  REDIS_URL: process.env.REDIS_URL,
});
console.log(`[xp-service] Redis host: ${REDIS_HOST}`);
console.log(`[xp-service] Redis port: ${REDIS_PORT}`);
console.log(`[xp-service] Redis URL: ${REDIS_URL}`);

const redisClient = createClient({
  url: REDIS_URL,
  socket: {
    host: REDIS_HOST,
    port: REDIS_PORT,
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
