const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
  const skipRoutes = [
    { path: '/', method: 'GET' },
    { path: '/auth/login', method: 'POST' },
    { path: '/auth/register', method: 'POST' },
    { path: '/auth/forgot-password-step1', method: 'POST' },
    { path: '/auth/forgot-password-step2', method: 'POST' },
    { path: '/health', method: 'GET' },
    { path: '/metrics', method: 'GET' }
  ];

  const shouldSkip = skipRoutes.some(
    r => req.path === r.path && req.method === r.method
  );

  if (shouldSkip) {
    return next();
  }

  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>

  if (!token) {
    console.log(`[Auth] Blocked: No token for ${req.method} ${req.path}`);
    return res.status(401).json({ error: "unauthorized" });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      console.log(`[Auth] Blocked: Invalid token for ${req.method} ${req.path}`);
      return res.status(401).json({ error: "unauthorized" });
    }

    // Add headers to forward request
    req.headers['x-user-id'] = decoded.userId;
    req.headers['x-username'] = decoded.username;
    next();
  });
};

module.exports = authenticateToken;
