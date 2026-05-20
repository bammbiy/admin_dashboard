const { readJson } = require('../utils/dataStore');

module.exports = (req, res, next) => {
  const blockedIps = readJson('blockedIps.json', []);

  if (blockedIps.some((entry) => entry.ip === req.ip)) {
    return res.status(403).json({ message: 'Access denied' });
  }

  next();
};
