const cron = require('node-cron');
const pool = require('../db/index');

module.exports = (redisClient) => {
  cron.schedule('0 0 * * 1', async () => {
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
    }
  });
};
