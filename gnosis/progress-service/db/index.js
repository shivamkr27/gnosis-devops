const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

pool.on('connect', () => {
  console.log('Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(1);
});

const createTables = async () => {
  try {
    await pool.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto";`);

  await pool.query(`
  CREATE TABLE IF NOT EXISTS user_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    level_id UUID NOT NULL,
    subject_id UUID NOT NULL,
    status VARCHAR(20) DEFAULT 'locked'
      CHECK (status IN ('locked', 'unlocked', 'complete')),
    xp_earned INT DEFAULT 0,
    completed_at TIMESTAMP,
    answers JSONB DEFAULT '[]'::jsonb,
    UNIQUE(user_id, level_id)
  );

  -- Upgrade old tables safely
  DO $$
  BEGIN
    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_name='user_progress'
      AND column_name='answers'
    ) THEN
      ALTER TABLE user_progress
      ADD COLUMN answers JSONB DEFAULT '[]'::jsonb;
    END IF;
  END $$;
`);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS daily_activity (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        activity_date DATE NOT NULL,
        levels_completed INT DEFAULT 0,
        UNIQUE(user_id, activity_date)
      );
    `);

    console.log('Tables created or already exist');
  } catch (err) {
    console.error('Error creating tables', err);
    process.exit(1);
  }
};

createTables();

module.exports = pool;