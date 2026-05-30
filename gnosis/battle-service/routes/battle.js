const express = require('express');
const router = express.Router();
const pool = require('../db/index');

module.exports = (redisClient) => {
  // GET /battle/history/:userId
  router.get('/history/:userId', async (req, res) => {
    const { userId } = req.params;
    try {
      const result = await pool.query(
        `SELECT id, room_code, type, subject_name, level_number,
                participants, results, winner_id, created_at
         FROM battle_history
         WHERE participants @> $1::jsonb
         ORDER BY created_at DESC
         LIMIT 4`,
        [JSON.stringify([{ userId }])]
      );
      res.json(result.rows);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // GET /battle/room/:roomCode
  router.get('/room/:roomCode', async (req, res) => {
    const { roomCode } = req.params;
    try {
      const roomData = await redisClient.hGetAll('gnosis:room:' + roomCode);
      if (!roomData || !roomData.type) {
        return res.status(404).json({ error: 'Room not found' });
      }

      const players = JSON.parse(roomData.players || '[]');
      
      res.json({
        roomCode,
        status: roomData.status,
        type: roomData.type,
        playerCount: players.length,
        quizName: roomData.quiz_name,
        subjectName: roomData.subject_name
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // GET /health
  router.get('/health', (req, res) => {
    res.json({ status: "ok", service: "battle-service" });
  });

  return router;
};
