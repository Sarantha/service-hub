const User = require('../models/User');
const Branch = require('../models/Branch');
const jwt = require('jsonwebtoken');

class AuthService {
  /**
   * Generates a JWT token for the user.
   */
  static generateToken(userId) {
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET is missing from environment configurations.');
    }
    return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
      expiresIn: '24h'
    });
  }

  /**
   * Handles user registration logic.
   */
  static async registerUser({ name, email, password, role, branchId }) {
    // 1. Enforce unique emails among active accounts — a soft-deleted
    // account's email is free to reuse (e.g. rehiring, or retrying after a
    // typo in a since-removed account).
    const existingUser = await User.findOne({ email: email.toLowerCase(), isDeleted: false });
    if (existingUser) {
      const error = new Error('Email is already registered under another account.');
      error.statusCode = 400;
      throw error;
    }

    let resolvedBranchId = branchId;

    if (!resolvedBranchId) {
      // Super Admin has no fixed branch by default (they may own/manage
      // several) — only Advisor/Technician fall back to the default branch.
      if (role !== 'Super Admin') {
        const defaultBranch = await Branch.findOne({ code: 'CMB-01', isDeleted: false });
        if (!defaultBranch) {
          const error = new Error('System setup error. Default branch (CMB-01) is missing.');
          error.statusCode = 500;
          throw error;
        }
        resolvedBranchId = defaultBranch._id;
      }
    } else {
      const targetBranch = await Branch.findOne({ _id: resolvedBranchId, isDeleted: false, isActive: true });
      if (!targetBranch) {
        const error = new Error('Specified branch is invalid or currently offline.');
        error.statusCode = 400;
        throw error;
      }
    }

    // 3. Create user record (pre-save middleware handles bcrypt hashing)
    const newUser = await User.create({
      name,
      email: email.toLowerCase(),
      password,
      role: role || 'Technician',
      ...(resolvedBranchId ? { branchId: resolvedBranchId } : {})
    });

    const userObject = newUser.toObject();
    delete userObject.password; // Do not return the hashed password in API responses

    return userObject;
  }

  /**
   * Handles user login and verification.
   */
  static async loginUser({ email, password }) {
    if (!email || !password) {
      const error = new Error('Both email and password are required credentials.');
      error.statusCode = 400;
      throw error;
    }

    // 1. Fetch user (ensure non-deleted profile)
    const user = await User.findOne({ email: email.toLowerCase(), isDeleted: false });
    if (!user) {
      const error = new Error('Invalid email or password credentials.');
      error.statusCode = 401;
      throw error;
    }

    // 2. Validate status checks
    if (user.status !== 'Active') {
      const error = new Error('Access denied. Your user account is suspended.');
      error.statusCode = 401;
      throw error;
    }

    // 3. Match credential secrets
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      const error = new Error('Invalid email or password credentials.');
      error.statusCode = 401;
      throw error;
    }

    // 4. Sign standard JSON Web Token
    const token = this.generateToken(user._id);

    const userObject = user.toObject();
    delete userObject.password; // Scrub secret info before return

    return {
      token,
      user: userObject
    };
  }
}

module.exports = AuthService;
