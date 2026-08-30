const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');
const authGuard = require('../middleware/authGuard');
const roleGuard = require('../middleware/roleGuard');

// Register a new customer profile (RBAC: restricted to Super Admin, Service Advisor, and Technician)
router.post('/', authGuard, roleGuard(['Super Admin', 'Service Advisor', 'Technician']), customerController.createCustomer);

// Search customer records (Authenticated users only)
router.get('/', authGuard, customerController.getCustomers);

// Update an existing customer profile (RBAC: restricted to Super Admin and Service Advisor)
router.put('/:id', authGuard, roleGuard(['Super Admin', 'Service Advisor']), customerController.updateCustomer);

// Append a vehicle to a customer profile (RBAC: restricted to Super Admin and Service Advisor)
router.post('/:id/vehicles', authGuard, roleGuard(['Super Admin', 'Service Advisor']), customerController.addVehicle);

// Transfer a vehicle's ownership to a different customer, e.g. when sold (RBAC: restricted to Super Admin and Service Advisor)
router.patch('/vehicles/:regNo/transfer', authGuard, roleGuard(['Super Admin', 'Service Advisor']), customerController.transferVehicleOwnership);

module.exports = router;
