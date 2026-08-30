const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');
const authGuard = require('../middleware/authGuard');
const roleGuard = require('../middleware/roleGuard');

// GET /api/v1/settings - Protected: Super Admin only
router.get('/', authGuard, roleGuard(['Super Admin']), settingsController.getSettings);

// POST /api/v1/settings - Protected: Super Admin only
router.post('/', authGuard, roleGuard(['Super Admin']), settingsController.updateSettings);

// PUT /api/v1/settings - Protected: Super Admin only
router.put('/', authGuard, roleGuard(['Super Admin']), settingsController.updateSettings);

module.exports = router;
