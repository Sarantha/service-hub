const { verifyVehicleToken } = require('../utils/vehicleTokenUtil');
const Customer = require('../models/Customer');
const JobCard = require('../models/JobCard');
const Invoice = require('../models/Invoice');
const AppointmentService = require('./appointmentService');

class PortalService {
  /**
   * Resolves a signed vehicle portal token to a sanitized service history timeline.
   *
   * Boundary rules (Architecture 3.1 — Customer Self-Service Portal):
   *  - NO internal unit costs (unitPriceAtAllocation, laborCharges.cost, subtotal, taxAmount, totalAmount)
   *  - NO staff IDs (assignedTechnicianId, serviceAdvisorId)
   *  - NO payment method or invoice financial breakdown
   *  - YES: service type, status, job card number, checklist (task names + done state), timeline dates
   *  - YES: invoice number, payment status, paidAt (confirmation only — no amounts)
   */
  static async getVehicleTimeline(token) {
    // Verify token signature and extract regNo
    const decoded = verifyVehicleToken(token);
    return this._buildTimeline(decoded.regNo);
  }

  /**
   * Public, token-less lookup for the landing-page self-service tool.
   * Requires BOTH the registration number AND the phone number on file to
   * match — a bare plate number is not secret/hard to observe, so an
   * unauthenticated lookup must not resolve on regNo alone (that would let
   * anyone browse any customer's service history). This mirrors the same
   * sanitized timeline shape as the token-based portal.
   */
  static async lookupByRegAndPhone(regNo, phone) {
    const normalizedRegNo = (regNo || '').trim().toUpperCase();
    const normalizedPhone = (phone || '').trim();

    const customer = await Customer.findOne({
      'vehicles.regNo': normalizedRegNo,
      phone: normalizedPhone,
      isDeleted: false
    }, {
      firstName: 1,
      lastName:  1,
      vehicles:  { $elemMatch: { regNo: normalizedRegNo } }
    }).lean();

    if (!customer || !customer.vehicles?.length) {
      // Deliberately generic — does not reveal whether the regNo or the
      // phone number individually exist in the registry.
      const error = new Error('No matching vehicle found. Please check the registration number and phone number.');
      error.statusCode = 404;
      throw error;
    }

    return this._assembleTimeline(normalizedRegNo, customer);
  }

  /**
   * Staff-side lookup (authenticated Super Admin / Service Advisor) — no
   * phone verification needed since the caller is already trusted.
   */
  static async getStaffVehicleHistory(regNo) {
    const normalizedRegNo = (regNo || '').trim().toUpperCase();

    const customer = await Customer.findOne({
      'vehicles.regNo': normalizedRegNo,
      isDeleted: false
    }, {
      firstName: 1,
      lastName:  1,
      vehicles:  { $elemMatch: { regNo: normalizedRegNo } }
    }).lean();

    if (!customer || !customer.vehicles?.length) {
      const error = new Error(`No vehicle found with registration '${regNo}'.`);
      error.statusCode = 404;
      throw error;
    }

    return this._assembleTimeline(normalizedRegNo, customer);
  }

  static async _buildTimeline(regNo) {
    const customer = await Customer.findOne({
      'vehicles.regNo': regNo,
      isDeleted: false
    }, {
      firstName:  1,
      lastName:   1,
      vehicles:   { $elemMatch: { regNo } }
    }).lean();

    if (!customer || !customer.vehicles?.length) {
      const error = new Error('Vehicle not found in registry.');
      error.statusCode = 404;
      throw error;
    }

    return this._assembleTimeline(regNo, customer);
  }

