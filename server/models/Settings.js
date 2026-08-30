const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true, unique: true },

  // Station metadata
  stationName:          { type: String, required: true, default: 'Colombo Central Service Station' },
  phone:                { type: String, required: true, default: '+94 11 234 5678' },
  vatRegistrationNumber: { type: String, required: true, default: 'VAT-123456789' },
  address:              { type: String, required: true, default: 'No. 42, Galle Road, Colombo 03' },

  // Booking configuration
  maxBookingsPerDay:     { type: Number, required: true, default: 20, min: 1 },

  // Billing configuration
  vatRatePercentage:     { type: Number, required: true, default: 18 },
  defaultCurrency:       { type: String, enum: ['LKR', 'USD'], default: 'LKR' },
  allowedPaymentMethods: [{ type: String, enum: ['Cash', 'Card', 'Online'] }],
  invoicePrefix:         { type: String, default: 'INV-' },
  invoiceFooterNote:     { type: String, default: 'Thank you for choosing our service. Warranty valid 30 days.' },

  // Notification toggles
  notificationToggles: {
    smsServiceReminders:            { type: Boolean, default: true },
    emailEstimateApprovals:         { type: Boolean, default: true },
    smsVehicleReadyAlerts:          { type: Boolean, default: true },
    multiFactorAuthenticationEnabled: { type: Boolean, default: false },
    lowStockEmailAlerts:            { type: Boolean, default: true }
  }
}, { timestamps: true });

module.exports = mongoose.model('Settings', settingsSchema);
