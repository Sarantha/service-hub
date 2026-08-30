import api from './api'

const BASE = '/customers'

// ── Customer CRUD ─────────────────────────────────────────────────────────────

/** Fetch paginated customers with optional filters (status, search) */
export const getCustomers = (params = {}) => api.get(BASE, { params })

/** Fetch a single customer by id (includes vehicles array) */
export const getCustomer = (id) => api.get(`${BASE}/${id}`)

/** Create a new customer profile */
export const createCustomer = (payload) => api.post(BASE, payload)

/** Update customer contact info or vehicle records */
export const updateCustomer = (id, payload) => api.put(`${BASE}/${id}`, payload)

/** Soft-delete a customer (sets isDeleted: true on server) */
export const deleteCustomer = (id) => api.delete(`${BASE}/${id}`)

// ── Vehicle sub-resource ──────────────────────────────────────────────────────

/** Add a vehicle to an existing customer profile */
export const addVehicle = (customerId, vehiclePayload) =>
  api.post(`${BASE}/${customerId}/vehicles`, vehiclePayload)

/** Update a vehicle record under a customer */
export const updateVehicle = (customerId, vehicleId, vehiclePayload) =>
  api.put(`${BASE}/${customerId}/vehicles/${vehicleId}`, vehiclePayload)

/** Transfer a vehicle's ownership to a different (existing or new) customer */
export const transferVehicleOwnership = (regNo, payload) =>
  api.patch(`${BASE}/vehicles/${regNo}/transfer`, payload)
