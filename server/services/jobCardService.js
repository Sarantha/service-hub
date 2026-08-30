const JobCard = require('../models/JobCard');
const Customer = require('../models/Customer');
const User = require('../models/User');
const Inventory = require('../models/Inventory');
const Invoice = require('../models/Invoice');
const mongoose = require('mongoose');

class JobCardService {
  /**
   * Initializes a job card intake flow.
   */
  static async initializeIntake(intakeData, serviceAdvisorId, branchId) {
    const {
      vehicleRegNo,
      serviceType,
      customerReportedIssues,
      priority,
      checklist,
      laborCharges,
      estimatedCost,
      odometerReading,
      vehicleInventory,
      warningIndicators,
      damageMarkers
    } = intakeData;

    if (!vehicleRegNo) {
      const error = new Error('Vehicle registration number is required for intake.');
      error.statusCode = 400;
      throw error;
    }

    const numericOdometer = Number(odometerReading);
    if (!Number.isFinite(numericOdometer) || numericOdometer < 0) {
      const error = new Error('A valid odometer reading (in km) is required for intake.');
      error.statusCode = 400;
      throw error;
    }

    // 1. Normalize registration number and locate customer profile
    const normalizedRegNo = vehicleRegNo.toUpperCase().trim();
    const customer = await Customer.findOne({
      'vehicles.regNo': normalizedRegNo,
      isDeleted: false
    });

    if (!customer) {
      const error = new Error(`Intake failed. Vehicle registration ${normalizedRegNo} does not exist in registry.`);
      error.statusCode = 404;
      throw error;
    }

    // 2. Create Job Card document — the odometer reading is frozen on this
    // record so each past service in the vehicle's history keeps the mileage
    // it actually had at that visit, not the vehicle's current reading.
    const newJobCard = await JobCard.create({
      branchId,
      vehicleRegNo: normalizedRegNo,
      customerPhone: customer.phone,
      serviceAdvisorId,
      priority: priority || 'Normal',
      status: 'Open',
      currentStage: 1,
      serviceType,
      customerReportedIssues,
      checklist: checklist || [],
      laborCharges: laborCharges || [],
      estimatedCost: estimatedCost || 0,
      odometerReading: numericOdometer,
      vehicleInventory: vehicleInventory || {},
      warningIndicators: warningIndicators || '',
      damageMarkers: damageMarkers || []
    });

    // 3. Keep the vehicle's "current" odometer in sync — only move it
    // forward, never backward, in case of an out-of-order/corrective entry.
    const vehicle = customer.vehicles.find(v => v.regNo === normalizedRegNo);
    if (vehicle && numericOdometer > (vehicle.odometer || 0)) {
      vehicle.odometer = numericOdometer;
      await customer.save();
    }

    return newJobCard;
  }

  /**
   * Assigns a technician to a Job Card and transitions stage to 2.
   */
  static async assignTechnicianToBay(jobCardIdOrNumber, technicianId, branchFilter = {}) {
    const query = mongoose.Types.ObjectId.isValid(jobCardIdOrNumber)
      ? { _id: jobCardIdOrNumber }
      : { jobCardNumber: jobCardIdOrNumber };

    // 1. Fetch Job Card
    const jobCard = await JobCard.findOne({ ...query, ...branchFilter, isDeleted: false });
    if (!jobCard) {
      const error = new Error('Job Card profile not found.');
      error.statusCode = 404;
      throw error;
    }

    // 2. Find and validate technician
    const technician = await User.findOne({ _id: technicianId, isDeleted: false });
    if (!technician) {
      const error = new Error('Target technician profile not found.');
      error.statusCode = 404;
      throw error;
    }

    if (technician.role !== 'Technician') {
      const error = new Error('Assigned user must hold the Technician role.');
      error.statusCode = 400;
      throw error;
    }

    if (technician.status !== 'Active') {
      const error = new Error('Target technician account is suspended.');
      error.statusCode = 400;
      throw error;
    }

    // 3. Assign technician and transition stage/status if at stage 1
    jobCard.assignedTechnicianId = technician._id;
    if (jobCard.currentStage === 1) {
      jobCard.currentStage = 2;
      jobCard.status = 'In Progress';
      jobCard.inProgressAt = new Date();
    }

    await jobCard.save();
    return jobCard;
  }

