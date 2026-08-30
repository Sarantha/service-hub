const CustomerService = require('../services/customerService');

/**
 * Handle POST request to create a new customer record.
 */
exports.createCustomer = async (req, res, next) => {
  try {
    const { firstName, lastName, phone, email, nicPassport, vehicles } = req.body;
    
    const customer = await CustomerService.createCustomer({
      firstName,
      lastName,
      phone,
      email,
      nicPassport,
      vehicles
    });

    res.status(201).json({
      success: true,
      message: 'Customer profile registered successfully.',
      data: customer
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handle GET request to query or search customer records.
 * Supports ?search=<phone> and ?regNo=<partial-reg> query parameters.
 */
exports.getCustomers = async (req, res, next) => {
  try {
    const { search, regNo } = req.query;
    
    const customers = await CustomerService.findCustomers(search, regNo);

    res.status(200).json({
      success: true,
      message: 'Customer profiles retrieved successfully.',
      data: customers
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handle POST request to append a new vehicle to an existing customer.
 */
exports.addVehicle = async (req, res, next) => {
  try {
    const { id } = req.params;
    const vehicleData = req.body;

    const customer = await CustomerService.addVehicle(id, vehicleData);

    res.status(200).json({
      success: true,
      message: 'Vehicle successfully linked to customer profile.',
      data: customer
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handle PATCH request to transfer a vehicle's ownership to a different
 * (existing or newly created) customer — e.g. the vehicle was sold.
 */
exports.transferVehicleOwnership = async (req, res, next) => {
  try {
    const { regNo } = req.params;
    const result = await CustomerService.transferVehicleOwnership(regNo, req.body);

    res.status(200).json({
      success: true,
      message: `Vehicle ${regNo.toUpperCase()} ownership transferred successfully.`,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handle PUT request to update an existing customer profile.
 */
exports.updateCustomer = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const customer = await CustomerService.updateCustomer(id, updateData);

    res.status(200).json({
      success: true,
      message: 'Customer profile updated successfully.',
      data: customer
    });
  } catch (error) {
    next(error);
  }
};
