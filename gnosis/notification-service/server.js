require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { createClient } = require('redis');
const { createMetrics } = require('../common/metrics');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { 
  cors: { origin: '*', methods: ['GET','POST'] } 
});

const PORT = process.env.PORT || 3006;
const REDIS_HOST = process.env.REDIS_HOST || 'redis';
const REDIS_PORT = Number(process.env.REDIS_PORT || 6379);
const REDIS_URL = process.env.REDIS_URL || `redis://${REDIS_HOST}:${REDIS_PORT}`;
const { metricsMiddleware, metricsHandler } = createMetrics('notification_service');

app.use(cors());
app.use(express.json());
app.use(metricsMiddleware);

// Request logger
app.use((req, res, next) => {
  console.log(`[Notification API] ${req.method} ${req.url}`);
  next();
});

app.get('/health', (req, res) => {
  res.json({ status: "ok", service: "notification-service" });
});

app.get('/metrics', metricsHandler);

console.log({
  REDIS_HOST: process.env.REDIS_HOST,
  REDIS_PORT: process.env.REDIS_PORT,
  REDIS_URL: process.env.REDIS_URL,
});
console.log(`[notification-service] Redis host: ${REDIS_HOST}`);
console.log(`[notification-service] Redis port: ${REDIS_PORT}`);
console.log(`[notification-service] Redis URL: ${REDIS_URL}`);

const redisClient = createClient({
  url: REDIS_URL,
  socket: {
    host: REDIS_HOST,
    port: REDIS_PORT,
    reconnectStrategy: (retries) => {
      const delay = Math.min(retries * 100, 3000);
      console.log(`[notification-service] Redis reconnect attempt ${retries} in ${delay}ms`);
      return delay;
    }
  }
});

redisClient.on('error', (err) => {
  console.error('[notification-service] Redis connection error:', err);
});

redisClient.on('reconnecting', () => {
  console.log('[notification-service] Redis reconnecting');
});

const startServer = async () => {
  try {
    await redisClient.connect();
    console.log('[notification-service] Connected to Redis');

    // Load Socket handlers
    require('./socket/handlers')(io, redisClient);

    // Load REST routes
    const notificationRoutes = require('./routes/notifications')(redisClient);
    app.use('/notifications', notificationRoutes);

    server.listen(PORT, () => {
      console.log(`Notification service running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    setTimeout(startServer, 2000);
  }
};

startServer();
