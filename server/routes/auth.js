const express = require('express');
const router = express.Router();
const users = require('../data/users.json');

const loginAttempts = {};

router.post('/login', (req, res) => {
  const ip = req.ip;
  const { username, password } = req.body;

  loginAttempts[ip] = loginAttempts[ip] || 0;

  if (loginAttempts[ip] >= 5) {
    return res.status(429).json({ message: 'Too many attempts' });
  }

  const user = users.find(
    u => u.username === username && u.password === password
  );

  if (!user) {
    loginAttempts[ip]++;
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  loginAttempts[ip] = 0;
  req.session.user = { username: user.username };
  res.json({ message: 'Login success' });
});

router.post('/logout', (req, res) => {
  req.session.destroy();
  res.json({ message: 'Logged out' });
});

module.exports = router;
