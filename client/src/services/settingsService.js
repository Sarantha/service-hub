import api from './api'

const BASE = '/settings'

/** Fetch branch settings (Super Admin only) */
export const getSettings = () => api.get(BASE)

/** Update branch settings (Super Admin only) */
export const updateSettings = (payload) => api.put(BASE, payload)
