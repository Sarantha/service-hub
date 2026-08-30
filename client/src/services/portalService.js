import api from './api'

const BASE = '/portal'

// ── Admin-side (authenticated) ────────────────────────────────────────────────

/** Generate a signed portal token for a vehicle registration (Super Admin / Service Advisor) */
export const generatePortalToken = (regNo) => api.post(`${BASE}/generate-token`, { regNo })

/** Staff-side vehicle service-history lookup by registration number (Super Admin / Service Advisor) */
export const getStaffVehicleHistory = (regNo) => api.get(`${BASE}/staff/history`, { params: { regNo } })

/** Staff-side downloadable PDF of the same history */
export const downloadStaffVehicleHistoryPdf = (regNo) =>
  api.get(`${BASE}/staff/history/pdf`, { params: { regNo }, responseType: 'blob' })

// ── Public, token-less lookup (landing page self-service tool) ─────────────────
// Requires BOTH regNo and phone to match the registry — see the backend for why.

/** Public vehicle service-history lookup */
export const lookupVehicleHistory = (regNo, phone) => api.get(`${BASE}/lookup`, { params: { regNo, phone } })

/** Public downloadable PDF of the same history */
export const downloadVehicleHistoryPdf = (regNo, phone) =>
  api.get(`${BASE}/lookup/pdf`, { params: { regNo, phone }, responseType: 'blob' })

// ── Customer-side (public, scoped strictly to the signed vehicle token) ────────

/** Fetch the sanitized vehicle service-history timeline */
export const getVehicleTimeline = (token) => api.get(`${BASE}/vehicle-timeline/${token}`)

/** Server-computed remaining booking slots for the selected date */
export const getPortalAvailability = (token, params = {}) => api.get(`${BASE}/${token}/availability`, { params })

/** Read-only appointment history (upcoming + past) for this vehicle */
export const getMyAppointments = (token) => api.get(`${BASE}/${token}/appointments`)

/** Customer self-booking */
export const bookMyAppointment = (token, payload) => api.post(`${BASE}/${token}/appointments`, payload)

/** Customer self-reschedule (own appointment only — enforced server-side) */
export const rescheduleMyAppointment = (token, id, scheduledDateTime) =>
  api.patch(`${BASE}/${token}/appointments/${id}/reschedule`, { scheduledDateTime })

/** Customer self-cancel (own appointment only — enforced server-side) */
export const cancelMyAppointment = (token, id) => api.patch(`${BASE}/${token}/appointments/${id}/cancel`)