  /**
   * Advances the Job Card operational stage (1 through 5).
   */
  static async advanceOperationalStage(jobCardIdOrNumber, stageNumber, branchFilter = {}) {
    const query = mongoose.Types.ObjectId.isValid(jobCardIdOrNumber)
      ? { _id: jobCardIdOrNumber }
      : { jobCardNumber: jobCardIdOrNumber };

    // 1. Fetch Job Card
    const jobCard = await JobCard.findOne({ ...query, ...branchFilter, isDeleted: false });
    if (!jobCard) {
      const error = new Error('Job Card profile not found.');
      error.statusCode = 404;
      throw error;
    }

    const stage = parseInt(stageNumber, 10);
    if (![1, 2, 3, 4, 5].includes(stage)) {
      const error = new Error('Invalid stage number. Value must be between 1 and 5.');
      error.statusCode = 400;
      throw error;
    }

    // 2. Set stage and status
    jobCard.currentStage = stage;
    const now = new Date();

    switch (stage) {
      case 1:
        jobCard.status = 'Open';
        break;
      case 2:
        jobCard.status = 'In Progress';
        if (!jobCard.inProgressAt) jobCard.inProgressAt = now;
        break;
      case 3:
        jobCard.status = 'Awaiting Parts';
        break;
      case 4:
        jobCard.status = 'Completed';
        if (!jobCard.completedAt) jobCard.completedAt = now;
        break;
      case 5:
        jobCard.status = 'Delivered';
        if (!jobCard.deliveredAt) jobCard.deliveredAt = now;
        break;
    }

    await jobCard.save();
    return jobCard;
  }

  /**
   * Appends a freeform labour/service charge to the Job Card ledger.
   */
  static async addLaborCharge(jobCardIdOrNumber, { description, cost }, branchFilter = {}) {
    const query = mongoose.Types.ObjectId.isValid(jobCardIdOrNumber)
      ? { _id: jobCardIdOrNumber }
      : { jobCardNumber: jobCardIdOrNumber };

    if (!description || typeof description !== 'string' || !description.trim()) {
      const error = new Error('Labour charge description is required.');
      error.statusCode = 400;
      throw error;
    }

    const numericCost = Number(cost);
    if (!Number.isFinite(numericCost) || numericCost < 0) {
      const error = new Error('Labour charge cost must be a valid non-negative number.');
      error.statusCode = 400;
      throw error;
    }

    const jobCard = await JobCard.findOne({ ...query, ...branchFilter, isDeleted: false });
    if (!jobCard) {
      const error = new Error('Job Card profile not found.');
      error.statusCode = 404;
      throw error;
    }

    jobCard.laborCharges.push({ description: description.trim(), cost: numericCost });
    await jobCard.save();

    return jobCard;
  }

  /**
   * Removes a single line item (allocated part or labour charge) from the Job
   * Card ledger. Removing an allocated part restores its quantity back to the
   * source Inventory item's stockLevel, undoing the deduction made at allocation.
   */
  static async removeLineItem(jobCardIdOrNumber, lineId, branchFilter = {}) {
    if (!mongoose.Types.ObjectId.isValid(lineId)) {
      const error = new Error('Invalid line item ID format.');
      error.statusCode = 400;
      throw error;
    }

    const query = mongoose.Types.ObjectId.isValid(jobCardIdOrNumber)
      ? { _id: jobCardIdOrNumber }
      : { jobCardNumber: jobCardIdOrNumber };

    const jobCard = await JobCard.findOne({ ...query, ...branchFilter, isDeleted: false });
    if (!jobCard) {
      const error = new Error('Job Card profile not found.');
      error.statusCode = 404;
      throw error;
    }

    const part = jobCard.partsAllocated.id(lineId);
    if (part) {
      if (part.partId) {
        await Inventory.findOneAndUpdate(
          { _id: part.partId, isDeleted: false },
          { $inc: { stockLevel: part.quantity } }
        );
      }
      part.deleteOne();
      await jobCard.save();
      return jobCard;
    }

    const labor = jobCard.laborCharges.id(lineId);
    if (labor) {
      labor.deleteOne();
      await jobCard.save();
      return jobCard;
    }

    const error = new Error('Line item not found on this Job Card.');
    error.statusCode = 404;
    throw error;
  }

