const mongoose = require('mongoose');
const Branch = require('../models/Branch');

/**
 * Resolves the branch scope for this request into req.branchScope:
 *   - filter: a Mongo filter fragment to merge into read queries.
 *             {} means "all branches" (Super Admin central view).
 *             { branchId } means scoped to one branch.
 *   - writeBranchId: the single branch id to stamp on newly created records.
 *             undefined when the scope is "all branches" — a record can't be
 *             filed into "all branches" at once, so any create action must
 *             check this and reject with a clear error when it's missing.
 *
 * Service Advisor/Technician are always forced to their own
 * req.user.branchId, regardless of any X-Active-Branch-Id header they send
 * — enforced here, server-side, not just hidden in the UI.
 *
 * Super Admin: no header (or header "all") = central, all-branches scope.
 * A real, active branch id in the header = scoped to that one branch.
 *
 * Must run after authGuard (needs req.user).
 */
const branchScope = async (req, res, next) => {
  try {
    if (!req.user) {
      const error = new Error('Access denied. Authentication is required before resolving branch scope.');
      error.statusCode = 401;
      return next(error);
    }

    if (req.user.role !== 'Super Admin') {
      const branchId = req.user.branchId;
      req.branchScope = { filter: { branchId }, writeBranchId: branchId };
      return next();
    }

    const headerValue = req.headers['x-active-branch-id'];

    if (!headerValue || headerValue === 'all') {
      req.branchScope = { filter: {}, writeBranchId: undefined };
      return next();
    }

    if (!mongoose.Types.ObjectId.isValid(headerValue)) {
      const error = new Error('Invalid active branch selection.');
      error.statusCode = 400;
      return next(error);
    }

    const branch = await Branch.findOne({ _id: headerValue, isDeleted: false, isActive: true });
    if (!branch) {
      const error = new Error('Selected branch is invalid or currently inactive.');
      error.statusCode = 400;
      return next(error);
    }

    req.branchScope = { filter: { branchId: branch._id }, writeBranchId: branch._id };
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = branchScope;