  static async _assembleTimeline(regNo, customer) {
    const vehicle = customer.vehicles[0];

    // Fetch all non-deleted Job Cards for this vehicle, newest first
    const jobCards = await JobCard.find(
      { vehicleRegNo: regNo, isDeleted: false },
      {
        jobCardNumber:  1,
        serviceType:    1,
        status:         1,
        currentStage:   1,
        priority:       1,
        checklist:      1,  // task names + isDone (no cost data)
        odometerReading: 1, // mileage frozen at this service's intake
        openedAt:       1,
        inProgressAt:   1,
        completedAt:    1,
        deliveredAt:    1,
        createdAt:      1
        // Intentionally excluded: partsAllocated (costs), laborCharges, assignedTechnicianId, serviceAdvisorId
      }
    )
      .sort({ createdAt: -1 })
      .lean();

    // 4. Attach invoice payment confirmation (status only — no financial amounts)
    const jobCardIds = jobCards.map(jc => jc._id);
    const invoices = await Invoice.find(
      { jobCardId: { $in: jobCardIds }, isDeleted: false },
      {
        jobCardId:     1,
        invoiceNumber: 1,
        paymentStatus: 1,
        paidAt:        1
        // Intentionally excluded: subtotal, taxAmount, totalAmount, paymentMethod, lineItems
      }
    ).lean();

    const invoiceMap = {};
    invoices.forEach(inv => {
      invoiceMap[inv.jobCardId.toString()] = {
        invoiceNumber: inv.invoiceNumber,
        paymentStatus: inv.paymentStatus,
        paidAt:        inv.paidAt ?? null
      };
    });

    // 5. Assemble sanitized timeline
    const timeline = jobCards.map(jc => ({
      jobCardNumber: jc.jobCardNumber,
      serviceType:   jc.serviceType,
      status:        jc.status,
      currentStage:  jc.currentStage,
      priority:      jc.priority,
      odometerReading: jc.odometerReading ?? null,
      checklist:     jc.checklist.map(task => ({
        task:   task.task,
        isDone: task.isDone
      })),
      timestamps: {
        openedAt:    jc.openedAt ?? null,
        inProgressAt: jc.inProgressAt ?? null,
        completedAt: jc.completedAt ?? null,
        deliveredAt: jc.deliveredAt ?? null
      },
      invoice: invoiceMap[jc._id.toString()] ?? null
    }));

    return {
      vehicle: {
        regNo:    vehicle.regNo,
        make:     vehicle.make,
        model:    vehicle.model,
        fuelType: vehicle.fuelType,
        odometer: vehicle.odometer,
        ownerName: `${customer.firstName} ${customer.lastName}`,
        nextServiceReminderDate: vehicle.nextServiceReminderDate ?? null
      },
      totalServiceEntries: timeline.length,
      timeline
    };
  }

  /**
   * Resolves a signed vehicle token to the vehicle's registry details
   * (make/model) so a portal-side booking doesn't need the customer to
   * retype vehicle info that's already on file.
   */
  static async _resolveVehicle(regNo) {
    const customer = await Customer.findOne(
      { 'vehicles.regNo': regNo, isDeleted: false },
      { vehicles: { $elemMatch: { regNo } } }
    ).lean();

    if (!customer || !customer.vehicles?.length) {
      const error = new Error('Vehicle not found in registry.');
      error.statusCode = 404;
      throw error;
    }
    return customer.vehicles[0];
  }

  /** Server-computed slot availability for the portal booking form. */
  static async getAvailability({ date } = {}) {
    return AppointmentService.getAvailability({ date });
  }

  /** Customer self-booking, scoped to the vehicle encoded in the verified token. */
  static async bookAppointment(regNo, payload) {
    const vehicle = await this._resolveVehicle(regNo);

    return AppointmentService.bookAppointment({
      ...payload,
      vehicleRegNo: regNo,
      vehicleDetails: `${vehicle.make} ${vehicle.model}`.trim()
    }, { bookedVia: 'Portal' });
  }

  /** Customer self-reschedule — ownership enforced inside AppointmentService via actor.vehicleRegNo. */
  static async rescheduleAppointment(regNo, appointmentId, newDateTime) {
    return AppointmentService.rescheduleAppointment(appointmentId, newDateTime, {
      isCustomer: true,
      vehicleRegNo: regNo
    });
  }

  /** Customer self-cancel — ownership enforced inside AppointmentService via actor.vehicleRegNo. */
  static async cancelAppointment(regNo, appointmentId) {
    return AppointmentService.cancelAppointment(appointmentId, {
      isCustomer: true,
      vehicleRegNo: regNo
    });
  }

  /** Read-only appointment history (upcoming + past, including reschedule audit trail). */
  static async getMyAppointments(regNo) {
    return AppointmentService.getCustomerAppointments(regNo);
  }
}

module.exports = PortalService;
