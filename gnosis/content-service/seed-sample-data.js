const { Pool } = require('pg');
const dotenv = require('dotenv');
dotenv.config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

(async () => {
  const client = await pool.connect();
  try {
    const subjResult = await client.query(
      'INSERT INTO subjects (name, description, order_index) VALUES ($1, $2, $3) ON CONFLICT (order_index) DO NOTHING RETURNING id',
      ['C Programming', 'Master memory, pointers and low-level programming', 1]
    );

    const subjectId =
      subjResult.rows[0]?.id ||
      (await client.query('SELECT id FROM subjects WHERE name = $1', ['C Programming'])).rows[0].id;

    await client.query(
      'INSERT INTO levels (subject_id, level_number, topic, xp_reward) VALUES ($1, $2, $3, $4) ON CONFLICT (subject_id, level_number) DO NOTHING',
      [subjectId, 1, 'Memory Layout, Storage Classes, Operator Precedence', 100]
    );

    console.log('inserted subjectId', subjectId);
  } catch (err) {
    console.error('insert-error', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
})();
