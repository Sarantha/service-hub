import api from './api'

const BASE = '/reports'

// ── Reports & Analytics ───────────────────────────────────────────────────────

/** Fetch dashboard analytics KPIs for a given date range (Reports & Analytics page) */
export const getAnalytics = (params = {}) => api.get(`${BASE}/analytics`, { params })

/** Fetch the full executive dashboard KPI payload (Dashboard page) */
export const getDashboardKpis = () => api.get(`${BASE}/dashboard-kpis`)

/** Fetch the cross-branch performance comparison (Super Admin, central view) */
export const getBranchPerformance = () => api.get(`${BASE}/branch-performance`)

/** Fetch chart/table data for one of the six Reports & Analytics report types */
export const getReportData = (reportType, params = {}) =>
  api.get(`${BASE}/${reportType}`, { params })

/** Download a specific report as PDF blob */
export const downloadReportPdf = (reportType, params = {}) =>
  api.get(`${BASE}/${reportType}/pdf`, { params, responseType: 'blob' })

/** Download a specific report as XLS blob */
export const downloadReportXls = (reportType, params = {}) =>
  api.get(`${BASE}/${reportType}/xls`, { params, responseType: 'blob' })
