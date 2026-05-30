require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const http = require('http');
const https = require('https');

const authenticateToken = require('./middleware/auth');
const answerTimingMiddleware = require('./middleware/timing');
const { createProxyMiddleware } = require('http-proxy-middleware');
const { createMetrics } = require('../common/metrics');

const app = express();
const server = http.createServer(app);
const { metricsMiddleware, metricsHandler } = createMetrics('api_gateway');

// Setup Socket.io Upgrade Proxy
const battleProxy = createProxyMiddleware({
  target: 'http://battle-service:3005',
  changeOrigin: true,
  ws: true,
  logLevel: 'debug',
  onError: (err, req, res) => {
    console.error(`[Proxy Error] Battle: ${err.message}`);
    if (res.writeHead && !res.headersSent) {
      res.writeHead(502);
    }
    res.end('Bad Gateway');
  }
});

const notificationProxy = createProxyMiddleware({
  target: 'http://notification-service:3006',
  changeOrigin: true,
  ws: true,
  logLevel: 'debug',
  pathRewrite: {
    '^/socket.io/notifications': '/socket.io'
  },
  onError: (err, req, res) => {
    console.error(`[Proxy Error] Notification: ${err.message}`);
    if (res.writeHead && !res.headersSent) {
      res.writeHead(502);
    }
    res.end('Bad Gateway');
  }
});

const PORT = process.env.PORT || 3000;

app.set('trust proxy', 1);
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: '*' }));
app.use(metricsMiddleware);

// Request logger
app.use((req, res, next) => {
  // console.log(`[API Gateway] ${req.method} ${req.url}`);
  next();
});

// WebSocket / Battle Proxy - WITHOUT path stripping
app.use((req, res, next) => {
  if (req.url.startsWith('/socket.io/notifications')) {
    return notificationProxy(req, res, next);
  } else if (req.url.startsWith('/socket.io')) {
    return battleProxy(req, res, next);
  }
  next();
});

app.use(express.json());

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 2000, // Increased from 100 to 2000 to prevent 429s during development/typical usage
  message: { error: "Too many requests" },
  skip: (req) => {
    // Don't rate limit auth routes - they need flexibility
    return req.path.startsWith('/auth') || req.path === '/metrics';
  }
});
app.use(generalLimiter);

// Health route - BEFORE auth middleware
app.get('/health', (req, res) => {
  res.json({ 
    status: "ok", 
    service: "api-gateway",
    services: {
      auth: process.env.AUTH_SERVICE,
      content: process.env.CONTENT_SERVICE,
      progress: process.env.PROGRESS_SERVICE,
      xp: process.env.XP_SERVICE,
      battle: process.env.BATTLE_SERVICE,
      notification: process.env.NOTIFICATION_SERVICE
    }
  });
});

app.get('/metrics', metricsHandler);

// Auth middleware - AFTER health
app.use(authenticateToken);
app.use(answerTimingMiddleware);

const quizAnswerLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: { error: "Too many answer requests" }
});
app.use('/content/levels/:levelId/answer', quizAnswerLimiter);

// Generic reverse proxy function
// prefix: the route prefix to prepend to req.url when calling upstream (e.g. '/auth')
function proxyRequest(targetBase, prefix, req, res) {
  const url = new URL(targetBase);
  const isHttps = url.protocol === 'https:';
  const lib = isHttps ? https : http;
  
  // req.url has the prefix stripped by Express, so restore it
  const targetPath = prefix + req.url;
  const body = req.body && Object.keys(req.body).length > 0 ? JSON.stringify(req.body) : null;
  
  const headers = {
    ...req.headers,
    host: url.host,
  };

  if (body) {
    headers['content-type'] = 'application/json';
    headers['content-length'] = Buffer.byteLength(body);
  } else {
    delete headers['content-length'];
  }

  const options = {
    hostname: url.hostname,
    port: url.port || (isHttps ? 443 : 80),
    path: targetPath,
    method: req.method,
    headers
  };

  const proxyReq = lib.request(options, (proxyRes) => {
    res.status(proxyRes.statusCode);
    Object.keys(proxyRes.headers).forEach(key => {
      res.setHeader(key, proxyRes.headers[key]);
    });
    proxyRes.pipe(res);
  });

  proxyReq.on('error', (err) => {
    console.error('Proxy error:', err.message);
    if (!res.headersSent) {
      res.status(502).json({ error: 'Bad Gateway', details: err.message });
    }
  });

  if (body) proxyReq.write(body);
  proxyReq.end();
}

// Proxy routes
app.use('/auth', (req, res) => proxyRequest(process.env.AUTH_SERVICE, '/auth', req, res));
app.use('/content', (req, res) => proxyRequest(process.env.CONTENT_SERVICE, '/content', req, res));
app.use('/progress', (req, res) => proxyRequest(process.env.PROGRESS_SERVICE, '/progress', req, res));
app.use('/xp', (req, res) => proxyRequest(process.env.XP_SERVICE, '/xp', req, res));
app.use('/battle', (req, res) => proxyRequest(process.env.BATTLE_SERVICE, '/battle', req, res));

// Handle WebSocket upgrades
server.on('upgrade', (req, socket, head) => {
  const pathname = req.url.split('?')[0];
  console.log(`[Proxy] Upgrade request for ${pathname}`);
  
  if (pathname.startsWith('/socket.io/notifications')) {
    notificationProxy.upgrade(req, socket, head);
  } else if (pathname.startsWith('/socket.io')) {
    battleProxy.upgrade(req, socket, head);
  }
});

app.use('/notifications', (req, res) => proxyRequest(process.env.NOTIFICATION_SERVICE, '/notifications', req, res));

server.listen(PORT, () => {
  console.log(`API Gateway running on port ${PORT}`);
});
