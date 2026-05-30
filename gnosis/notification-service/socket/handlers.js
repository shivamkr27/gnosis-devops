module.exports = (io, redisClient) => {
  io.on('connection', (socket) => {

    socket.on('user:identify', async ({ userId }) => {
      socket.userId = userId;
      // Mark user online in Redis with 30s TTL
      await redisClient.set('gnosis:online:' + userId, '1', { EX: 30 });
      socket.emit('identified', { message: 'online' });
    });

    socket.on('user:heartbeat', async ({ userId }) => {
      // Refresh TTL every 20s from client
      await redisClient.set('gnosis:online:' + userId, '1', { EX: 30 });
    });

    socket.on('disconnect', async () => {
      if (socket.userId) {
        await redisClient.del('gnosis:online:' + socket.userId);
      }
    });

  });
};
