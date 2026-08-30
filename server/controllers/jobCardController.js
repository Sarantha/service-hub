const JobCardService = require('../services/jobCardService');

/**
 * Handle POST request to initialize a new Job Card intake.
 */
exports.createJobCard = async (req, res, next) => {
  try {
    const intakeData = req.body;
    const serviceAdvisorId = req.user.id;
    const branchId = req.branchScope.writeBranchId;
    if (!branchId) {
      const error = new Error('Select a branch to work in before creating a Job Card.');
      error.statusCode = 400;
      return next(error);
    }
    const jobCard = await JobCardService.initializeIntake(intakeData, serviceAdvisorId, branchId);

    res.status(201).json({
      success: true,
      message: 'Job Card created and intake logged successfully.',
      data: jobCard
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handle PATCH request to assign a technician to a Job Card.
 */
exports.assignTechnician = async (req, res, next) => {
  try {
    const { idOrNumber } = req.params;
    const { technicianId } = req.body;

    const jobCard = await JobCardService.assignTechnicianToBay(idOrNumber, technicianId, req.branchScope.filter);

    res.status(200).json({
      success: true,
      message: 'Technician assigned to work bay successfully.',
      data: jobCard
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handle POST request to append a labour/service charge to a Job Card.
 */
exports.addLaborCharge = async (req, res, next) => {
  try {
    const { idOrNumber } = req.params;
    const { description, cost } = req.body;

    const jobCard = await JobCardService.addLaborCharge(idOrNumber, { description, cost }, req.branchScope.filter);

    res.status(201).json({
      success: true,
      message: 'Labour charge added to job card ledger.',
      data: jobCard
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handle DELETE request to remove a line item (part or labour charge) from a
 * Job Card. Removing an allocated part restores the quantity back to Inventory.
 */
exports.removeLineItem = async (req, res, next) => {
  try {
    const { idOrNumber, lineId } = req.params;

    const jobCard = await JobCardService.removeLineItem(idOrNumber, lineId, req.branchScope.filter);

    res.status(200).json({
      success: true,
      message: 'Line item removed from job card ledger.',
      data: jobCard
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handle PUT request to modify the job card checklist items.
 */
exports.updateChecklist = async (req, res, next) => {
  try {
    const { idOrNumber } = req.params;
    const { checklist } = req.body;

    const jobCard = await JobCardService.updateChecklist(idOrNumber, checklist, req.branchScope.filter);

    res.status(200).json({
      success: true,
      message: 'Job Card checklist state synchronized.',
      data: jobCard
    });
  } catch (error) {
    next(error);
  }
};

// ── Status label → stage number lookup ──────────────────────────────────────
const STATUS_STAGE_MAP = {
  'Open':          1,
  'In Progress':   2,
  'Awaiting Parts':3,
  'Completed':     4,
  'Delivered':     5
};

/**
 * Handle PATCH request to set a job card status by label (e.g. 'In Progress').
 * Allowed for Technician, Service Advisor, and Super Admin.
 */
exports.setStatus = async (req, res, next) => {
  try {
    const { idOrNumber } = req.params;
    const { status } = req.body;

    const stage = STATUS_STAGE_MAP[status];
    if (!stage) {
      const error = new Error(`Invalid status label '${status}'. Must be one of: ${Object.keys(STATUS_STAGE_MAP).join(', ')}.`);
      error.statusCode = 400;
      return next(error);
    }

    const jobCard = await JobCardService.advanceOperationalStage(idOrNumber, stage, req.branchScope.filter);

    res.status(200).json({
      success: true,
      message: `Job Card status updated to '${status}'.`,
      data: jobCard
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handle PATCH request to advance the job card workflow stage.
 */
exports.updateStage = async (req, res, next) => {
  try {
    const { idOrNumber } = req.params;
    const { stage } = req.body;

    const jobCard = await JobCardService.advanceOperationalStage(idOrNumber, stage, req.branchScope.filter);

    res.status(200).json({
      success: true,
      message: `Job Card workflow status advanced to Stage ${stage}.`,
      data: jobCard
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handle GET request to retrieve all job cards.
 */
exports.getJobCards = async (req, res, next) => {
  try {
    let jobCards = await JobCardService.getAllJobCards(req.branchScope.filter);

    // If requester is a Technician, strip financial fields from all cards
    if (req.user.role === 'Technician') {
      jobCards = jobCards.map(jc => {
        const jcCopy = { ...jc };
        delete jcCopy.estimatedCost;
        if (Array.isArray(jcCopy.partsAllocated)) {
          jcCopy.partsAllocated = jcCopy.partsAllocated.map(part => {
            const partCopy = { ...part };
            delete partCopy.unitPriceAtAllocation;
            return partCopy;
          });
        }
        if (Array.isArray(jcCopy.laborCharges)) {
          jcCopy.laborCharges = jcCopy.laborCharges.map(labor => {
            const laborCopy = { ...labor };
            delete laborCopy.cost;
            return laborCopy;
          });
        }
        return jcCopy;
      });
    }

    res.status(200).json({
      success: true,
      message: 'Job cards retrieved successfully.',
      data: jobCards
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handle GET request to retrieve a single job card.
 */
exports.getJobCard = async (req, res, next) => {
  try {
    const { idOrNumber } = req.params;
    const jobCard = await JobCardService.getJobCard(idOrNumber, req.branchScope.filter);

    // If requester is a Technician, strip financial fields
    if (req.user.role === 'Technician') {
      delete jobCard.estimatedCost;
      if (Array.isArray(jobCard.partsAllocated)) {
        jobCard.partsAllocated = jobCard.partsAllocated.map(part => {
          const partCopy = { ...part };
          delete partCopy.unitPriceAtAllocation;
          return partCopy;
        });
      }
      if (Array.isArray(jobCard.laborCharges)) {
        jobCard.laborCharges = jobCard.laborCharges.map(labor => {
          const laborCopy = { ...labor };
          delete laborCopy.cost;
          return laborCopy;
        });
      }
    }

    res.status(200).json({
      success: true,
      message: 'Job card retrieved successfully.',
      data: jobCard
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handle PUT request to update generic job card fields.
 */
exports.updateJobCard = async (req, res, next) => {
  try {
    const { idOrNumber } = req.params;
    const jobCard = await JobCardService.updateJobCard(idOrNumber, req.body, req.branchScope.filter);
    res.status(200).json({
      success: true,
      message: 'Job card updated successfully.',
      data: jobCard
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handle DELETE request to soft-delete a job card.
 */
exports.deleteJobCard = async (req, res, next) => {
  try {
    const { idOrNumber } = req.params;
    const jobCard = await JobCardService.deleteJobCard(idOrNumber, req.branchScope.filter);
    res.status(200).json({
      success: true,
      message: 'Job card soft-deleted successfully.',
      data: jobCard
    });
  } catch (error) {
    next(error);
  }
};


