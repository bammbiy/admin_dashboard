const blockedIps = ['123.123.123.123'];

module.exports = (req, res, next) => {
  if (blockedIps.includes(req.ip)) {
    return res.status(403).json({ message: 'Access denied' });
  }
  next();
};
