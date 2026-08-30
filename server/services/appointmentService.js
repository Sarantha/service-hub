const mongoose = require('mongoose');
const Appointment = require('../models/Appointment');
const BookingSlot = require('../models/BookingSlot');
const Settings = require('../models/Settings');
const Branch = require('../models/Branch');

const DEFAULT_MAX_BOOKINGS_PER_DAY = 20;
const TERMINAL_STATUSES = ['Cancelled', 'Completed', 'No-show'];

// ──────────────────────────────────────────────────────────────────────────
// CONCURRENCY DESIGN — how this service prevents overbooking under
// concurrent requests. Two complementary MongoDB-native atomicity
// guarantees, combined (not "read count, then insert" as two unguarded
// steps — that is the exact race this design avoids):
//
// 1. Single-document atomic capacity check + reservation (_reserveSlot).
//    A BookingSlot document holds a `count` for one {branchId, date}.
//    Reservation is a single `findOneAndUpdate({ count: { $lt: max } },
//    { $inc: { count: 1 } })` call. MongoDB applies one document's
//    read-modify-write indivisibly at the storage-engine level, so under
//    concurrent requests the `count: { $lt: max }` filter and the `$inc`
//    can never interleave: once one request's increment lands, every other
//    concurrent request's filter is re-evaluated against the NEW value, not
//    a stale read taken before either write. This is the textbook
//    "conditional update" atomic-counter pattern.
//
// 2. Multi-document ACID transactions (session.withTransaction) wrap the
//    BookingSlot mutation(s) together with the Appointment document
//    mutation on every write path (book / reschedule / cancel). This
//    guarantees the counter and the appointment record can never diverge,
//    and makes reschedule genuinely all-or-nothing: the NEW date's slot is
//    reserved FIRST (capacity-checked); if that throws (day full),
//    withTransaction aborts the entire transaction and none of the
//    operation's steps are applied — the old slot is never released and the
//    appointment document is never touched, so the customer can never end
//    up holding neither the old slot nor the new one.
// ──────────────────────────────────────────────────────────────────────────

class AppointmentService {
  static _toDateKey(dateInput) {
    // Bare 'YYYY-MM-DD' strings (e.g. an availability query param, or an
    // <input type="date"> value) are already an unambiguous calendar day —
    // pass them through as-is. Routing them through `new Date(str)` would be
    // wrong: per the JS spec, a date-only string parses as UTC midnight,
    // while a full datetime string parses in local time, so the two forms
    // would silently disagree by a day in any timezone ahead of UTC.
    if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
      return dateInput;
    }

    const d = new Date(dateInput);
    if (Number.isNaN(d.getTime())) {
      const error = new Error('A valid date is required.');
      error.statusCode = 400;
      throw error;
    }
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  static async _resolveBranchId(branchId) {
    if (branchId) return branchId;
    const defaultBranch = await Branch.findOne({ code: 'CMB-01' });
    if (!defaultBranch) {
      const error = new Error('No active branch found.');
      error.statusCode = 500;
      throw error;
    }
    return defaultBranch._id;
  }

  static async _getMaxBookingsPerDay(branchId) {
    const settings = await Settings.findOne({ branchId }).lean();
    return settings?.maxBookingsPerDay ?? DEFAULT_MAX_BOOKINGS_PER_DAY;
  }

  /** Atomically reserves one slot for {branchId, dateKey}. Throws 409 if the day is full. */
  static async _reserveSlot(branchId, dateKey, maxBookingsPerDay, session) {
    // Lazily provision the day's counter. Safe under races: the unique index
    // on {branchId, date} means at most one such document can ever exist —
    // a losing concurrent upsert inside a transaction simply matches zero
    // documents (no-op), it does not throw or corrupt state.
    await BookingSlot.updateOne(
      { branchId, date: dateKey },
      { $setOnInsert: { branchId, date: dateKey, count: 0 } },
      { upsert: true, session }
    );

    const slot = await BookingSlot.findOneAndUpdate(
      { branchId, date: dateKey, count: { $lt: maxBookingsPerDay } },
      { $inc: { count: 1 } },
      { new: true, session }
    );

    if (!slot) {
      const error = new Error(`No available slots for ${dateKey}. This day is fully booked.`);
      error.statusCode = 409;
      throw error;
    }
    return slot;
  }

