const BillingService = require('../services/billingService');
const JobCard = require('../models/JobCard');
const mongoose = require('mongoose');

/**
 * Middleware that rejects any mutating request on a Job Card
 * if that card is linked to a settled (Paid) invoice.
 * Satisfies Guardrail #3: Immutable Settled Records.
 *
 * Must be mounted after authGuard so req.user is available.
 * Resolves the Job Card by :idOrNumber param.
 */
const invoiceLockGuard = async (req, res, next) => {
  try {
    const { idOrNumber } = req.params;
    if (!idOrNumber) return next();

    // Resolve Job Card _id from either ObjectId or jobCardNumber
    let jobCardId;
    if (mongoose.Types.ObjectId.isValid(idOrNumber)) {
      jobCardId = idOrNumber;
    } else {
      const jobCard = await JobCard.findOne(
        { jobCardNumber: idOrNumber, isDeleted: false },
        { _id: 1 }
      ).lean();

      if (!jobCard) return next(); // Let controller return the 404
      jobCardId = jobCard._id;
    }

    // Check if the resolved Job Card is locked
    const locked = await BillingService.isJobCardLocked(jobCardId);
    if (locked) {
      const error = new Error(
        'This Job Card is sealed. The linked invoice has been settled and all records are immutable.'
      );
      error.statusCode = 400;
      return next(error);
    }

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = invoiceLockGuard;
