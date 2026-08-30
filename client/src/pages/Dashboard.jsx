import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  IconArrowUp,
  IconArrowDown,
  IconChartBar,
} from '@tabler/icons-react'
import { useAuth } from '../context/AuthContext'
import Badge from '../components/Badge'
import { useToast } from '../context/ToastContext'
import { getDashboardKpis } from '../services/reportsService'
import { getJobCards } from '../services/jobCardsService'

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

// ── KPI Card ──────────────────────────────────────────────────────────────────
const KpiCard = ({ label, value, sub, trend, trendDir, danger }) => (
  <div className="bg-white border border-slate-100 rounded-lg p-4">
    <div className={`text-[11px] font-semibold mb-1.5 flex items-center gap-1 ${danger ? 'text-red-600' : 'text-slate-500'}`}>
      {label}
    </div>
    <div className={`text-[22px] font-semibold ${danger ? 'text-red-600' : 'text-slate-800'}`}>{value}</div>
    {trend && (
      <div className={`text-[10px] mt-0.5 flex items-center gap-0.5 ${trendDir === 'up' ? 'text-emerald-600' : 'text-red-600'}`}>
        {trendDir === 'up' ? <IconArrowUp size={10} /> : <IconArrowDown size={10} />}
        {trend}
      </div>
    )}
    {sub && !trend && <div className="text-[10px] text-slate-400 mt-0.5">{sub}</div>}
  </div>
)

// ── Revenue Bar Chart ──────────────────────────────────────────────────────────
const RevenueChart = ({ bars, total }) => {
  return (
    <div className="bg-white border border-slate-100 rounded-lg p-4">
      <div className="text-[13px] font-semibold text-slate-800 mb-3">Revenue — This Week</div>
      {bars.length === 0 ? (
        <div className="h-[52px] flex items-center justify-center text-[11px] text-slate-400">No revenue recorded this week yet.</div>
      ) : (
        <div className="flex items-end gap-[3px] h-[52px] mt-2">
          {bars.map((b) => (
            <div
              key={b.day}
              className={`flex-1 rounded-t-sm cursor-pointer transition-colors ${b.hi ? 'bg-brandBlue hover:bg-brandLight' : 'bg-[#D0E4F5] hover:bg-brandBlue/50'}`}
              style={{ height: `${Math.max(b.pct, 2)}%` }}
              title={b.day}
            />
          ))}
        </div>
      )}
      <div className="flex justify-between text-[10px] text-slate-400 mt-1.5">
        {bars.map((b) => <span key={b.day}>{b.day}</span>)}
      </div>
      <div className="border-t border-slate-100 mt-3.5 pt-3">
        <div className="text-[11px] text-slate-500">Week total</div>
        <div className="text-xl font-semibold text-slate-800 mt-0.5">LKR {total.toLocaleString()}</div>
      </div>
    </div>
  )
}

