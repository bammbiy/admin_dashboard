const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { readAccessLogs } = require('../utils/dataStore');

router.get('/', authMiddleware, (req, res) => {
  res.json(readAccessLogs().slice(0, 200));
});

module.exports = router;
