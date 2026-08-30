const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventoryController');
const authGuard = require('../middleware/authGuard');
const roleGuard = require('../middleware/roleGuard');
const branchScope = require('../middleware/branchScope');
const validate = require('../middleware/validate');
const { createInventoryItemSchema, updateInventoryItemSchema } = require('../validators/inventoryValidators');

// Add a new inventory part (RBAC: Super Admin and Service Advisor only)
router.post('/', authGuard, roleGuard(['Super Admin', 'Service Advisor']), branchScope, validate(createInventoryItemSchema), inventoryController.addItem);

// List all active inventory items (Super Admin, Service Advisor, and Technician)
router.get('/', authGuard, roleGuard(['Super Admin', 'Service Advisor', 'Technician']), branchScope, inventoryController.getAllItems);

// Get single inventory item by ID (Super Admin and Service Advisor only)
router.get('/:id', authGuard, roleGuard(['Super Admin', 'Service Advisor']), branchScope, inventoryController.getItemById);

// Update an inventory item (RBAC: Super Admin and Service Advisor only)
router.patch('/:id', authGuard, roleGuard(['Super Admin', 'Service Advisor']), branchScope, validate(updateInventoryItemSchema), inventoryController.updateItem);

// Soft-delete an inventory item (RBAC: Super Admin and Service Advisor only)
router.delete('/:id', authGuard, roleGuard(['Super Admin', 'Service Advisor']), branchScope, inventoryController.deleteItem);

module.exports = router;
