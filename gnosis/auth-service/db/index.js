const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function initDb() {
  try {
    await pool.query('SELECT 1');
    console.log('Connected to PostgreSQL');

    await pool.query(`
      CREATE EXTENSION IF NOT EXISTS "pgcrypto";

      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        total_xp INT DEFAULT 0,
        streak_count INT DEFAULT 0,
        last_active_date DATE,
        battle_wins INT DEFAULT 0,
        battle_losses INT DEFAULT 0,
        is_admin BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS security_questions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        question TEXT NOT NULL,
        answer_hash TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );

      -- Migration: add missing columns if missing (safe for existing DBs)
      ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS battle_wins INT DEFAULT 0;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS battle_losses INT DEFAULT 0;

      CREATE TABLE IF NOT EXISTS friendships (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        requester_id UUID REFERENCES users(id) ON DELETE CASCADE,
        receiver_id UUID REFERENCES users(id) ON DELETE CASCADE,
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted')),
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(requester_id, receiver_id)
      );
    `);
  } catch (error) {
    console.error('PostgreSQL connection or initialization failed:', error);
    throw error;
  }
}

module.exports = { pool, initDb };