// ── Main Dashboard ─────────────────────────────────────────────────────────────
export const Dashboard = () => {
  const { user, hasRole, activeBranchId, branches } = useAuth()
  const { toastError } = useToast()
  const isSuperAdmin = hasRole('Super Admin')

  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  // Advisor/Technician always show their own (fixed) branch; Super Admin
  // shows whichever branch is active, or "All Branches" in central view.
  const scopedBranchId = isSuperAdmin ? activeBranchId : user?.branchId
  const branchLabel = !scopedBranchId
    ? 'All Branches — Central View'
    : (branches.find((b) => b._id === scopedBranchId)?.branchName || '…')

  const [stats, setStats] = useState({
    allTimeEarnings: 'LKR 0',
    todayRevenue: 'LKR 0',
    revenueTrend: null,
    jobsInProgress: '0',
    completedToday: '0',
    lowStockItemsCount: '0',
    lowStockSub: 'Stock level OK'
  })
  const [activeJobs, setActiveJobs] = useState([])
  const [lowStockItems, setLowStockItems] = useState([])
  const [weeklyRevenue, setWeeklyRevenue] = useState([])
  const [weeklyTotal, setWeeklyTotal] = useState(0)

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        const [kpisRes, jobCardsRes] = await Promise.all([
          getDashboardKpis(),
          getJobCards()
        ])

        const kpis = kpisRes?.data?.data
        if (kpis) {
          const inProgressCount = kpis.workVolume?.byStatus?.find(s => s._id === 'In Progress')?.count ?? 0
          const lowStock = kpis.lowStock || []

          setStats({
            allTimeEarnings: `LKR ${(kpis.revenue?.totalGrossRevenue ?? 0).toLocaleString()}`,
            todayRevenue: `LKR ${(kpis.revenue?.todayRevenue ?? 0).toLocaleString()}`,
            revenueTrend: kpis.revenue?.revenueTrendVsYesterday || null,
            jobsInProgress: String(inProgressCount),
            completedToday: String(kpis.workVolume?.completedToday ?? 0),
            lowStockItemsCount: String(lowStock.length),
            lowStockSub: lowStock.length > 0 ? 'Reorder required' : 'Stock level OK'
          })

          setLowStockItems(lowStock.map(item => ({
            name: item.partName,
            sku: item.sku,
            stock: `${item.stockLevel} left`
          })))

          // Last 7 calendar days, zero-filled for days with no recorded
          // revenue — the underlying sums are 100% server-computed
          // (kpis.revenue.dailyRevenue); this just selects/shapes them for
          // the bar chart's display.
          const dailyMap = new Map()
          ;(kpis.revenue?.dailyRevenue || []).forEach(b => {
            dailyMap.set(`${b._id.year}-${b._id.month}-${b._id.day}`, b.dailyRevenue)
          })
          const days = []
          const today = new Date()
          for (let i = 6; i >= 0; i--) {
            const d = new Date(today)
            d.setDate(d.getDate() - i)
            const key = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
            days.push({ day: DAY_NAMES[d.getDay()], amount: dailyMap.get(key) || 0 })
          }
          const maxAmount = Math.max(...days.map(d => d.amount), 1)
          setWeeklyRevenue(days.map(d => ({
            day: d.day,
            pct: Math.round((d.amount / maxAmount) * 100),
            hi: d.amount === maxAmount && d.amount > 0
          })))
          setWeeklyTotal(days.reduce((sum, d) => sum + d.amount, 0))
        }

        const jobsList = Array.isArray(jobCardsRes?.data) ? jobCardsRes.data : (Array.isArray(jobCardsRes?.data?.data) ? jobCardsRes.data.data : [])

        const active = jobsList
          .filter(j => j.status !== 'Delivered')
          .slice(0, 5)
          .map(j => ({
            id: j.jobCardNumber || j._id || String(j.id),
            vehicle: `${j.vehicleRegNo || 'Unknown'}${j.vehicleMake ? ` · ${j.vehicleMake}` : ''}`,
            tech: j.assignedTechnician?.name || 'Unassigned',
            status: j.status
          }))
        setActiveJobs(active)
      } catch (err) {
        toastError(err.message || 'Failed to load dashboard data.')
      }
    }
    loadDashboardData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const statusVariant = (s) => {
    if (s === 'Completed') return 'success'
    if (s === 'In Progress' || s === 'Awaiting Parts') return 'warning'
    if (s === 'Open') return 'info'
    return 'default'
  }

  return (
    <div className="space-y-[18px]">
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[17px] font-semibold text-slate-800">Dashboard</div>
          <div className="text-[12px] text-slate-500 mt-0.5" id="db-branch-label">
            {currentDate} — {branchLabel}
          </div>
        </div>
        {isSuperAdmin && !scopedBranchId && (
          <Link to="/reports" className="btn-secondary !h-8 !px-3 !text-xs flex items-center gap-1" id="db-branch-performance-link">
            <IconChartBar size={13} /> Compare Branches
          </Link>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <KpiCard label="All Time Earnings" value={stats.allTimeEarnings} sub="All paid invoices" />
        <KpiCard
          label="Today's Revenue" value={stats.todayRevenue}
          trend={stats.revenueTrend} trendDir={stats.revenueTrend?.startsWith('↓') ? 'down' : 'up'}
        />
        <KpiCard label="Jobs In Progress" value={stats.jobsInProgress} sub={stats.lowStockSub} />
        <KpiCard label="Completed Today" value={stats.completedToday} />
        <KpiCard label="Low Stock Items" value={stats.lowStockItemsCount} sub={stats.lowStockSub} danger />
      </div>

      {/* Active Job Cards + Revenue Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Active Job Cards mini-table */}
        <div className="bg-white border border-slate-100 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-[13px] font-semibold text-slate-800">Active Job Cards</div>
            <Link to="/jobcards" className="text-[11px] text-brandBlue hover:underline" id="db-view-all-jobs">
              View all →
            </Link>
          </div>
          <div className="w-full overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  {['Job #', 'Vehicle', 'Technician', 'Status'].map((h) => (
                    <th key={h} className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider text-left px-3 py-2 border-b border-slate-100">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {activeJobs.length === 0 && (
                  <tr><td colSpan={4} className="px-3 py-4 text-center text-[12px] text-slate-400">No active job cards.</td></tr>
                )}
                {activeJobs.map((job) => (
                  <tr key={job.id} className="hover:bg-slate-50/70 transition-colors border-b border-slate-100 last:border-0">
                    <td className="px-3 py-2">
                      <Link to={`/jobcards/${job.id.replace('JC-', '')}`} className="text-[12px] font-semibold text-brandBlue hover:underline">
                        #{job.id}
                      </Link>
                    </td>
                    <td className="px-3 py-2 text-[12px] text-slate-700">{job.vehicle}</td>
                    <td className="px-3 py-2 text-[12px] text-slate-600">{job.tech}</td>
                    <td className="px-3 py-2">
                      <Badge variant={statusVariant(job.status)} className="!text-[10px]">{job.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Revenue Chart */}
        <RevenueChart bars={weeklyRevenue} total={weeklyTotal} />
      </div>

      {/* Low Stock Alerts */}
      <div className="bg-white border border-slate-100 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-[13px] font-semibold text-slate-800">Low Stock Alerts</div>
          <Link to="/inventory" className="text-[11px] text-brandBlue hover:underline" id="db-manage-inventory">
            Manage →
          </Link>
        </div>
        <div className="w-full overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                {['Item', 'SKU', 'Stock'].map((h) => (
                  <th key={h} className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider text-left px-3 py-2 border-b border-slate-100">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lowStockItems.length === 0 && (
                <tr><td colSpan={3} className="px-3 py-4 text-center text-[12px] text-slate-400">No items below their reorder point.</td></tr>
              )}
              {lowStockItems.map((item) => (
                <tr key={item.sku} className="hover:bg-slate-50/70 transition-colors border-b border-slate-100 last:border-0">
                  <td className="px-3 py-2 text-[12px] text-slate-800">{item.name}</td>
                  <td className="px-3 py-2 text-[12px] font-mono text-slate-500">{item.sku}</td>
                  <td className="px-3 py-2">
                    <Badge variant="danger" className="!text-[10px]">{item.stock}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
