const express = require('express');
const router = express.Router();
const appointmentController = require('../controllers/appointmentController');
const authGuard = require('../middleware/authGuard');
const roleGuard = require('../middleware/roleGuard');
const branchScope = require('../middleware/branchScope');
const validate = require('../middleware/validate');
const { createAppointmentSchema, rescheduleSchema } = require('../validators/appointmentValidators');

// Booking is a Super Admin / Service Advisor capability only — Technician
// gets 403 on every route below, including read (no booking UI/route/data
// is exposed to Technician at all, per the booking system's RBAC matrix).
const STAFF_ROLES = ['Super Admin', 'Service Advisor'];

// GET /api/v1/appointments
router.get('/', authGuard, roleGuard(STAFF_ROLES), branchScope, appointmentController.getAllAppointments);

// GET /api/v1/appointments/availability - must be registered before '/:id'
router.get('/availability', authGuard, roleGuard(STAFF_ROLES), branchScope, appointmentController.getAvailability);

// GET /api/v1/appointments/:id
router.get('/:id', authGuard, roleGuard(STAFF_ROLES), branchScope, appointmentController.getAppointmentById);

// POST /api/v1/appointments - create a booking on behalf of a customer
router.post('/', authGuard, roleGuard(STAFF_ROLES), branchScope, validate(createAppointmentSchema), appointmentController.createAppointment);

// PUT /api/v1/appointments/:id - generic field edits (no date changes)
router.put('/:id', authGuard, roleGuard(STAFF_ROLES), branchScope, appointmentController.updateAppointment);

// PATCH /api/v1/appointments/:id/reschedule
router.patch('/:id/reschedule', authGuard, roleGuard(STAFF_ROLES), branchScope, validate(rescheduleSchema), appointmentController.rescheduleAppointment);

// PATCH /api/v1/appointments/:id/cancel
router.patch('/:id/cancel', authGuard, roleGuard(STAFF_ROLES), branchScope, appointmentController.cancelAppointment);

module.exports = router;
