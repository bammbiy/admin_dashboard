const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { readJson, writeJson } = require('../utils/dataStore');
const { hashPassword } = require('../utils/password');

function sanitizeUser(user) {
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

router.get('/', authMiddleware, (req, res) => {
  const users = readJson('users.json', []);
  res.json(users.map(sanitizeUser));
});

router.post('/', authMiddleware, (req, res) => {
  const { username, name, role, status, password } = req.body;
  const users = readJson('users.json', []);

  if (!username || !name || !password) {
    return res.status(400).json({ message: 'Username, name, and password are required.' });
  }

  if (users.some((user) => user.username === username)) {
    return res.status(409).json({ message: 'Username already exists.' });
  }

  const passwordData = hashPassword(password);
  const user = {
    id: `usr_${Date.now()}`,
    username,
    name,
    role: role || 'viewer',
    status: status || 'active',
    passwordHash: passwordData.hash,
    salt: passwordData.salt,
    createdAt: new Date().toISOString(),
    lastLoginAt: null
  };

  users.push(user);
  writeJson('users.json', users);
  res.status(201).json(sanitizeUser(user));
});

router.patch('/:id', authMiddleware, (req, res) => {
  const users = readJson('users.json', []);
  const user = users.find((item) => item.id === req.params.id);

  if (!user) {
    return res.status(404).json({ message: 'User not found.' });
  }

  const { name, role, status, password } = req.body;

  if (name) user.name = name;
  if (role) user.role = role;
  if (status) user.status = status;

  if (password) {
    const passwordData = hashPassword(password);
    user.passwordHash = passwordData.hash;
    user.salt = passwordData.salt;
  }

  writeJson('users.json', users);
  res.json(sanitizeUser(user));
});

router.delete('/:id', authMiddleware, (req, res) => {
  const users = readJson('users.json', []);
  const user = users.find((item) => item.id === req.params.id);

  if (!user) {
    return res.status(404).json({ message: 'User not found.' });
  }

  if (user.username === req.session.user.username) {
    return res.status(400).json({ message: 'You cannot delete your own account.' });
  }

  writeJson('users.json', users.filter((item) => item.id !== req.params.id));
  res.status(204).end();
});

module.exports = router;
