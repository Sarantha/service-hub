import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'
import MainLayout from './components/MainLayout'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import JobCards from './pages/JobCards'
import JobCardNew from './pages/JobCardNew'
import JobCardDetails from './pages/JobCardDetails'
import Appointments from './pages/Appointments'
import Customers from './pages/Customers'
import Billing from './pages/Billing'
import Reports from './pages/Reports'
import Inventory from './pages/Inventory'
import Settings from './pages/Settings'
import Portal from './pages/Portal'
import VehicleHistory from './pages/VehicleHistory'

// ── Route guard — redirects unauthenticated users to /login ───────────────────
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-7 h-7 rounded-full border-[2.5px] border-brandBlue border-t-transparent animate-spin" />
          <span className="text-xs font-semibold text-slate-400 tracking-wide">
            Loading session…
          </span>
        </div>
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  return children
}

// ── Role-based route guard — validates user role and handles redirect fallbacks ──
const RoleProtectedRoute = ({ allowedRoles, children }) => {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-7 h-7 rounded-full border-[2.5px] border-brandBlue border-t-transparent animate-spin" />
          <span className="text-xs font-semibold text-slate-400 tracking-wide">
            Loading session…
          </span>
        </div>
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  if (!allowedRoles.includes(user.role)) {
    const redirectMap = {
      'Technician': '/jobcards',
      'Service Advisor': '/jobcards',
      'Super Admin': '/dashboard'
    }
    const target = redirectMap[user.role] || '/jobcards'
    return <Navigate to={target} replace />
  }

  return children
}

function App() {
  return (
    <AuthProvider>
      {/* ToastProvider wraps everything so any component can call useToast() */}
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />

            {/* Customer Self-Service Portal (outside standard layout) — token-scoped, no auth */}
            <Route path="/portal/:token" element={<Portal />} />

            {/* Administrative Workspace — protected behind auth guard */}
            <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
              <Route path="/dashboard"       element={<RoleProtectedRoute allowedRoles={['Super Admin']}><Dashboard /></RoleProtectedRoute>} />
              <Route path="/jobcards"        element={<JobCards />} />
              <Route path="/jobcards/new"    element={<JobCardNew />} />
              <Route path="/jobcards/:id"    element={<JobCardDetails />} />
              <Route path="/appointments"    element={<RoleProtectedRoute allowedRoles={['Super Admin', 'Service Advisor']}><Appointments /></RoleProtectedRoute>} />
              <Route path="/customers"       element={<Customers />} />
              <Route path="/billing"         element={<RoleProtectedRoute allowedRoles={['Super Admin', 'Service Advisor']}><Billing /></RoleProtectedRoute>} />
              <Route path="/reports"         element={<RoleProtectedRoute allowedRoles={['Super Admin', 'Service Advisor']}><Reports /></RoleProtectedRoute>} />
              <Route path="/inventory"       element={<RoleProtectedRoute allowedRoles={['Super Admin', 'Service Advisor']}><Inventory /></RoleProtectedRoute>} />
              <Route path="/settings"        element={<RoleProtectedRoute allowedRoles={['Super Admin']}><Settings /></RoleProtectedRoute>} />
              <Route path="/vehicle-history" element={<RoleProtectedRoute allowedRoles={['Super Admin', 'Service Advisor']}><VehicleHistory /></RoleProtectedRoute>} />
            </Route>

            {/* Catch-all */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  )
}

export default App
