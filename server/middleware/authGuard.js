const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authGuard = async (req, res, next) => {
  try {
    let token;

    // Check for token in Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      const error = new Error('Authentication failed. Authorization header is missing or empty.');
      error.statusCode = 401;
      return next(error);
    }

    // Verify JWT token signature
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Find active, non-deleted user
    const user = await User.findOne({ _id: decoded.id, isDeleted: false });

    if (!user) {
      const error = new Error('Authentication failed. User profile no longer exists.');
      error.statusCode = 401;
      return next(error);
    }

    if (user.status !== 'Active') {
      const error = new Error('Authentication failed. Your account has been suspended.');
      error.statusCode = 401;
      return next(error);
    }

    // Attach user payload to the request object (excluding private password values)
    req.user = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      branchId: user.branchId
    };

    next();
  } catch (error) {
    next(error); // central error handler will format TokenExpiredError and JsonWebTokenError
  }
};

module.exports = authGuard;
