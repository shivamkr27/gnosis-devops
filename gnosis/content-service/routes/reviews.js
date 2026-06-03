const express = require('express');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const db = require('../db');

const router = express.Router();

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'shivamkumarbxr8@gmail.com';
const SMTP_USER   = process.env.SMTP_USER;
const SMTP_PASS   = process.env.SMTP_PASS;
const SITE_URL    = process.env.SITE_URL || 'http://80.225.228.31';

function getTransporter() {
  if (!SMTP_USER || !SMTP_PASS) return null;
  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
}

async function sendReviewEmail(review, approveToken, rejectToken) {
  const transporter = getTransporter();
  if (!transporter) {
    console.log('[reviews] SMTP not configured — email skipped. Set SMTP_USER + SMTP_PASS.');
    return;
  }

  const approveUrl = `${SITE_URL}/api/content/reviews/approve/${approveToken}`;
  const rejectUrl  = `${SITE_URL}/api/content/reviews/reject/${rejectToken}`;
  const stars = '⭐'.repeat(review.rating);

  await transporter.sendMail({
    from: SMTP_USER,
    to: ADMIN_EMAIL,
    subject: `New GNOSIS Review from ${review.reviewer_name}`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
        <h2 style="color:#1a1a1a">New Review Submitted</h2>
        <div style="background:#f9f9f9;border-radius:12px;padding:20px;margin:16px 0">
          <p style="font-size:20px;margin:0 0 8px">${stars}</p>
          <p style="font-size:16px;font-style:italic;color:#333">"${review.review_text}"</p>
          <p style="color:#666;margin-top:12px">— <strong>${review.reviewer_name}</strong></p>
        </div>
        <div style="display:flex;gap:12px;margin-top:24px">
          <a href="${approveUrl}"
             style="background:#16a34a;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block">
            ✅ Keep It (Approve)
          </a>
          &nbsp;&nbsp;
          <a href="${rejectUrl}"
             style="background:#dc2626;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block">
            🗑 Remove It (Reject)
          </a>
        </div>
        <p style="color:#999;font-size:12px;margin-top:24px">
          Submitted at ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
        </p>
      </div>
    `,
  });
}

// POST /content/reviews — public, no auth
router.post('/', async (req, res) => {
  const { reviewer_name, review_text, rating } = req.body;

  if (!reviewer_name || !reviewer_name.trim()) {
    return res.status(400).json({ error: 'reviewer_name is required' });
  }
  if (!review_text || review_text.trim().length < 10) {
    return res.status(400).json({ error: 'review_text must be at least 10 characters' });
  }
  const ratingNum = Number(rating) || 5;
  if (ratingNum < 1 || ratingNum > 5) {
    return res.status(400).json({ error: 'rating must be 1-5' });
  }

  const approveToken = crypto.randomBytes(32).toString('hex');
  const rejectToken  = crypto.randomBytes(32).toString('hex');

  try {
    const result = await db.query(
      `INSERT INTO reviews (reviewer_name, review_text, rating, approve_token, reject_token)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [reviewer_name.trim(), review_text.trim(), ratingNum, approveToken, rejectToken]
    );

    await sendReviewEmail(
      { reviewer_name: reviewer_name.trim(), review_text: review_text.trim(), rating: ratingNum },
      approveToken,
      rejectToken
    );

    res.status(201).json({ message: 'Review submitted! It will appear after approval.', id: result.rows[0].id });
  } catch (err) {
    console.error('Review submit error:', err);
    res.status(500).json({ error: 'Failed to submit review' });
  }
});

// GET /content/reviews/approved — public, no auth
router.get('/approved', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, reviewer_name, review_text, rating, created_at
       FROM reviews
       WHERE status = 'approved'
       ORDER BY created_at DESC
       LIMIT 10`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Reviews fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

// GET /content/reviews/approve/:token — email link, no auth
router.get('/approve/:token', async (req, res) => {
  const { token } = req.params;
  try {
    const result = await db.query(
      `UPDATE reviews SET status = 'approved'
       WHERE approve_token = $1 AND status = 'pending'
       RETURNING reviewer_name`,
      [token]
    );
    if (!result.rowCount) {
      return res.status(404).send('<html><body style="font-family:sans-serif;text-align:center;padding:60px"><h2>Link already used or not found.</h2></body></html>');
    }
    res.send(`<html><body style="font-family:sans-serif;text-align:center;padding:60px;background:#f0fdf4">
      <h2 style="color:#16a34a">✅ Review Approved!</h2>
      <p>Review by <strong>${result.rows[0].reviewer_name}</strong> is now live on GNOSIS.</p>
      <a href="${SITE_URL}" style="color:#1a1a1a">← Go to site</a>
    </body></html>`);
  } catch (err) {
    console.error('Approve error:', err);
    res.status(500).send('<html><body><p>Error approving review.</p></body></html>');
  }
});

// GET /content/reviews/reject/:token — email link, no auth
router.get('/reject/:token', async (req, res) => {
  const { token } = req.params;
  try {
    const result = await db.query(
      `UPDATE reviews SET status = 'rejected'
       WHERE reject_token = $1 AND status = 'pending'
       RETURNING reviewer_name`,
      [token]
    );
    if (!result.rowCount) {
      return res.status(404).send('<html><body style="font-family:sans-serif;text-align:center;padding:60px"><h2>Link already used or not found.</h2></body></html>');
    }
    res.send(`<html><body style="font-family:sans-serif;text-align:center;padding:60px;background:#fef2f2">
      <h2 style="color:#dc2626">🗑 Review Removed</h2>
      <p>Review by <strong>${result.rows[0].reviewer_name}</strong> has been rejected.</p>
      <a href="${SITE_URL}" style="color:#1a1a1a">← Go to site</a>
    </body></html>`);
  } catch (err) {
    console.error('Reject error:', err);
    res.status(500).send('<html><body><p>Error rejecting review.</p></body></html>');
  }
});

module.exports = router;
