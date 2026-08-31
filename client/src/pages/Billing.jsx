import React, { useState, useEffect } from 'react'
import {
  IconDownload,
  IconCash, IconAlertCircle, IconFileInvoice, IconChartBar, IconX,
} from '@tabler/icons-react'
import DataTable from '../components/DataTable'
import Badge from '../components/Badge'
import Modal from '../components/Modal'
import TextInput from '../components/TextInput'
import SelectBox from '../components/SelectBox'
import { useToast } from '../context/ToastContext'
import { getInvoices, getInvoiceSummary, collectPayment, downloadInvoicePdf } from '../services/billingService'

const badgeVariant = (s) => s === 'Paid' ? 'success' : 'danger'

const mapInvoice = (inv) => ({
  id: inv._id || inv.id,
  invNo: inv.invoiceNumber || `INV-${inv.id || inv._id}`,
  customer: inv.customerName || 'Customer',
  jobCard: inv.jobCardNumber || '—',
  date: inv.createdAt ? new Date(inv.createdAt).toLocaleDateString('en-US') : 'Recent',
  amount: inv.totalAmount || inv.amount || 0,
  method: inv.paymentMethod || '—',
  status: inv.paymentStatus || 'Unpaid'
})

// Filter inputs only accept past dates/months — today and later stay disabled.
const yesterdayISO = () => {
  const d = new Date(); d.setDate(d.getDate() - 1)
  return d.toISOString().slice(0, 10)
}
const lastMonthISO = () => {
  const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - 1)
  return d.toISOString().slice(0, 7)
}

