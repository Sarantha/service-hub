import api from './api'

const BASE = '/inventory'

// ── Inventory CRUD ────────────────────────────────────────────────────────────

/** Fetch inventory list with optional filters (category, stockLevel, search) */
export const getInventory = (params = {}) => api.get(BASE, { params })

/** Fetch a single SKU by id */
export const getInventoryItem = (id) => api.get(`${BASE}/${id}`)

/** Create a new inventory SKU */
export const createInventoryItem = (payload) => api.post(BASE, payload)

/** Update an existing SKU (edit modal save) */
export const updateInventoryItem = (id, payload) => api.patch(`${BASE}/${id}`, payload)

/** Soft-delete a SKU */
export const deleteInventoryItem = (id) => api.delete(`${BASE}/${id}`)

// ── Purchase Orders ────────────────────────────────────────────────────────────

/** Generate and record a purchase order for a SKU */
export const createPurchaseOrder = (payload) => api.post(`${BASE}/purchase-orders`, payload)

// ── Reorder trigger ───────────────────────────────────────────────────────────

/** Mark a SKU as "reorder requested" — triggers backend PO workflow */
export const reorderItem = (id) => api.post(`${BASE}/${id}/reorder`)
