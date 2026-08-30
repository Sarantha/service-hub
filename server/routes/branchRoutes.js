const express = require('express');
const router = express.Router();
const branchController = require('../controllers/branchController');
const authGuard = require('../middleware/authGuard');
const roleGuard = require('../middleware/roleGuard');
const validate = require('../middleware/validate');
const { createBranchSchema } = require('../validators/branchValidators');

// List branches — every staff role needs this for selectors (assigning
// staff, switching working context), even though only Super Admin can
// create/deactivate them.
router.get('/', authGuard, roleGuard(['Super Admin', 'Service Advisor', 'Technician']), branchController.getAllBranches);

// Create/deactivate/reactivate — Super Admin only.
router.post('/', authGuard, roleGuard(['Super Admin']), validate(createBranchSchema), branchController.createBranch);
router.patch('/:id/deactivate', authGuard, roleGuard(['Super Admin']), branchController.deactivateBranch);
router.patch('/:id/activate', authGuard, roleGuard(['Super Admin']), branchController.activateBranch);

module.exports = router;
