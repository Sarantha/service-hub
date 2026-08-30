import React, { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  IconTool,
  IconArrowRight,
  IconArrowDown,
  IconFileText,
  IconBox,
  IconReceipt,
  IconDeviceLaptop,
  IconLayoutDashboard,
  IconTrendingUp,
  IconFileDescription,
  IconAlertTriangle,
  IconSearch,
  IconDownload,
  IconCar,
  IconClipboardCheck,
  IconClipboardList,
  IconTools,
  IconPackageOff,
  IconCircleCheck,
  IconTruckDelivery,
} from '@tabler/icons-react'
import { lookupVehicleHistory, downloadVehicleHistoryPdf } from '../services/portalService'
import TextInput from '../components/TextInput'

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'

// ── Scroll-reveal — sections fade/rise into place once, respects reduced-motion ──
const useReveal = () => {
  const ref = useRef(null)
  const [revealed, setRevealed] = useState(false)

  useEffect(() => {
    const node = ref.current
    if (!node) return

    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setRevealed(true); observer.disconnect() } },
      { threshold: 0.1, rootMargin: '0px 0px -10% 0px' }
    )
    observer.observe(node)

    // Safety net: never let content stay invisible indefinitely if the
    // observer doesn't fire for some reason (crawlers, odd viewport states).
    const fallback = setTimeout(() => setRevealed(true), 2000)

    return () => { observer.disconnect(); clearTimeout(fallback) }
  }, [])

  return [ref, revealed]
}

// ── The Bay — the signature element. ServiceHub's real, five-stage Job Card
// lifecycle (Open → In Progress → Awaiting Parts → Completed → Delivered),
// visualized as a live shop floor. This is the actual operational sequence
// the product tracks, not an invented "3 steps to success." ──────────────────
const BAY_STAGES = [
  { key: 'Open', label: 'Open', icon: IconClipboardList, sample: { job: 'JC-1082', vehicle: 'Toyota Aqua' } },
  { key: 'In Progress', label: 'In Progress', icon: IconTools, sample: { job: 'JC-1079', vehicle: 'Honda Vezel' } },
  { key: 'Awaiting Parts', label: 'Awaiting Parts', icon: IconPackageOff, sample: { job: 'JC-1077', vehicle: 'Suzuki Wagon R' }, attention: true },
  { key: 'Completed', label: 'Completed', icon: IconCircleCheck, sample: { job: 'JC-1074', vehicle: 'Nissan Leaf' } },
  { key: 'Delivered', label: 'Delivered', icon: IconTruckDelivery, sample: { job: 'JC-1071', vehicle: 'Toyota Vitz' } },
]

