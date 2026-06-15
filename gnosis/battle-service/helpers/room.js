const crypto = require('crypto');
const pool = require('../db/index');
const axios = require('axios');

const XP_SERVICE_URL = 'http://xp-service:3004';

const generateRoomCode = async (redisClient) => {
  let code;
  let exists = true;
  while (exists) {
    code = crypto.randomBytes(3).toString('hex').toUpperCase();
    const room = await redisClient.exists('gnosis:room:' + code);
    if (!room) exists = false;
  }
  return code;
};

const getRoomPlayers = async (redisClient, roomCode) => {
  const playersStr = await redisClient.hGet('gnosis:room:' + roomCode, 'players');
  return playersStr ? JSON.parse(playersStr) : [];
};

const updateRoomPlayers = async (redisClient, roomCode, players) => {
  await redisClient.hSet('gnosis:room:' + roomCode, 'players', JSON.stringify(players));
};

const notifyWaitingForOpponent = async (io, redisClient, roomCode, finishedUserId) => {
  const roomData = await redisClient.hGetAll('gnosis:room:' + roomCode);
  if (!roomData || !roomData.questions || !roomData.players) return;

  const questions = JSON.parse(roomData.questions || '[]');
  const players = JSON.parse(roomData.players || '[]');
  const finisher = players.find((player) => player.userId === finishedUserId);
  if (!finisher || !finisher.socketId) return;

  const pendingOpponents = players.filter(
    (player) => player.userId !== finishedUserId && !player.finished
  );
  if (pendingOpponents.length === 0) return;

  const timePerQuestion = questions[0]?.timer_seconds || 15;
  const secondsRemaining = pendingOpponents.reduce((maxSeconds, opponent) => {
    const opponentIndex = opponent.currentIndex ?? 0;
    const remainingQuestions = Math.max(questions.length - opponentIndex, 0);
    return Math.max(maxSeconds, remainingQuestions * timePerQuestion);
  }, 0);

  io.to(finisher.socketId).emit('quiz:opponent_finishing', {
    opponentName: pendingOpponents.length === 1 ? pendingOpponents[0].username : 'Opponents',
    secondsRemaining,
  });
};

// Track active question timers so they can be cancelled when all players answer early
const activeTimers = new Map(); // roomCode -> timeoutId

const clearRoomTimer = (roomCode) => {
  const existing = activeTimers.get(roomCode);
  if (existing) {
    clearTimeout(existing);
    activeTimers.delete(roomCode);
  }
};

