const mongoose = require('mongoose');

const vehicleSchema = new mongoose.Schema({
  regNo: {
    type: String,
    required: true,
    unique: true,
    sparse: true, // MongoDB indexes an empty `vehicles` array as an implicit null entry on
                   // a multikey index — without `sparse`, any two customers with zero vehicles
                   // (e.g. a seller right after their only vehicle is transferred away) would
                   // collide on that null and fail to save.
    uppercase: true,
    trim: true,
    match: [/^[A-Z]{3}-\d{4}$/, 'Vehicle Registration Number must follow the strict format: CBS-8154']
  }, // e.g., 'CBB-2341'
  vin: { 
    type: String, 
    uppercase: true, 
    trim: true 
  },
  make: { 
    type: String, 
    required: true, 
    trim: true 
  },
  model: { 
    type: String, 
    required: true, 
    trim: true 
  },
  year: { 
    type: Number,
    required: true
  },
  fuelType: { 
    type: String, 
    enum: ['Petrol', 'Diesel', 'Hybrid', 'Electric'], 
    required: true 
  },
  odometer: { 
    type: Number, 
    required: true 
  },
  nextServiceReminderDate: { 
    type: Date 
  }
});

const customerSchema = new mongoose.Schema({
  firstName: { 
    type: String, 
    required: true, 
    trim: true 
  },
  lastName: { 
    type: String, 
    required: true, 
    trim: true 
  },
  phone: { 
    type: String, 
    required: true, 
    unique: true, 
    trim: true,
    match: [/^0\d{9}$/, 'Phone number must be exactly 10 numeric digits and start with 0. Example: 0771234567']
  }, // Primary lookup key, e.g., '077 123 4567'
  email: { 
    type: String, 
    lowercase: true, 
    trim: true,
    default: ""
  },
  nicPassport: {
    type: String,
    required: true,
    trim: true
  },
  outstandingBalance: { 
    type: Number, 
    required: true, 
    default: 0 
  }, // Feeds billing alert cards
  lastVisitDate: { 
    type: Date 
  },
  isDeleted: { 
    type: Boolean, 
    default: false 
  }, // Guardrail #5 (Soft deletes only)
  vehicles: [vehicleSchema]
}, { timestamps: true });

module.exports = mongoose.model('Customer', customerSchema);
