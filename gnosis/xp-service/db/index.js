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
      CREATE TABLE IF NOT EXISTS xp_ledger (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        username VARCHAR(50) NOT NULL,
        amount INT NOT NULL,
        source VARCHAR(30) CHECK (source IN (
          'lesson', 'streak_bonus', 'level_complete', 'battle'
        )),
        scope VARCHAR(10) CHECK (scope IN ('global', 'room', 'event')),
        room_id VARCHAR(20),
        awarded_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Safe migration: Update constraint to support 'event' scope
    await pool.query(`
      ALTER TABLE xp_ledger
        DROP CONSTRAINT IF EXISTS xp_ledger_scope_check;
    `);
    await pool.query(`
      ALTER TABLE xp_ledger
        ADD CONSTRAINT xp_ledger_scope_check
        CHECK (scope IN ('global', 'room', 'event'));
    `);

    await pool.query(`
      DO $$
      BEGIN
        IF to_regclass('public.users') IS NOT NULL THEN
          UPDATE users u
          SET total_xp = COALESCE(ledger.total_xp, 0)
          FROM (
            SELECT user_id, COALESCE(SUM(amount), 0) AS total_xp
            FROM xp_ledger
            GROUP BY user_id
          ) ledger
          WHERE u.id = ledger.user_id;
        END IF;
      END
      $$;
    `);

    console.log('XP tables ready');
  } catch (err) {
    console.error('Error creating tables', err);
    process.exit(1);
  }
};

createTables();

module.exports = pool;
