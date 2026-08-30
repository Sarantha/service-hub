import api from './api'

const BASE = '/appointments'

// ── Appointments CRUD ─────────────────────────────────────────────────────────

/** Fetch appointments with optional filters (date, status) */
export const getAppointments = (params = {}) => api.get(BASE, { params })

/** Fetch a single appointment by id */
export const getAppointment = (id) => api.get(`${BASE}/${id}`)

/** Server-computed remaining slots for a given date ({date: 'YYYY-MM-DD'}) */
export const getAvailability = (params = {}) => api.get(`${BASE}/availability`, { params })

/** Create a new appointment (Booking Modal submit) */
export const createAppointment = (payload) => api.post(BASE, payload)

/** Update an existing appointment (non-date fields only) */
export const updateAppointment = (id, payload) => api.put(`${BASE}/${id}`, payload)

/** Reschedule an appointment to a new date/time (atomic, capacity-checked) */
export const rescheduleAppointment = (id, scheduledDateTime) =>
  api.patch(`${BASE}/${id}/reschedule`, { scheduledDateTime })

/** Cancel an appointment (soft-delete / status change to 'Cancelled') */
export const cancelAppointment = (id) => api.patch(`${BASE}/${id}/cancel`)
