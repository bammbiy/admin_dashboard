const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const users = require('../data/users.json');

router.get('/', authMiddleware, (req, res) => {
  res.json(users);
});

module.exports = router;
