const VehicleService = require('../services/vehicleService');

/**
 * GET /api/v1/vehicles/lookup?regNo=VALUE
 *
 * Scans the Customer collection for a vehicle matching the supplied
 * registration number and returns a unified customer + vehicle payload
 * for the intake form auto-hydration engine.
 */
exports.lookupVehicle = async (req, res, next) => {
  try {
    const { regNo } = req.query;
    const result = await VehicleService.lookupByRegNo(regNo);

    res.status(200).json({
      success: true,
      message: 'Vehicle lookup resolved successfully.',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
