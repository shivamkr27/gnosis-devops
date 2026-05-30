const pool = require('./progress-service/db/index');

async function migrate() {
  try {
    console.log('Adding answers column to user_progress...');
    await pool.query(`
      ALTER TABLE user_progress 
      ADD COLUMN IF NOT EXISTS answers JSONB DEFAULT '[]';
    `);
    console.log('Done!');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrate();
