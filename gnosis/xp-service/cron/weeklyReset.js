const cron = require('node-cron');
const pool = require('../db/index');

const LOCK_KEY = 'gnosis:lock:weekly-reset';
const LOCK_TTL_SECONDS = 300;

module.exports = (redisClient) => {
  cron.schedule('0 0 * * 1', async () => {
    const acquired = await redisClient.set(LOCK_KEY, '1', { NX: true, EX: LOCK_TTL_SECONDS });
    if (!acquired) {
      console.log('[weeklyReset] Lock held by another replica — skipping');
      return;
    }

    console.log('Starting weekly leaderboard reset...');
    try {
      // Step 1: Delete Redis key
      await redisClient.del('gnosis:leaderboard:global');

      // Step 2: Query xp_ledger for current week global XP
      const result = await pool.query(`
        SELECT user_id, username, SUM(amount) as total
        FROM xp_ledger
        WHERE scope = 'global'
        AND awarded_at >= date_trunc('week', NOW())
        GROUP BY user_id, username
      `);

      // Step 3: Re-populate Redis
      for (const row of result.rows) {
        const member = `${row.user_id}:${row.username}`;
        await redisClient.zAdd('gnosis:leaderboard:global', [
          { score: row.total, value: member }
        ]);
      }

      console.log('Weekly leaderboard reset done');
    } catch (err) {
      console.error('Error during weekly leaderboard reset:', err);
    } finally {
      await redisClient.del(LOCK_KEY);
    }
  });
};
