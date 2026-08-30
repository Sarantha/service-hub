import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { IconTool } from '@tabler/icons-react'
import { useAuth } from '../context/AuthContext'
import TextInput from '../components/TextInput'
import Checkbox from '../components/Checkbox'
import Button from '../components/Button'

export const Login = () => {
  const navigate = useNavigate()
  const { login } = useAuth()

  // Set default values matching high-fidelity HTML mockup defaults
  const [email, setEmail] = useState()
  const [password, setPassword] = useState()
  const [rememberMe, setRememberMe] = useState(true)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      await login(email, password, rememberMe)
      navigate('/dashboard')
    } catch (err) {
      setError(err.message || 'Authentication failed. Please verify credentials.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex font-sans bg-white">
      {/* Brand Sidebar (Left Side) — signature "radar sweep" ops-console visual */}
      <div className="hidden md:flex md:w-[58%] relative overflow-hidden bg-navy text-white flex-col justify-between p-16 lg:p-20 text-left">
        {/* Blueprint grid, matching the landing page's "Bay" texture */}
        <div className="absolute inset-0 opacity-[0.05] pointer-events-none" style={{
          backgroundImage: 'linear-gradient(#3E92CC 1px, transparent 1px), linear-gradient(90deg, #3E92CC 1px, transparent 1px)',
          backgroundSize: '44px 44px',
        }} />
        {/* Radar sweep — a live console watching the shop floor */}
        <div className="absolute -right-[180px] top-1/2 -translate-y-1/2 w-[520px] h-[520px] pointer-events-none">
          <div className="absolute inset-0 rounded-full border border-blueGlow/10" />
          <div className="absolute inset-[60px] rounded-full border border-blueGlow/10" />
          <div className="absolute inset-[120px] rounded-full border border-blueGlow/10" />
          <div
            className="absolute inset-0 rounded-full radar-sweep"
            style={{ background: 'conic-gradient(from 0deg, rgba(62,146,204,0.28), transparent 28%)' }}
          />
          <span className="absolute w-1.5 h-1.5 rounded-full bg-bayAmber animate-dot-pulse" style={{ top: '38%', left: '46%' }} />
          <span className="absolute w-1.5 h-1.5 rounded-full bg-blueGlow" style={{ top: '58%', left: '58%' }} />
          <span className="absolute w-1.5 h-1.5 rounded-full bg-blueGlow" style={{ top: '48%', left: '30%' }} />
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-14 select-none">
            <IconTool size={20} className="text-white" />
            <span className="text-xl font-display font-semibold tracking-tight">ServiceHub</span>
          </div>
          <div className="inline-flex items-center gap-2 text-blueGlow text-[11px] font-semibold uppercase tracking-[0.16em] mb-5" style={{ fontFamily: 'var(--font-mono)' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-bayAmber animate-dot-pulse" /> Console Online
          </div>
          <h2 className="font-display text-[34px] font-bold tracking-tight leading-[1.25] mb-4 max-w-[440px]">
            Every bay, every job, one console.
          </h2>
          <p className="text-white/55 text-sm leading-[1.7] max-w-[400px]">
            Sign in to track intake through delivery, manage technician workloads, keep parts stocked, and
            issue VAT-ready invoices — all from a single operator console.
          </p>
        </div>

        <div className="relative z-10 flex gap-8 pt-10 border-t border-white/10 max-w-[440px]">
          <div>
            <div className="text-[10px] font-bold text-white/35 uppercase tracking-wider mb-1">Active Jobs</div>
            <div className="text-[20px] font-bold" style={{ fontFamily: 'var(--font-mono)' }}>12</div>
          </div>
          <div>
            <div className="text-[10px] font-bold text-white/35 uppercase tracking-wider mb-1">Today's Revenue</div>
            <div className="text-[20px] font-bold" style={{ fontFamily: 'var(--font-mono)' }}>LKR 184.5K</div>
          </div>
          <div>
            <div className="text-[10px] font-bold text-white/35 uppercase tracking-wider mb-1">Bays Free</div>
            <div className="text-[20px] font-bold text-emerald-400" style={{ fontFamily: 'var(--font-mono)' }}>3</div>
          </div>
        </div>
      </div>

      {/* Form Workspace (Right Side) */}
      <div className="flex-1 bg-[#F6F8FA] flex flex-col justify-center p-12 md:p-20">
        <div className="w-full max-w-[360px] mx-auto text-left">
          <div className="mb-6">
            <h1 className="font-display text-[24px] font-bold text-navy mb-1">Account Login</h1>
            <p className="text-xs text-slate-500">Enter your administrative credentials below</p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-xs text-red-600 rounded-lg">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-3.5" id="login-form">
            <TextInput
              label="User email / Identification ID"
              id="login-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <TextInput
              label="Password"
              id="login-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <div className="flex items-center justify-between text-[11px] py-1 select-none">
              <Checkbox
                label="Remember session"
                id="login-remember"
                checked={rememberMe}
                onChange={setRememberMe}
              />
              <a
                href="#forgot"
                onClick={(e) => {
                  e.preventDefault()
                  alert('Please contact the station administrator to retrieve your credentials.')
                }}
                className="text-brandBlue hover:underline font-semibold"
                id="forgot-password"
              >
                Forgot credentials?
              </a>
            </div>

            <Button
              type="submit"
              variant="primary"
              disabled={submitting}
              className="w-full justify-center mt-1 text-xs !h-9 font-medium"
              id="login-submit"
            >
              {submitting ? 'Authenticating...' : 'Authenticate & Enter'}
            </Button>

            <Link
              to="/"
              className="btn-secondary w-full justify-center text-xs !h-[34px] font-normal"
              id="login-back-home"
            >
              &larr; Return Home
            </Link>
          </form>
        </div>
      </div>
    </div>
  )
}

export default Login
