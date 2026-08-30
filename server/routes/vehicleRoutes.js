const express = require('express');
const router = express.Router();
const vehicleController = require('../controllers/vehicleController');
const authGuard = require('../middleware/authGuard');

// GET /api/v1/vehicles/lookup?regNo=VALUE
// Returns the parent customer profile + vehicle specs for intake auto-hydration.
// Accessible by all authenticated roles (Super Admin, Service Advisor, Technician).
router.get('/lookup', authGuard, vehicleController.lookupVehicle);

module.exports = router;
