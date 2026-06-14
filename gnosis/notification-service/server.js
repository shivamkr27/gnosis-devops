require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { createClient } = require('redis');
const { createMetrics } = require('../common/metrics');

const app = express();
const server = http.createServer(app);

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : ['http://localhost:5173', 'http://localhost:3000'];

const io = new Server(server, {
  cors: { origin: allowedOrigins, methods: ['GET','POST'] }
});

const PORT = process.env.PORT || 3006;
const REDIS_URL = process.env.REDIS_URL || 'redis://redis:6379';
const { metricsMiddleware, metricsHandler } = createMetrics('notification_service');

app.use(cors({ origin: allowedOrigins }));
app.use(express.json());
app.use(metricsMiddleware);

app.get('/health', (req, res) => {
  res.json({ status: "ok", service: "notification-service" });
});

app.get('/metrics', metricsHandler);

console.log(`[notification-service] Redis URL: ${REDIS_URL}`);

const redisClient = createClient({
  url: REDIS_URL,
  socket: {
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
