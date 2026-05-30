const express = require('express');
const router = express.Router();

module.exports = (redisClient) => {
  
  // GET /notifications/online/:userId
  router.get('/online/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      const status = await redisClient.get('gnosis:online:' + userId);
      res.json({
        userId,
        online: status === '1'
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // POST /notifications/online/batch
  router.post('/online/batch', async (req, res) => {
    try {
      const { userIds } = req.body;
      if (!userIds || !Array.isArray(userIds)) {
        return res.status(400).json({ error: 'userIds array is required' });
      }

      // Check Redis for each userId in parallel
      const statuses = await Promise.all(
        userIds.map(id => redisClient.get('gnosis:online:' + id))
      );

      const result = {};
      userIds.forEach((id, index) => {
        result[id] = statuses[index] === '1';
      });

      res.json(result);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
};
