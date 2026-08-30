import api from './api'

/**
 * Vehicle Registration Lookup Service
 * Calls GET /api/v1/vehicles/lookup?regNo=VALUE
 * Returns unified customer + vehicle payload for intake auto-hydration.
 */

/**
 * Look up a vehicle by its registration number.
 * @param {string} regNo - The registration number to search for.
 * @returns {Promise} Axios response containing { customerName, phone, vehicle: { regNo, vin, make, model, year, fuelType } }
 */
export const lookupVehicle = (regNo) =>
  api.get('/vehicles/lookup', { params: { regNo } })