const TheBay = () => {
  const [ref, revealed] = useReveal()
  return (
    <section ref={ref} className="bg-navy py-[90px] px-[8%] relative overflow-hidden" id="the-bay">
      <div className="absolute inset-0 opacity-[0.05] pointer-events-none" style={{
        backgroundImage: 'linear-gradient(#3E92CC 1px, transparent 1px), linear-gradient(90deg, #3E92CC 1px, transparent 1px)',
        backgroundSize: '44px 44px',
      }} />
      <div className="relative max-w-[1100px] mx-auto">
        <div className={`max-w-[620px] mb-14 ${revealed ? 'reveal-in' : 'reveal-init'}`}>
          <div className="inline-flex items-center gap-2 text-blueGlow text-xs font-semibold uppercase tracking-[0.16em] mb-4" style={{ fontFamily: 'var(--font-mono)' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-bayAmber animate-dot-pulse" /> Live on the floor
          </div>
          <h2 className="font-display text-[34px] md:text-[40px] font-bold text-white leading-[1.15] tracking-tight">
            The Bay — every job, tracked stage by stage.
          </h2>
          <p className="text-white/55 text-[15px] mt-4 leading-relaxed">
            No vehicle sits in limbo. A Job Card moves through five real stages from intake to delivery,
            and everyone on the floor — advisor, technician, owner — sees exactly where it stands.
          </p>
        </div>

        <div className={`grid grid-cols-2 md:grid-cols-5 gap-3 ${revealed ? 'reveal-in' : 'reveal-init'}`} style={{ animationDelay: '120ms' }}>
          {BAY_STAGES.map((stage, i) => (
            <div key={stage.key} className="relative">
              <div className={`rounded-xl border p-4 h-full flex flex-col gap-3 transition-all ${
                stage.attention
                  ? 'bg-bayAmber/10 border-bayAmber/40'
                  : 'bg-white/[0.04] border-white/10 hover:border-white/20'
              }`}>
                <div className="flex items-center justify-between">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${stage.attention ? 'bg-bayAmber text-navy' : 'bg-white/10 text-blueGlow'}`}>
                    <stage.icon size={16} />
                  </div>
                  <span className="text-[10px] font-bold text-white/30" style={{ fontFamily: 'var(--font-mono)' }}>0{i + 1}</span>
                </div>
                <div>
                  <div className={`text-[12.5px] font-bold ${stage.attention ? 'text-bayAmber' : 'text-white'}`}>{stage.label}</div>
                </div>
                <div className="mt-auto pt-2 border-t border-white/10">
                  <div className="text-[11px] font-semibold text-white/70" style={{ fontFamily: 'var(--font-mono)' }}>{stage.sample.job}</div>
                  <div className="text-[10px] text-white/40">{stage.sample.vehicle}</div>
                </div>
              </div>
              {i < BAY_STAGES.length - 1 && (
                <div className="hidden md:flex absolute top-1/2 -right-3 -translate-y-1/2 z-10 items-center justify-center w-6 h-6">
                  <IconArrowRight size={13} className="text-white/20" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── Check Your Service History — real, working public lookup (unchanged
// logic/behavior — only restyled to match the new type system). ─────────────
const ServiceHistoryLookup = () => {
  const [ref, revealed] = useReveal()
  const [regNo, setRegNo] = useState('')
  const [phone, setPhone] = useState('')
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [downloading, setDownloading] = useState(false)

  const handleSearch = async (e) => {
    e.preventDefault()
    setError('')
    setResult(null)
    setLoading(true)
    try {
      const res = await lookupVehicleHistory(regNo.trim(), phone.trim())
      setResult(res?.data?.data || null)
    } catch (err) {
      setError(err.message || 'No matching vehicle found.')
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = async () => {
    setDownloading(true)
    try {
      const response = await downloadVehicleHistoryPdf(regNo.trim(), phone.trim())
      const blob = new Blob([response.data], { type: 'application/pdf' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `${result.vehicle.regNo}-service-history.pdf`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      setError(err.message || 'Failed to download service history PDF.')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <section ref={ref} className="bg-brandPale border-y border-brandBlue/10 py-[90px] px-[8%]" id="service-history">
      <div className={`max-w-[680px] mx-auto text-center space-y-3 mb-10 ${revealed ? 'reveal-in' : 'reveal-init'}`}>
        <div className="inline-flex items-center gap-1.5 bg-white text-brandBlue px-3.5 py-1.5 rounded-full text-xs font-bold border border-brandBlue/10">
          <IconClipboardCheck size={14} /> Vehicle Owner Self-Service
        </div>
        <h2 className="font-display text-[30px] md:text-[34px] font-bold text-navy tracking-tight">Check your service history</h2>
        <p className="text-slate-500 text-[15px]">
          Enter your vehicle's registration number and the phone number on file to view — and download — your complete service history.
        </p>
      </div>

      <div className={`max-w-[560px] mx-auto ${revealed ? 'reveal-in' : 'reveal-init'}`} style={{ animationDelay: '100ms' }}>
        <form onSubmit={handleSearch} className="bg-white rounded-xl shadow-md border border-slate-100 p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <TextInput
              label="Vehicle Registration Number" id="lh-regno" placeholder="e.g. ABC-1234" required
              value={regNo} onChange={(e) => setRegNo(e.target.value)}
            />
            <TextInput
              label="Phone Number" id="lh-phone" placeholder="0771234567" required
              value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
            />
          </div>
          <button type="submit" className="btn-primary w-full flex items-center justify-center gap-1.5" id="lh-search-btn" disabled={loading}>
            <IconSearch size={15} /> {loading ? 'Searching…' : 'View Service History'}
          </button>
        </form>

        {error && (
          <div className="mt-4 bg-red-50 border border-red-100 text-red-600 rounded-lg px-4 py-3 text-[13px] text-center">
            {error}
          </div>
        )}

        {result && (
          <div className="mt-6 bg-white rounded-xl shadow-md border border-slate-100 p-6 text-left space-y-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-brandPale text-brandBlue flex items-center justify-center flex-shrink-0">
                  <IconCar size={20} />
                </div>
                <div>
                  <div className="text-[15px] font-bold text-navy">{result.vehicle.make} {result.vehicle.model}</div>
                  <div className="text-[12px] text-slate-500" style={{ fontFamily: 'var(--font-mono)' }}>{result.vehicle.regNo} &bull; {result.vehicle.ownerName}</div>
                </div>
              </div>
              <button
                id="lh-download-pdf-btn"
                className="btn-secondary !h-9 !px-4 !text-xs flex items-center gap-1.5"
                onClick={handleDownload}
                disabled={downloading}
              >
                <IconDownload size={13} /> {downloading ? 'Preparing…' : 'Download PDF'}
              </button>
            </div>

            <div className="border-t border-slate-100 pt-4">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                Service Records ({result.totalServiceEntries})
              </div>
              {result.timeline.length === 0 ? (
                <div className="text-[13px] text-slate-400">No service records found for this vehicle yet.</div>
              ) : (
                <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                  {result.timeline.map((item) => (
                    <div key={item.jobCardNumber} className="flex items-center justify-between gap-2 bg-slate-50 rounded-lg px-3 py-2">
                      <div>
                        <div className="text-[12px] font-semibold text-slate-800">{item.serviceType}</div>
                        <div className="text-[11px] text-slate-500">
                          {fmtDate(item.timestamps.completedAt || item.timestamps.openedAt)} &bull; {item.jobCardNumber}
                          {item.odometerReading != null && <> &bull; {item.odometerReading.toLocaleString()} km</>}
                        </div>
                      </div>
                      <span className="text-[10px] font-semibold text-slate-500 flex-shrink-0" style={{ fontFamily: 'var(--font-mono)' }}>{item.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

// ── Modules — the app's real five lettered modules (A–E), as documented in
// overview.md. Real structural information (this IS how the product is
// organized), not a decorative numbered list. ────────────────────────────────
const MODULES = [
  { letter: 'A', icon: IconLayoutDashboard, title: 'Operations Dashboard', desc: 'Branch-level KPIs — today\'s revenue, active and completed jobs, low-stock counts — plus a live jobs table and technician workload balancer.' },
  { letter: 'B', icon: IconFileText, title: 'Digital Job Cards & Intake', desc: 'A 4-stage guided intake: vehicle details, issue isolation, cost estimation, technician assignment — with photo evidence and interactive task checklists.' },
  { letter: 'C', icon: IconBox, title: 'Smart Inventory', desc: 'Parts catalog grouped by category — Oils & Fluids, Filters, Brakes, Electrical, Body Components — with live stock valuation and reorder-point tracking.' },
  { letter: 'D', icon: IconReceipt, title: 'Billing & Invoicing', desc: 'Combines allocated parts and labor into VAT-ready invoices, and tracks payment status and method through to settlement.' },
  { letter: 'E', icon: IconDeviceLaptop, title: 'Customer Self-Service Portal', desc: 'A token-based, read-only view for vehicle owners — service history, timelines, and automated service reminders.' },
]

export const Landing = () => {
  const [featuresRef, featuresRevealed] = useReveal()

  return (
    <div className="min-h-screen bg-[#F9FAFC] font-sans text-[#1E293B] leading-relaxed flex flex-col">
      {/* Sticky Glassmorphic Navbar */}
      <nav className="bg-white/85 backdrop-blur-md border-b border-slate-100 sticky top-0 z-50 flex justify-between items-center px-[8%] py-4 shadow-sm">
        <Link to="/" className="flex items-center gap-2.5 text-xl font-bold text-navy tracking-tight font-display">
          <IconTool size={20} className="bg-brandPale text-brandBlue p-1.5 w-8 h-8 rounded-lg" />
          <span>ServiceHub</span>
        </Link>
        <ul className="flex gap-8 items-center list-none">
          <li className="hidden lg:block">
            <a href="#the-bay" className="text-slate-500 hover:text-brandBlue font-semibold text-sm transition-colors">
              The Bay
            </a>
          </li>
          <li className="hidden lg:block">
            <a href="#service-history" className="text-slate-500 hover:text-brandBlue font-semibold text-sm transition-colors">
              Service History
            </a>
          </li>
          <li className="hidden lg:block">
            <a href="#modules" className="text-slate-500 hover:text-brandBlue font-semibold text-sm transition-colors">
              Modules
            </a>
          </li>
          <li>
            <Link to="/login" className="btn-secondary !h-9 !px-4 flex items-center justify-center text-xs font-bold" id="nav-login-btn">
              Sign In
            </Link>
          </li>
          <li>
            <Link to="/login" className="btn-primary !h-9 !px-4 flex items-center justify-center text-xs font-bold gap-1" id="nav-launch-btn">
              Launch Platform <IconArrowRight size={14} />
            </Link>
          </li>
        </ul>
      </nav>

      {/* Hero Architecture */}
      <header className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] items-center gap-[60px] px-[8%] py-[100px] bg-[radial-gradient(circle_at_90%_10%,rgba(62,146,204,0.08)_0%,transparent_45%),radial-gradient(circle_at_10%_90%,rgba(15,76,129,0.04)_0%,transparent_50%)]">
        <div className="max-w-[620px] text-left space-y-6">
          <div className="inline-flex items-center gap-2 text-brandBlue text-xs font-bold uppercase tracking-[0.14em]" style={{ fontFamily: 'var(--font-mono)' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-brandBlue" /> Station Management System
          </div>
          <h1 className="font-display text-[46px] md:text-[54px] font-bold text-navy leading-[1.1] tracking-tight">
            Intake to invoice, <span className="bg-gradient-to-r from-brandBlue to-blueGlow bg-clip-text text-transparent">on one screen.</span>
          </h1>
          <p className="text-[17px] text-slate-500 leading-[1.65]">
            Digital job cards, live parts inventory, technician workloads, and VAT-ready billing — run the whole
            workshop from intake to delivery, with a self-service portal your customers actually use.
          </p>
          <div className="flex gap-4 flex-wrap pt-2">
            <Link to="/login" className="btn-primary flex items-center gap-1.5 hover:shadow-lg transition-all" id="hero-admin-btn">
              Launch the Console <IconArrowRight size={16} />
            </Link>
            <a href="#the-bay" className="btn-secondary flex items-center gap-1.5" id="hero-features-btn">
              See the Bay <IconArrowDown size={14} />
            </a>
          </div>
        </div>

        {/* Hero Floating Graphics */}
        <div className="flex justify-center items-center relative w-full max-w-[420px] mx-auto lg:max-w-none">
          <div className="bg-white rounded-xl shadow-lg border border-slate-100 p-7 w-full relative animate-float-main">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
              <strong className="text-brandBlue text-sm font-bold font-display">Live Operations Stream</strong>
              <span className="h-6 px-2.5 inline-flex items-center text-xs font-semibold rounded-full bg-brandPale text-brandBlue border border-brandBlue/10">
                Active Session
              </span>
            </div>
            <div className="text-xs text-slate-500 mb-1">Today's Revenue Benchmark</div>
            <div className="text-[28px] font-bold text-navy mb-3 tracking-tight" style={{ fontFamily: 'var(--font-mono)' }}>LKR 184,500</div>
            <div className="h-1.5 bg-slate-200 rounded-full mt-2 overflow-hidden">
              <div className="h-full rounded-full bg-emerald-500" style={{ width: '78%' }} />
            </div>
            <p className="text-[11px] text-slate-500 mt-2 flex items-center gap-1">
              <IconTrendingUp size={14} className="text-emerald-500 font-bold" />
              <span className="text-emerald-600 font-bold">+12%</span> above standard daily target curves
            </p>
          </div>

          {/* Floating Widget 1 — hidden on narrow viewports where absolute
              positioning would overlap the card content beneath it */}
          <div className="hidden lg:flex absolute bg-white border border-slate-100 p-3 rounded-lg shadow-md items-center gap-3 -top-6 -right-4 animate-float-w1">
            <div className="bg-brandPale text-brandBlue p-1.5 rounded-lg">
              <IconFileDescription size={20} />
            </div>
            <div>
              <div className="font-bold text-xs text-navy" style={{ fontFamily: 'var(--font-mono)' }}>#JC-1082 Active</div>
              <div className="text-[10px] text-slate-500">Toyota Aqua &bull; Diagnostics</div>
            </div>
          </div>

          {/* Floating Widget 2 — same visibility rule as Widget 1 above */}
          <div className="hidden lg:flex absolute bg-white border border-slate-100 p-3 rounded-lg shadow-md items-center gap-3 -bottom-5 -left-4 animate-float-w2">
            <div className="bg-[#FFF7E6] text-[#EF9F27] p-1.5 rounded-lg">
              <IconAlertTriangle size={20} />
            </div>
            <div>
              <div className="font-bold text-xs text-navy">Low Stock Alert</div>
              <div className="text-[10px] text-red-600">Engine Oil 5W-30 (3 left)</div>
            </div>
          </div>
        </div>
      </header>

      <TheBay />

      <ServiceHistoryLookup />

      {/* Modules Section */}
      <section ref={featuresRef} className="bg-white border-t border-slate-100 py-[100px] px-[8%]" id="modules">
        <div className={`text-center max-w-[620px] mx-auto mb-[60px] space-y-3 ${featuresRevealed ? 'reveal-in' : 'reveal-init'}`}>
          <div className="inline-flex items-center gap-1.5 text-brandBlue text-xs font-bold uppercase tracking-[0.14em]" style={{ fontFamily: 'var(--font-mono)' }}>
            Five Modules
          </div>
          <h2 className="font-display text-[34px] font-bold text-navy tracking-tight">
            Five modules, one shop floor.
          </h2>
          <p className="text-slate-500 text-[15px]">
            Every part of the workflow — from the front desk to the parts shelf — gets its own dedicated module.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-[1000px] mx-auto">
          {MODULES.map((m, i) => (
            <div
              key={m.letter}
              className={`bg-[#F9FAFC] border border-slate-100 rounded-xl p-7 hover:bg-white hover:border-brandBlue/20 hover:shadow-md transition-all duration-300 group flex gap-5 ${featuresRevealed ? 'reveal-in' : 'reveal-init'} ${m.letter === 'E' ? 'md:col-span-2' : ''}`}
              style={{ animationDelay: `${i * 70}ms` }}
            >
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center text-brandBlue shadow-sm transition-all duration-300 group-hover:bg-brandBlue group-hover:text-white">
                  <m.icon size={22} />
                </div>
                <div className="text-[11px] font-bold text-slate-300 mt-2 text-center" style={{ fontFamily: 'var(--font-mono)' }}>MOD.{m.letter}</div>
              </div>
              <div>
                <h3 className="text-[17px] font-bold text-navy mb-1.5">{m.title}</h3>
                <p className="text-slate-500 text-[13.5px] leading-relaxed">{m.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-100 bg-navy py-10 px-[8%]">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 max-w-[1100px] mx-auto">
          <div className="flex items-center gap-2 text-white font-bold font-display text-sm">
            <IconTool size={16} className="text-blueGlow" /> ServiceHub
          </div>
          <p className="text-white/40 text-xs">&copy; {new Date().getFullYear()} ServiceHub Inc. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}

export default Landing
