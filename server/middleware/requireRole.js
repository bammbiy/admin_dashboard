const roleLevels = {
  viewer: 1,
  manager: 2,
  admin: 3
};

module.exports = (minimumRole) => (req, res, next) => {
  const userRole = req.session.user?.role;

  if (!userRole || roleLevels[userRole] < roleLevels[minimumRole]) {
    return res.status(403).json({ message: 'You do not have permission for this action.' });
  }

  next();
};
