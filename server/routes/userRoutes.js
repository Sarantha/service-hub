const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authGuard = require('../middleware/authGuard');
const roleGuard = require('../middleware/roleGuard');
const validate = require('../middleware/validate');
const { createUserSchema, updateUserSchema } = require('../validators/userValidators');

// Staff account management — Super Admin only, for the same reason
// account creation itself is Super-Admin-gated: these are the accounts
// that hold operational and financial authority over the branch.
router.get('/', authGuard, roleGuard(['Super Admin']), userController.getAllUsers);

router.post('/', authGuard, roleGuard(['Super Admin']), validate(createUserSchema), userController.createUser);

router.patch('/:id', authGuard, roleGuard(['Super Admin']), validate(updateUserSchema), userController.updateUser);

router.delete('/:id', authGuard, roleGuard(['Super Admin']), userController.deleteUser);

module.exports = router;
