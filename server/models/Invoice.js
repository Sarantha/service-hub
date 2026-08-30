const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema({
  invoiceNumber: {
    type: String,
    unique: true
  }, // Auto-incremented (e.g. 'INV-0001')
  branchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    required: true
  },
  jobCardId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'JobCard',
    required: true
  },
  customerPhone: {
    type: String,
    required: true,
    trim: true
  },

  // Job Card context snapshotted at generation time — the invoice must remain a
  // complete, standalone record even if the source Job Card changes later.
  jobCardNumber: { type: String },
  vehicleRegNo:  { type: String },
  serviceType:   { type: String },
  checklistSnapshot: [{
    task:   { type: String, required: true },
    isDone: { type: Boolean, default: false }
  }],

  // Itemized line breakdowns (frozen at invoice generation time)
  lineItems: {
    parts: [{
      partName:              { type: String, required: true },
      quantity:              { type: Number, required: true },
      unitPriceAtAllocation: { type: Number, required: true },
      lineTotal:             { type: Number, required: true } // quantity × unitPrice
    }],
    labor: [{
      description: { type: String, required: true },
      cost:        { type: Number, required: true }
    }]
  },

  subtotal:    { type: Number, required: true }, // Parts + Labor total
  taxRate:     { type: Number, required: true, default: 18 }, // VAT % applied (e.g. 18)
  taxAmount:   { type: Number, required: true }, // Computed server-side (Guardrail #2)
  totalAmount: { type: Number, required: true }, // subtotal + taxAmount

  paymentStatus: {
    type: String,
    enum: ['Paid', 'Unpaid'],
    default: 'Unpaid'
  },
  paymentMethod: {
    type: String,
    enum: ['Cash', 'Card', 'Online', 'None'],
    default: 'None'
  },
  paidAt:    { type: Date },
  isDeleted: { type: Boolean, default: false } // Guardrail #5
}, { timestamps: true });

// Pre-save hook: auto-generate sequential invoiceNumbers (INV-0001+)
invoiceSchema.pre('save', async function () {
  if (this.invoiceNumber) return;

  const lastInvoice = await mongoose.model('Invoice')
    .findOne({}, { invoiceNumber: 1 })
    .sort({ createdAt: -1 });

  let nextNumber = 1;
  if (lastInvoice && lastInvoice.invoiceNumber) {
    const match = lastInvoice.invoiceNumber.match(/\d+/);
    if (match) nextNumber = parseInt(match[0], 10) + 1;
  }

  this.invoiceNumber = `INV-${String(nextNumber).padStart(4, '0')}`;
});

module.exports = mongoose.model('Invoice', invoiceSchema);
