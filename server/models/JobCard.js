const mongoose = require('mongoose');

const checklistSchema = new mongoose.Schema({
  task: { type: String, required: true, trim: true },
  isDone: { type: Boolean, default: false }
});

const partAllocationSchema = new mongoose.Schema({
  partId: { type: mongoose.Schema.Types.ObjectId, ref: 'Inventory' },
  partName: { type: String, required: true },
  quantity: { type: Number, default: 1 },
  unitPriceAtAllocation: { type: Number, required: true } // Frozen at allocation time
});

const laborChargeSchema = new mongoose.Schema({
  description: { type: String, required: true, trim: true }, // e.g., 'Labour — Full service (2h)'
  cost: { type: Number, required: true }
});

// Loose items physically in the vehicle at intake (spare wheel, jack, mats,
// etc.) — recorded so the workshop is accountable for returning everything
// the customer handed over, mirroring the paper Job Card's "Vehicle
// Inventory" section.
const vehicleInventorySchema = new mongoose.Schema({
  wheelBrace:        { type: Boolean, default: false },
  spareWheel:        { type: Boolean, default: false },
  jack:               { type: Boolean, default: false },
  jackLever:          { type: Boolean, default: false },
  towingPin:          { type: Boolean, default: false },
  airPump:            { type: Boolean, default: false },
  tireSealant:        { type: Boolean, default: false },
  rubberCarpets:      { type: Boolean, default: false },
  fabricCarpets:      { type: Boolean, default: false },
  additionalCarpets:  { type: Boolean, default: false },
  others:             { type: String, trim: true, default: '' }
}, { _id: false });

// One marked point of pre-existing damage on the intake diagram. Coordinates
// are percentages (0-100) of the diagram view's own bounding box, not pixels
// — keeps markers correctly positioned regardless of screen size.
const damageMarkerSchema = new mongoose.Schema({
  view: { type: String, enum: ['side', 'top', 'front', 'rear'], required: true },
  xPct: { type: Number, required: true, min: 0, max: 100 },
  yPct: { type: Number, required: true, min: 0, max: 100 },
  note: { type: String, trim: true, default: '' }
});

const jobCardSchema = new mongoose.Schema({
  jobCardNumber: { 
    type: String, 
    unique: true 
  }, // Auto-incremented sequence (e.g. 'JC-1001')
  branchId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Branch', 
    required: true 
  },
  vehicleRegNo: { 
    type: String, 
    required: true, 
    uppercase: true, 
    trim: true,
    match: [/^[A-Z]{3}-\d{4}$/, 'Vehicle Registration Number must follow the strict format: CBS-8154']
  },
  customerPhone: { 
    type: String, 
    required: true, 
    trim: true,
    match: [/^0\d{9}$/, 'Phone number must be exactly 10 numeric digits and start with 0. Example: 0771234567']
  },
  serviceAdvisorId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  assignedTechnicianId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  },
  priority: { 
    type: String, 
    enum: ['Normal', 'Urgent'], 
    default: 'Normal' 
  },
  status: { 
    type: String, 
    enum: ['Open', 'In Progress', 'Awaiting Parts', 'Completed', 'Delivered'], 
    default: 'Open' 
  },
  currentStage: { 
    type: Number, 
    enum: [1, 2, 3, 4, 5], 
    default: 1 
  },
  serviceType: {
    type: String,
    required: true,
    trim: true
  },
  odometerReading: {
    type: Number,
    required: true,
    min: 0
  }, // Mileage entered at intake — frozen per service record for the vehicle's history timeline
  customerReportedIssues: { 
    type: String, 
    trim: true 
  },
  conditionPhotos: [{
    type: String
  }],
  vehicleInventory: { type: vehicleInventorySchema, default: () => ({}) },
  warningIndicators: { type: String, trim: true, default: '' },
  damageMarkers: [damageMarkerSchema],
  checklist: [checklistSchema],
  partsAllocated: [partAllocationSchema],
  laborCharges: [laborChargeSchema],
  customerApprovalStatus: { 
    type: String, 
    enum: ['Pending Approval', 'Approved', 'Rejected'], 
    default: 'Pending Approval' 
  },
  estimatedCost: { 
    type: Number, 
    default: 0 
  },
  openedAt: { 
    type: Date, 
    default: Date.now 
  },
  inProgressAt: { 
    type: Date 
  },
  completedAt: { 
    type: Date 
  },
  deliveredAt: { 
    type: Date 
  },
  isDeleted: { 
    type: Boolean, 
    default: false 
  } // Guardrail #5 (Soft deletes only)
}, { timestamps: true });

// Pre-save hook to automatically generate sequential jobCardNumbers
jobCardSchema.pre('save', async function () {
  if (this.jobCardNumber) {
    return;
  }
  
  try {
    const lastJobCard = await mongoose.model('JobCard')
      .findOne({}, { jobCardNumber: 1 })
      .sort({ createdAt: -1 });

    let nextNumber = 1001; // Start numbering from 1001
    
    if (lastJobCard && lastJobCard.jobCardNumber) {
      const match = lastJobCard.jobCardNumber.match(/\d+/);
      if (match) {
        nextNumber = parseInt(match[0], 10) + 1;
      }
    }
    
    this.jobCardNumber = `JC-${nextNumber}`;
  } catch (error) {
    throw error;
  }
});

module.exports = mongoose.model('JobCard', jobCardSchema);
