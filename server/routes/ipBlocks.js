const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { readJson, writeJson } = require('../utils/dataStore');

router.get('/', authMiddleware, (req, res) => {
  res.json(readJson('blockedIps.json', []));
});

router.post('/', authMiddleware, (req, res) => {
  const { ip, reason } = req.body;

  if (!ip) {
    return res.status(400).json({ message: 'IP address is required.' });
  }

  const blockedIps = readJson('blockedIps.json', []);

  if (blockedIps.some((entry) => entry.ip === ip)) {
    return res.status(409).json({ message: 'IP address is already blocked.' });
  }

  const entry = {
    ip,
    reason: reason || 'Manual block',
    createdAt: new Date().toISOString()
  };

  blockedIps.push(entry);
  writeJson('blockedIps.json', blockedIps);
  res.status(201).json(entry);
});

router.delete('/:ip', authMiddleware, (req, res) => {
  const blockedIps = readJson('blockedIps.json', []);
  writeJson(
    'blockedIps.json',
    blockedIps.filter((entry) => entry.ip !== req.params.ip)
  );

  res.status(204).end();
});

module.exports = router;
