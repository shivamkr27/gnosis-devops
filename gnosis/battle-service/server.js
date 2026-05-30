require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { createClient } = require('redis');
const setupSocketHandlers = require('./socket/handlers');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { 
  cors: { origin: '*', methods: ['GET','POST'] } 
});

const PORT = process.env.PORT || 3005;
const REDIS_HOST = process.env.REDIS_HOST || 'redis';
const REDIS_PORT = Number(process.env.REDIS_PORT || 6379);
const REDIS_URL = process.env.REDIS_URL || `redis://${REDIS_HOST}:${REDIS_PORT}`;

app.use(cors());
app.use(express.json());

// Setup Redis
console.log({
  REDIS_HOST: process.env.REDIS_HOST,
  REDIS_PORT: process.env.REDIS_PORT,
  REDIS_URL: process.env.REDIS_URL,
});
console.log(`[battle-service] Redis host: ${REDIS_HOST}`);
console.log(`[battle-service] Redis port: ${REDIS_PORT}`);
console.log(`[battle-service] Redis URL: ${REDIS_URL}`);

const redisClient = createClient({
  url: REDIS_URL,
  socket: {
    host: REDIS_HOST,
    port: REDIS_PORT,
    reconnectStrategy: (retries) => {
      const delay = Math.min(retries * 100, 3000);
      console.log(`[battle-service] Redis reconnect attempt ${retries} in ${delay}ms`);
      return delay;
    }
  }
});

redisClient.on('error', (err) => {
  console.error('[battle-service] Redis connection error', err);
});

redisClient.on('reconnecting', () => {
  console.log('[battle-service] Redis reconnecting');
});

const startServer = async () => {
  try {
    await redisClient.connect();
    console.log('[battle-service] Connected to Redis');
    
    // Setup Database logic checks by requiring the pool which connects automatically
    // The db/index.js will print 'Connected to PostgreSQL'
    require('./db/index');
    
    // Setup Socket IO handlers
    setupSocketHandlers(io, redisClient);

    // Load REST routes
    const battleRoutes = require('./routes/battle')(redisClient);
    
    // We attach routes at root for health, or /battle for specific. The prompt specifies GET /battle/history and GET /health
    app.use('/battle', battleRoutes);
    // Add health route to root as well just in case
    app.get('/health', (req, res) => {
      res.json({ status: "ok", service: "battle-service" });
    });

    server.listen(PORT, () => {
      console.log(`Battle service running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    setTimeout(startServer, 2000);
  }
};

startServer();
