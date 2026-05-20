const fs = require('fs');
const path = require('path');

const logFile = path.join(__dirname, '../logs/access.log');

module.exports = (req, res, next) => {
  res.on('finish', () => {
    const log = `[${new Date().toISOString()}] ${req.ip} ${req.method} ${req.originalUrl} ${res.statusCode}\n`;

    fs.appendFile(logFile, log, (err) => {
      if (err) {
        console.error('Log write error');
      }
    });
  });

  next();
};
