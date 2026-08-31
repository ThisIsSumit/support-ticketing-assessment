const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const RefreshToken = require('../models/RefreshToken');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function signAccessToken(user) {
  return jwt.sign(
    { sub: user._id.toString(), role: user.role, email: user.email },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: '15m' }
  );
}

async function issueRefreshToken(userId) {
  const raw = crypto.randomBytes(40).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(raw).digest('hex');
  await RefreshToken.create({
    userId,
    tokenHash,
    expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
  });
  return raw;
}

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email: email?.toLowerCase() });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }
  const accessToken = signAccessToken(user);
  const refreshToken = await issueRefreshToken(user._id);
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true, secure: true, sameSite: 'none', maxAge: REFRESH_TTL_MS,
  });
  res.json({ accessToken, user: { id: user._id, email: user.email, name: user.name, role: user.role } });
});

router.post('/refresh', async (req, res) => {
  const raw = req.cookies?.refreshToken;
  if (!raw) return res.status(401).json({ error: 'No refresh token' });

  const tokenHash = crypto.createHash('sha256').update(raw).digest('hex');
  const stored = await RefreshToken.findOne({ tokenHash });
  if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
    return res.status(401).json({ error: 'Refresh token invalid or expired' });
  }
  const user = await User.findById(stored.userId);
  res.json({ accessToken: signAccessToken(user) });
});

router.post('/logout', async (req, res) => {
  const raw = req.cookies?.refreshToken;
  if (raw) {
    const tokenHash = crypto.createHash('sha256').update(raw).digest('hex');
    await RefreshToken.updateOne({ tokenHash }, { revokedAt: new Date() });
  }
  res.clearCookie('refreshToken');
  res.json({ ok: true });
});

router.get('/me', requireAuth, async (req, res) => {
  const user = await User.findById(req.user.sub).select('-passwordHash');
  res.json(user);
});
module.exports = router;
