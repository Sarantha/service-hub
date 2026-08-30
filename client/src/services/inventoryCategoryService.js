import api from './api'

const BASE = '/inventory-categories'

/** List active product categories */
export const getCategories = () => api.get(BASE)

/** Add a new product category (Super Admin only) */
export const createCategory = (name) => api.post(BASE, { name })

/** Remove a product category (Super Admin only; blocked if still in use) */
export const deleteCategory = (id) => api.delete(`${BASE}/${id}`)
