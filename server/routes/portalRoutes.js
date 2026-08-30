const express = require('express');
const router = express.Router();
const portalController = require('../controllers/portalController');
const authGuard = require('../middleware/authGuard');
const roleGuard = require('../middleware/roleGuard');
const vehicleTokenGuard = require('../middleware/vehicleTokenGuard');
const validate = require('../middleware/validate');
const { portalBookSchema, rescheduleSchema } = require('../validators/appointmentValidators');

// POST /api/v1/portal/generate-token
// Requires admin auth — restricted to Super Admin and Service Advisor
router.post('/generate-token', authGuard, roleGuard(['Super Admin', 'Service Advisor']), portalController.generateToken);

// GET /api/v1/portal/vehicle-timeline/:token
// Public - no auth header required
router.get('/vehicle-timeline/:token', portalController.getVehicleTimeline);

// ── Public, token-less service-history lookup (landing page tool) — must
// be registered before the generic '/:token/...' routes below. Requires
// BOTH regNo and phone to match (see PortalService.lookupByRegAndPhone). ───
router.get('/lookup', portalController.lookupVehicleHistory);
router.get('/lookup/pdf', portalController.downloadVehicleHistoryPdf);

// ── Staff-side lookup (authenticated Super Admin / Service Advisor) ────────
router.get('/staff/history', authGuard, roleGuard(['Super Admin', 'Service Advisor']), portalController.getStaffVehicleHistory);
router.get('/staff/history/pdf', authGuard, roleGuard(['Super Admin', 'Service Advisor']), portalController.downloadStaffVehicleHistoryPdf);

// ── Customer self-service booking — all scoped strictly to the vehicle
// encoded in the signed token, never to a client-supplied identity. ────────

// GET /api/v1/portal/:token/availability
router.get('/:token/availability', vehicleTokenGuard, portalController.getAvailability);

// GET /api/v1/portal/:token/appointments — read-only booking history
router.get('/:token/appointments', vehicleTokenGuard, portalController.getMyAppointments);

// POST /api/v1/portal/:token/appointments — self-booking
router.post('/:token/appointments', vehicleTokenGuard, validate(portalBookSchema), portalController.bookAppointment);

// PATCH /api/v1/portal/:token/appointments/:id/reschedule
router.patch('/:token/appointments/:id/reschedule', vehicleTokenGuard, validate(rescheduleSchema), portalController.rescheduleMyAppointment);

// PATCH /api/v1/portal/:token/appointments/:id/cancel
router.patch('/:token/appointments/:id/cancel', vehicleTokenGuard, portalController.cancelMyAppointment);

module.exports = router;
