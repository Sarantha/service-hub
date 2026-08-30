const AppointmentService = require('../services/appointmentService');

/**
 * GET /api/v1/appointments
 */
exports.getAllAppointments = async (req, res, next) => {
  try {
    const { status } = req.query;
    const appointments = await AppointmentService.getAllAppointments({
      status,
      branchId: req.branchScope.filter.branchId
    });
    res.status(200).json({
      success: true,
      message: 'Appointments retrieved successfully.',
      data: appointments
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/appointments/availability?date=YYYY-MM-DD
 */
exports.getAvailability = async (req, res, next) => {
  try {
    const availability = await AppointmentService.getAvailability({
      branchId: req.branchScope.filter.branchId,
      date: req.query.date
    });
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
 * GET /api/v1/appointments/:id
 */
exports.getAppointmentById = async (req, res, next) => {
  try {
    const appointment = await AppointmentService.getAppointmentById(req.params.id, req.branchScope.filter);
    res.status(200).json({
      success: true,
      message: 'Appointment retrieved.',
      data: appointment
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/appointments
 * Staff booking on behalf of a customer (Super Admin, Service Advisor).
 */
exports.createAppointment = async (req, res, next) => {
  try {
    if (!req.branchScope.writeBranchId) {
      const error = new Error('Select a branch to work in before booking an appointment.');
      error.statusCode = 400;
      return next(error);
    }
    const appointment = await AppointmentService.bookAppointment(req.body, {
      branchId: req.branchScope.writeBranchId,
      bookedVia: 'Staff'
    });
    res.status(201).json({
      success: true,
      message: 'Appointment booked successfully.',
      data: appointment
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/v1/appointments/:id
 * Generic field edits — date changes are rejected here (use /reschedule).
 */
exports.updateAppointment = async (req, res, next) => {
  try {
    const appointment = await AppointmentService.updateAppointment(req.params.id, req.body, req.branchScope.filter);
    res.status(200).json({
      success: true,
      message: 'Appointment updated successfully.',
      data: appointment
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/v1/appointments/:id/reschedule
 */
exports.rescheduleAppointment = async (req, res, next) => {
  try {
    const appointment = await AppointmentService.rescheduleAppointment(
      req.params.id,
      req.body.scheduledDateTime,
      { userId: req.user.id, role: req.user.role, isCustomer: false },
      req.branchScope.filter
    );
    res.status(200).json({
      success: true,
      message: 'Appointment rescheduled successfully.',
      data: appointment
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/v1/appointments/:id/cancel
 */
exports.cancelAppointment = async (req, res, next) => {
  try {
    const appointment = await AppointmentService.cancelAppointment(req.params.id, {
      userId: req.user.id,
      role: req.user.role,
      isCustomer: false
    }, req.branchScope.filter);
    res.status(200).json({
      success: true,
      message: 'Appointment has been cancelled.',
      data: appointment
    });
  } catch (error) {
    next(error);
  }
};
