const fs = require('fs');
const path = require('path');

const logFile = path.join(__dirname, '../logs/access.log');

module.exports = (req, res, next) => {
  const log = `[${new Date().toISOString()}] ${req.ip} ${req.method} ${req.originalUrl}\n`;

  fs.appendFile(logFile, log, (err) => {
    if (err) {
      console.error('Log write error');
    }
  });

  next();
};
