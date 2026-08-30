import api from './api'

const BASE = '/branches'

/** List all branches (active and inactive) — every staff role can call this */
export const getBranches = () => api.get(BASE)

/** Create a new branch (Super Admin only) */
export const createBranch = (payload) => api.post(BASE, payload)

/** Deactivate a branch (Super Admin only) — hides it from new-assignment pickers */
export const deactivateBranch = (id) => api.patch(`${BASE}/${id}/deactivate`)

/** Reactivate a previously deactivated branch (Super Admin only) */
export const activateBranch = (id) => api.patch(`${BASE}/${id}/activate`)
