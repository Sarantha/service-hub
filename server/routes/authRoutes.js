const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authGuard = require('../middleware/authGuard');
const roleGuard = require('../middleware/roleGuard');

// Register a new user profile — Super Admin only. This endpoint used to be
// public, meaning any anonymous caller could self-register a Super Admin
// account with full administrative access. New staff accounts are created
// via POST /api/v1/users (which additionally re-verifies the acting admin's
// own password); this route stays as the underlying primitive it delegates
// to, now gated the same way.
router.post('/register', authGuard, roleGuard(['Super Admin']), authController.register);

// Authenticate credentials and receive token
router.post('/login', authController.login);

// Protected testing route to verify JWT setup
router.get('/test-protected', authGuard, authController.testProtected);

module.exports = router;
