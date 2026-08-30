const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name:     { type: String, required: true },
  // Uniqueness among ACTIVE accounts is enforced in authService (scoped to
  // isDeleted: false), not a schema-level unique index — a hard index would
  // permanently block reusing an email after its account is soft-deleted
  // (the same class of bug already found/fixed on Inventory.sku,
  // InventoryCategory.name, and Branch.branchName/code).
  email:    { type: String, required: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  role:     { type: String, enum: ['Super Admin', 'Service Advisor', 'Technician'], default: 'Technician' },
  status:   { type: String, enum: ['Active', 'Suspended'], default: 'Active' },
  // Required for Service Advisor/Technician (they belong to exactly one
  // branch); optional for Super Admin — a Super Admin may own/manage
  // multiple branches and isn't pinned to a single one. If set on a Super
  // Admin, it's just their personal default/home branch, not a restriction.
  branchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    required: function () { return this.role !== 'Super Admin'; }
  },
  performanceMetrics: {
    averageResolutionTimeMinutes: { type: Number, default: 0 },
    totalJobsCompletedCount:      { type: Number, default: 0 },
    customerRating:               { type: Number, default: 5.0 }
  },
  isDeleted: { type: Boolean, default: false } // Guardrail #5 (Soft deletes only)
}, { timestamps: true });

// Pre-save hook to automatically hash password strings via bcryptjs before saving
userSchema.pre('save', async function () {
  if (!this.isModified('password')) {
    return;
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Compare candidate password during login
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
