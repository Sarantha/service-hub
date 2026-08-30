import axios from 'axios'

// ── Axios singleton ──────────────────────────────────────────────────────────
// All network requests must flow through this instance — never create ad-hoc
// axios.get() or fetch() calls inside components. See architecture.md Rule 4.
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// ── Request interceptor — inject JWT Bearer token ────────────────────────────
api.interceptors.request.use(
  (config) => {
    // Token is stored by AuthContext in localStorage / sessionStorage
    const token =
      localStorage.getItem('sh_token') || sessionStorage.getItem('sh_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }

    // Active branch scope — only meaningful for Super Admin (server-side
    // forces Advisor/Technician to their own branch regardless of this
    // header, so sending it for them is harmless but also a no-op).
    const activeBranchId =
      localStorage.getItem('sh_active_branch') || sessionStorage.getItem('sh_active_branch')
    if (activeBranchId) {
      config.headers['X-Active-Branch-Id'] = activeBranchId
    }

    return config
  },
  (error) => Promise.reject(error)
)

// ── Response interceptor — normalize errors & handle 401 expiry ──────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      const { status } = error.response

      // The customer portal is a separate, login-free token flow (a bad/
      // expired vehicle token 401s just like a bad JWT would) — it must
      // never be treated as "your staff session expired" and force-clear
      // an unrelated staff session or redirect a customer to /login.
      // '/portal/generate-token' and '/portal/staff/*' are the exception —
      // those genuinely use the staff JWT, so a real session expiry there
      // should behave normally.
      const url = error.config?.url || ''
      const isPortalRequest = url.startsWith('/portal') && !url.startsWith('/portal/generate-token') && !url.startsWith('/portal/staff')

      // Token expired or invalid — clear session and redirect to login
      if (status === 401 && !isPortalRequest) {
        localStorage.removeItem('sh_token')
        localStorage.removeItem('sh_user')
        sessionStorage.removeItem('sh_token')
        sessionStorage.removeItem('sh_user')
        // Hard redirect so React Router state is fully reset
        if (window.location.pathname !== '/login') {
          window.location.href = '/login'
        }
      }

      // Normalize error message for consistent catch handling. When the
      // server returns field-specific errorDetails (e.g. Zod/Mongoose
      // validation failures), surface those specific reasons instead of
      // the generic wrapper message ("Validation failed. Please verify
      // your input parameters.") — that wrapper alone never tells the user
      // which field is wrong or why.
      const errorDetails = error.response.data?.errorDetails
      const detailText = errorDetails && typeof errorDetails === 'object'
        ? Object.values(errorDetails).filter(Boolean).join(' ')
        : ''
      const message =
        detailText ||
        error.response.data?.message ||
        error.response.data?.error ||
        `Request failed with status ${status}`
      const normalizedError = new Error(message)
      normalizedError.errorDetails = errorDetails
      return Promise.reject(normalizedError)
    }

    if (error.request) {
      // Network error — server unreachable
      return Promise.reject(new Error('Network error — please check your connection.'))
    }

    return Promise.reject(error)
  }
)

export default api
