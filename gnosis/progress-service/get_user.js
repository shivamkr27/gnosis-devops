require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

pool.query('SELECT id FROM users LIMIT 1', (err, res) => {
  if (err) {
    console.error(err);
  } else {
    console.log(res.rows[0]?.id);
  }
  pool.end();
});