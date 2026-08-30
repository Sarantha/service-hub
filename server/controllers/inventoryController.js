const InventoryService = require('../services/inventoryService');

/**
 * Handle POST request to add a new inventory part.
 */
exports.addItem = async (req, res, next) => {
  try {
    const item = await InventoryService.addItem(req.body, req.branchScope.writeBranchId);
    res.status(201).json({
      success: true,
      message: 'Inventory item registered in the ledger.',
      data: item
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handle GET request to list all active inventory items.
 */
exports.getAllItems = async (req, res, next) => {
  try {
    const role = req.user ? req.user.role : null;
    const items = await InventoryService.getAllItems(role, req.branchScope.filter);

    res.status(200).json({
      success: true,
      message: 'Inventory ledger retrieved successfully.',
      data: items
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Handle GET request to retrieve a single inventory item by ID.
 */
exports.getItemById = async (req, res, next) => {
  try {
    const item = await InventoryService.getItemById(req.params.id, req.branchScope.filter);
    res.status(200).json({
      success: true,
      message: 'Inventory item retrieved.',
      data: item
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handle PATCH request to update an inventory item.
 */
exports.updateItem = async (req, res, next) => {
  try {
    const item = await InventoryService.updateItem(req.params.id, req.body, req.branchScope.filter);
    res.status(200).json({
      success: true,
      message: 'Inventory item updated.',
      data: item
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handle DELETE request to soft-delete an inventory item.
 */
exports.deleteItem = async (req, res, next) => {
  try {
    const result = await InventoryService.deleteItem(req.params.id, req.branchScope.filter);
    res.status(200).json({
      success: true,
      message: result.message,
      data: null
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handle POST request to allocate parts from inventory to a Job Card.
 */
exports.allocateParts = async (req, res, next) => {
  try {
    const { idOrNumber } = req.params;
    const { partId, quantity } = req.body;
    
    const result = await InventoryService.allocatePartsToJobCard(idOrNumber, partId, quantity, req.branchScope.filter);

    res.status(200).json({
      success: true,
      message: 'Part allocated to Job Card and stock decremented.',
      data: result
    });
  } catch (error) {
    next(error);
  }
};
