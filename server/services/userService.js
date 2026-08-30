const mongoose = require('mongoose');
const User = require('../models/User');
const Branch = require('../models/Branch');
const AuthService = require('./authService');
const { generateTemporaryPassword } = require('../utils/passwordGenerator');

const VALID_ROLES = ['Super Admin', 'Service Advisor', 'Technician'];

class UserService {
  /**
   * Lists active staff accounts (password never included).
   */
  static async getAllUsers() {
    return User.find({ isDeleted: false })
      .select('-password -__v')
      .sort({ createdAt: -1 })
      .lean();
  }

  /**
   * Creates a new staff account on behalf of the acting Super Admin.
   *
   * Security: requires the ACTING admin's own current password to be
   * re-supplied and verified (step-up re-authentication) before a new
   * privileged account can be created — a stolen/left-open session alone
   * is not enough to mint new accounts. A strong temporary password is
   * generated server-side (never chosen by the admin) and returned exactly
   * once in the response; it is never logged or persisted in plaintext.
   */
  static async createUser({ name, email, role, branchId, currentPassword }, actingAdminId) {
    if (!currentPassword) {
      const error = new Error('Please re-enter your password to confirm this action.');
      error.statusCode = 400;
      throw error;
    }

    if (!VALID_ROLES.includes(role)) {
      const error = new Error(`Role must be one of: ${VALID_ROLES.join(', ')}.`);
      error.statusCode = 400;
      throw error;
    }

    const actingAdmin = await User.findOne({ _id: actingAdminId, isDeleted: false });
    if (!actingAdmin) {
      const error = new Error('Acting admin account not found.');
      error.statusCode = 401;
      throw error;
    }

    const isMatch = await actingAdmin.comparePassword(currentPassword);
    if (!isMatch) {
      // 403, not 401: the admin's session/JWT is perfectly valid — this is a
      // failed step-up re-auth check for one specific sensitive action, not
      // an expired/invalid session. The frontend's global 401 handler treats
      // any 401 as "your session expired, log out and redirect to /login",
      // which would otherwise silently sign the admin out on a mistyped
      // password before they ever see why it failed.
      const error = new Error('Incorrect password. Please re-enter your password to confirm this action.');
      error.statusCode = 403;
      throw error;
    }

    const temporaryPassword = generateTemporaryPassword();

    // The new user's branch is whichever branch the acting admin picked in
    // the form — NOT inherited from the acting admin's own branchId, since a
    // Super Admin may not have one (they can manage several branches) and,
    // even when they do, a new Advisor/Technician should be assignable to
    // any branch, not automatically the admin's own.
    const newUser = await AuthService.registerUser({
      name,
      email,
      password: temporaryPassword,
      role,
      branchId
    });

    return { user: newUser, temporaryPassword };
  }

  /**
   * Updates a staff account's name/role/status. Does not touch the
   * password — there is no "change my own password" flow yet, so this is
   * intentionally scoped to profile/role/status fields only.
   */
  static async updateUser(userId, { name, role, status, branchId }) {
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (status !== undefined) updates.status = status;
    if (role !== undefined) {
      if (!VALID_ROLES.includes(role)) {
        const error = new Error(`Role must be one of: ${VALID_ROLES.join(', ')}.`);
        error.statusCode = 400;
        throw error;
      }
      updates.role = role;
    }
    if (branchId !== undefined) {
      if (!mongoose.Types.ObjectId.isValid(branchId)) {
        const error = new Error('Invalid branch ID format.');
        error.statusCode = 400;
        throw error;
      }
      const targetBranch = await Branch.findOne({ _id: branchId, isDeleted: false, isActive: true });
      if (!targetBranch) {
        const error = new Error('Specified branch is invalid or currently offline.');
        error.statusCode = 400;
        throw error;
      }
      updates.branchId = branchId;
    }

    const user = await User.findOneAndUpdate(
      { _id: userId, isDeleted: false },
      { $set: updates },
      { new: true, runValidators: true }
    ).select('-password -__v');

    if (!user) {
      const error = new Error('User not found.');
      error.statusCode = 404;
      throw error;
    }

    return user;
  }

  /**
   * Soft-deletes a staff account (Guardrail #5). Guards against two ways an
   * admin could accidentally lock the station out of administration:
   *  - removing their own account
   *  - removing the last remaining active Super Admin
   */
  static async deleteUser(userId, actingAdminId) {
    if (String(userId) === String(actingAdminId)) {
      const error = new Error('You cannot remove your own account.');
      error.statusCode = 400;
      throw error;
    }

    const user = await User.findOne({ _id: userId, isDeleted: false });
    if (!user) {
      const error = new Error('User not found.');
      error.statusCode = 404;
      throw error;
    }

    if (user.role === 'Super Admin') {
      const otherActiveSuperAdmins = await User.countDocuments({
        _id: { $ne: userId },
        role: 'Super Admin',
        isDeleted: false
      });
      if (otherActiveSuperAdmins === 0) {
        const error = new Error('Cannot remove the last remaining Super Admin account.');
        error.statusCode = 400;
        throw error;
      }
    }

    user.isDeleted = true;
    await user.save();

    return { message: `${user.name}'s account has been removed.` };
  }
}

module.exports = UserService;
