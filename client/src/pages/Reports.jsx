import React, { useState, useEffect, useCallback } from 'react'
import {
  BarChart, Bar, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import Badge from '../components/Badge'
import DataTable from '../components/DataTable'
import ReportCard from '../components/ReportCard'
import ChartTooltip from '../components/charts/ChartTooltip'
import { CHART_COLORS } from '../components/charts/chartColors'
import { useToast } from '../context/ToastContext'
import { useAuth } from '../context/AuthContext'
import { getAnalytics, getReportData, downloadReportPdf, downloadReportXls, getBranchPerformance } from '../services/reportsService'

// ── Date-range options ────────────────────────────────────────────────────────
const DATE_RANGES = ['This Month', 'Last Month', 'This Year', 'Custom Range']

// ── KPI empty state (shown until real data loads, or if the backend call fails) ──
const EMPTY_KPI = { revenue: 'LKR 0', revTrend: '', jobs: 0, parts: 'LKR 0', profit: 'LKR 0', margin: '~0% margin' }

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const dayLabel = (id) => (id ? `${MONTH_NAMES[id.month - 1]} ${id.day}` : '')

// ── Report catalog — daily operational bar charts + outstanding balances ──────
const REPORT_DEFS = [
  { reportType: 'jobs-completed-daily',        title: 'Jobs Completed — Daily',        description: 'Number of jobs completed each day' },
  { reportType: 'sales-daily',                 title: 'Sales — Daily',                 description: 'Revenue collected each day' },
  { reportType: 'inventory-consumption-daily', title: 'Inventory Consumption — Daily', description: 'Value of parts consumed each day' },
  { reportType: 'outstanding-balances',        title: 'Outstanding Balances',          description: 'Unpaid invoices and aging' },
]

// ── KPI card ──────────────────────────────────────────────────────────────────
const KPI = ({ label, value, sub, trend }) => (
  <div className="bg-white border border-slate-100 rounded-lg px-4 py-3">
    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</div>
    <div className="text-[22px] font-bold text-slate-800 mt-0.5">{value}</div>
    {trend && <div className="text-[11px] text-emerald-600 font-medium mt-0.5">{trend}</div>}
    {sub   && <div className="text-[11px] text-slate-400 mt-0.5">{sub}</div>}
  </div>
)

const EmptyChartState = () => (
  <div className="h-full min-h-[200px] flex items-center justify-center text-[12px] text-slate-400">
    No data for this period.
  </div>
)

const axisTick = { fontSize: 10, fill: CHART_COLORS.axisText }

// ── Shared: one bar per day of the selected range ──────────────────────────────
const DailyBarChart = ({ buckets = [], dataKey, name, color, valueFormatter, integersOnly = false }) => {
  const chartData = buckets.map((b) => ({ day: dayLabel(b._id), value: b[dataKey] }))
  if (chartData.length === 0) return <EmptyChartState />
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 30 }}>
        <CartesianGrid stroke={CHART_COLORS.gridLine} strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="day"
          tick={{ ...axisTick, fontSize: 9 }}
          axisLine={false}
          tickLine={false}
          interval={chartData.length > 15 ? Math.ceil(chartData.length / 15) - 1 : 0}
          angle={-45}
          textAnchor="end"
          height={50}
        />
        <YAxis
          tick={axisTick}
          axisLine={false}
          tickLine={false}
          width={40}
          tickFormatter={valueFormatter}
          allowDecimals={!integersOnly}
        />
        <Tooltip content={<ChartTooltip />} />
        <Bar dataKey="value" name={name} fill={color} radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

const thousandsTick = (v) => `${(v / 1000).toFixed(0)}K`

const JobsCompletedDailyChart = ({ data }) => (
  <DailyBarChart buckets={data?.buckets} dataKey="count" name="Jobs Completed" color={CHART_COLORS.brandBlue} integersOnly />
)

const SalesDailyChart = ({ data }) => (
  <DailyBarChart buckets={data?.buckets} dataKey="totalSales" name="Sales" color={CHART_COLORS.blueGlow} valueFormatter={thousandsTick} />
)

const InventoryConsumptionDailyChart = ({ data }) => (
  <DailyBarChart buckets={data?.buckets} dataKey="totalValue" name="Parts Consumed" color={CHART_COLORS.brandLight} valueFormatter={thousandsTick} />
)

// ── Chart + table: Outstanding Balances ────────────────────────────────────────
const AGING_BADGE_VARIANT = ['info', 'warning', 'danger', 'danger']

