const mongoose = require('mongoose');
const InventoryCategory = require('../models/InventoryCategory');
const Inventory = require('../models/Inventory');

class InventoryCategoryService {
  /**
   * Lists active categories, alphabetically — used to populate the Category
   * dropdown on the Add/Edit Inventory Item forms.
   */
  static async getAllCategories() {
    return InventoryCategory.find({ isDeleted: false }).sort({ name: 1 }).lean();
  }

  /**
   * Adds a new product category (Super Admin only, enforced at the route).
   */
  static async createCategory(name) {
    const trimmedName = (name || '').trim();
    if (!trimmedName) {
      const error = new Error('Category name is required.');
      error.statusCode = 400;
      throw error;
    }

    const existing = await InventoryCategory.findOne({
      name: { $regex: `^${trimmedName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' },
      isDeleted: false
    });
    if (existing) {
      const error = new Error(`Category "${existing.name}" already exists.`);
      error.statusCode = 400;
      throw error;
    }

    return InventoryCategory.create({ name: trimmedName });
  }

  /**
   * Soft-deletes a category (Guardrail #5). Refuses to remove a category
   * that's still in use by any active inventory item — deleting it would
   * silently orphan that item's category value.
   */
  static async deleteCategory(categoryId) {
    if (!mongoose.Types.ObjectId.isValid(categoryId)) {
      const error = new Error('Invalid category ID format.');
      error.statusCode = 400;
      throw error;
    }

    const category = await InventoryCategory.findOne({ _id: categoryId, isDeleted: false });
    if (!category) {
      const error = new Error('Category not found.');
      error.statusCode = 404;
      throw error;
    }

    const inUseCount = await Inventory.countDocuments({ category: category.name, isDeleted: false });
    if (inUseCount > 0) {
      const error = new Error(`Cannot remove "${category.name}" — it is still used by ${inUseCount} inventory item${inUseCount === 1 ? '' : 's'}.`);
      error.statusCode = 400;
      throw error;
    }

    category.isDeleted = true;
    await category.save();

    return { message: `Category "${category.name}" removed.` };
  }
}

module.exports = InventoryCategoryService;
