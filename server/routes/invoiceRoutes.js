const express = require('express');
const router = express.Router();
const invoiceController = require('../controllers/invoiceController');
const authGuard = require('../middleware/authGuard');
const roleGuard = require('../middleware/roleGuard');
const branchScope = require('../middleware/branchScope');

// Generate an invoice from a completed Job Card (Super Admin, Service Advisor, Technician)
router.post('/generate', authGuard, roleGuard(['Super Admin', 'Service Advisor', 'Technician']), branchScope, invoiceController.generateInvoice);

// List all invoices (RBAC: restricted to Super Admin and Service Advisor — viewing invoices is not a Technician privilege)
router.get('/', authGuard, roleGuard(['Super Admin', 'Service Advisor']), branchScope, invoiceController.getAllInvoices);

// Period-scoped billing summary (today by default, or a given day/month) — must
// be registered before the generic '/:idOrNumber' route below.
router.get('/summary', authGuard, roleGuard(['Super Admin', 'Service Advisor']), branchScope, invoiceController.getInvoiceSummary);

// Get single invoice by number or ID (RBAC: restricted to Super Admin and Service Advisor)
router.get('/:idOrNumber', authGuard, roleGuard(['Super Admin', 'Service Advisor']), branchScope, invoiceController.getInvoice);

// Download a generated PDF of the invoice (RBAC: restricted to Super Admin and Service Advisor)
router.get('/:idOrNumber/pdf', authGuard, roleGuard(['Super Admin', 'Service Advisor']), branchScope, invoiceController.downloadInvoicePdf);

// Record payment and seal the invoice (Super Admin & Service Advisor)
router.patch('/:idOrNumber/payment', authGuard, roleGuard(['Super Admin', 'Service Advisor']), branchScope, invoiceController.recordPayment);

module.exports = router;
