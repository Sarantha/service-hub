const mongoose = require('mongoose');

const inventoryCategorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  }, // Uniqueness among ACTIVE categories is enforced in the service layer
     // (case-insensitive, scoped to isDeleted: false) rather than a schema-
     // level unique index — a hard index would permanently block reusing a
     // name after its category is soft-deleted.
  isDeleted: {
    type: Boolean,
    default: false
  } // Guardrail #5 (Soft deletes only)
}, { timestamps: true });

module.exports = mongoose.model('InventoryCategory', inventoryCategorySchema);
