import api from './api'

const BASE = '/jobcards'

// ── Job Card CRUD ─────────────────────────────────────────────────────────────

/** Fetch paginated list with optional filters */
export const getJobCards = (params = {}) => api.get(BASE, { params })

/** Fetch a single job card by id */
export const getJobCard = (id) => api.get(`${BASE}/${id}`)

/** Create a new job card (wizard final step) */
export const createJobCard = (payload) => api.post(BASE, payload)

/** Update job card fields (status change, technician reassign, etc.) */
export const updateJobCard = (id, payload) => api.put(`${BASE}/${id}`, payload)

/** Soft-delete a job card (sets isDeleted: true on server) */
export const deleteJobCard = (id) => api.delete(`${BASE}/${id}`)

// ── Task checklist ────────────────────────────────────────────────────────────

/** Persist the full checklist array (task text + isDone state) */
export const updateChecklist = (jobId, checklist) =>
  api.put(`${BASE}/${jobId}/checklist`, { checklist })

// ── Parts & Labour ledger ─────────────────────────────────────────────────────

/** Allocate an inventory part to the job card (decrements stock server-side) */
export const addLineItem = (jobId, line) => api.post(`${BASE}/${jobId}/lines`, line)

/** Add a freeform labour/service charge to the job card ledger */
export const addLaborCharge = (jobId, payload) => api.post(`${BASE}/${jobId}/labor-charges`, payload)

/** Remove a line item from the job card ledger */
export const removeLineItem = (jobId, lineId) =>
  api.delete(`${BASE}/${jobId}/lines/${lineId}`)

// ── Status transition ─────────────────────────────────────────────────────────

/** Advance or set the job card status */
export const setJobCardStatus = (id, status) =>
  api.patch(`${BASE}/${id}/status`, { status })
