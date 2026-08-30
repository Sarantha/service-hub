const UserService = require('../services/userService');

/**
 * GET /api/v1/users
 */
exports.getAllUsers = async (req, res, next) => {
  try {
    const users = await UserService.getAllUsers();
    res.status(200).json({
      success: true,
      message: 'Users retrieved successfully.',
      data: users
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/users
 * Requires the acting Super Admin's own password (step-up re-auth).
 */
exports.createUser = async (req, res, next) => {
  try {
    const { user, temporaryPassword } = await UserService.createUser(req.body, req.user.id);
    res.status(201).json({
      success: true,
      message: `${user.name}'s account has been created.`,
      data: { user, temporaryPassword }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/v1/users/:id
 */
exports.updateUser = async (req, res, next) => {
  try {
    const user = await UserService.updateUser(req.params.id, req.body);
    res.status(200).json({
      success: true,
      message: 'User updated successfully.',
      data: user
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/v1/users/:id
 */
exports.deleteUser = async (req, res, next) => {
  try {
    const result = await UserService.deleteUser(req.params.id, req.user.id);
    res.status(200).json({
      success: true,
      message: result.message,
      data: null
    });
  } catch (error) {
    next(error);
  }
};
