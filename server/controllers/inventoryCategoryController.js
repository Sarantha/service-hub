const InventoryCategoryService = require('../services/inventoryCategoryService');

/**
 * GET /api/v1/inventory-categories
 */
exports.getAllCategories = async (req, res, next) => {
  try {
    const categories = await InventoryCategoryService.getAllCategories();
    res.status(200).json({
      success: true,
      message: 'Inventory categories retrieved successfully.',
      data: categories
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/inventory-categories
 */
exports.createCategory = async (req, res, next) => {
  try {
    const category = await InventoryCategoryService.createCategory(req.body.name);
    res.status(201).json({
      success: true,
      message: `Category "${category.name}" added.`,
      data: category
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/v1/inventory-categories/:id
 */
exports.deleteCategory = async (req, res, next) => {
  try {
    const result = await InventoryCategoryService.deleteCategory(req.params.id);
    res.status(200).json({
      success: true,
      message: result.message,
      data: null
    });
  } catch (error) {
    next(error);
  }
};
