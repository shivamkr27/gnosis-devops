const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const pool = require('../db/index');

function verifyGatewaySecret(req) {
  const secret = process.env.INTERNAL_GATEWAY_SECRET;
  const provided = req.headers['x-gateway-secret'];
  if (!secret || !provided) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(secret), Buffer.from(provided));
  } catch {
    return false;
  }
}

module.exports = (redisClient) => {
  // POST /xp/award
  router.post('/award', async (req, res) => {
    if (!verifyGatewaySecret(req)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { userId, username, amount, source, scope, roomId } = req.body;

    try {
      await pool.query(
        `INSERT INTO xp_ledger (user_id, username, amount, source, scope, room_id)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [userId, username, amount, source, scope, roomId]
      );

      await pool.query(
        `UPDATE users SET total_xp = COALESCE(total_xp, 0) + $1 WHERE id = $2`,
        [amount, userId]
      );

      if (scope === 'global') {
        const member = `${userId}:${username}`;
        await redisClient.zIncrBy('gnosis:leaderboard:global', amount, member);
      }

      res.status(201).json({ message: 'XP awarded', amount });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // GET /xp/leaderboard/global
  // Query from users.total_xp directly (authoritative source, not Redis)
  router.get('/leaderboard/global', async (req, res) => {
    try {
      const { currentUserId } = req.query;
      
      // Fetch top 20 users by total_xp from users table
      const result = await pool.query(
        `SELECT id as user_id, username, total_xp
         FROM users
         WHERE total_xp > 0
         ORDER BY total_xp DESC
         LIMIT 20`
      );

      const leaderboard = result.rows.map((row, index) => ({
        rank: index + 1,
        userId: row.user_id,
        username: row.username,
        total_xp: parseInt(row.total_xp, 10)
      }));

      const response = { leaderboard };

      if (currentUserId) {
        // Get current user's rank
        const rankResult = await pool.query(
          `SELECT COUNT(*) + 1 as rank FROM users 
           WHERE total_xp > (SELECT total_xp FROM users WHERE id = $1)`,
          [currentUserId]
        );
        if (rankResult.rows.length > 0) {
          response.currentUserRank = parseInt(rankResult.rows[0].rank, 10);
        }
      }

      res.json(response);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // GET /xp/leaderboard/friends
  router.get('/leaderboard/friends', async (req, res) => {
    try {
      const { userId, friendIds } = req.query;
      
      if (!userId || !friendIds) {
        return res.status(400).json({ error: 'userId and friendIds query params required' });
      }

      const allIds = friendIds.split(',').map(id => id.trim());
      if (!allIds.includes(userId)) {
        allIds.push(userId);
      }

      // Query from users table directly (authoritative source)
      const result = await pool.query(
        `SELECT id as user_id, username, total_xp
         FROM users
         WHERE id = ANY($1::uuid[])
         ORDER BY total_xp DESC`,
        [allIds]
      );

      const ranked = result.rows.map((row, index) => ({
        rank: index + 1,
        userId: row.user_id,
        username: row.username,
        total_xp: parseInt(row.total_xp, 10)
      }));

      res.json(ranked);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // GET /xp/user/:userId/total
  router.get('/user/:userId/total', async (req, res) => {
    try {
      const { userId } = req.params;
      const result = await pool.query(
        `SELECT COALESCE(SUM(amount), 0) as total
         FROM xp_ledger
         WHERE user_id = $1 AND scope = 'global'`,
        [userId]
      );
      
      res.json({
        userId,
        totalXp: parseInt(result.rows[0].total, 10)
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // GET /xp/user/:userId/event-total
  router.get('/user/:userId/event-total', async (req, res) => {
    try {
      const { userId } = req.params;
      const result = await pool.query(
        `SELECT COALESCE(SUM(amount), 0) as total
         FROM xp_ledger
         WHERE user_id = $1 AND scope = 'event'`,
        [userId]
      );

      res.json({
        userId,
        eventXp: parseInt(result.rows[0].total, 10)
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // GET /xp/user/:userId/history
  router.get('/user/:userId/history', async (req, res) => {
    try {
      const { userId } = req.params;
      const result = await pool.query(
        `SELECT amount, source, scope, awarded_at
         FROM xp_ledger
         WHERE user_id = $1
         ORDER BY awarded_at DESC
         LIMIT 20`,
        [userId]
      );
      
      res.json(result.rows);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
};