  /** Atomically releases one slot for {branchId, dateKey}. Never goes below 0. */
  static async _releaseSlot(branchId, dateKey, session) {
    await BookingSlot.findOneAndUpdate(
      { branchId, date: dateKey, count: { $gt: 0 } },
      { $inc: { count: -1 } },
      { session }
    );
  }

  static async getAllAppointments(filters = {}) {
    const query = { isDeleted: false };
    if (filters.status) query.status = filters.status;
    if (filters.branchId) query.branchId = filters.branchId;

    return Appointment.find(query)
      .populate('assignedTechnicianId', 'name email role')
      .sort({ scheduledDateTime: 1 })
      .lean();
  }

  static async getAppointmentById(id, branchFilter = {}) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      const error = new Error('Invalid appointment ID format.');
      error.statusCode = 400;
      throw error;
    }
    const appointment = await Appointment.findOne({ _id: id, ...branchFilter, isDeleted: false })
      .populate('assignedTechnicianId', 'name email role')
      .lean();
    if (!appointment) {
      const error = new Error('Appointment not found.');
      error.statusCode = 404;
      throw error;
    }
    return appointment;
  }

  /** Server-computed slot availability for a branch+date — no frontend math. */
  static async getAvailability({ branchId, date } = {}) {
    const resolvedBranchId = await this._resolveBranchId(branchId);
    const dateKey = this._toDateKey(date || new Date());
    const maxBookingsPerDay = await this._getMaxBookingsPerDay(resolvedBranchId);
    const slot = await BookingSlot.findOne({ branchId: resolvedBranchId, date: dateKey }).lean();
    const bookedCount = slot?.count || 0;

    return {
      date: dateKey,
      maxBookingsPerDay,
      bookedCount,
      remaining: Math.max(0, maxBookingsPerDay - bookedCount)
    };
  }

  /**
   * Creates a new appointment, atomically capacity-checking and reserving
   * the slot in the same transaction as the document insert. Shared by both
   * the staff controller (Super Admin / Service Advisor) and the portal
   * controller (customer self-booking) — the atomic logic is identical,
   * only the caller-supplied metadata (bookedVia) differs.
   */
  static async bookAppointment(payload, meta = {}) {
    const {
      customerName, customerPhone, vehicleRegNo, vehicleDetails,
      serviceType, scheduledDateTime, assignedTechnicianId
    } = payload;

    const branchId = await this._resolveBranchId(meta.branchId);
    const dateKey = this._toDateKey(scheduledDateTime);
    const maxBookingsPerDay = await this._getMaxBookingsPerDay(branchId);

    const session = await mongoose.startSession();
    try {
      let appointment;
      await session.withTransaction(async () => {
        await this._reserveSlot(branchId, dateKey, maxBookingsPerDay, session);

        const created = await Appointment.create([{
          branchId,
          customerName,
          customerPhone,
          vehicleRegNo,
          vehicleDetails,
          serviceType,
          scheduledDateTime,
          assignedTechnicianId: assignedTechnicianId || null,
          bookedVia: meta.bookedVia || 'Staff'
        }], { session });

        appointment = created[0];
      });
      return appointment;
    } finally {
      await session.endSession();
    }
  }

  /**
   * Reschedules an appointment. actor = { userId, role, isCustomer, vehicleRegNo }.
   * Reserves the new date FIRST, then releases the old date, then updates the
   * appointment — all inside one transaction (see concurrency notes above).
   */
  static async rescheduleAppointment(id, newDateTime, actor = {}, branchFilter = {}) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      const error = new Error('Invalid appointment ID format.');
      error.statusCode = 400;
      throw error;
    }

    const newDate = new Date(newDateTime);
    if (Number.isNaN(newDate.getTime())) {
      const error = new Error('A valid new scheduled date/time is required.');
      error.statusCode = 400;
      throw error;
    }

    const session = await mongoose.startSession();
    try {
      let result;
      await session.withTransaction(async () => {
        const appointment = await Appointment.findOne({ _id: id, ...branchFilter, isDeleted: false }).session(session);
        if (!appointment) {
          const error = new Error('Appointment not found.');
          error.statusCode = 404;
          throw error;
        }

        if (actor.isCustomer && appointment.vehicleRegNo !== actor.vehicleRegNo) {
          const error = new Error('You do not have permission to reschedule this appointment.');
          error.statusCode = 403;
          throw error;
        }

        if (TERMINAL_STATUSES.includes(appointment.status)) {
          const error = new Error(`This appointment is ${appointment.status.toLowerCase()} and can no longer be rescheduled.`);
          error.statusCode = 400;
          throw error;
        }

        const oldDateKey = this._toDateKey(appointment.scheduledDateTime);
        const newDateKey = this._toDateKey(newDate);

        if (oldDateKey !== newDateKey) {
          const maxBookingsPerDay = await this._getMaxBookingsPerDay(appointment.branchId);
          // Reserve the new date first — if this throws (full), the whole
          // transaction aborts and nothing below ever runs.
          await this._reserveSlot(appointment.branchId, newDateKey, maxBookingsPerDay, session);
          await this._releaseSlot(appointment.branchId, oldDateKey, session);
        }

        appointment.rescheduleHistory.push({
          previousDateTime: appointment.scheduledDateTime,
          rescheduledBy: actor.isCustomer ? null : actor.userId,
          rescheduledByRole: actor.isCustomer ? 'Customer' : (actor.role || 'Unknown'),
          rescheduledAt: new Date()
        });
        appointment.scheduledDateTime = newDate;
        await appointment.save({ session });

        result = appointment;
      });
      return result;
    } finally {
      await session.endSession();
    }
  }

  /** Cancels an appointment (soft status change) and releases its slot atomically. */
  static async cancelAppointment(id, actor = {}, branchFilter = {}) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      const error = new Error('Invalid appointment ID format.');
      error.statusCode = 400;
      throw error;
    }

    const session = await mongoose.startSession();
    try {
      let result;
      await session.withTransaction(async () => {
        const appointment = await Appointment.findOne({ _id: id, ...branchFilter, isDeleted: false }).session(session);
        if (!appointment) {
          const error = new Error('Appointment not found.');
          error.statusCode = 404;
          throw error;
        }

        if (actor.isCustomer && appointment.vehicleRegNo !== actor.vehicleRegNo) {
          const error = new Error('You do not have permission to cancel this appointment.');
          error.statusCode = 403;
          throw error;
        }

        if (appointment.status === 'Cancelled') {
          const error = new Error('This appointment has already been cancelled.');
          error.statusCode = 400;
          throw error;
        }

        const dateKey = this._toDateKey(appointment.scheduledDateTime);
        await this._releaseSlot(appointment.branchId, dateKey, session);

        appointment.status = 'Cancelled';
        await appointment.save({ session });
        result = appointment;
      });
      return result;
    } finally {
      await session.endSession();
    }
  }

  /**
   * Generic field edits (customerName, vehicleDetails, serviceType,
   * assignedTechnicianId, status). Date changes are explicitly rejected —
   * they must go through rescheduleAppointment() so the atomic counter
   * system is never bypassed.
   */
  static async updateAppointment(id, body = {}, branchFilter = {}) {
    if (body.scheduledDateTime !== undefined) {
      const error = new Error("Use the reschedule endpoint to change an appointment's date/time.");
      error.statusCode = 400;
      throw error;
    }

    const allowedFields = ['customerName', 'customerPhone', 'vehicleRegNo', 'vehicleDetails', 'serviceType', 'assignedTechnicianId', 'status'];
    const updates = {};
    allowedFields.forEach((field) => {
      if (body[field] !== undefined) updates[field] = body[field];
    });

    const appointment = await Appointment.findOneAndUpdate(
      { _id: id, ...branchFilter, isDeleted: false },
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!appointment) {
      const error = new Error('Appointment not found.');
      error.statusCode = 404;
      throw error;
    }
    return appointment;
  }

  /** Portal history view — all appointments for a given vehicle, newest first. */
  static async getCustomerAppointments(vehicleRegNo) {
    return Appointment.find({ vehicleRegNo, isDeleted: false })
      .sort({ scheduledDateTime: -1 })
      .lean();
  }
}

module.exports = AppointmentService;
