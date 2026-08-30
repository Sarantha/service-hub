const mongoose = require('mongoose');

/**
 * Per-branch-per-day booking capacity counter. Exactly one document per
 * {branchId, date} pair — this is the single-document atomicity anchor that
 * the booking capacity check/reservation pivots on (see appointmentService.js).
 */
const bookingSlotSchema = new mongoose.Schema({
  branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
  date:     { type: String, required: true }, // 'YYYY-MM-DD', branch-local calendar day
  count:    { type: Number, required: true, default: 0, min: 0 }
}, { timestamps: true });

bookingSlotSchema.index({ branchId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('BookingSlot', bookingSlotSchema);
