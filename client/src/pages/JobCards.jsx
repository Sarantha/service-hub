import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { IconPlus, IconDownload } from '@tabler/icons-react'
import Badge from '../components/Badge'
import DataTable from '../components/DataTable'
import { getJobCards } from '../services/jobCardsService'

const STATUS_OPTIONS = ['All Statuses', 'Open', 'In Progress', 'Awaiting Parts', 'Completed', 'Delivered']
const DATE_OPTIONS   = ['Today', 'This Week', 'This Month', 'All Time']
const PAGE_SIZE_OPTIONS = [10, 25, 50]

const badgeVariant = (s) => {
  if (s === 'Completed')                       return 'success'
  if (s === 'In Progress' || s === 'Awaiting Parts') return 'warning'
  if (s === 'Open')                            return 'info'
  if (s === 'Delivered')                       return 'delivered'
  return 'default'
}

// ── Headers ───────────────────────────────────────────────────────────────────
const headers = [
  { label: 'Job #',        key: 'jobNo'    },
  { label: 'Customer',     key: 'customer' },
  { label: 'Vehicle',      key: 'vehicle'  },
  { label: 'Service Type', key: 'service'  },
  { label: 'Technician',   key: 'tech'     },
  { label: 'Opened',       key: 'opened'   },
  { label: 'Status',       key: 'status'   },
  { label: 'Action',       key: 'action', align: 'right' },
]

