const { readJson, writeJson } = require('./dataStore');

function writeAuditLog(req, action, target, detail = '') {
  const auditLogs = readJson('auditLogs.json', []);
  const entry = {
    id: `aud_${Date.now()}_${Math.random().toString(16).slice(2)}`,
    timestamp: new Date().toISOString(),
    actor: req.session.user?.username || 'anonymous',
    role: req.session.user?.role || 'unknown',
    ip: req.ip,
    action,
    target,
    detail
  };

  auditLogs.unshift(entry);
  writeJson('auditLogs.json', auditLogs.slice(0, 500));
}

module.exports = {
  writeAuditLog
};
