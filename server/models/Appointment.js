const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
  branchId:             { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
  customerName:         { type: String, required: true },
  customerPhone:        { 
    type: String, 
    required: true,
    trim: true,
    match: [/^0\d{9}$/, 'Phone number must be exactly 10 numeric digits and start with 0. Example: 0771234567']
  },
  vehicleRegNo:         { 
    type: String, 
    required: true,
    uppercase: true,
    trim: true,
    match: [/^[A-Z]{3}-\d{4}$/, 'Vehicle Registration Number must follow the strict format: CBS-8154']
  },
  vehicleDetails:       { type: String, required: true },  // e.g., 'Toyota Aqua'
  serviceType:          { type: String, enum: ['Full Service', 'Oil Change', 'Brake Service', 'AC Service', 'Engine Diagnostics', 'Other'], required: true },
  scheduledDateTime:    { type: Date, required: true },
  assignedTechnicianId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Nullable → 'Unassigned'
  status:               { type: String, enum: ['Booked', 'Completed', 'Cancelled', 'No-show'], default: 'Booked' },
  bookedVia:            { type: String, enum: ['Staff', 'Portal'], default: 'Staff' },

  // Audit trail — a rescheduled appointment stays 'Booked' (still an active,
  // upcoming appointment); this array is what lets the history view show it
  // was moved, rather than overloading `status` for something that isn't
  // itself a terminal state.
  rescheduleHistory: [{
    previousDateTime:   { type: Date, required: true },
    rescheduledBy:       { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // null when customer-initiated via portal
    rescheduledByRole:   { type: String, required: true }, // 'Super Admin' | 'Service Advisor' | 'Customer'
    rescheduledAt:        { type: Date, default: Date.now }
  }],

  isDeleted:            { type: Boolean, default: false }  // Guardrail #5
}, { timestamps: true });

module.exports = mongoose.model('Appointment', appointmentSchema);
