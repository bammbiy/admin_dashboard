const express = require('express');
const router = express.Router();
const { readJson, writeJson } = require('../utils/dataStore');
const { verifyPassword } = require('../utils/password');

const loginAttempts = {};
const MAX_ATTEMPTS = 5;
const LOCK_TIME = 10 * 60 * 1000;

function publicUser(user) {
  return {
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
    status: user.status,
    createdAt: user.createdAt,
    lastLoginAt: user.lastLoginAt
  };
}

router.post('/login', (req, res) => {
  const ip = req.ip;
  const { username, password } = req.body;

  loginAttempts[ip] = loginAttempts[ip] || { count: 0, lockedUntil: null };

  if (loginAttempts[ip].lockedUntil && loginAttempts[ip].lockedUntil > Date.now()) {
    return res.status(429).json({ message: 'Too many attempts. Try again later.' });
  }

  const users = readJson('users.json', []);
  const user = users.find((item) => item.username === username);
  const isValid = user && user.status === 'active' && verifyPassword(password, user.passwordHash, user.salt);

  if (!isValid) {
    loginAttempts[ip].count += 1;

    if (loginAttempts[ip].count >= MAX_ATTEMPTS) {
      loginAttempts[ip].lockedUntil = Date.now() + LOCK_TIME;
    }

    return res.status(401).json({ message: 'Invalid credentials' });
  }

  user.lastLoginAt = new Date().toISOString();
  writeJson('users.json', users);

  loginAttempts[ip] = { count: 0, lockedUntil: null };
  req.session.user = publicUser(user);
  res.json({ message: 'Login success', user: req.session.user });
});

router.get('/me', (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  res.json(req.session.user);
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ message: 'Logged out' });
  });
});

module.exports = router;
