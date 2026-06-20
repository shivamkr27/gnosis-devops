const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { pool } = require('../db');
const { authenticateToken } = require('../middleware/auth');
const axios = require('axios');
const router = express.Router();

const PROGRESS_SERVICE_URL = process.env.PROGRESS_SERVICE_URL || 'http://localhost:3003';

const validateEmail = (email) => /\S+@\S+\.\S+/.test(email);
const validateUsername = (username) => /^[a-zA-Z0-9]{3,20}$/.test(username);

// ── Register ─────────────────────────────────────────────────────────
router.post('/register', async (req, res) => {
  const { username, email, password, securityQuestion, securityAnswer } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: 'username, email, and password are required' });
  }
  if (!validateUsername(username)) {
    return res.status(400).json({ error: 'username must be 3-20 alphanumeric characters' });
  }
  if (!validateEmail(email)) {
    return res.status(400).json({ error: 'invalid email format' });
  }
  if (typeof password !== 'string' || password.length < 8) {
    return res.status(400).json({ error: 'password must be at least 8 characters' });
  }
  if (!securityQuestion || !securityAnswer || securityAnswer.trim().length < 2) {
    return res.status(400).json({ error: 'securityQuestion and securityAnswer are required' });
  }

  try {
    const passwordHash = await bcrypt.hash(password, 12);

    const result = await pool.query(
      `INSERT INTO users (username, email, password_hash)
       VALUES ($1, $2, $3) RETURNING id`,
      [username, email, passwordHash]
    );
    const userId = result.rows[0].id;

    // Save security question (answer stored as bcrypt hash, lowercased+trimmed)
    const answerHash = await bcrypt.hash(securityAnswer.toLowerCase().trim(), 10);
    await pool.query(
      `INSERT INTO security_questions (user_id, question, answer_hash) VALUES ($1, $2, $3)`,
      [userId, securityQuestion, answerHash]
    );

    // Initialize progress asynchronously — don't block registration on this
    axios.post(`${PROGRESS_SERVICE_URL}/progress/initialize/${userId}`)
      .catch(err => console.error('Progress init failed (non-blocking):', err.message));

    return res.status(201).json({ message: 'registered', userId });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'username or email already exists' });
    }
    console.error('Register error:', error);
    return res.status(500).json({ error: 'internal server error' });
  }
});

// ── Login ─────────────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required' });
  }

  try {
    const result = await pool.query(
      `SELECT id, username, email, password_hash, total_xp, streak_count,
              battle_wins, battle_losses, is_admin
       FROM users WHERE email = $1`,
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'invalid credentials' });
    }

    const user = result.rows[0];
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'invalid credentials' });
    }

    const token = jwt.sign(
      { userId: user.id, username: user.username, isAdmin: user.is_admin === true },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(200).json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        total_xp: user.total_xp,
        streak_count: user.streak_count,
        battle_wins: user.battle_wins,
        battle_losses: user.battle_losses,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'internal server error' });
  }
});

// ── Forgot Password Step 1 — return security question for email ───────
router.post('/forgot-password-step1', async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'email is required' });
  }

  try {
    const result = await pool.query(
      `SELECT u.id, sq.question
       FROM users u
       JOIN security_questions sq ON sq.user_id = u.id
       WHERE u.email = $1`,
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'no account found with that email, or no security question set' });
    }

    // frontend reads res.data.securityQuestion
    return res.json({ securityQuestion: result.rows[0].question });
  } catch (error) {
    console.error('Forgot step1 error:', error);
    return res.status(500).json({ error: 'internal server error' });
  }
});

// ── Forgot Password Step 2 — verify answer and reset password ─────────
router.post('/forgot-password-step2', async (req, res) => {
  const { email, securityAnswer, newPassword } = req.body;

  if (!email || !securityAnswer || !newPassword) {
    return res.status(400).json({ error: 'email, securityAnswer and newPassword are required' });
  }
  if (typeof newPassword !== 'string' || newPassword.length < 8) {
    return res.status(400).json({ error: 'password must be at least 8 characters' });
  }

  try {
    const result = await pool.query(
      `SELECT u.id, sq.answer_hash
       FROM users u
       JOIN security_questions sq ON sq.user_id = u.id
       WHERE u.email = $1`,
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'no account found with that email' });
    }

    const { id: userId, answer_hash } = result.rows[0];
    const answerMatch = await bcrypt.compare(
      securityAnswer.toLowerCase().trim(),
      answer_hash
    );

    if (!answerMatch) {
      return res.status(401).json({ error: 'incorrect security answer' });
    }

    const newHash = await bcrypt.hash(newPassword, 12);
    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [newHash, userId]);

    return res.json({ message: 'password reset successfully' });
  } catch (error) {
    console.error('Forgot step2 error:', error);
    return res.status(500).json({ error: 'internal server error' });
  }
});