// ── KPI Card ──────────────────────────────────────────────────────────────────
const KPI = ({ label, value, sub, icon: Icon, iconColor, valueColor }) => (
  <div className="bg-white border border-slate-100 rounded-lg px-4 py-3 flex items-start justify-between gap-2">
    <div>
      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</div>
      <div className={`text-[22px] font-bold mt-0.5 ${valueColor || 'text-slate-800'}`}>{value}</div>
      {sub && <div className="text-[11px] text-slate-400 mt-0.5">{sub}</div>}
    </div>
    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${iconColor}`}>
      <Icon size={17} />
    </div>
  </div>
)

// ── Payment Collection Modal ───────────────────────────────────────────────────
const CollectModal = ({ invoice, onClose, onCollect }) => {
  const [method, setMethod] = useState('Cash')

  if (!invoice) return null
  return (
    <Modal
      isOpen={!!invoice}
      onClose={onClose}
      title={`Collect Payment — ${invoice.invNo}`}
      footer={
        <>
          <button className="btn-secondary" onClick={onClose} id="cm-cancel-btn">Cancel</button>
          <button className="btn-primary"   onClick={() => { onCollect(invoice.id, method); onClose() }} id="cm-collect-btn">
            <IconCash size={14} /> Mark Paid
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="bg-slate-50 border border-slate-100 rounded-lg p-4 space-y-1.5">
          <div className="flex justify-between text-[12px]">
            <span className="text-slate-500">Customer</span>
            <span className="text-slate-800 font-semibold">{invoice.customer}</span>
          </div>
          <div className="flex justify-between text-[12px]">
            <span className="text-slate-500">Job Card</span>
            <span className="text-slate-800">{invoice.jobCard}</span>
          </div>
          <div className="flex justify-between text-[14px] font-bold border-t border-slate-200 pt-2 mt-1">
            <span className="text-slate-800">Amount Due</span>
            <span className="text-brandBlue">LKR {invoice.amount.toLocaleString()}</span>
          </div>
        </div>
        <SelectBox
          label="Payment Method"
          id="cm-method"
          value={method}
          onChange={(e) => setMethod(e.target.value)}
          options={['Cash', 'Card', 'Online']}
        />
      </div>
    </Modal>
  )
}

// ── Table headers ─────────────────────────────────────────────────────────────
const HEADERS = [
  { label: 'Invoice #',  key: 'invNo'    },
  { label: 'Customer',   key: 'customer' },
  { label: 'Job Card',   key: 'jobCard'  },
  { label: 'Date',       key: 'date'     },
  { label: 'Amount',     key: 'amount'   },
  { label: 'Method',     key: 'method'   },
  { label: 'Status',     key: 'status'   },
  { label: 'Action',     key: 'action', align: 'right' },
]

// ── Main component ────────────────────────────────────────────────────────────
export const Billing = () => {
  const { toastSuccess, toastInfo, toastError } = useToast()
  const [invoices,     setInvoices]     = useState([])
  const [currentPage,  setCurrentPage]  = useState(1)
  const [collectTarget, setCollectTarget] = useState(null)

  // Today's Receipts — computed server-side, actual (not rounded) amount.
  const [todayReceipts, setTodayReceipts] = useState(0)

  // Past-day/month invoice filter
  const [filterMode,  setFilterMode]  = useState('date') // 'date' | 'month'
  const [filterValue, setFilterValue] = useState('')
  const [filterActive, setFilterActive] = useState(false)
  const [filteredInvoices, setFilteredInvoices] = useState([])
  const [periodSummary, setPeriodSummary] = useState(null)
  const [filterLoading, setFilterLoading] = useState(false)

  const fetchAllInvoices = async () => {
    try {
      const res = await getInvoices()
      const list = Array.isArray(res?.data) ? res.data : (Array.isArray(res?.data?.data) ? res.data.data : [])
      setInvoices(list.map(mapInvoice))
    } catch (err) {
      toastError(err.message || 'Failed to load invoices.')
    }
  }

  const fetchTodayReceipts = async () => {
    try {
      const res = await getInvoiceSummary()
      const summary = res?.data?.data || res?.data
      if (summary) setTodayReceipts(summary.totalCollection || 0)
    } catch (err) {
      console.warn('API error fetching today\'s receipts summary', err)
    }
  }

  useEffect(() => {
    fetchAllInvoices()
    fetchTodayReceipts()
  }, [])

  const applyFilter = async () => {
    if (!filterValue) return
    const params = filterMode === 'date' ? { date: filterValue } : { month: filterValue }
    setFilterLoading(true)
    try {
      const [invRes, sumRes] = await Promise.all([getInvoices(params), getInvoiceSummary(params)])
      const list = Array.isArray(invRes?.data) ? invRes.data : (Array.isArray(invRes?.data?.data) ? invRes.data.data : [])
      setFilteredInvoices(list.map(mapInvoice))
      setPeriodSummary(sumRes?.data?.data || sumRes?.data || null)
      setFilterActive(true)
      setCurrentPage(1)
    } catch (err) {
      toastError(err.message || 'Failed to load invoices for the selected period.')
    } finally {
      setFilterLoading(false)
    }
  }

  const clearFilter = () => {
    setFilterActive(false)
    setFilterValue('')
    setFilteredInvoices([])
    setPeriodSummary(null)
    setCurrentPage(1)
  }

  const refreshFilterIfActive = async () => {
    if (!filterActive || !filterValue) return
    const params = filterMode === 'date' ? { date: filterValue } : { month: filterValue }
    const [invRes, sumRes] = await Promise.all([getInvoices(params), getInvoiceSummary(params)])
    const list = Array.isArray(invRes?.data) ? invRes.data : (Array.isArray(invRes?.data?.data) ? invRes.data.data : [])
    setFilteredInvoices(list.map(mapInvoice))
    setPeriodSummary(sumRes?.data?.data || sumRes?.data || null)
  }

  const handlePdfDownload = async (item) => {
    toastInfo(`Preparing PDF for ${item.invNo}…`, 'PDF Download')
    try {
      const response = await downloadInvoicePdf(item.id)
      const blob = new Blob([response.data], { type: 'application/pdf' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `${item.invNo}.pdf`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      toastError(err.message || 'Failed to download invoice PDF.')
    }
  }

  // Derived KPIs (unfiltered, all-time — unaffected by the past-day/month filter below)
  const outstanding   = invoices.filter((i) => i.status === 'Unpaid')
  const outstandingAmt = outstanding.reduce((s, i) => s + i.amount, 0)
  const avgValue      = invoices.length ? Math.round(invoices.reduce((s, i) => s + i.amount, 0) / invoices.length) : 0

  const markPaid = async (id, method) => {
    try {
      await collectPayment(id, method)
      const inv = invoices.find((i) => i.id === id)
      toastSuccess(`${inv?.invNo || 'Invoice'} marked as Paid via ${method}.`, 'Payment Collected')
      await Promise.all([fetchAllInvoices(), fetchTodayReceipts(), refreshFilterIfActive()])
    } catch (err) {
      toastError(err.message || 'Failed to collect payment.')
    }
  }

  const handleExport = () => {
    const rows = [['Invoice #', 'Customer', 'Job Card', 'Date', 'Amount', 'Method', 'Status'],
      ...invoices.map((i) => [i.invNo, i.customer, i.jobCard, i.date, i.amount, i.method, i.status])]
    const csv  = rows.map((r) => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a'); a.href = url; a.download = 'billing.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  const renderRow = (item) => (
    <tr key={item.id} className="h-14 bg-white hover:bg-slate-50/70 transition-colors border-b border-slate-100 last:border-0">
      <td className="px-4 py-3 text-[13px] font-semibold text-brandBlue">{item.invNo}</td>
      <td className="px-4 py-3 text-[13px] text-slate-800">{item.customer}</td>
      <td className="px-4 py-3 text-[12px] text-slate-600">{item.jobCard}</td>
      <td className="px-4 py-3 text-[12px] text-slate-500">{item.date}</td>
      <td className="px-4 py-3 text-[13px] font-semibold text-slate-800">LKR {item.amount.toLocaleString()}</td>
      <td className="px-4 py-3 text-[12px] text-slate-600">{item.method}</td>
      <td className="px-4 py-3">
        <Badge variant={badgeVariant(item.status)} className="!text-[10px]">{item.status}</Badge>
      </td>
      <td className="px-4 py-3 text-right flex items-center gap-2 justify-end h-14">
        <button
          id={`bill-pdf-${item.id}`}
          className="h-[28px] px-3 inline-flex items-center gap-1 bg-white text-slate-600 text-xs font-semibold border border-slate-200 rounded-md hover:border-brandBlue hover:text-brandBlue transition-all"
          onClick={() => handlePdfDownload(item)}
        >
          <IconDownload size={11} /> PDF
        </button>
        {item.status !== 'Paid' && (
          <button
            id={`bill-collect-${item.id}`}
            className="h-[28px] px-3 inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200 rounded-md hover:bg-emerald-600 hover:text-white hover:border-emerald-600 transition-all"
            onClick={() => setCollectTarget(item)}
          >
            Collect
          </button>
        )}
      </td>
    </tr>
  )

  return (
    <div className="space-y-[18px]">
      {/* Page Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="text-[17px] font-semibold text-slate-800">Billing &amp; Payments</div>
          <div className="text-[12px] text-slate-500 mt-0.5">Invoices, receipts, and outstanding balances</div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button id="bill-export-btn" className="btn-secondary !h-8 !px-3 !text-xs flex items-center gap-1.5" onClick={handleExport}>
            <IconDownload size={13} /> Export
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPI label="Today's Receipts"     value={`LKR ${todayReceipts.toLocaleString()}`}          icon={IconCash}         iconColor="bg-emerald-50 text-emerald-500" />
        <KPI label="Outstanding Balances" value={`LKR ${outstandingAmt.toLocaleString()}`}
          sub={`${outstanding.length} customer${outstanding.length !== 1 ? 's' : ''}`}
          icon={IconAlertCircle}  iconColor="bg-red-50 text-red-500"     valueColor="text-red-600"  />
        <KPI label="Invoices This Month"  value={invoices.length}                                   icon={IconFileInvoice}  iconColor="bg-blue-50 text-blue-500"      />
        <KPI label="Avg. Invoice Value"   value={`LKR ${avgValue.toLocaleString()}`}                icon={IconChartBar}     iconColor="bg-purple-50 text-purple-500"  />
      </div>

      {/* Past Invoices Filter */}
      <div className="bg-white border border-slate-100 rounded-lg p-4 space-y-3">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">View Past Invoices By</div>
            <div className="flex bg-slate-50 border border-slate-200 rounded-lg p-0.5">
              <button
                id="bill-filter-mode-date"
                className={`h-8 px-3 text-xs font-semibold rounded-md transition-colors ${filterMode === 'date' ? 'bg-white text-brandBlue shadow-sm' : 'text-slate-500'}`}
                onClick={() => { setFilterMode('date'); setFilterValue('') }}
              >
                Day
              </button>
              <button
                id="bill-filter-mode-month"
                className={`h-8 px-3 text-xs font-semibold rounded-md transition-colors ${filterMode === 'month' ? 'bg-white text-brandBlue shadow-sm' : 'text-slate-500'}`}
                onClick={() => { setFilterMode('month'); setFilterValue('') }}
              >
                Month
              </button>
            </div>
          </div>

          {filterMode === 'date' ? (
            <TextInput
              id="bill-filter-date"
              label="Select a past day"
              type="date"
              max={yesterdayISO()}
              value={filterValue}
              onChange={(e) => setFilterValue(e.target.value)}
            />
          ) : (
            <TextInput
              id="bill-filter-month"
              label="Select a past month"
              type="month"
              max={lastMonthISO()}
              value={filterValue}
              onChange={(e) => setFilterValue(e.target.value)}
            />
          )}

          <button id="bill-filter-apply" className="btn-primary !h-[42px] !px-4 !text-xs" disabled={!filterValue || filterLoading} onClick={applyFilter}>
            {filterLoading ? 'Loading…' : 'Apply Filter'}
          </button>
          {filterActive && (
            <button id="bill-filter-clear" className="btn-secondary !h-[42px] !px-3 !text-xs flex items-center gap-1" onClick={clearFilter}>
              <IconX size={13} /> Clear
            </button>
          )}
        </div>

        {filterActive && periodSummary && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
            <div className="bg-slate-50 border border-slate-100 rounded-lg px-3 py-2.5">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Collection</div>
              <div className="text-[16px] font-bold text-emerald-600 mt-0.5">LKR {(periodSummary.totalCollection || 0).toLocaleString()}</div>
            </div>
            <div className="bg-slate-50 border border-slate-100 rounded-lg px-3 py-2.5">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Outstanding</div>
              <div className="text-[16px] font-bold text-red-600 mt-0.5">LKR {(periodSummary.totalOutstanding || 0).toLocaleString()}</div>
            </div>
            <div className="bg-slate-50 border border-slate-100 rounded-lg px-3 py-2.5">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">No. of Invoices</div>
              <div className="text-[16px] font-bold text-slate-800 mt-0.5">{periodSummary.invoiceCount || 0}</div>
            </div>
            <div className="bg-slate-50 border border-slate-100 rounded-lg px-3 py-2.5">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Avg. Invoice Value</div>
              <div className="text-[16px] font-bold text-slate-800 mt-0.5">LKR {Math.round(periodSummary.avgInvoiceValue || 0).toLocaleString()}</div>
            </div>
            <div className="col-span-2 lg:col-span-4 text-[11px] text-slate-400">
              Showing invoices for <span className="font-semibold text-slate-600">{periodSummary.label}</span>
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      <DataTable
        headers={HEADERS}
        data={filterActive ? filteredInvoices : invoices}
        renderRow={renderRow}
        currentPage={currentPage}
        totalPages={Math.max(1, Math.ceil((filterActive ? filteredInvoices.length : invoices.length) / 10))}
        totalItems={filterActive ? filteredInvoices.length : invoices.length}
        itemsPerPage={10}
        onPageChange={setCurrentPage}
      />

      {/* Modals */}
      <CollectModal invoice={collectTarget} onClose={() => setCollectTarget(null)} onCollect={markPaid} />
    </div>
  )
}

export default Billing
