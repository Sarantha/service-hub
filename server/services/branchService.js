const mongoose = require('mongoose');
const Branch = require('../models/Branch');

class BranchService {
  /**
   * Lists all non-deleted branches (active and inactive). Selectors used for
   * new-transaction pickers (assigning staff, switching working context)
   * filter to isActive:true client-side; the Super Admin's branch-management
   * list in Settings needs to see inactive branches too, to reactivate them.
   */
  static async getAllBranches() {
    return Branch.find({ isDeleted: false }).sort({ branchName: 1 }).lean();
  }

  /**
   * Creates a new branch (Super Admin only, enforced at the route).
   * Uniqueness on name/code is enforced here, scoped to non-deleted branches
   * — not a schema-level unique index, which would permanently block reusing
   * a name/code after a branch is soft-deleted (the same class of bug found
   * and fixed on Inventory.sku and InventoryCategory.name).
   */
  static async createBranch({ branchName, code }) {
    const trimmedName = (branchName || '').trim();
    const trimmedCode = (code || '').trim().toUpperCase();

    if (!trimmedName) {
      const error = new Error('Branch name is required.');
      error.statusCode = 400;
      throw error;
    }
    if (!trimmedCode) {
      const error = new Error('Branch code is required.');
      error.statusCode = 400;
      throw error;
    }

    const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    const existingName = await Branch.findOne({
      branchName: { $regex: `^${escape(trimmedName)}$`, $options: 'i' },
      isDeleted: false
    });
    if (existingName) {
      const error = new Error(`Branch "${existingName.branchName}" already exists.`);
      error.statusCode = 400;
      throw error;
    }

    const existingCode = await Branch.findOne({
      code: { $regex: `^${escape(trimmedCode)}$`, $options: 'i' },
      isDeleted: false
    });
    if (existingCode) {
      const error = new Error(`Branch code "${existingCode.code}" is already in use.`);
      error.statusCode = 400;
      throw error;
    }

    return Branch.create({ branchName: trimmedName, code: trimmedCode, isActive: true });
  }

  /**
   * Toggles a branch's active flag. This is NOT a soft delete — a branch
   * that already owns Job Cards/Invoices must stay queryable in reports and
   * branch-scoped views forever. Deactivating only removes it from
   * new-assignment/new-transaction pickers (new staff, new active-branch
   * selection for writes).
   */
  static async setBranchActive(branchId, isActive) {
    if (!mongoose.Types.ObjectId.isValid(branchId)) {
      const error = new Error('Invalid branch ID format.');
      error.statusCode = 400;
      throw error;
    }

    const branch = await Branch.findOneAndUpdate(
      { _id: branchId, isDeleted: false },
      { $set: { isActive } },
      { new: true }
    );

    if (!branch) {
      const error = new Error('Branch not found.');
      error.statusCode = 404;
      throw error;
    }

    return branch;
  }
}

module.exports = BranchService;