export const JobCards = () => {
  const navigate = useNavigate()
  const [statusFilter, setStatusFilter] = useState('All Statuses')
  const [dateFilter,   setDateFilter]   = useState('Today')
  const [currentPage,  setCurrentPage]  = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [jobs,         setJobs]         = useState([])

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const res = await getJobCards()
        if (res && res.data) {
          const list = Array.isArray(res.data) ? res.data : (Array.isArray(res.data.data) ? res.data.data : [])
          if (list.length > 0) {
            const mapped = list.map(j => ({
              id: j._id || j.id,
              jobNo: j.jobCardNumber || `#JC-${j.id || j._id}`,
              customer: j.customerName || j.customerPhone || 'Customer',
              vehicle: j.vehicleRegNo || 'Vehicle',
              service: j.serviceType || 'Service',
              tech: j.assignedTechnician?.name || j.assignedTechnician || '—',
              opened: j.createdAt ? new Date(j.createdAt).toLocaleDateString('en-US') : 'Recent',
              openedAt: j.createdAt || j.openedAt || null,
              status: j.status || 'Open'
            }))
            console.log(mapped)
            setJobs(mapped)
          }
        }
      } catch (err) {
        console.warn('API error fetching job cards, using mock data fallback', err)
      }
    }
    fetchJobs()
  }, [])

  // ── Date range helpers ────────────────────────────────────────────────────────
  const now       = new Date()
  const todayStr  = now.toDateString()
  const weekStart = new Date(now); weekStart.setDate(now.getDate() - now.getDay())
  const monthStart= new Date(now.getFullYear(), now.getMonth(), 1)

  // Client-side filtering
  const filtered = jobs.filter((j) => {
    const matchStatus = statusFilter === 'All Statuses' || j.status === statusFilter

    let matchDate = true
    if (dateFilter === 'All Time') {
      matchDate = true
    } else if (j.openedAt) {
      const d = new Date(j.openedAt)
      if (dateFilter === 'Today')      matchDate = d.toDateString() === todayStr
      else if (dateFilter === 'This Week')  matchDate = d >= weekStart
      else if (dateFilter === 'This Month') matchDate = d >= monthStart
    } else {
      // Fallback for mock rows: match on the display string
      if (dateFilter === 'Today')      matchDate = j.opened?.startsWith('Today')
      else if (dateFilter === 'This Week')  matchDate = j.opened?.startsWith('Today') || j.opened?.startsWith('Yesterday')
      else if (dateFilter === 'This Month') matchDate = true
    }

    return matchStatus && matchDate
  })

  // DataTable renders whatever rows it's given — it doesn't slice by page
  // itself — so the current page's slice must be computed here.
  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage))
  const pageJobs = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  // CSV export helper
  const handleExport = () => {
    const rows = [
      ['Job #', 'Customer', 'Vehicle', 'Service', 'Technician', 'Opened', 'Status'],
      ...filtered.map((j) => [j.jobNo, j.customer, j.vehicle, j.service, j.tech, j.opened, j.status]),
    ]
    const csv = rows.map((r) => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = 'job-cards.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  const renderRow = (item) => (
    <tr
      key={item.id}
      className="h-14 bg-white hover:bg-slate-50/70 transition-colors border-b border-slate-100 last:border-0 cursor-pointer"
      onClick={() => navigate(`/jobcards/${item.id}`)}
    >
      <td className="px-4 py-3 text-[13px] font-semibold text-brandBlue">{item.jobNo}</td>
      <td className="px-4 py-3 text-[13px] text-slate-800">{item.customer}</td>
      <td className="px-4 py-3 text-[12px] text-slate-600">{item.vehicle}</td>
      <td className="px-4 py-3 text-[12px] text-slate-600">{item.service}</td>
      <td className="px-4 py-3 text-[12px] text-slate-600">{item.tech}</td>
      <td className="px-4 py-3 text-[12px] text-slate-500">{item.opened}</td>
      <td className="px-4 py-3">
        <Badge variant={badgeVariant(item.status)} className="!text-[10px]">{item.status}</Badge>
      </td>
      <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
        <Link
          to={`/jobcards/${item.id}`}
          id={`jc-open-${item.id}`}
          className="h-[28px] px-3 inline-flex items-center gap-1 bg-white text-slate-600 text-xs font-semibold border border-slate-200 rounded-md hover:border-brandBlue hover:text-brandBlue transition-all"
        >
          Open
        </Link>
      </td>
    </tr>
  )

  return (
    <div className="space-y-[18px]">
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[17px] font-semibold text-slate-800">Job Cards</div>
          <div className="text-[12px] text-slate-500 mt-0.5">Track and manage all service work orders</div>
        </div>
        <div className="flex gap-2">
          <button
            id="jc-export-btn"
            className="btn-secondary !h-8 !px-3 !text-xs flex items-center gap-1.5"
            onClick={handleExport}
          >
            <IconDownload size={13} /> Export
          </button>
          <Link
            to="/jobcards/new"
            id="jc-new-btn"
            className="btn-primary !h-8 !px-3 !text-xs flex items-center gap-1.5"
          >
            <IconPlus size={13} /> New Job Card
          </Link>
        </div>
      </div>

      {/* Filter Row */}
      <div className="flex items-center gap-2 flex-wrap">
        {[
          { value: statusFilter, set: setStatusFilter, opts: STATUS_OPTIONS, id: 'jc-filter-status' },
          { value: dateFilter,   set: setDateFilter,   opts: DATE_OPTIONS,   id: 'jc-filter-date'   },
        ].map(({ value, set, opts, id }) => (
          <select
            key={id}
            id={id}
            value={value}
            onChange={(e) => { set(e.target.value); setCurrentPage(1) }}
            className="h-8 px-2.5 text-[12px] bg-white border border-slate-200 rounded-md text-slate-700 focus:outline-none focus:border-brandBlue cursor-pointer"
          >
            {opts.map((o) => <option key={o}>{o}</option>)}
          </select>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <span className="text-[11px] text-slate-400">{filtered.length} record{filtered.length !== 1 ? 's' : ''}</span>
          <label htmlFor="jc-page-size" className="text-[11px] text-slate-400">Show</label>
          <select
            id="jc-page-size"
            value={itemsPerPage}
            onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1) }}
            className="h-8 px-2.5 text-[12px] bg-white border border-slate-200 rounded-md text-slate-700 focus:outline-none focus:border-brandBlue cursor-pointer"
          >
            {PAGE_SIZE_OPTIONS.map((n) => <option key={n} value={n}>{n} / page</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      <DataTable
        headers={headers}
        data={pageJobs}
        renderRow={renderRow}
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={filtered.length}
        itemsPerPage={itemsPerPage}
        onPageChange={setCurrentPage}
      />
    </div>
  )
}

export default JobCards
