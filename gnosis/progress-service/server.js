require('dotenv').config();
const express = require('express');
const cors = require('cors');
const progressRoutes = require('./routes/progress');
const { createMetrics } = require('../common/metrics');

const app = express();
const PORT = process.env.PORT || 3003;
const { metricsMiddleware, metricsHandler } = createMetrics('progress_service');

// Middleware
app.use(cors());
app.use(express.json());
app.use(metricsMiddleware);

// Health endpoint
app.get('/health', (req, res) => {
  res.json({ status: "ok", service: "progress-service" });
});

app.get('/metrics', metricsHandler);

// Routes
app.use('/progress', progressRoutes);

// Start server
app.listen(PORT, () => {
  console.log(`Progress service running on port ${PORT}`);
});