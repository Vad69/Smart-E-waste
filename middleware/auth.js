const jwt = require('jsonwebtoken');

module.exports = function(req, res, next) {
  // Get token from header
  const token = req.header('x-auth-token');

  // Check if no token
  if (!token) {
    return res.status(401).json({ error: 'No token, authorization denied' });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded.user;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Token is not valid' });
  }
};

// Middleware to check if user has specific role
module.exports.requireRole = function(roles) {
  return function(req, res, next) {
    if (!req.user) {
      return res.status(401).json({ error: 'No token, authorization denied' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    next();
  };
};

// Middleware to check if user is admin
module.exports.requireAdmin = function(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'No token, authorization denied' });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  next();
};

// Middleware to check if user is manager or admin
module.exports.requireManager = function(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'No token, authorization denied' });
  }

  if (!['admin', 'manager'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Manager access required' });
  }

  next();
};