const { z } = require('zod');

// Category is validated dynamically against the InventoryCategory collection
// in the service layer (Super-Admin-managed, extensible) — not a fixed enum.
const createInventoryItemSchema = z.object({
  partName: z.string().trim().min(1, 'Item name is required.'),
  sku: z.string().trim().min(1, 'SKU is required.'),
  category: z.string().trim().min(1, 'Category is required.'),
  stockLevel: z.coerce.number().min(0, 'Stock level cannot be negative.').optional(),
  reorderPoint: z.coerce.number().min(0, 'Reorder point cannot be negative.').optional(),
  unitPrice: z.coerce.number().min(0, 'Selling price cannot be negative.'),
  buyingPrice: z.coerce.number().min(0, 'Buying price cannot be negative.').optional(),
  expirationDate: z.coerce.date().optional()
});

const updateInventoryItemSchema = z.object({
  partName: z.string().trim().min(1).optional(),
  category: z.string().trim().min(1).optional(),
  stockLevel: z.coerce.number().min(0).optional(),
  reorderPoint: z.coerce.number().min(0).optional(),
  unitPrice: z.coerce.number().min(0, 'Selling price cannot be negative.').optional(),
  buyingPrice: z.coerce.number().min(0, 'Buying price cannot be negative.').optional(),
  expirationDate: z.coerce.date().optional()
});

module.exports = { createInventoryItemSchema, updateInventoryItemSchema };