const OutstandingBalancesBody = ({ data }) => {
  const [page, setPage] = useState(1)
  const buckets = data?.buckets || []
  const invoices = data?.invoices || []
  const itemsPerPage = 5
  const pageInvoices = invoices.slice((page - 1) * itemsPerPage, page * itemsPerPage)

  if (invoices.length === 0) return <EmptyChartState />

  const renderRow = (inv) => {
    const bucketIdx = inv.ageDays <= 30 ? 0 : inv.ageDays <= 60 ? 1 : inv.ageDays <= 90 ? 2 : 3
    return (
      <tr key={inv._id} className="h-11 bg-white hover:bg-slate-50/70 transition-colors border-b border-slate-100 last:border-0">
        <td className="px-4 py-2 text-[12px] font-semibold text-brandBlue">{inv.invoiceNumber}</td>
        <td className="px-4 py-2 text-[12px] text-slate-600">{inv.jobCardNumber || '—'}</td>
        <td className="px-4 py-2 text-[12px] text-slate-800 text-right">LKR {inv.totalAmount.toLocaleString()}</td>
        <td className="px-4 py-2 text-right">
          <Badge variant={AGING_BADGE_VARIANT[bucketIdx]} className="!text-[10px]">{inv.ageDays}d</Badge>
        </td>
      </tr>
    )
  }

  return (
    <div className="space-y-2">
      <ResponsiveContainer width="100%" height={120}>
        <BarChart data={buckets} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={CHART_COLORS.gridLine} strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" tick={{ ...axisTick, fontSize: 9 }} axisLine={false} tickLine={false} />
          <YAxis tick={axisTick} axisLine={false} tickLine={false} width={30} />
          <Tooltip content={<ChartTooltip />} />
          <Bar dataKey="totalAmount" name="Amount" radius={[3, 3, 0, 0]}>
            {buckets.map((entry, i) => (
              <Cell key={entry.label} fill={[CHART_COLORS.info, CHART_COLORS.warning, CHART_COLORS.danger, CHART_COLORS.danger][i]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <DataTable
        headers={[
          { label: 'Invoice #', key: 'invoiceNumber' },
          { label: 'Job Card', key: 'jobCardNumber' },
          { label: 'Amount', key: 'totalAmount', align: 'right' },
          { label: 'Age', key: 'age', align: 'right' },
        ]}
        data={pageInvoices}
        renderRow={renderRow}
        currentPage={page}
        totalPages={Math.max(1, Math.ceil(invoices.length / itemsPerPage))}
        totalItems={invoices.length}
        itemsPerPage={itemsPerPage}
        onPageChange={setPage}
      />
    </div>
  )
}

const renderReportBody = (reportType, data) => {
  switch (reportType) {
    case 'jobs-completed-daily':        return <JobsCompletedDailyChart data={data} />
    case 'sales-daily':                 return <SalesDailyChart data={data} />
    case 'inventory-consumption-daily': return <InventoryConsumptionDailyChart data={data} />
    case 'outstanding-balances':        return <OutstandingBalancesBody data={data} />
    default:                            return <EmptyChartState />
  }
}

// ── Branch Performance — Super Admin's cross-branch comparison table ───────────
const BranchPerformanceSection = () => {
  const { toastError } = useToast()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    getBranchPerformance()
      .then((res) => {
        if (cancelled) return
        const list = Array.isArray(res?.data) ? res.data : (Array.isArray(res?.data?.data) ? res.data.data : [])
        setRows(list)
      })
      .catch((err) => { if (!cancelled) toastError(err.message || 'Failed to load branch performance.') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="bg-white border border-slate-100 rounded-lg p-4">
      <div className="text-[13px] font-semibold text-slate-800 mb-1">Branch Performance</div>
      <div className="text-[11px] text-slate-500 mb-3">All-time figures per branch, for side-by-side comparison</div>
      <div className="w-full overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              {['Branch', 'Code', 'Status', 'Total Revenue', 'Paid Invoices', 'Jobs Completed', 'Low Stock Items'].map((h) => (
                <th key={h} className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider text-left px-3 py-2 border-b border-slate-100">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {!loading && rows.length === 0 && (
              <tr><td colSpan={7} className="px-3 py-4 text-center text-[12px] text-slate-400">No branches yet.</td></tr>
            )}
            {rows.map((r) => (
              <tr key={r.branchId} id={`branch-perf-row-${r.branchId}`} className="hover:bg-slate-50/70 transition-colors border-b border-slate-100 last:border-0">
                <td className="px-3 py-2 text-[13px] font-semibold text-slate-800">{r.branchName}</td>
                <td className="px-3 py-2 text-[12px] font-mono text-slate-500">{r.code}</td>
                <td className="px-3 py-2">
                  <Badge variant={r.isActive ? 'success' : 'danger'} className="!text-[10px]">{r.isActive ? 'Active' : 'Inactive'}</Badge>
                </td>
                <td className="px-3 py-2 text-[12px] text-slate-800">LKR {r.totalRevenue.toLocaleString()}</td>
                <td className="px-3 py-2 text-[12px] text-slate-600">{r.paidInvoiceCount}</td>
                <td className="px-3 py-2 text-[12px] text-slate-600">{r.jobsCompleted}</td>
                <td className="px-3 py-2">
                  {r.lowStockCount > 0
                    ? <Badge variant="danger" className="!text-[10px]">{r.lowStockCount}</Badge>
                    : <span className="text-[12px] text-slate-400">0</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export const Reports = () => {
  const { toastInfo, toastSuccess, toastError } = useToast()
  const { hasRole } = useAuth()
  const [dateRange, setDateRange] = useState('This Month')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')
  const [kpi, setKpi] = useState(EMPTY_KPI)
  const [reportData, setReportData] = useState({})

  const buildParams = useCallback(() => {
    const params = { range: dateRange }
    if (dateRange === 'Custom Range' && customStart && customEnd) {
      params.startDate = customStart
      params.endDate = customEnd
    }
    return params
  }, [dateRange, customStart, customEnd])

  useEffect(() => {
    if (dateRange === 'Custom Range' && (!customStart || !customEnd)) return

    const fetchReportData = async () => {
      const params = buildParams()
      const [analyticsRes, ...reportResults] = await Promise.all([
        getAnalytics(params).catch(() => null),
        ...REPORT_DEFS.map((r) => getReportData(r.reportType, params).catch(() => null)),
      ])

      if (analyticsRes && analyticsRes.data && analyticsRes.data.data) {
        const d = analyticsRes.data.data
        setKpi({
          revenue: `LKR ${(d.revenue || 0).toLocaleString()}`,
          revTrend: d.revTrend || 'Stable',
          jobs: d.completedJobsCount || 0,
          parts: `LKR ${(d.partsConsumedValue || 0).toLocaleString()}`,
          profit: `LKR ${(d.grossProfit || 0).toLocaleString()}`,
          margin: `~${d.profitMargin || 0}% margin`,
        })
      } else {
        setKpi(EMPTY_KPI)
        toastError('Failed to load analytics summary.')
      }

      const nextReportData = {}
      REPORT_DEFS.forEach((r, i) => {
        const res = reportResults[i]
        nextReportData[r.reportType] = res && res.data ? res.data.data : null
      })
      setReportData(nextReportData)
    }

    fetchReportData()
  }, [dateRange, customStart, customEnd, buildParams])

  const handleExport = async (reportType, title, format) => {
    toastInfo(`Preparing ${format.toUpperCase()} for ${title}…`, 'Export')
    try {
      const params = buildParams()
      const res = format === 'pdf' ? await downloadReportPdf(reportType, params) : await downloadReportXls(reportType, params)
      const mime = format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      const blob = new Blob([res.data], { type: mime })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `${reportType}.${format === 'pdf' ? 'pdf' : 'xlsx'}`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      toastSuccess(`${title} downloaded.`, 'Export Complete')
    } catch (err) {
      toastError(err.message || `Failed to download ${title}.`)
    }
  }

  return (
    <div className="space-y-[18px]">
      {/* Page Header with Date Range selector */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="text-[17px] font-semibold text-slate-800">Reports &amp; Analytics</div>
          <div className="text-[12px] text-slate-500 mt-0.5">Generate and export business reports</div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select
            id="rpt-date-range"
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="h-8 px-2.5 text-[12px] bg-white border border-slate-200 rounded-md text-slate-700 focus:outline-none focus:border-brandBlue cursor-pointer"
          >
            {DATE_RANGES.map((r) => <option key={r}>{r}</option>)}
          </select>
          {dateRange === 'Custom Range' && (
            <>
              <input
                id="rpt-custom-start"
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="h-8 px-2.5 text-[12px] bg-white border border-slate-200 rounded-md text-slate-700 focus:outline-none focus:border-brandBlue"
              />
              <span className="text-[11px] text-slate-400">to</span>
              <input
                id="rpt-custom-end"
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="h-8 px-2.5 text-[12px] bg-white border border-slate-200 rounded-md text-slate-700 focus:outline-none focus:border-brandBlue"
              />
            </>
          )}
        </div>
      </div>

      {/* Analytics KPI Summary Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPI label="Revenue"         value={kpi.revenue} trend={kpi.revTrend} />
        <KPI label="Jobs Completed"  value={kpi.jobs}    />
        <KPI label="Parts Consumed"  value={kpi.parts}   />
        <KPI label="Gross Profit"    value={kpi.profit}  sub={kpi.margin}     />
      </div>

      {/* Report cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {REPORT_DEFS.map(({ reportType, title, description }) => (
          <ReportCard
            key={reportType}
            reportType={reportType}
            title={title}
            description={description}
            onExport={(format) => handleExport(reportType, title, format)}
          >
            {renderReportBody(reportType, reportData[reportType])}
          </ReportCard>
        ))}
      </div>

      {/* Branch Performance — cross-branch comparison, Super Admin only */}
      {hasRole('Super Admin') && <BranchPerformanceSection />}
    </div>
  )
}

export default Reports
