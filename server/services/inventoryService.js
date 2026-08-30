const Inventory = require('../models/Inventory');
const InventoryCategory = require('../models/InventoryCategory');
const JobCard = require('../models/JobCard');
const mongoose = require('mongoose');

class InventoryService {
  /**
   * Derives per-unit profit fields server-side (Guardrail #2 - No Frontend
   * Math). Only computed once a buyingPrice has actually been recorded —
   * legacy items without one show null rather than a fabricated 100% margin.
   */
  static _withProfit(item) {
    const hasCost = typeof item.buyingPrice === 'number';
    return {
      ...item,
      profitPerUnit: hasCost ? item.unitPrice - item.buyingPrice : null,
      profitMarginPercent: hasCost && item.unitPrice > 0
        ? Math.round(((item.unitPrice - item.buyingPrice) / item.unitPrice) * 100)
        : null
    };
  }

  /**
   * Validates a category name against the Super-Admin-managed
   * InventoryCategory collection — categories are no longer a fixed enum.
   */
  static async _assertValidCategory(category) {
    const match = await InventoryCategory.findOne({ name: category, isDeleted: false });
    if (!match) {
      const error = new Error(`"${category}" is not a recognized category. Ask a Super Admin to add it first.`);
      error.statusCode = 400;
      throw error;
    }
  }

  /**
   * Adds a new inventory part to the ledger.
   */
  static async addItem({ partName, sku, category, stockLevel, reorderPoint, unitPrice, buyingPrice, expirationDate }, branchId) {
    if (!branchId) {
      const error = new Error('Select a branch to work in before adding an inventory item.');
      error.statusCode = 400;
      throw error;
    }

    // SKU uniqueness is scoped per branch — the same part code (e.g.
    // 'OIL-001') is expected to exist as a separate stock record at each
    // branch that stocks it, each with its own quantity/pricing.
    const existing = await Inventory.findOne({ sku: sku.toUpperCase().trim(), branchId, isDeleted: false });
    if (existing) {
      const error = new Error(`SKU '${sku.toUpperCase().trim()}' is already registered at this branch.`);
      error.statusCode = 400;
      throw error;
    }

    await InventoryService._assertValidCategory(category);

    const item = await Inventory.create({
      branchId,
      partName,
      sku,
      category,
      stockLevel,
      reorderPoint,
      unitPrice,
      buyingPrice,
      expirationDate
    });

    return InventoryService._withProfit(item.toObject());
  }

  /**
   * Retrieves all active (non-deleted) inventory items with optional low-stock warning flag.
   * Cost/profit data (buyingPrice, profit) is withheld from Technician — they
   * can see stock levels but not margin/cost information.
   */
  static async getAllItems(role, branchFilter = {}) {
    let query = Inventory.find({ ...branchFilter, isDeleted: false });
    if (role === 'Technician') {
      query = query.select('-buyingPrice');
    }
    const items = await query.lean();

    return items.map(item => ({
      ...(role === 'Technician' ? item : InventoryService._withProfit(item)),
      lowStockWarning: item.stockLevel <= item.reorderPoint
    }));
  }

  /**
   * Retrieves a single inventory item by ID with low-stock warning.
   */
  static async getItemById(itemId, branchFilter = {}) {
    if (!mongoose.Types.ObjectId.isValid(itemId)) {
      const error = new Error('Invalid inventory item ID format.');
      error.statusCode = 400;
      throw error;
    }

    const item = await Inventory.findOne({ _id: itemId, ...branchFilter, isDeleted: false }).lean();
    if (!item) {
      const error = new Error('Inventory item not found.');
      error.statusCode = 404;
      throw error;
    }

    return {
      ...InventoryService._withProfit(item),
      lowStockWarning: item.stockLevel <= item.reorderPoint
    };
  }

  /**
   * Updates an inventory item (price, stock, reorder point, expiry).
   */
  static async updateItem(itemId, updates, branchFilter = {}) {
    if (!mongoose.Types.ObjectId.isValid(itemId)) {
      const error = new Error('Invalid inventory item ID format.');
      error.statusCode = 400;
      throw error;
    }

    // Guardrail: never allow isDeleted/branchId updates through this method
    // — moving stock between branches is not supported by a field edit.
    delete updates.isDeleted;
    delete updates.branchId;

    if (updates.category !== undefined) {
      await InventoryService._assertValidCategory(updates.category);
    }

    const item = await Inventory.findOneAndUpdate(
      { _id: itemId, ...branchFilter, isDeleted: false },
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!item) {
      const error = new Error('Inventory item not found.');
      error.statusCode = 404;
      throw error;
    }

    const itemObj = item.toObject();
    return {
      ...InventoryService._withProfit(itemObj),
      lowStockWarning: itemObj.stockLevel <= itemObj.reorderPoint
    };
  }

