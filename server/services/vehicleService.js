const Customer = require('../models/Customer');

class VehicleService {
  /**
   * Locate a vehicle by registration number and return a unified
   * customer + vehicle payload for the intake auto-hydration engine.
   *
   * @param {string} regNo - Raw registration string from the query parameter.
   * @returns {Object} Unified payload containing customer and vehicle details.
   */
  static async lookupByRegNo(regNo) {
    if (!regNo) {
      const err = new Error('Registration number query parameter is required.');
      err.statusCode = 400;
      throw err;
    }

    const normalizedReg = regNo.toUpperCase().trim();

    const customer = await Customer.findOne({
      'vehicles.regNo': normalizedReg,
      isDeleted: false,
    })
      .select('firstName lastName phone vehicles')
      .lean();

    if (!customer) {
      const err = new Error(`No vehicle with registration "${normalizedReg}" found in registry.`);
      err.statusCode = 404;
      throw err;
    }

    const vehicle = customer.vehicles.find(
      (v) => v.regNo.toUpperCase().trim() === normalizedReg
    );

    return {
      customerName: `${customer.firstName} ${customer.lastName}`,
      firstName:    customer.firstName,
      lastName:     customer.lastName,
      phone:        customer.phone,
      vehicle: {
        regNo:    vehicle.regNo,
        vin:      vehicle.vin   || null,
        make:     vehicle.make,
        model:    vehicle.model,
        year:     vehicle.year,
        fuelType: vehicle.fuelType,
      },
    };
  }
}

module.exports = VehicleService;
