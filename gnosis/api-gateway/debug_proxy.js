require('dotenv').config();
const { createProxyMiddleware, fixRequestBody } = require('http-proxy-middleware');
const express = require('express');
const app = express();

app.use(express.json());
app.use((req, res, next) => {
  console.log('[DBG]', req.method, req.path, JSON.stringify(req.body));
  next();
});

app.use('/auth', createProxyMiddleware({
  target: process.env.AUTH_SERVICE,
  changeOrigin: true,
  on: {
    proxyReq: fixRequestBody,
    error: (err, req, res) => {
      console.log('[PROXY ERROR]', err.message);
      res.status(502).json({ error: err.message });
    }
  }
}));

app.listen(9990, () => console.log('debug proxy running on 9990'));