  /**
   * Soft-deletes an inventory item (Guardrail #5).
   */
  static async deleteItem(itemId, branchFilter = {}) {
    if (!mongoose.Types.ObjectId.isValid(itemId)) {
      const error = new Error('Invalid inventory item ID format.');
      error.statusCode = 400;
      throw error;
    }

    const item = await Inventory.findOneAndUpdate(
      { _id: itemId, ...branchFilter, isDeleted: false },
      { $set: { isDeleted: true } },
      { new: true }
    );

    if (!item) {
      const error = new Error('Inventory item not found.');
      error.statusCode = 404;
      throw error;
    }

    return { message: 'Inventory item removed from active ledger.' };
  }

  /**
   * Allocates a part to a Job Card:
   *  1. Checks stockLevel can cover the requested quantity (Guardrail: no overselling).
   *  2. Atomically decrements stockLevel using $inc to prevent race conditions.
   *  3. Appends part details to the Job Card's partsAllocated array (price frozen at allocation).
   *  4. Returns updated inventory with lowStockWarning flag.
   */
  static async allocatePartsToJobCard(jobCardIdOrNumber, partId, quantity, branchFilter = {}) {
    const qty = parseInt(quantity, 10);
    if (!qty || qty < 1) {
      const error = new Error('Allocation quantity must be a positive integer.');
      error.statusCode = 400;
      throw error;
    }

    if (!mongoose.Types.ObjectId.isValid(partId)) {
      const error = new Error('Invalid inventory part ID format.');
      error.statusCode = 400;
      throw error;
    }

    // 1. Resolve Job Card
    const jobCardQuery = mongoose.Types.ObjectId.isValid(jobCardIdOrNumber)
      ? { _id: jobCardIdOrNumber }
      : { jobCardNumber: jobCardIdOrNumber };

    const jobCard = await JobCard.findOne({ ...jobCardQuery, ...branchFilter, isDeleted: false });
    if (!jobCard) {
      const error = new Error('Job Card not found.');
      error.statusCode = 404;
      throw error;
    }

    // 2. Fetch inventory item and validate sufficient stock — scoped to the
    // Job Card's own branch, so a part can never be allocated from a
    // different branch's stock than the one servicing the vehicle.
    const inventoryItem = await Inventory.findOne({ _id: partId, branchId: jobCard.branchId, isDeleted: false });
    if (!inventoryItem) {
      const error = new Error('Inventory part not found.');
      error.statusCode = 404;
      throw error;
    }

    if (inventoryItem.stockLevel < qty) {
      const error = new Error(
        `Insufficient stock for '${inventoryItem.partName}'. Available: ${inventoryItem.stockLevel}, Requested: ${qty}.`
      );
      error.statusCode = 400;
      throw error;
    }

    // 3. Atomically decrement stockLevel (prevents race conditions)
    const updatedItem = await Inventory.findOneAndUpdate(
      { _id: partId, isDeleted: false, stockLevel: { $gte: qty } },
      { $inc: { stockLevel: -qty } },
      { new: true }
    );

    if (!updatedItem) {
      const error = new Error('Stock allocation failed. Stock may have changed concurrently.');
      error.statusCode = 409;
      throw error;
    }

    // 4. Append allocation record to Job Card (price frozen at allocation time)
    jobCard.partsAllocated.push({
      partId: inventoryItem._id,
      partName: inventoryItem.partName,
      quantity: qty,
      unitPriceAtAllocation: inventoryItem.unitPrice
    });
    await jobCard.save();

    // 5. Return updated inventory item with low stock warning flag
    const updatedItemObj = updatedItem.toObject();
    return {
      updatedInventory: {
        ...updatedItemObj,
        lowStockWarning: updatedItemObj.stockLevel <= updatedItemObj.reorderPoint
      },
      updatedJobCard: jobCard
    };
  }
}

module.exports = InventoryService;
