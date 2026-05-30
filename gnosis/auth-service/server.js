require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { initDb } = require('./db');
const authRoutes = require('./routes/auth');

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use('/auth', authRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'auth-service' });
});

async function startServer() {
  try {
    await initDb();
    app.listen(port, () => {
      console.log(`Auth service running on port ${port}`);
    });
  } catch (error) {
    console.error('Failed to start auth service:', error);
    process.exit(1);
  }
}

startServer();