const endQuiz = async (io, redisClient, roomCode) => {
  clearRoomTimer(roomCode);

  const roomData = await redisClient.hGetAll('gnosis:room:' + roomCode);
  if (!roomData || !roomData.players) return;

  // Mark complete immediately to prevent double-trigger
  await redisClient.hSet('gnosis:room:' + roomCode, 'status', 'complete');

  const players = JSON.parse(roomData.players);
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
  const top3 = sortedPlayers.slice(0, 3);
  const is1v1 = roomData.type === '1v1';

  // Determine winner_id for 1v1 (null = draw)
  let winnerId = null;
  if (is1v1 && players.length === 2) {
    const winner = sortedPlayers[0];
    const loser = sortedPlayers[1];
    if (winner.score > loser.score) {
      winnerId = winner.userId;
    }
  }

  // Emit results — include winnerId and isDraw so each client knows their own outcome
  io.to(roomCode).emit('quiz:results', {
    top3,
    winnerId,
    isDraw: is1v1 && winnerId === null
  });

  if (roomData.host_socket) {
    io.to(roomData.host_socket).emit('quiz:full_scoreboard', {
      allPlayers: sortedPlayers
    });
  }

  // Award XP — scope depends on room type:
  //   1v1  → scope 'room'  (friends leaderboard)
  //   group → scope 'event' (profile page only)
  const xpScope = is1v1 ? 'room' : 'event';

  for (const player of players) {
    if (player.score > 0) {
      try {
        await axios.post(`${XP_SERVICE_URL}/xp/award`, {
          userId: player.userId,
          username: player.username,
          amount: player.score,
          source: 'battle',
          scope: xpScope,
          roomId: roomCode
        });
      } catch (xpErr) {
        console.error(`Failed to award XP to ${player.username}:`, xpErr.message);
      }
    }
  }

  // Register Win/Loss in users table
  if (is1v1 && players.length === 2 && winnerId) {
    const winner = sortedPlayers[0];
    const loser = sortedPlayers[1];
    try {
      await pool.query('UPDATE users SET battle_wins = battle_wins + 1 WHERE id = $1', [winner.userId]);
      await pool.query('UPDATE users SET battle_losses = battle_losses + 1 WHERE id = $1', [loser.userId]);
      console.log(`[Battle] Win -> ${winner.username} | Loss -> ${loser.username}`);
    } catch (dbErr) {
      console.error('Failed to update win/loss stats:', dbErr.message);
    }
  }

  // Fetch per-player answers for review and attach to player objects
  const playersWithAnswers = await Promise.all(sortedPlayers.map(async (player) => {
    try {
      const answersStr = await redisClient.get(`gnosis:battle_answers:${roomCode}:${player.userId}`);
      return { ...player, answers: answersStr ? JSON.parse(answersStr) : [] };
    } catch (e) {
      return { ...player, answers: [] };
    }
  }));

  // Clean up answer tracking keys
  for (const player of players) {
    redisClient.del(`gnosis:battle_answers:${roomCode}:${player.userId}`).catch(() => {});
  }

  // Save to DB with winner_id, then enforce max 4 battles per player
  try {
    await pool.query(
      `INSERT INTO battle_history (room_code, type, host_id, subject_name, level_number, participants, results, winner_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        roomCode,
        roomData.type,
        roomData.host_id || null,
        roomData.subject_name || null,
        roomData.level_number ? parseInt(roomData.level_number) : null,
        JSON.stringify(players.map(p => ({ userId: p.userId, username: p.username }))),
        JSON.stringify(playersWithAnswers),
        winnerId
      ]
    );

    // Keep only 4 most recent battles per player, delete older ones
    for (const player of players) {
      await pool.query(
        `DELETE FROM battle_history
         WHERE id IN (
           SELECT id FROM battle_history
           WHERE EXISTS (
             SELECT 1 FROM jsonb_array_elements(participants) elem
             WHERE elem->>'userId' = $1
           )
           ORDER BY created_at DESC
           OFFSET 4
         )`,
        [String(player.userId)]
      );
    }
  } catch (err) {
    console.error('Error saving battle history', err);
  }

  setTimeout(async () => {
    await redisClient.del('gnosis:room:' + roomCode);
  }, 5 * 60 * 1000);
};

const sendNextQuestion = async (io, redisClient, roomCode) => {
  const roomData = await redisClient.hGetAll('gnosis:room:' + roomCode);
  if (!roomData || !roomData.questions) return;
  if (roomData.status !== 'active') return;

  const questions = JSON.parse(roomData.questions);
  let players = JSON.parse(roomData.players || '[]');

  // INDIVIDUAL FLOW: Each player gets their own question based on currentIndex
  // Send questions individually to each player
  for (let i = 0; i < players.length; i++) {
    const p = players[i];
    if (!p.socketId || p.finished) continue;

    const pIndex = p.currentIndex ?? 0;
    if (pIndex >= questions.length) {
      p.finished = true;
      continue;
    }

    const pQuestion = questions[pIndex];
    const pQuestionForClient = { ...pQuestion };
    delete pQuestionForClient.correct_options;
    delete pQuestionForClient.explanation;

    // Reset answered flag for this player
    p.answered = false;

    io.to(p.socketId).emit('quiz:question', {
      question: pQuestionForClient,
      qIndex: pIndex + 1,
      total: questions.length,
      timerSeconds: pQuestion.timer_seconds || 15,
      sentAt: Date.now()
    });

    console.log(`[Battle] Room ${roomCode} sent Q${pIndex + 1} to ${p.username}`);

    // Per-player auto-advance timer (if player doesn't answer in time)
    const ms = (pQuestion.timer_seconds || 15) * 1000;
    setTimeout(async () => {
      const freshData = await redisClient.hGetAll('gnosis:room:' + roomCode);
      if (!freshData || freshData.status !== 'active') return;

      const freshPlayers = JSON.parse(freshData.players || '[]');
      const fp = freshPlayers.find(x => x.userId === p.userId);
      if (!fp || fp.finished || (fp.currentIndex ?? 0) !== pIndex) return;

      console.log(`[Battle] Room ${roomCode} Q${pIndex + 1} timed out for ${p.username} — advancing`);

      // Auto-advance this player to next question
      const nextIdx = pIndex + 1;
      fp.currentIndex = nextIdx;
      fp.answered = false;

      if (nextIdx >= questions.length) {
        fp.finished = true;
      }

      await updateRoomPlayers(redisClient, roomCode, freshPlayers);

      // Check if all players finished
      const allDone = freshPlayers.every(x => x.finished);
      if (allDone) {
        await endQuiz(io, redisClient, roomCode);
        return;
      }

      if (fp.finished) {
        await notifyWaitingForOpponent(io, redisClient, roomCode, fp.userId);
      }

      // Send next question to this player if not done
      if (!fp.finished) {
        const nextQ = questions[nextIdx];
        const nextQClient = { ...nextQ };
        delete nextQClient.correct_options;
        delete nextQClient.explanation;

        io.to(p.socketId).emit('quiz:question', {
          question: nextQClient,
          qIndex: nextIdx + 1,
          total: questions.length,
          timerSeconds: nextQ.timer_seconds || 15,
          sentAt: Date.now()
        });
      }
    }, ms);
  }

  // Update players with reset answered flags
  await updateRoomPlayers(redisClient, roomCode, players);
};

module.exports = {
  generateRoomCode,
  getRoomPlayers,
  updateRoomPlayers,
  notifyWaitingForOpponent,
  sendNextQuestion,
  endQuiz,
  clearRoomTimer  // NEW EXPORT — handlers.js needs this
};
