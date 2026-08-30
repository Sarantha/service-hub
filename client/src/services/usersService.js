import api from './api'

const BASE = '/users'

/** List all active staff accounts (Super Admin only) */
export const getUsers = () => api.get(BASE)

/** Create a new staff account. payload: {name, email, role, currentPassword} —
 * currentPassword is the ACTING Super Admin's own password (re-auth step-up). */
export const createUser = (payload) => api.post(BASE, payload)

/** Update a staff account's name/role/status */
export const updateUser = (id, payload) => api.patch(`${BASE}/${id}`, payload)

/** Soft-delete (remove) a staff account */
export const deleteUser = (id) => api.delete(`${BASE}/${id}`)
