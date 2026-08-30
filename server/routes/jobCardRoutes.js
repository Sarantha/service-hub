const express = require('express');
const router = express.Router();
const jobCardController = require('../controllers/jobCardController');
const inventoryController = require('../controllers/inventoryController');
const authGuard = require('../middleware/authGuard');
const roleGuard = require('../middleware/roleGuard');
const branchScope = require('../middleware/branchScope');
const invoiceLockGuard = require('../middleware/invoiceLockGuard');

// Log a new vehicle intake (RBAC: restricted to Super Admin, Service Advisor, and Technician)
router.post('/', authGuard, roleGuard(['Super Admin', 'Service Advisor', 'Technician']), branchScope, jobCardController.createJobCard);

// Get list of all job cards (Authenticated users)
router.get('/', authGuard, branchScope, jobCardController.getJobCards);

// Get details of a single job card (Authenticated users)
router.get('/:idOrNumber', authGuard, branchScope, jobCardController.getJobCard);

// Update generic job card fields (RBAC: restricted to Super Admin and Service Advisor)
router.put('/:idOrNumber', authGuard, roleGuard(['Super Admin', 'Service Advisor']), branchScope, invoiceLockGuard, jobCardController.updateJobCard);

// Soft-delete a job card (RBAC: restricted to Super Admin and Service Advisor)
router.delete('/:idOrNumber', authGuard, roleGuard(['Super Admin', 'Service Advisor']), branchScope, invoiceLockGuard, jobCardController.deleteJobCard);

// Assign technician to work bay — lock guard protects settled cards (Guardrail #3)
router.patch('/:idOrNumber/assign', authGuard, roleGuard(['Super Admin', 'Service Advisor']), branchScope, invoiceLockGuard, jobCardController.assignTechnician);

// Update checklist tasks — lock guard prevents edits on settled cards (Guardrail #3)
router.put('/:idOrNumber/checklist', authGuard, branchScope, invoiceLockGuard, jobCardController.updateChecklist);

// Transition job card status by label — allowed for Technician, Service Advisor, Super Admin
router.patch('/:idOrNumber/status', authGuard, roleGuard(['Super Admin', 'Service Advisor', 'Technician']), branchScope, invoiceLockGuard, jobCardController.setStatus);

// Transition workflow stages — lock guard protects settled cards (Guardrail #3)
router.patch('/:idOrNumber/stage', authGuard, roleGuard(['Super Admin', 'Service Advisor']), branchScope, invoiceLockGuard, jobCardController.updateStage);

// Allocate inventory parts to a Job Card — lock guard protects settled cards (Guardrail #3)
router.post('/:idOrNumber/lines', authGuard, roleGuard(['Super Admin', 'Service Advisor', 'Technician']), branchScope, invoiceLockGuard, inventoryController.allocateParts);

// Add a freeform labour/service charge to a Job Card — lock guard protects settled cards (Guardrail #3)
router.post('/:idOrNumber/labor-charges', authGuard, roleGuard(['Super Admin', 'Service Advisor', 'Technician']), branchScope, invoiceLockGuard, jobCardController.addLaborCharge);

// Remove a part or labour line item from a Job Card — restores allocated part stock to Inventory; lock guard protects settled cards (Guardrail #3)
router.delete('/:idOrNumber/lines/:lineId', authGuard, roleGuard(['Super Admin', 'Service Advisor', 'Technician']), branchScope, invoiceLockGuard, jobCardController.removeLineItem);

module.exports = router;


