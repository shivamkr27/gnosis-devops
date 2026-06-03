const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function initialize() {
  const client = await pool.connect();
  try {
    console.log('Connected to PostgreSQL');

    await client.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');

    await client.query(`
      CREATE TABLE IF NOT EXISTS subjects (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) NOT NULL,
        description TEXT,
        order_index INT UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS levels (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
        level_number INT NOT NULL CHECK (level_number BETWEEN 1 AND 4),
        topic VARCHAR(200) NOT NULL,
        xp_reward INT DEFAULT 100,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(subject_id, level_number)
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS questions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        level_id UUID REFERENCES levels(id) ON DELETE CASCADE,
        question_text TEXT NOT NULL,
        option_a TEXT NOT NULL,
        option_b TEXT NOT NULL,
        option_c TEXT NOT NULL,
        option_d TEXT NOT NULL,
        correct_options JSONB NOT NULL,
        question_type VARCHAR(20) CHECK (question_type IN (
          'easy','medium','hard','tricky',
          'core_concept','numerical','multi_correct'
        )),
        timer_seconds INT DEFAULT 20,
        explanation TEXT,
        source VARCHAR(20) DEFAULT 'pregenerated',
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Remove duplicates keeping the lowest ID and add Unique Constraint
    await client.query(`
        DELETE FROM questions a
        USING questions b
        WHERE a.id > b.id
        AND a.level_id = b.level_id
        AND a.question_text = b.question_text;
    `);

    await client.query(`
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'unique_question'
  ) THEN
    ALTER TABLE questions
    ADD CONSTRAINT unique_question
    UNIQUE (level_id, question_text);
  END IF;
END
$$;
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS reviews (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        reviewer_name VARCHAR(100) NOT NULL,
        review_text TEXT NOT NULL,
        rating INT DEFAULT 5 CHECK (rating BETWEEN 1 AND 5),
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
        approve_token VARCHAR(64) UNIQUE NOT NULL,
        reject_token  VARCHAR(64) UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

  } catch(e) {
    console.error('Migration failed or constraint already exists', e);
  } finally {
    client.release();
  }
}

function query(text, params) {
  return pool.query(text, params);
}

module.exports = {
  initialize,
  query,
};
