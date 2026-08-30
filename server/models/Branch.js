const mongoose = require('mongoose');

const branchSchema = new mongoose.Schema({
  branchName: { type: String, required: true }, // e.g., 'Colombo Main Branch'
  code:        { type: String, required: true }, // e.g., 'CMB-01'
  isActive:    { type: Boolean, default: true },
  isDeleted:   { type: Boolean, default: false }               // Guardrail #5: soft delete
  // Uniqueness on name/code is enforced in branchService (case-insensitive,
  // scoped to isDeleted: false), not a schema-level unique index — a hard
  // index would permanently block reusing a name/code after a soft delete.
}, { timestamps: true });

module.exports = mongoose.model('Branch', branchSchema);
