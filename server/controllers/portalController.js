const PortalService = require('../services/portalService');
const VehicleHistoryPdfService = require('../services/vehicleHistoryPdfService');
const { signVehicleToken } = require('../utils/vehicleTokenUtil');
const Customer = require('../models/Customer');

/**
 * POST /api/v1/portal/generate-token
 * Generates a secure, signed portal token for a given vehicle registration number.
 * Requires admin auth — the token itself is what the customer receives (no auth needed to use it).
 */
exports.generateToken = async (req, res, next) => {
  try {
    const { regNo } = req.body;
    if (!regNo || typeof regNo !== 'string' || !regNo.trim()) {
      const error = new Error('Vehicle registration number (regNo) is required.');
      error.statusCode = 400;
      throw error;
    }

    // Confirm vehicle exists before issuing a token
    const customer = await Customer.findOne(
      { 'vehicles.regNo': regNo.trim().toUpperCase(), isDeleted: false },
      { _id: 1 }
    ).lean();

    if (!customer) {
      const error = new Error(`No vehicle with registration '${regNo}' found in the registry.`);
      error.statusCode = 404;
      throw error;
    }

    const token = signVehicleToken(regNo.trim().toUpperCase());

    res.status(200).json({
      success: true,
      message: 'Portal access token generated. Share this token with the vehicle owner.',
      data: {
        regNo: regNo.trim().toUpperCase(),
        portalToken: token,
        portalUrl: `/api/v1/portal/vehicle-timeline/${token}`
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/portal/vehicle-timeline/:token
 * Public — no auth header required.
 * Returns the sanitized service history for the vehicle encoded in the token.
 */
exports.getVehicleTimeline = async (req, res, next) => {
  try {
    const timeline = await PortalService.getVehicleTimeline(req.params.token);
    res.status(200).json({
      success: true,
      message: 'Vehicle service timeline retrieved.',
      data: timeline
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/portal/:token/availability
 * Server-computed remaining booking slots for the selected date.
 */
exports.getAvailability = async (req, res, next) => {
  try {
    const availability = await PortalService.getAvailability({ date: req.query.date });
    res.status(200).json({
      success: true,
      message: 'Booking availability retrieved successfully.',
      data: availability
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/portal/:token/appointments
 * Read-only appointment history (upcoming + past) for this vehicle only.
 */
exports.getMyAppointments = async (req, res, next) => {
  try {
    const appointments = await PortalService.getMyAppointments(req.vehicleRegNo);
    res.status(200).json({
      success: true,
      message: 'Appointment history retrieved successfully.',
      data: appointments
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/portal/:token/appointments
 * Customer self-booking, scoped strictly to the vehicle encoded in the token.
 */
exports.bookAppointment = async (req, res, next) => {
  try {
    const appointment = await PortalService.bookAppointment(req.vehicleRegNo, req.body);
    res.status(201).json({
      success: true,
      message: 'Your appointment has been booked successfully.',
      data: appointment
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/v1/portal/:token/appointments/:id/reschedule
 * Own-vehicle-only — ownership is enforced server-side regardless of the UI.
 */
exports.rescheduleMyAppointment = async (req, res, next) => {
  try {
    const appointment = await PortalService.rescheduleAppointment(
      req.vehicleRegNo,
      req.params.id,
      req.body.scheduledDateTime
    );
    res.status(200).json({
      success: true,
      message: 'Your appointment has been rescheduled successfully.',
      data: appointment
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/v1/portal/:token/appointments/:id/cancel
 * Own-vehicle-only — ownership is enforced server-side regardless of the UI.
 */
exports.cancelMyAppointment = async (req, res, next) => {
  try {
    const appointment = await PortalService.cancelAppointment(req.vehicleRegNo, req.params.id);
    res.status(200).json({
      success: true,
      message: 'Your appointment has been cancelled.',
      data: appointment
    });
  } catch (error) {
    next(error);
  }
};

// ── Public, token-less service-history lookup (landing page) ───────────────

/**
 * GET /api/v1/portal/lookup?regNo=&phone=
 * Public — no auth header required. Requires BOTH regNo and phone to match
 * the registry (see PortalService.lookupByRegAndPhone for why).
 */
exports.lookupVehicleHistory = async (req, res, next) => {
  try {
    const { regNo, phone } = req.query;
    if (!regNo || !phone) {
      const error = new Error('Both a vehicle registration number and a phone number are required.');
      error.statusCode = 400;
      throw error;
    }

    const history = await PortalService.lookupByRegAndPhone(regNo, phone);
    res.status(200).json({
      success: true,
      message: 'Vehicle service history retrieved.',
      data: history
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/portal/lookup/pdf?regNo=&phone=
 * Public — no auth header required. Streams a downloadable PDF of the same
 * sanitized history returned by lookupVehicleHistory.
 */
exports.downloadVehicleHistoryPdf = async (req, res, next) => {
  try {
    const { regNo, phone } = req.query;
    if (!regNo || !phone) {
      const error = new Error('Both a vehicle registration number and a phone number are required.');
      error.statusCode = 400;
      throw error;
    }

    const history = await PortalService.lookupByRegAndPhone(regNo, phone);
    const pdfBuffer = await VehicleHistoryPdfService.buildHistoryPdfBuffer(history);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${history.vehicle.regNo}-service-history.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.status(200).send(pdfBuffer);
  } catch (error) {
    next(error);
  }
};

// ── Staff-side lookup (authenticated Super Admin / Service Advisor) ────────

/**
 * GET /api/v1/portal/staff/history?regNo=
 */
exports.getStaffVehicleHistory = async (req, res, next) => {
  try {
    const { regNo } = req.query;
    if (!regNo) {
      const error = new Error('A vehicle registration number is required.');
      error.statusCode = 400;
      throw error;
    }

    const history = await PortalService.getStaffVehicleHistory(regNo);
    res.status(200).json({
      success: true,
      message: 'Vehicle service history retrieved.',
      data: history
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/portal/staff/history/pdf?regNo=
 */
exports.downloadStaffVehicleHistoryPdf = async (req, res, next) => {
  try {
    const { regNo } = req.query;
    if (!regNo) {
      const error = new Error('A vehicle registration number is required.');
      error.statusCode = 400;
      throw error;
    }

    const history = await PortalService.getStaffVehicleHistory(regNo);
    const pdfBuffer = await VehicleHistoryPdfService.buildHistoryPdfBuffer(history);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${history.vehicle.regNo}-service-history.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.status(200).send(pdfBuffer);
  } catch (error) {
    next(error);
  }
};
