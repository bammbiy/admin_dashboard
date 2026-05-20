const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { readAccessLogs, readJson } = require('../utils/dataStore');

router.get('/', authMiddleware, (req, res) => {
  const { ip, status, method } = req.query;
  const logs = readAccessLogs()
    .filter((log) => !ip || log.ip?.includes(ip))
    .filter((log) => !status || String(log.status) === String(status))
    .filter((log) => !method || log.method === method)
    .slice(0, 200);

  res.json(logs);
});

router.get('/audit', authMiddleware, (req, res) => {
  res.json(readJson('auditLogs.json', []).slice(0, 200));
});

module.exports = router;