  /**
   * Updates the checklist tasks array.
   */
  static async updateChecklist(jobCardIdOrNumber, checklist, branchFilter = {}) {
    const query = mongoose.Types.ObjectId.isValid(jobCardIdOrNumber)
      ? { _id: jobCardIdOrNumber }
      : { jobCardNumber: jobCardIdOrNumber };

    // 1. Fetch Job Card
    const jobCard = await JobCard.findOne({ ...query, ...branchFilter, isDeleted: false });
    if (!jobCard) {
      const error = new Error('Job Card profile not found.');
      error.statusCode = 404;
      throw error;
    }

    if (!Array.isArray(checklist)) {
      const error = new Error('Checklist payload must be a valid array of tasks.');
      error.statusCode = 400;
      throw error;
    }

    // 2. Apply and save
    jobCard.checklist = checklist;

    await jobCard.save();
    return jobCard;
  }

  /**
   * Retrieves all active job cards.
   */
  static async getAllJobCards(branchFilter = {}) {
    const jobCards = await JobCard.find({ ...branchFilter, isDeleted: false })
      .populate('serviceAdvisorId', 'name')
      .populate('assignedTechnicianId', 'name')
      .lean();

    const phones = jobCards.map(jc => jc.customerPhone);
    const customers = await Customer.find({ phone: { $in: phones }, isDeleted: false }).lean();
    
    const customerMap = {};
    customers.forEach(c => {
      customerMap[c.phone] = `${c.firstName} ${c.lastName}`;
    });

    return jobCards.map(jc => ({
      ...jc,
      customerName: customerMap[jc.customerPhone] || 'Customer',
      assignedTechnician: jc.assignedTechnicianId ? { name: jc.assignedTechnicianId.name } : null
    }));
  }

  /**
   * Retrieves a single job card.
   */
  static async getJobCard(idOrNumber, branchFilter = {}) {
    const query = mongoose.Types.ObjectId.isValid(idOrNumber)
      ? { _id: idOrNumber }
      : { jobCardNumber: idOrNumber };

    const jobCard = await JobCard.findOne({ ...query, ...branchFilter, isDeleted: false })
      .populate('serviceAdvisorId', 'name')
      .populate('assignedTechnicianId', 'name')
      .lean();

    if (!jobCard) {
      const error = new Error('Job Card profile not found.');
      error.statusCode = 404;
      throw error;
    }

    const customer = await Customer.findOne({ phone: jobCard.customerPhone, isDeleted: false }).lean();

    // Surface invoice existence so the client can block duplicate invoice creation
    // up front (the server still rejects duplicates independently — see BillingService).
    const existingInvoice = await Invoice.findOne({ jobCardId: jobCard._id, isDeleted: false })
      .select('invoiceNumber')
      .lean();

    return {
      ...jobCard,
      customerName: customer ? `${customer.firstName} ${customer.lastName}` : 'Customer',
      assignedTechnician: jobCard.assignedTechnicianId ? { name: jobCard.assignedTechnicianId.name } : null,
      hasInvoice: !!existingInvoice,
      invoiceNumber: existingInvoice?.invoiceNumber || null
    };
  }

  /**
   * Updates generic job card fields.
   */
  static async updateJobCard(idOrNumber, updateData, branchFilter = {}) {
    const query = mongoose.Types.ObjectId.isValid(idOrNumber)
      ? { _id: idOrNumber }
      : { jobCardNumber: idOrNumber };

    const jobCard = await JobCard.findOneAndUpdate(
      { ...query, ...branchFilter, isDeleted: false },
      { $set: updateData },
      { new: true }
    );

    if (!jobCard) {
      const error = new Error('Job Card profile not found.');
      error.statusCode = 404;
      throw error;
    }

    return jobCard;
  }

  /**
   * Soft-deletes a job card.
   */
  static async deleteJobCard(idOrNumber, branchFilter = {}) {
    const query = mongoose.Types.ObjectId.isValid(idOrNumber)
      ? { _id: idOrNumber }
      : { jobCardNumber: idOrNumber };

    const jobCard = await JobCard.findOneAndUpdate(
      { ...query, ...branchFilter, isDeleted: false },
      { $set: { isDeleted: true } },
      { new: true }
    );

    if (!jobCard) {
      const error = new Error('Job Card profile not found.');
      error.statusCode = 404;
      throw error;
    }

    return jobCard;
  }
}

module.exports = JobCardService;


