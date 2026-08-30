const express = require('express');
const router = express.Router();
const inventoryCategoryController = require('../controllers/inventoryCategoryController');
const authGuard = require('../middleware/authGuard');
const roleGuard = require('../middleware/roleGuard');
const validate = require('../middleware/validate');
const { createCategorySchema } = require('../validators/inventoryCategoryValidators');

// List active categories — anyone who can view inventory needs this for the
// Category dropdown/filter (Super Admin, Service Advisor, Technician).
router.get('/', authGuard, roleGuard(['Super Admin', 'Service Advisor', 'Technician']), inventoryCategoryController.getAllCategories);

// Add/remove categories — Super Admin only, per explicit product requirement.
router.post('/', authGuard, roleGuard(['Super Admin']), validate(createCategorySchema), inventoryCategoryController.createCategory);
router.delete('/:id', authGuard, roleGuard(['Super Admin']), inventoryCategoryController.deleteCategory);

module.exports = router;
