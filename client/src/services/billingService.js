import api from './api'

const BASE = '/billing'

// ── Invoice CRUD ──────────────────────────────────────────────────────────────

/** Generate an invoice from a completed/delivered Job Card */
export const generateInvoiceFromJobCard = (jobCardId, taxRate) =>
  api.post(`${BASE}/generate`, { jobCardId, taxRate })

/** Fetch paginated invoices list with optional filters */
export const getInvoices = (params = {}) => api.get(BASE, { params })

/** Fetch a single invoice by id */
export const getInvoice = (id) => api.get(`${BASE}/${id}`)

/** Period-scoped billing summary — { date: 'YYYY-MM-DD' } or { month: 'YYYY-MM' }, defaults to today */
export const getInvoiceSummary = (params = {}) => api.get(`${BASE}/summary`, { params })

// ── Payment collection ────────────────────────────────────────────────────────

/** Record a payment against an invoice (Collect modal submit) */
export const collectPayment = (idOrNumber, method) =>
  api.patch(`${BASE}/${idOrNumber}/payment`, { method })

// ── PDF export ────────────────────────────────────────────────────────────────

/** Fetch a PDF blob URL for an invoice (triggers download on client) */
export const downloadInvoicePdf = (id) =>
  api.get(`${BASE}/${id}/pdf`, { responseType: 'blob' })
