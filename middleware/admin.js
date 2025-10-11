// Grant access to specific roles
exports.admin = (req, res, next) => {
  // `req.user` is populated by the `protect` middleware
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, msg: `User role ${req.user.role} is not authorized to access this route` });
  }
  next();
};