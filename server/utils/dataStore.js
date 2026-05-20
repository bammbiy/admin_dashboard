const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '../data');
const logsDir = path.join(__dirname, '../logs');

function readJson(fileName, fallback) {
  const filePath = path.join(dataDir, fileName);

  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    return fallback;
  }
}

function writeJson(fileName, data) {
  const filePath = path.join(dataDir, fileName);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function readAccessLogs() {
  const filePath = path.join(logsDir, 'access.log');

  if (!fs.existsSync(filePath)) {
    return [];
  }

  return fs
    .readFileSync(filePath, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const match = line.match(/^\[(.+)] (.+) (.+) (.+) (\d+)$/);

      if (!match) {
        return { raw: line };
      }

      return {
        timestamp: match[1],
        ip: match[2],
        method: match[3],
        url: match[4],
        status: Number(match[5])
      };
    })
    .reverse();
}

module.exports = {
  readJson,
  writeJson,
  readAccessLogs
};
