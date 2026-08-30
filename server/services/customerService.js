const Customer = require('../models/Customer');

class CustomerService {
  /**
   * Registers a new customer and their associated vehicles.
   */
  static async createCustomer({ firstName, lastName, phone, email, nicPassport, vehicles }) {
    // 1. Validate customer phone uniqueness
    const existingCustomer = await Customer.findOne({ phone, isDeleted: false });
    if (existingCustomer) {
      const error = new Error('A customer with this phone number is already registered.');
      error.statusCode = 400;
      throw error;
    }

    const processedVehicles = [];

    // 2. Validate vehicles array
    if (vehicles && Array.isArray(vehicles)) {
      const regNos = new Set();
      for (const vehicle of vehicles) {
        if (!vehicle.regNo) {
          const error = new Error('Vehicle registration number is required.');
          error.statusCode = 400;
          throw error;
        }

        const normalizedRegNo = vehicle.regNo.toUpperCase().trim();

        // Check for duplicate regNo within the payload
        if (regNos.has(normalizedRegNo)) {
          const error = new Error(`Duplicate vehicle registration number in payload: ${normalizedRegNo}`);
          error.statusCode = 400;
          throw error;
        }
        regNos.add(normalizedRegNo);

        // Check for duplicate regNo across the database
        const vehicleExists = await Customer.findOne({ 'vehicles.regNo': normalizedRegNo });
        if (vehicleExists) {
          const error = new Error(`Vehicle with registration number ${normalizedRegNo} is already registered to a customer.`);
          error.statusCode = 400;
          throw error;
        }

        processedVehicles.push({
          ...vehicle,
          regNo: normalizedRegNo
        });
      }
    }

    // 3. Create the customer document
    const newCustomer = await Customer.create({
      firstName,
      lastName,
      phone,
      email,
      nicPassport,
      vehicles: processedVehicles
    });

    return newCustomer;
  }

  /**
   * Search registry for customers by phone, name, or vehicle registration.
   * Supports optional `regNo` filter for server-side indexed search.
   */
  static async findCustomers(searchQuery, regNoFilter) {
    const filter = { isDeleted: false };

    // Prioritize regNo filter (indexed nested vehicle search)
    if (regNoFilter) {
      filter['vehicles.regNo'] = { $regex: regNoFilter.trim(), $options: 'i' };
    } else if (searchQuery) {
      const cleanQuery = searchQuery.trim();
      filter.$or = [
        { phone: { $regex: cleanQuery, $options: 'i' } },
        { 'vehicles.regNo': { $regex: cleanQuery, $options: 'i' } }
      ];
    }

    // Use .lean() to skip hydration and speed up read performance (Section 4 of Coding Standards)
    return Customer.find(filter).lean();
  }

  /**
   * Adds a new vehicle to an existing customer profile.
   */
  static async addVehicle(customerId, vehicleData) {
    // 1. Find customer
    const customer = await Customer.findOne({ _id: customerId, isDeleted: false });
    if (!customer) {
      const error = new Error('Customer profile not found.');
      error.statusCode = 404;
      throw error;
    }

    if (!vehicleData.regNo) {
      const error = new Error('Vehicle registration number is required.');
      error.statusCode = 400;
      throw error;
    }

    const normalizedRegNo = vehicleData.regNo.toUpperCase().trim();

    // 2. Enforce global vehicle uniqueness
    const vehicleExists = await Customer.findOne({ 'vehicles.regNo': normalizedRegNo });
    if (vehicleExists) {
      const error = new Error(`Vehicle with registration number ${normalizedRegNo} is already registered to a customer.`);
      error.statusCode = 400;
      throw error;
    }

    // 3. Push and save
    customer.vehicles.push({
      ...vehicleData,
      regNo: normalizedRegNo
    });

    await customer.save();
    return customer;
  }

  /**
   * Transfers a vehicle's ownership from its current customer to a different
   * one — either an existing customer (by ID or phone) or a brand-new
   * customer profile created on the fly. Used when a registered vehicle is
   * sold to a new owner.
   */
  static async transferVehicleOwnership(regNo, target) {
    if (!regNo) {
      const error = new Error('Vehicle registration number is required.');
      error.statusCode = 400;
      throw error;
    }
    const normalizedRegNo = regNo.toUpperCase().trim();

    // 1. Locate the current owner and the vehicle subdocument
    const currentOwner = await Customer.findOne({ 'vehicles.regNo': normalizedRegNo, isDeleted: false });
    if (!currentOwner) {
      const error = new Error(`No customer currently owns a vehicle with registration ${normalizedRegNo}.`);
      error.statusCode = 404;
      throw error;
    }

    const vehicleIndex = currentOwner.vehicles.findIndex(v => v.regNo === normalizedRegNo);
    const vehicleSnapshot = currentOwner.vehicles[vehicleIndex].toObject();

    // 2. Resolve the new owner — an existing customer, or a freshly created one
    let newOwner;
    if (target.customerId) {
      newOwner = await Customer.findOne({ _id: target.customerId, isDeleted: false });
      if (!newOwner) {
        const error = new Error('Target customer profile not found.');
        error.statusCode = 404;
        throw error;
      }
    } else {
      const { firstName, lastName, phone, email, nicPassport } = target;
      if (!firstName || !lastName || !phone || !nicPassport) {
        const error = new Error('New owner requires firstName, lastName, phone, and nicPassport.');
        error.statusCode = 400;
        throw error;
      }
      // Reuse the customer profile if that phone is already registered
      newOwner = await Customer.findOne({ phone, isDeleted: false });
      if (!newOwner) {
        newOwner = await Customer.create({ firstName, lastName, phone, email, nicPassport, vehicles: [] });
      }
    }

    if (String(newOwner._id) === String(currentOwner._id)) {
      const error = new Error('This vehicle is already registered to that customer.');
      error.statusCode = 400;
      throw error;
    }

    // 3. Move the vehicle: remove from the old owner, append to the new owner
    currentOwner.vehicles.splice(vehicleIndex, 1);
    await currentOwner.save();

    delete vehicleSnapshot._id; // let Mongoose assign a fresh subdocument id under the new owner
    if (target.odometer !== undefined) vehicleSnapshot.odometer = target.odometer;
    newOwner.vehicles.push(vehicleSnapshot);
    await newOwner.save();

    return { previousOwner: currentOwner, newOwner };
  }

  /**
   * Updates an existing customer profile with the provided payload.
   * Supports updating personal identifiers and their vehicles array.
   */
  static async updateCustomer(customerId, updateData) {
    const customer = await Customer.findOne({ _id: customerId, isDeleted: false });
    if (!customer) {
      const error = new Error('Customer profile not found.');
      error.statusCode = 404;
      throw error;
    }

    const { firstName, lastName, phone, email, vehicles } = updateData;

    if (firstName !== undefined) customer.firstName = firstName;
    if (lastName  !== undefined) customer.lastName  = lastName;
    if (phone     !== undefined) customer.phone     = phone;
    if (email     !== undefined) customer.email     = email;

    // Replace vehicle array only if payload includes it
    if (vehicles && Array.isArray(vehicles)) {
      // Normalize regNo values
      customer.vehicles = vehicles.map(v => ({
        ...v,
        regNo: v.regNo ? v.regNo.toUpperCase().trim() : v.regNo
      }));
    }

    await customer.save();
    return customer;
  }
}

module.exports = CustomerService;

