/**
 * Express middleware to restrict route access to specific authenticated roles.
 * Must be mounted AFTER authGuard middleware.
 * 
 * @param {Array<string>} allowedRoles - List of roles permitted to access the route
 */
const roleGuard = (allowedRoles) => {
  return (req, res, next) => {
    // Safety check in case authGuard was not registered before roleGuard
    if (!req.user) {
      const error = new Error('Access denied. Authentication is required before checking roles.');
      error.statusCode = 401;
      return next(error);
    }

    // Check if the current user's role is permitted
    if (!allowedRoles.includes(req.user.role)) {
      const error = new Error('Access denied. Insufficient permissions to perform this operation.');
      error.statusCode = 403;
      return next(error);
    }

    next();
  };
};

module.exports = roleGuard;
