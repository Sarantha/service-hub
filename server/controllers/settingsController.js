const Settings = require('../models/Settings');
const Branch = require('../models/Branch');

/**
 * Helper to get or create settings for a branch.
 */
const getOrCreateSettings = async (branchId) => {
  let settings = await Settings.findOne({ branchId });
  if (!settings) {
    settings = await Settings.create({
      branchId,
      stationName: 'Colombo Central Service Station',
      phone: '+94 11 234 5678',
      vatRegistrationNumber: 'VAT-123456789',
      address: 'No. 42, Galle Road, Colombo 03',
      maxBookingsPerDay: 20,
      vatRatePercentage: 18,
      defaultCurrency: 'LKR',
      allowedPaymentMethods: ['Cash', 'Card', 'Online'],
      invoicePrefix: 'INV-',
      invoiceFooterNote: 'Thank you for choosing our service. Warranty valid 30 days.',
      notificationToggles: {
        smsServiceReminders: true,
        emailEstimateApprovals: true,
        smsVehicleReadyAlerts: true,
        multiFactorAuthenticationEnabled: false,
        lowStockEmailAlerts: true
      }
    });
  }
  return settings;
};

/**
 * GET /api/v1/settings
 */
exports.getSettings = async (req, res, next) => {
  try {
    let branchId = req.user.branchId;
    if (!branchId) {
      const defaultBranch = await Branch.findOne({ code: 'CMB-01' });
      if (defaultBranch) {
        branchId = defaultBranch._id;
      } else {
        const error = new Error('No active branch found.');
        error.statusCode = 404;
        throw error;
      }
    }

    const settings = await getOrCreateSettings(branchId);
    res.status(200).json({
      success: true,
      message: 'System settings retrieved successfully.',
      data: settings
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT/POST /api/v1/settings
 */
exports.updateSettings = async (req, res, next) => {
  try {
    let branchId = req.user.branchId;
    if (!branchId) {
      const defaultBranch = await Branch.findOne({ code: 'CMB-01' });
      if (defaultBranch) {
        branchId = defaultBranch._id;
      } else {
        const error = new Error('No active branch found.');
        error.statusCode = 404;
        throw error;
      }
    }

    let settings = await Settings.findOne({ branchId });
    if (!settings) {
      settings = new Settings({ branchId });
    }

    // Apply fields from body
    const fields = [
      'stationName', 'phone', 'vatRegistrationNumber', 'address',
      'maxBookingsPerDay',
      'vatRatePercentage', 'defaultCurrency', 'allowedPaymentMethods',
      'invoicePrefix', 'invoiceFooterNote', 'notificationToggles'
    ];
    fields.forEach(field => {
      if (req.body[field] !== undefined) {
        settings[field] = req.body[field];
      }
    });

    await settings.save();

    res.status(200).json({
      success: true,
      message: 'System settings updated successfully.',
      data: settings
    });
  } catch (error) {
    next(error);
  }
};
