import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import api from '../services/api'
import { getBranches } from '../services/branchService'

const AuthContext = createContext()

// Storage helpers — token lives alongside user object
const TOKEN_KEY = 'sh_token'
const USER_KEY  = 'sh_user'
const ACTIVE_BRANCH_KEY = 'sh_active_branch'

const readStorage = (key) =>
  localStorage.getItem(key) || sessionStorage.getItem(key)

const writeStorage = (key, value, persist) => {
  const store = persist ? localStorage : sessionStorage
  store.setItem(key, value)
}

const clearStorage = () => {
  ;[TOKEN_KEY, USER_KEY, ACTIVE_BRANCH_KEY].forEach((k) => {
    localStorage.removeItem(k)
    sessionStorage.removeItem(k)
  })
}

export const AuthProvider = ({ children }) => {
  const [user,    setUser]    = useState(null)
  const [loading, setLoading] = useState(true)
  // null = "All Branches" (Super Admin's central view) or, for Advisor/
  // Technician, simply unused — the backend always forces their own branch
  // regardless of this value. Only Super Admin can meaningfully change it.
  const [activeBranchId, setActiveBranchId] = useState(null)
  // Shared branch list — lives here (not fetched independently per
  // component) so that Topbar's selector and any other consumer stay in
  // sync the moment a branch is created/deactivated in Settings, instead of
  // each holding its own stale snapshot until a full reload.
  const [branches, setBranches] = useState([])

  const refreshBranches = useCallback(async () => {
    try {
      const res = await getBranches()
      const list = Array.isArray(res?.data) ? res.data : (Array.isArray(res?.data?.data) ? res.data.data : [])
      setBranches(list)
      return list
    } catch {
      return []
    }
  }, [])

  // Rehydrate from storage on mount
  useEffect(() => {
    const storedUser  = readStorage(USER_KEY)
    const storedToken = readStorage(TOKEN_KEY)
    const storedBranch = readStorage(ACTIVE_BRANCH_KEY)

    if (storedUser && storedToken) {
      try {
        setUser(JSON.parse(storedUser))
        if (storedBranch) setActiveBranchId(storedBranch)
        refreshBranches()
      } catch {
        clearStorage()
      }
    } else if (storedUser) {
      // Legacy sessions without token (mock-only mode) — still load user
      try {
        setUser(JSON.parse(storedUser))
        if (storedBranch) setActiveBranchId(storedBranch)
        refreshBranches()
      } catch {
        clearStorage()
      }
    }

    setLoading(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /**
   * Login — calls POST /api/v1/auth/login.
   * Falls back to mock validation if the server isn't running (dev mode).
   */
  const login = async (email, password, rememberMe = false) => {
    if (!email || !password) throw new Error('Email and password are required.')

    let userData
    let token

    try {
      const { data } = await api.post('/auth/login', { email, password })
      userData = data.data.user
      token    = data.data.token
    } catch (err) {
      // ── Mock fallback (no backend running) ─────────────────────────────────
      if (
        err.message?.startsWith('Network error') ||
        err.message?.includes('ECONNREFUSED')   ||
        err.message?.includes('ERR_CONNECTION_REFUSED') ||
        import.meta.env.VITE_MOCK_AUTH === 'true'
      ) {
        userData = {
          name:   'Ravi Amarasinghe',
          email,
          role:   email.includes('tech') ? 'Technician' : 'Super Admin',
          status: 'Active',
        }
        token = 'mock-jwt-token'
      } else {
        throw err
      }
    }

    setUser(userData)
    const userString = JSON.stringify(userData)
    writeStorage(USER_KEY,  userString, rememberMe)
    writeStorage(TOKEN_KEY, token,      rememberMe)

    // Reset branch scope for the new session: Super Admin lands in the
    // central "All Branches" view (activeBranchId = null); Advisor/
    // Technician default to their own branch (the backend forces this
    // regardless, but it keeps the UI's displayed branch consistent).
    const initialBranchId = userData.role === 'Super Admin' ? null : (userData.branchId || null)
    setActiveBranchId(initialBranchId)
    if (initialBranchId) {
      writeStorage(ACTIVE_BRANCH_KEY, initialBranchId, rememberMe)
    } else {
      localStorage.removeItem(ACTIVE_BRANCH_KEY)
      sessionStorage.removeItem(ACTIVE_BRANCH_KEY)
    }

    refreshBranches()

    return userData
  }

  /**
   * Logout — calls POST /api/v1/auth/logout (fire-and-forget) then clears state.
   */
  const logout = async () => {
    try {
      await api.post('/auth/logout')
    } catch {
      // Ignore server errors on logout — always clear local state
    }
    setUser(null)
    setActiveBranchId(null)
    setBranches([])
    clearStorage()
  }

  /**
   * Sets the active working branch (Super Admin only, in practice — Advisor/
   * Technician are always forced server-side to their own branch regardless
   * of this value). Pass null for "All Branches" (central view).
   */
  const setActiveBranch = (branchId) => {
    setActiveBranchId(branchId)
    const persist = !!localStorage.getItem(TOKEN_KEY)
    if (branchId) {
      writeStorage(ACTIVE_BRANCH_KEY, branchId, persist)
    } else {
      localStorage.removeItem(ACTIVE_BRANCH_KEY)
      sessionStorage.removeItem(ACTIVE_BRANCH_KEY)
    }
  }

  /**
   * Returns true if the current user has one of the given roles.
   * @param {string[]} roles
   */
  const hasRole = (...roles) => !!user && roles.includes(user.role)

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, hasRole, activeBranchId, setActiveBranch, branches, refreshBranches }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within an AuthProvider')
  return context
}

export default AuthContext
