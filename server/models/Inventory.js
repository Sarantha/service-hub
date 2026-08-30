const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema({
  branchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    required: true
  }, // Physical stock is location-specific — each branch manages its own inventory
  partName: {
    type: String,
    required: true,
    trim: true
  },
  sku: {
    type: String,
    required: true,
    uppercase: true,
    trim: true
  }, // e.g., 'OIL-001'. Uniqueness among ACTIVE items is enforced in the
     // service layer (scoped to isDeleted: false), not a schema-level unique
     // index — a hard index would permanently block reusing a SKU after its
     // item is soft-deleted.
  category: {
    type: String,
    required: true,
    trim: true
  }, // Validated against the InventoryCategory collection at the service
     // layer (Super-Admin-managed, extensible) rather than a fixed enum
  stockLevel: {
    type: Number,
    required: true,
    default: 0,
    min: [0, 'Stock level cannot be negative.']
  },
  reorderPoint: {
    type: Number,
    required: true,
    default: 5
  }, // Low stock flag triggered when stockLevel <= reorderPoint
  unitPrice: {
    type: Number,
    required: true,
    min: [0, 'Unit price cannot be negative.']
  }, // Selling price — charged to customers via Job Card part allocation
  buyingPrice: {
    type: Number,
    min: [0, 'Buying price cannot be negative.']
  }, // Cost price — used to derive per-unit profit; not required so legacy
     // items don't fail validation, but profit is only computed once it's set
  expirationDate: {
    type: Date
  }, // Drives "Expiring Soon" dashboard alerts
  isDeleted: {
    type: Boolean,
    default: false
  } // Guardrail #5 (Soft deletes only)
}, { timestamps: true });

module.exports = mongoose.model('Inventory', inventorySchema);
