const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { createMetrics } = require('../common/metrics');

dotenv.config();

const db = require('./db');
const contentRoutes = require('./routes/content');
const reviewRoutes  = require('./routes/reviews');

const app = express();
const PORT = process.env.PORT || 3002;
const { metricsMiddleware, metricsHandler } = createMetrics('content_service');

app.use(cors());
app.use(express.json());
app.use(metricsMiddleware);
app.use('/content', contentRoutes);
app.use('/content/reviews', reviewRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'content-service' });
});

app.get('/metrics', metricsHandler);

async function start() {
  try {
    await db.initialize();
    app.listen(PORT, () => {
      console.log(`Content service running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to initialize database:', error);
    process.exit(1);
  }
}

start();
