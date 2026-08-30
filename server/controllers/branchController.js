const BranchService = require('../services/branchService');

/**
 * GET /api/v1/branches
 */
exports.getAllBranches = async (req, res, next) => {
  try {
    const branches = await BranchService.getAllBranches();
    res.status(200).json({
      success: true,
      message: 'Branches retrieved successfully.',
      data: branches
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/branches
 */
exports.createBranch = async (req, res, next) => {
  try {
    const branch = await BranchService.createBranch(req.body);
    res.status(201).json({
      success: true,
      message: `Branch "${branch.branchName}" created.`,
      data: branch
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/v1/branches/:id/deactivate
 */
exports.deactivateBranch = async (req, res, next) => {
  try {
    const branch = await BranchService.setBranchActive(req.params.id, false);
    res.status(200).json({
      success: true,
      message: `Branch "${branch.branchName}" deactivated.`,
      data: branch
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/v1/branches/:id/activate
 */
exports.activateBranch = async (req, res, next) => {
  try {
    const branch = await BranchService.setBranchActive(req.params.id, true);
    res.status(200).json({
      success: true,
      message: `Branch "${branch.branchName}" reactivated.`,
      data: branch
    });
  } catch (error) {
    next(error);
  }
};