// ── All routes below require JWT auth ─────────────────────────────────
router.use(authenticateToken);

// ── /me ───────────────────────────────────────────────────────────────
router.get('/me', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, username, email, total_xp, streak_count, last_active_date,
              battle_wins, battle_losses, created_at
       FROM users WHERE id = $1`,
      [req.user.userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'user not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Me error:', error);
    res.status(500).json({ error: 'internal server error' });
  }
});

// ── User search ───────────────────────────────────────────────────────
router.get('/users/search', async (req, res) => {
  const q = req.query.q || '';
  try {
    const result = await pool.query(
      `SELECT id, username, total_xp, streak_count
       FROM users
       WHERE username ILIKE $1 AND id <> $2
       ORDER BY username LIMIT 20`,
      [`%${q}%`, req.user.userId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({ error: 'internal server error' });
  }
});

// ── Friend request ────────────────────────────────────────────────────
router.post('/friend-request', async (req, res) => {
  const { receiverId } = req.body;
  const requesterId = req.user.userId;

  if (!receiverId) return res.status(400).json({ error: 'receiverId is required' });
  if (receiverId === requesterId) return res.status(400).json({ error: 'cannot send friend request to yourself' });

  try {
    const existing = await pool.query(
      `SELECT id FROM friendships
       WHERE (requester_id = $1 AND receiver_id = $2)
          OR (requester_id = $2 AND receiver_id = $1)`,
      [requesterId, receiverId]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'friend request already exists or users are already connected' });
    }
    await pool.query(
      `INSERT INTO friendships (requester_id, receiver_id, status) VALUES ($1, $2, 'pending')`,
      [requesterId, receiverId]
    );
    res.status(201).json({ message: 'request sent' });
  } catch (error) {
    console.error('Friend request error:', error);
    res.status(500).json({ error: 'internal server error' });
  }
});

// ── Friend request respond ────────────────────────────────────────────
router.post('/friend-request/respond', async (req, res) => {
  const { requesterId, action } = req.body;
  const receiverId = req.user.userId;

  if (!requesterId || !action) return res.status(400).json({ error: 'requesterId and action are required' });
  if (!['accept', 'reject'].includes(action)) return res.status(400).json({ error: 'action must be accept or reject' });

  try {
    if (action === 'accept') {
      await pool.query(
        `UPDATE friendships SET status = 'accepted' WHERE requester_id = $1 AND receiver_id = $2`,
        [requesterId, receiverId]
      );
    } else {
      await pool.query(
        `DELETE FROM friendships WHERE requester_id = $1 AND receiver_id = $2`,
        [requesterId, receiverId]
      );
    }
    res.json({ message: 'done' });
  } catch (error) {
    console.error('Friend request respond error:', error);
    res.status(500).json({ error: 'internal server error' });
  }
});

// ── Friends list ──────────────────────────────────────────────────────
router.get('/friends', async (req, res) => {
  const userId = req.user.userId;
  try {
    const result = await pool.query(
      `SELECT u.id, u.username, u.total_xp, u.streak_count
       FROM friendships f
       JOIN users u ON (
         (f.requester_id = $1 AND f.receiver_id = u.id)
         OR (f.receiver_id = $1 AND f.requester_id = u.id)
       )
       WHERE f.status = 'accepted'`,
      [userId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Friends error:', error);
    res.status(500).json({ error: 'internal server error' });
  }
});

// ── Pending friend requests ───────────────────────────────────────────
router.get('/friend-requests/pending', async (req, res) => {
  const userId = req.user.userId;
  try {
    const result = await pool.query(
      `SELECT f.id, f.created_at, u.id AS requester_id, u.username
       FROM friendships f
       JOIN users u ON u.id = f.requester_id
       WHERE f.receiver_id = $1 AND f.status = 'pending'
       ORDER BY f.created_at DESC`,
      [userId]
    );
    res.json(result.rows.map(row => ({
      id: row.id,
      requester: { id: row.requester_id, username: row.username },
      created_at: row.created_at,
    })));
  } catch (error) {
    console.error('Pending friend requests error:', error);
    res.status(500).json({ error: 'internal server error' });
  }
});

module.exports = router;
