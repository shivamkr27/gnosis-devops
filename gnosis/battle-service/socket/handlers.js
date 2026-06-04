const axios = require('axios');
const { generateRoomCode, updateRoomPlayers, notifyWaitingForOpponent, sendNextQuestion, endQuiz, clearRoomTimer } = require('../helpers/room');

module.exports = (io, redisClient) => {
  io.on('connection', (socket) => {
    console.log(`[Socket] New connection: ${socket.id}`);
    
    // User identifies themselves after connecting
    socket.on('user:identify', async ({ userId, username }) => {
      console.log(`[Socket] User identify: ${username} (${userId})`);
      socket.userId = userId;
      socket.username = username;
      // Store socket mapping in Redis
      await redisClient.set('gnosis:socket:' + userId, socket.id, { EX: 3600 });
      // Also mark as online for notification service
      await redisClient.set('gnosis:online:' + userId, '1', { EX: 30 });
    });

    socket.on('user:heartbeat', async ({ userId }) => {
      // Refresh online status and socket mapping
      await redisClient.set('gnosis:online:' + userId, '1', { EX: 30 });
      if (socket.id) {
        await redisClient.set('gnosis:socket:' + userId, socket.id, { EX: 3600 });
      }
    });

    socket.on('disconnect', async () => {
      if (socket.userId) {
        await redisClient.del('gnosis:socket:' + socket.userId);
        await redisClient.del('gnosis:online:' + socket.userId);
        
        // If they were in a 1v1 room, terminate it
        if (socket.roomCode) {
          const roomData = await redisClient.hGetAll('gnosis:room:' + socket.roomCode);
          if (roomData && roomData.type === '1v1' && roomData.status !== 'complete') {
            io.to(socket.roomCode).emit('room:cancelled', { message: 'Opponent disconnected' });
            await redisClient.del('gnosis:room:' + socket.roomCode);
          }
        }
      }
    });

    socket.on('challenge:send', async ({ toUserId, toUsername, subjectId, levelId, subjectName, levelNumber }) => {
      const targetSocketId = await redisClient.get('gnosis:socket:' + toUserId);
      if (!targetSocketId) {
        socket.emit('challenge:error', { message: 'User is offline' });
        return;
      }
      
      await redisClient.set(
        'gnosis:challenge:' + toUserId,
        JSON.stringify({
          fromUserId: socket.userId,
          fromUsername: socket.username,
          subjectId, levelId, subjectName, levelNumber
        }),
        { EX: 60 }
      );
      await redisClient.set('gnosis:challenger:' + socket.userId, socket.username, { EX: 60 });

      io.to(targetSocketId).emit('challenge:received', {
        fromUserId: socket.userId,
        fromUsername: socket.username,
        subjectId, levelId, subjectName, levelNumber
      });

      // Also push to notification bell
      io.to(targetSocketId).emit('notification:new', {
        id: Date.now().toString(),
        type: 'challenge',
        message: `${socket.username} challenged you to a battle!`,
        read: false,
        source: 'local'
      });

      socket.emit('challenge:sent', { message: 'Challenge sent' });
    });

    socket.on('challenge:respond', async ({ accepted, fromUserId, subjectId, levelId, subjectName, levelNumber }) => {
      const challengerSocketId = await redisClient.get('gnosis:socket:' + fromUserId);
      
      if (!accepted) {
        if (challengerSocketId) {
          io.to(challengerSocketId).emit('challenge:rejected', { by: socket.username });
        }
        return;
      }

      // ACCEPTED — create room
      const roomCode = await generateRoomCode(redisClient);
      
      let questions = [];
      try {
        // FETCH 10 RANDOM QUESTIONS FROM INTERNAL POOL
        const res = await axios.get(`http://content-service:3002/content/levels/${levelId}/questions?internal=true`);
        questions = res.data;
        
        if (!questions || questions.length === 0) {
           const subRes = await axios.get(`http://content-service:3002/content/subjects/${subjectId}`);
           const firstLevelId = subRes.data.levels[0].id;
           const fallbackRes = await axios.get(`http://content-service:3002/content/levels/${firstLevelId}/questions?internal=true`);
           questions = fallbackRes.data;
        }
        // Take only 10
        questions = questions.slice(0, 10);
      } catch (err) {
        console.error("Critical: Failed to fetch battle questions:", err.message);
        socket.emit('challenge:error', { message: 'Failed to prepare questions. Try again.' });
        return;
      }

      const challengerUsername = await redisClient.get('gnosis:challenger:' + fromUserId) || 'Challenger';

      const players = [
        { userId: fromUserId, username: challengerUsername, socketId: '', score: 0, answered: false },
        { userId: socket.userId, username: socket.username, socketId: '', score: 0, answered: false }
      ];

      await redisClient.hSet('gnosis:room:' + roomCode, {
        type: '1v1',
        host_id: fromUserId,
        host_socket: challengerSocketId || '',
        subject_id: subjectId,
        level_id: levelId || '',
        subject_name: subjectName || 'Battle',
        level_number: levelNumber ? levelNumber.toString() : '1',
        status: 'waiting',
        questions: JSON.stringify(questions),
        current_index: '0',
        q_sent_at: '0',
        players: JSON.stringify(players)
      });
      await redisClient.expire('gnosis:room:' + roomCode, 1800);

      socket.join(roomCode);
      if (challengerSocketId) {
        io.to(challengerSocketId).emit('challenge:accepted', { roomCode, subjectName });
      }
      socket.emit('challenge:accepted', { roomCode });
    });

    // ---- NOTIFICATION RELAY ----
    // Lets frontend push a notification to another user's bell after REST calls
    socket.on('notification:relay', async ({ toUserId, type, message }) => {
      if (!toUserId || !message) return;
      const targetSocketId = await redisClient.get('gnosis:socket:' + toUserId);
      if (targetSocketId) {
        io.to(targetSocketId).emit('notification:new', {
          id: Date.now().toString(),
          type: type || 'general',
          message,
          read: false,
          source: 'local'
        });
      }
    });

    // ---- GROUP QUIZ EVENTS ----
    socket.on('group:create', async ({ hostId, hostUsername, quizName, questions }) => {
      const roomCode = await generateRoomCode(redisClient);
      
      await redisClient.hSet('gnosis:room:' + roomCode, {
        type: 'group',
        host_id: hostId,
        host_socket: socket.id,
        quiz_name: quizName,
        status: 'waiting',
        questions: JSON.stringify(questions),
        current_index: '0',
        q_sent_at: '0',
        players: JSON.stringify([])
      });
      await redisClient.expire('gnosis:room:' + roomCode, 7200);

      socket.join(roomCode);
      socket.roomCode = roomCode;
      socket.emit('group:created', { roomCode, quizName });
    });

    socket.on('room:host_join', async ({ roomCode, userId, username }) => {
        socket.join(roomCode);
        socket.roomCode = roomCode;
        socket.userId = userId;
        socket.username = username;

        // Ensure host socket is updated in Redis room data if reconnected
        await redisClient.hSet('gnosis:room:' + roomCode, 'host_socket', socket.id);

        const roomData = await redisClient.hGetAll('gnosis:room:' + roomCode);
        let players = JSON.parse(roomData.players || '[]');
        
        // Update host socket in players array if it's a 1v1 (host IS a player)
        // For group quiz, add host to players array if not already present
        const playerIndex = players.findIndex(p => p.userId === userId);
        if (playerIndex !== -1) {
            players[playerIndex].socketId = socket.id;
            await updateRoomPlayers(redisClient, roomCode, players);
        } else if (roomData.type === 'group') {
            // Host joining group quiz — add to players array
            players.push({ userId, username, socketId: socket.id, score: 0, answered: false });
            await updateRoomPlayers(redisClient, roomCode, players);
        }

        socket.emit('room:joined', {
            roomCode,
            type: roomData.type,
            quizName: roomData.quiz_name || roomData.subject_name || '',
            players,
            playerCount: players.length
        });

        // AUTO-START 1v1: Wait for both players to have active socket connections
        if (roomData.type === '1v1' && players.length === 2 && roomData.status === 'waiting') {
          // Give 2.5s for components to mount and register listeners, then check fresh data
          setTimeout(async () => {
            const currentStatus = await redisClient.hGet('gnosis:room:' + roomCode, 'status');
            if (currentStatus !== 'waiting') return;
            
            // Fresh players read from Redis
            const freshPlayers = JSON.parse(
              await redisClient.hGet('gnosis:room:' + roomCode, 'players') || '[]'
            );
            const bothConnected = freshPlayers.length === 2 && 
                                  freshPlayers.every(p => p.socketId && p.socketId !== '');
            
            if (bothConnected) {
              await redisClient.hSet('gnosis:room:' + roomCode, 'status', 'active');
              const roomDataFresh = await redisClient.hGetAll('gnosis:room:' + roomCode);
              const qs = JSON.parse(roomDataFresh.questions || '[]');
              io.to(roomCode).emit('quiz:starting', { 
                message: 'Battle starting in 1 second!',
                totalQuestions: qs.length
              });
              
              setTimeout(() => {
                sendNextQuestion(io, redisClient, roomCode);
              }, 1000);
            }
          }, 2500);
        }
    });

    socket.on('room:join', async ({ roomCode, userId, username }) => {
      const roomData = await redisClient.hGetAll('gnosis:room:' + roomCode);
      if (!roomData || !roomData.type) {
        socket.emit('room:error', { message: 'Room not found' });
        return;
      }
      if (roomData.status !== 'waiting' && roomData.status !== 'active') {
        socket.emit('room:error', { message: 'Quiz already finished' });
        return;
      }
      if (roomData.host_id === userId && roomData.type !== '1v1') {
        socket.emit('room:error', { message: 'Host cannot join as participant. Please use host screen.' });
        return;
      }

      let players = JSON.parse(roomData.players || '[]');
      const alreadyJoined = players.find(p => p.userId === userId);
      if (!alreadyJoined) {
        players.push({ userId, username, socketId: socket.id, score: 0, answered: false });
        await updateRoomPlayers(redisClient, roomCode, players);
      } else {
        // Update socket ID even if already in array (relevant for 1v1 where players are pre-filled)
        const pIndex = players.findIndex(p => p.userId === userId);
        players[pIndex].socketId = socket.id;
        await updateRoomPlayers(redisClient, roomCode, players);
      }

      socket.join(roomCode);
      socket.roomCode = roomCode;
      socket.userId = userId;
      socket.username = username;

      const hostSocketId = roomData.host_socket;
      if (hostSocketId && hostSocketId !== socket.id) {
        io.to(hostSocketId).emit('room:player_joined', { 
          players,
          newPlayer: { userId, username }
        });
      }

      // Update everyone else in the room
      io.to(roomCode).emit('room:players', { players });

      // AUTO-START 1v1: Wait for both players to have active socket connections
      if (roomData.type === '1v1' && players.length === 2 && roomData.status === 'waiting') {
        // Give 2.5s for components to mount and register listeners, then check fresh data
        setTimeout(async () => {
          const currentStatus = await redisClient.hGet('gnosis:room:' + roomCode, 'status');
          if (currentStatus !== 'waiting') return;
          
          // Fresh players read from Redis
          const freshPlayers = JSON.parse(
            await redisClient.hGet('gnosis:room:' + roomCode, 'players') || '[]'
          );
          const bothConnected = freshPlayers.length === 2 && 
                                freshPlayers.every(p => p.socketId && p.socketId !== '');
          
          if (bothConnected) {
            await redisClient.hSet('gnosis:room:' + roomCode, 'status', 'active');
            const roomDataFresh = await redisClient.hGetAll('gnosis:room:' + roomCode);
            const qs = JSON.parse(roomDataFresh.questions || '[]');
            io.to(roomCode).emit('quiz:starting', { 
              message: 'Battle starting in 1 second!',
              totalQuestions: qs.length
            });
            
            setTimeout(() => {
              sendNextQuestion(io, redisClient, roomCode);
            }, 1000);
          }
        }, 2500);
      }

      socket.emit('room:joined', {
        roomCode,
        type: roomData.type,
        quizName: roomData.quiz_name || roomData.subject_name || '',
        players,
        playerCount: players.length
      });
    });

    socket.on('host:start_quiz', async ({ roomCode }) => {
      const roomData = await redisClient.hGetAll('gnosis:room:' + roomCode);
      if (roomData.host_socket !== socket.id) {
        socket.emit('quiz:error', { message: 'Not the host' });
        return;
      }
      const players = JSON.parse(roomData.players || '[]');
      if (players.length < 1) { // Changed to 1 so you can test it easily
        socket.emit('quiz:error', { message: 'Need at least 1 player' });
        return;
      }

      await redisClient.hSet('gnosis:room:' + roomCode, 'status', 'active');
      
      io.to(roomCode).emit('quiz:starting', { 
        message: 'Quiz starting in 1 second',
        totalQuestions: JSON.parse(roomData.questions).length
      });

      setTimeout(() => {
        sendNextQuestion(io, redisClient, roomCode);
      }, 1000);
    });

    socket.on('host:cancel', async ({ roomCode }) => {
      const roomData = await redisClient.hGetAll('gnosis:room:' + roomCode);
      if (!roomData || !roomData.type) return;
      if (roomData.host_id === socket.userId || roomData.type === '1v1') {
        clearRoomTimer(roomCode);
        io.to(roomCode).emit('room:cancelled', {
          message: roomData.type === '1v1' ? 'Battle terminated' : 'Host cancelled the session'
        });
        await redisClient.del('gnosis:room:' + roomCode);
      }
    });

    socket.on('room:leave', async ({ roomCode }) => {
      const roomData = await redisClient.hGetAll('gnosis:room:' + roomCode);
      if (!roomData || !roomData.type) return;
      if (roomData.type === '1v1') {
        clearRoomTimer(roomCode);
        io.to(roomCode).emit('room:cancelled', { message: 'Opponent left the battle' });
        await redisClient.del('gnosis:room:' + roomCode);
      } else {
        let players = JSON.parse(roomData.players || '[]');
        players = players.filter(p => p.userId !== socket.userId);
        await redisClient.hSet('gnosis:room:' + roomCode, 'players', JSON.stringify(players));
        io.to(roomCode).emit('room:players', { players });
        socket.leave(roomCode);
      }
    });

    socket.on('quiz:answer', async ({ roomCode, questionId, selectedOptions }) => {
      const roomData = await redisClient.hGetAll('gnosis:room:' + roomCode);
      if (!roomData || roomData.status !== 'active') return;

      const questions = JSON.parse(roomData.questions);
      let players = JSON.parse(roomData.players || '[]');
      const playerIndex = players.findIndex(p => p.userId === socket.userId);
      if (playerIndex === -1) return;

      // INDIVIDUAL FLOW: Use player's own currentIndex
      const pCurrentIndex = players[playerIndex].currentIndex ?? 0;
      const currentQuestion = questions[pCurrentIndex];
      if (!currentQuestion) return;

      // Guard: answer must be for the current question (only if question has ID — group quiz may not)
      if (currentQuestion?.id && currentQuestion.id !== questionId) {
        socket.emit('quiz:answer_rejected', { reason: 'stale_question', questionId });
        return;
      }

      // Guard: don't allow double-answer from same player
      if (players[playerIndex].answered) return;

      // Score it
      const normalize = (arr) => {
        if (!arr || !Array.isArray(arr)) return [];
        return arr.map(v => String(v).trim().toLowerCase()).sort();
      };
      const correctOptions = currentQuestion.correct_options || [];
      const normalizedSelected = normalize(selectedOptions);
      const normalizedCorrect = normalize(correctOptions);
      const isCorrect = normalizedSelected.length === normalizedCorrect.length &&
                        normalizedSelected.every((val, i) => val === normalizedCorrect[i]);

      let xpEarned = 0;
      if (isCorrect) {
        const isMulti = currentQuestion.question_type === 'multi_correct';
        xpEarned = isMulti ? 15 : 10;
        // Speed bonus (optional)
        // const timeTaken = Date.now() - sentAt;
        // if (timeTaken < 5000) xpEarned += 5;
        // else if (timeTaken < 8000) xpEarned += 2;
      }

      players[playerIndex].score += xpEarned;
      players[playerIndex].answered = true;

      socket.emit('quiz:answer_result', {
        correct: isCorrect, xpEarned, correctOptions,
        explanation: currentQuestion.explanation || '', questionId
      });

      // INDIVIDUAL PROGRESSION: Advance only this player
      const pNextIndex = pCurrentIndex + 1;
      players[playerIndex].currentIndex = pNextIndex;
      players[playerIndex].answered = false;

      if (pNextIndex >= questions.length) {
        // This player finished all questions
        players[playerIndex].finished = true;
      }

      await updateRoomPlayers(redisClient, roomCode, players);

      // Check if ALL players finished
      const allFinished = players.every(p => p.finished);
      if (allFinished) {
        console.log(`[Battle] Room ${roomCode} all players finished — ending quiz`);
        await endQuiz(io, redisClient, roomCode);
        return;
      }

      if (players[playerIndex].finished) {
        await notifyWaitingForOpponent(io, redisClient, roomCode, players[playerIndex].userId);
      }

      // Send next question to this player if not done
      if (!players[playerIndex].finished) {
        const nextQ = questions[pNextIndex];
        const nextQClient = { ...nextQ };
        delete nextQClient.correct_options;
        delete nextQClient.explanation;

        setTimeout(() => {
          socket.emit('quiz:question', {
            question: nextQClient,
            qIndex: pNextIndex + 1,
            total: questions.length,
            timerSeconds: nextQ.timer_seconds || 15,
            sentAt: Date.now()
          });
        }, 1500);
      }
    });

    socket.on('disconnect', async () => {
      if (socket.userId) {
        await redisClient.del('gnosis:socket:' + socket.userId);
        await redisClient.del('gnosis:online:' + socket.userId);
      }
      if (socket.roomCode) {
        const roomData = await redisClient.hGetAll('gnosis:room:' + socket.roomCode);
        if (roomData && roomData.type === '1v1' && roomData.status !== 'complete') {
          clearRoomTimer(socket.roomCode);
          io.to(socket.roomCode).emit('room:cancelled', { message: 'Opponent disconnected' });
          await redisClient.del('gnosis:room:' + socket.roomCode);
        }
      }
    });
  });
};
