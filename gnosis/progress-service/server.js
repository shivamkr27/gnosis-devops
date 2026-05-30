require('dotenv').config();
const express = require('express');
const cors = require('cors');
const progressRoutes = require('./routes/progress');

const app = express();
const PORT = process.env.PORT || 3003;

// Middleware
app.use(cors());
app.use(express.json());

// Health endpoint
app.get('/health', (req, res) => {
  res.json({ status: "ok", service: "progress-service" });
});

// Routes
app.use('/progress', progressRoutes);

// Start server
app.listen(PORT, () => {
  console.log(`Progress service running on port ${PORT}`);
});