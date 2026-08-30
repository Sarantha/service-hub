import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  IconArrowLeft, IconSend, IconReceipt,
  IconCheck, IconPlus, IconX,
} from '@tabler/icons-react'
import Modal from '../components/Modal'
import TextInput from '../components/TextInput'
import SelectBox from '../components/SelectBox'
import Badge from '../components/Badge'
import CarDamageDiagram from '../components/CarDamageDiagram'
import { useToast } from '../context/ToastContext'
import { useAuth } from '../context/AuthContext'
import { getJobCard, setJobCardStatus, updateChecklist, addLineItem, addLaborCharge, removeLineItem } from '../services/jobCardsService'
import { getInventory } from '../services/inventoryService'
import { generateInvoiceFromJobCard } from '../services/billingService'

// ── Status pipeline ────────────────────────────────────────────────────────────
const STATUS_STEPS = ['Open', 'In Progress', 'Awaiting Parts', 'Completed', 'Delivered']

const VAT_RATE = 0.18
const OBJECT_ID_RE = /^[0-9a-fA-F]{24}$/

const PARTS = [
  { id: 1, desc: 'Engine Oil 5W-30 (3L)', amount: 2400 },
  { id: 2, desc: 'Oil Filter (OEM)', amount: 850 },
  { id: 3, desc: 'AC Refrigerant R134a', amount: 1600 },
  { id: 4, desc: 'Labour — Full service (2h)', amount: 3000 },
]

const VEHICLE_INVENTORY_ITEMS = [
  { key: 'wheelBrace', label: 'Wheel Brace' },
  { key: 'spareWheel', label: 'Spare Wheel' },
  { key: 'jack', label: 'Jack' },
  { key: 'jackLever', label: 'Jack Lever' },
  { key: 'towingPin', label: 'Towing Pin' },
  { key: 'airPump', label: 'Air Pump' },
  { key: 'tireSealant', label: 'Tire Sealant' },
  { key: 'rubberCarpets', label: 'Rubber Carpets' },
  { key: 'fabricCarpets', label: 'Fabric Carpets' },
  { key: 'additionalCarpets', label: 'Additional Carpets' },
]

const TASKS = [
  { id: 1, label: 'Engine oil change (5W-30)', done: false },
  { id: 2, label: 'Oil filter replacement', done: false },
  { id: 3, label: 'AC gas top-up & filter clean', done: false },
  { id: 4, label: 'Engine diagnostics scan', done: false },
  { id: 5, label: 'Tyre pressure check', done: false },
]

// ── 5-Step Status Tracker ─────────────────────────────────────────────────────
const StatusTracker = ({ current, onChange }) => {
  const currentIdx = STATUS_STEPS.indexOf(current)
  return (
    <div className="flex items-center bg-white border border-slate-100 rounded-lg px-5 py-3 mb-5">
      {STATUS_STEPS.map((step, i) => {
        const isDone = i < currentIdx
        const isActive = i === currentIdx
        return (
          <React.Fragment key={step}>
            <button
              type="button"
              id={`jd-status-${step.toLowerCase().replace(/\s+/g, '-')}`}
              onClick={() => onChange(step)}
              className={`flex items-center gap-1.5 text-[11px] whitespace-nowrap transition-colors cursor-pointer
                ${isDone ? 'text-emerald-600' :
                  isActive ? 'text-brandBlue font-semibold' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <div className={`w-5 h-5 rounded-full border-[1.5px] flex items-center justify-center text-[9px] flex-shrink-0
                ${isDone ? 'bg-emerald-50 border-emerald-600' :
                  isActive ? 'bg-brandPale border-brandBlue' : 'border-slate-300'}`}
              >
                {isDone ? <IconCheck size={9} /> : i + 1}
              </div>
              {step}
            </button>
            {i < STATUS_STEPS.length - 1 && (
              <div className={`flex-1 h-px mx-2 min-w-[6px] ${i < currentIdx ? 'bg-emerald-300' : 'bg-slate-200'}`} />
            )}
          </React.Fragment>
        )
      })}
    </div>
  )
}

// ── Inventory Allocation Modal ─────────────────────────────────────────────────
const AddLineModal = ({ isOpen, onClose, onAdd, inventoryItems = [] }) => {
  const [type, setType] = useState('part')    // 'part' | 'labour'
  const [selected, setSelected] = useState('')
  const [qty, setQty] = useState('1')
  const [desc, setDesc] = useState('')
  const [price, setPrice] = useState('')

  const selectedItem = inventoryItems.find((i) => i.sku === selected)

  const handleAdd = () => {
    if (type === 'part' && selectedItem) {
      onAdd({
        desc: selectedItem.name,
        amount: selectedItem.price * Number(qty || 1),
        partId: selectedItem.id,
        quantity: Number(qty || 1)
      })
    } else if (type === 'labour' && desc && price) {
      onAdd({ desc, amount: Number(price) })
    }
    onClose()
    setSelected(''); setQty('1'); setDesc(''); setPrice('')
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Part or Labour"
      footer={
        <>
          <button className="btn-secondary" onClick={onClose} id="al-cancel-btn">Cancel</button>
          <button className="btn-primary" onClick={handleAdd} id="al-add-btn">
            <IconPlus size={14} /> Add Line
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {/* Type toggle */}
        <div className="flex rounded-lg border border-slate-200 overflow-hidden">
          {['part', 'labour'].map((t) => (
            <button
              key={t}
              type="button"
              id={`al-type-${t}`}
              onClick={() => setType(t)}
              className={`flex-1 py-2 text-[12px] font-semibold capitalize transition-colors ${type === t ? 'bg-brandBlue text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
                }`}
            >
              {t === 'part' ? 'Inventory Part' : 'Labour / Service'}
            </button>
          ))}
        </div>

        {type === 'part' ? (
          <>
            <SelectBox
              label="Select Part (SKU)"
              id="al-sku"
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              options={[{ value: '', label: '— choose item —' }, ...inventoryItems.map((i) => ({ value: i.sku, label: `${i.sku} — ${i.name}` }))]}
            />
            {selectedItem && (
              <div className="flex gap-3">
                <TextInput label="Unit Price (LKR)" id="al-unit" value={selectedItem.price.toLocaleString()} readOnly className="flex-1" />
                <TextInput label="Qty" id="al-qty" type="number" min="1" value={qty} onChange={(e) => setQty(e.target.value)} className="w-24" />
              </div>
            )}
            {selectedItem && (
              <div className="text-[12px] text-slate-600 font-medium">
                Line total: <span className="text-slate-800 font-bold">LKR {(selectedItem.price * Number(qty || 1)).toLocaleString()}</span>
              </div>
            )}
          </>
        ) : (
          <>
            <TextInput label="Description" id="al-labour-desc" placeholder="e.g. Labour — Brake replacement (1.5h)" value={desc} onChange={(e) => setDesc(e.target.value)} />
            <TextInput label="Amount (LKR)" id="al-labour-price" placeholder="e.g. 2500" value={price} onChange={(e) => setPrice(e.target.value)} type="number" min="0" />
          </>
        )}
      </div>
    </Modal>
  )
}

// ── Add Checklist Task Modal ───────────────────────────────────────────────────
const AddTaskModal = ({ isOpen, onClose, onAdd }) => {
  const [label, setLabel] = useState('')

  const handleAdd = () => {
    if (!label.trim()) return
    onAdd(label.trim())
    onClose()
    setLabel('')
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Checklist Task"
      footer={
        <>
          <button className="btn-secondary" onClick={onClose} id="at-cancel-btn">Cancel</button>
          <button className="btn-primary" onClick={handleAdd} id="at-add-btn">
            <IconPlus size={14} /> Add Task
          </button>
        </>
      }
    >
      <TextInput
        label="Task Description"
        id="at-label"
        placeholder="e.g. Replace cabin air filter"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
      />
    </Modal>
  )
}

// ── Main Job Card Detail ──────────────────────────────────────────────────────
export const JobCardDetails = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { toastSuccess, toastInfo, toastError } = useToast()
  const { user } = useAuth()

  const [jobDetails, setJobDetails] = useState(null)
  const [status, setStatus] = useState(null)
  const [tasks, setTasks] = useState(TASKS)
  const [parts, setParts] = useState(PARTS)
  const [showAdd, setShowAdd] = useState(false)
  const [showAddTask, setShowAddTask] = useState(false)
  const [inventoryItems, setInventoryItems] = useState(null)
  const [creatingInvoice, setCreatingInvoice] = useState(false)

  useEffect(() => {
    const fetchJobData = async () => {
      try {
        const [jobRes, invRes] = await Promise.all([
          getJobCard(id).catch(() => null),
          getInventory().catch((err) => { console.error('Inventory fetch failed:', err); return null })
        ])

        if (invRes && invRes.data) {
          const invList = Array.isArray(invRes.data)
            ? invRes.data
            : (Array.isArray(invRes.data.data) ? invRes.data.data : [])

          console.log(invList)

          if (invList.length > 0) {
            const mappedInv = invList.map(item => ({
              id: item._id,
              sku: item.sku,
              name: item.partName,
              price: item.unitPrice
            }))
            setInventoryItems(mappedInv)
          }
        }

        if (jobRes && jobRes.data) {
          const j = jobRes.data.data || jobRes.data
          const mappedTasks = Array.isArray(j.checklist) ? j.checklist.map((t, idx) => ({
            id: t._id || String(idx),
            label: t.task,
            done: t.isDone
          })) : TASKS

          const mappedParts = Array.isArray(j.partsAllocated) ? j.partsAllocated.map((p, idx) => ({
            id: p._id || String(idx),
            desc: p.partName || 'Allocated Part',
            amount: (p.unitPriceAtAllocation || 0) * (p.quantity || 1)
          })) : []

          const mappedLabor = Array.isArray(j.laborCharges) ? j.laborCharges.map((l, idx) => ({
            id: l._id || `labor-${idx}`,
            desc: l.description || 'Labour charge',
            amount: l.cost || 0
          })) : []

          const normalized = {
            title: `${j.jobCardNumber} - ${j.customerName} · ${j.vehicleRegNo}`,
            sub: `${j.serviceType || ''} · ${j.createdAt ? new Date(j.createdAt).toLocaleDateString() : 'Recent'}`,
            currentStatus: j.status || 'Open',
            details: {
              Customer: `${j.customerName}`,
              Vehicle: `${j.vehicleRegNo}`,
              Odometer: Number.isFinite(j.odometerReading) ? `${j.odometerReading.toLocaleString()} km` : '—',
              Issues: j.customerReportedIssues || 'No complaints logged',
              Advisor: `${j.serviceAdvisorId.name}`,
              Technician: j.assignedTechnician?.name || j.assignedTechnician || 'Unassigned',
            },
            tasks: mappedTasks,
            parts: [...mappedParts, ...mappedLabor],
            hasInvoice: !!j.hasInvoice,
            invoiceNumber: j.invoiceNumber || null,
            vehicleInventory: j.vehicleInventory || {},
            warningIndicators: j.warningIndicators || '',
            damageMarkers: Array.isArray(j.damageMarkers) ? j.damageMarkers : []
          }

          setJobDetails(normalized)
          setStatus(normalized.currentStatus)
          setTasks(normalized.tasks)
          setParts(normalized.parts)
        }

      } catch (err) {
        console.warn('API error fetching job card details, falling back to mocks', err)
      }
    }
    fetchJobData()
  }, [id])


  // Toggle task done state — persists the full checklist array per the backend contract
  const handleToggleTask = async (taskId) => {
    const taskItem = tasks.find((t) => t.id === taskId)
    if (!taskItem) return

    const updatedTasks = tasks.map((t) => t.id === taskId ? { ...t, done: !t.done } : t)
    const checklistPayload = updatedTasks.map((t) => ({
      ...(OBJECT_ID_RE.test(t.id) ? { _id: t.id } : {}),
      task: t.label,
      isDone: t.done
    }))

    try {
      await updateChecklist(id, checklistPayload)
      setTasks(updatedTasks)
      toastInfo('Task state updated.')
    } catch (err) {
      if (err.message?.startsWith('Network error') || err.message?.includes('refused')) {
        setTasks(updatedTasks)
        toastInfo('Task state updated (Mock Mode).')
      } else {
        toastError(err.message || 'Failed to toggle task.')
      }
    }
  }

  // Add a new checklist task — persists the full checklist array per the backend contract
  const addTask = async (label) => {
    const updatedTasks = [...tasks, { id: `new-${Date.now()}`, label, done: false }]
    const checklistPayload = updatedTasks.map((t) => ({
      ...(OBJECT_ID_RE.test(t.id) ? { _id: t.id } : {}),
      task: t.label,
      isDone: t.done
    }))

    try {
      await updateChecklist(id, checklistPayload)
      setTasks(updatedTasks)
      toastSuccess(`"${label}" added to checklist.`, 'Task Added')
    } catch (err) {
      if (err.message?.startsWith('Network error') || err.message?.includes('refused')) {
        setTasks(updatedTasks)
        toastSuccess(`"${label}" added to checklist (Mock Mode).`, 'Task Added')
      } else {
        toastError(err.message || 'Failed to add task.')
      }
    }
  }

  // Remove a line item
  const removePart = async (partId) => {
    try {
      await removeLineItem(id, partId)
      setParts((prev) => prev.filter((p) => p.id !== partId))
      toastInfo('Line item removed.')
    } catch (err) {
      if (err.message?.startsWith('Network error') || err.message?.includes('refused')) {
        setParts((prev) => prev.filter((p) => p.id !== partId))
        toastInfo('Line item removed (Mock Mode).')
      } else {
        toastError(err.message || 'Failed to remove line item.')
      }
    }
  }

  // Add a new line item — inventory parts go through allocation, labour/service
  // charges through the freeform labour endpoint (they have no partId).
  const addPart = async (line) => {
    try {
      let newId
      if (line.partId) {
        const res = await addLineItem(id, { partId: line.partId, quantity: line.quantity })
        const updatedParts = res.data?.data?.updatedJobCard?.partsAllocated
        newId = updatedParts?.[updatedParts.length - 1]?._id
      } else {
        const res = await addLaborCharge(id, { description: line.desc, cost: line.amount })
        const updatedLabor = res.data?.data?.laborCharges
        newId = updatedLabor?.[updatedLabor.length - 1]?._id
      }
      // Real backend id keeps the row removable without a page reload; Date.now()
      // is only a last-resort key if the response shape ever changes unexpectedly.
      setParts((prev) => [...prev, { ...line, id: newId || Date.now() }])
      toastSuccess(`"${line.desc}" added to ledger.`, 'Line Item Added')
    } catch (err) {
      if (err.message?.startsWith('Network error') || err.message?.includes('refused')) {
        setParts((prev) => [...prev, { ...line, id: Date.now() }])
        toastSuccess(`"${line.desc}" added to ledger (Mock Mode).`, 'Line Item Added')
      } else {
        toastError(err.message || 'Failed to add line item.')
      }
    }
  }

  // Handle status change with toast feedback
  // Create the invoice for this Job Card and hand off to the Billing page.
  // No mock-mode fallback here — Billing re-fetches from the server, so a fake
  // local "success" would just navigate to a page that can't show the invoice.
  const handleCreateInvoice = async () => {
    // Defense in depth — the button is disabled once hasInvoice is true, but
    // guard here too since the server is the ultimate source of truth anyway.
    if (jobDetails?.hasInvoice) {
      toastError(`An invoice (${jobDetails.invoiceNumber}) already exists for this job card.`)
      return
    }
    setCreatingInvoice(true)
    try {
      const res = await generateInvoiceFromJobCard(id)
      const invoice = res.data?.data || res.data
      setJobDetails((prev) => prev && { ...prev, hasInvoice: true, invoiceNumber: invoice.invoiceNumber })
      toastSuccess(`Invoice ${invoice.invoiceNumber} generated.`, 'Invoice Created')
      navigate('/billing')
    } catch (err) {
      toastError(err.message || 'Failed to create invoice.')
    } finally {
      setCreatingInvoice(false)
    }
  }

  const handleStatusChange = async (newStatus) => {
    try {
      await setJobCardStatus(id, newStatus)
      setStatus(newStatus)
      toastInfo(`Status updated to "${newStatus}".`)
    } catch (err) {
      if (err.message?.startsWith('Network error') || err.message?.includes('refused')) {
        setStatus(newStatus)
        toastInfo(`Status updated to "${newStatus}" (Mock Mode).`)
      } else {
        toastError(err.message || 'Failed to update status.')
      }
    }
  }

  // Financials
  const subtotal = parts.reduce((sum, p) => sum + p.amount, 0)
  const vat = Math.round(subtotal * VAT_RATE)
  const total = subtotal + vat

  const badgeVariant = (s) => {
    if (s === 'Completed') return 'success'
    if (s === 'In Progress' || s === 'Awaiting Parts') return 'warning'
    if (s === 'Open') return 'info'
    if (s === 'Delivered') return 'delivered'
    return 'default'
  }

  if (!jobDetails) {
    return <div className="text-slate-400 text-sm p-4">Loading job card…</div>
  }

  return (
    <div className="space-y-0">
      {/* Page Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="text-[17px] font-semibold text-slate-800">#{jobDetails.title}</div>
          <div className="text-[12px] text-slate-500 mt-0.5">{jobDetails.sub}</div>
        </div>
        <div className="flex gap-2">
          <button
            id="jd-back-btn"
            className="btn-secondary !h-8 !px-3 !text-xs flex items-center gap-1.5"
            onClick={() => navigate('/jobcards')}
          >
            <IconArrowLeft size={13} /> Back
          </button>
          <>
            <button
              id="jd-estimate-btn"
              className="btn-secondary !h-8 !px-3 !text-xs flex items-center gap-1.5"
              onClick={() => toastInfo('Estimate sent to customer via SMS/email.', 'Estimate Sent')}
            >
              <IconSend size={13} /> Send Estimate
            </button>
            <button
              id="jd-invoice-btn"
              type="button"
              disabled={creatingInvoice || jobDetails.hasInvoice}
              title={jobDetails.hasInvoice ? `Invoice ${jobDetails.invoiceNumber} already exists for this job card.` : undefined}
              className="btn-primary !h-8 !px-3 !text-xs flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handleCreateInvoice}
            >
              <IconReceipt size={13} />
              {creatingInvoice ? 'Creating…' : jobDetails.hasInvoice ? `Invoice Created (${jobDetails.invoiceNumber})` : 'Create Invoice'}
            </button>
          </>
        </div>
      </div>

      {/* 5-Step Status Tracker */}
      <StatusTracker current={status} onChange={handleStatusChange} />

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left: Job Details + Task Checklist */}
        <div className="bg-white border border-slate-100 rounded-lg p-4 space-y-4">
          {/* Details */}
          <div>
            <div className="text-[13px] font-semibold text-slate-800 mb-3">Job Details</div>
            <div className="space-y-2">
              {Object.entries(jobDetails.details).map(([label, value]) => (
                <div key={label} className="flex gap-2 items-start">
                  <span className="text-[11px] text-slate-500 w-[110px] flex-shrink-0 pt-0.5">{label}</span>
                  <span className="text-[12px] text-slate-800">{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Status badge in-context */}
          <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
            <span className="text-[11px] text-slate-500">Current Status</span>
            <Badge variant={badgeVariant(status)}>{status}</Badge>
          </div>

          {/* Task Checklist */}
          <div className="border-t border-slate-100 pt-4">
            <div className="text-[13px] font-semibold text-slate-800 mb-3">Task Checklist</div>
            <div className="space-y-1">
              {tasks.map((t) => (
                <button
                  key={t.id}
                  id={`jd-task-${t.id}`}
                  type="button"
                  onClick={() => handleToggleTask(t.id)}
                  className="w-full flex items-center gap-2.5 py-2 px-1 rounded-md hover:bg-slate-50 transition-colors text-left group"
                >
                  <div className={`w-4 h-4 rounded border-[1.5px] flex items-center justify-center flex-shrink-0 transition-colors ${t.done
                    ? 'bg-brandBlue border-brandBlue'
                    : 'border-slate-300 group-hover:border-brandBlue'
                    }`}>
                    {t.done && <IconCheck size={9} className="text-white" />}
                  </div>
                  <span className={`text-[12px] transition-colors ${t.done ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                    {t.label}
                  </span>
                </button>
              ))}
            </div>
            <button
              id="jd-add-task-btn"
              type="button"
              onClick={() => setShowAddTask(true)}
              className="flex items-center gap-1.5 text-[12px] text-brandBlue hover:text-brandLight font-medium transition-colors mt-1.5"
            >
              <IconPlus size={13} /> Add task
            </button>
            <div className="text-[11px] text-slate-400 mt-2">
              {tasks.filter((t) => t.done).length} of {tasks.length} tasks completed
            </div>
          </div>
        </div>

        {/* Right: Parts & Labour Ledger */}
        <div className="bg-white border border-slate-100 rounded-lg p-4 flex flex-col">
          <div className="text-[13px] font-semibold text-slate-800 mb-3">Parts &amp; Labour</div>

          {/* Line items */}
          <div className="flex-1">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider text-left py-2 border-b border-slate-100">Description</th>
                  <th className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider text-right py-2 border-b border-slate-100 w-28">Amount</th>
                  <th className="w-6 border-b border-slate-100" />
                </tr>
              </thead>
              <tbody>
                {parts.map((p) => (
                  <tr key={p.id} className="border-b border-slate-100 last:border-0 group">
                    <td className="py-2.5 text-[12px] text-slate-800">{p.desc}</td>
                    <td className="py-2.5 text-[12px] text-slate-800 text-right">LKR {p.amount.toLocaleString()}</td>
                    <td className="py-2.5 pl-2">
                      <button
                        type="button"
                        id={`jd-remove-${p.id}`}
                        onClick={() => removePart(p.id)}
                        className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition-all"
                      >
                        <IconX size={13} />
                      </button>
                    </td>
                  </tr>
                ))}

                {/* Add line */}
                <tr>
                  <td colSpan={3} className="py-2">
                    <button
                      id="jd-add-line-btn"
                      type="button"
                      onClick={() => setShowAdd(true)}
                      className="flex items-center gap-1.5 text-[12px] text-brandBlue hover:text-brandLight font-medium transition-colors"
                    >
                      <IconPlus size={13} /> Add part or labour
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Totals footer */}
          <div className="border-t border-slate-100 mt-3 pt-3 space-y-1.5">
            <div className="flex justify-between text-[12px] text-slate-500">
              <span>Subtotal</span>
              <span className="text-slate-800">LKR {subtotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-[12px] text-slate-500">
              <span>VAT (18%)</span>
              <span className="text-slate-800">LKR {vat.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-[14px] font-semibold text-slate-800 pt-1 border-t border-slate-100">
              <span>Estimated Total</span>
              <span>LKR {total.toLocaleString()}</span>
            </div>
          </div>

          {/* Approval status note */}
          <div className="mt-3">
            <Badge variant="warning">Awaiting customer approval</Badge>
          </div>
        </div>
      </div>

      {/* Vehicle Condition at Intake — inventory checklist + warning
          indicators + damage diagram, all captured at intake and read-only
          here (the record of the vehicle's state when it arrived). */}
      <div className="bg-white border border-slate-100 rounded-lg p-4 mt-4">
        <div className="text-[13px] font-semibold text-slate-800 mb-3">Vehicle Condition at Intake</div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Vehicle Inventory</div>
            <div className="space-y-1">
              {VEHICLE_INVENTORY_ITEMS.filter((item) => jobDetails.vehicleInventory[item.key]).map((item) => (
                <div key={item.key} className="flex items-center gap-2 text-[12px] text-slate-700">
                  <IconCheck size={12} className="text-emerald-600 flex-shrink-0" /> {item.label}
                </div>
              ))}
              {jobDetails.vehicleInventory.others && (
                <div className="text-[12px] text-slate-700">
                  <span className="text-slate-400">Others:</span> {jobDetails.vehicleInventory.others}
                </div>
              )}
              {!VEHICLE_INVENTORY_ITEMS.some((item) => jobDetails.vehicleInventory[item.key]) && !jobDetails.vehicleInventory.others && (
                <div className="text-[12px] text-slate-400">No items recorded.</div>
              )}
            </div>
            {jobDetails.warningIndicators && (
              <div className="mt-3">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Warning Indicators</div>
                <div className="text-[12px] text-amber-700 bg-amber-50 border border-amber-100 rounded-md px-2.5 py-1.5">{jobDetails.warningIndicators}</div>
              </div>
            )}
          </div>
          <div className="lg:col-span-2">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Damage Diagram</div>
            {jobDetails.damageMarkers.length > 0 ? (
              <CarDamageDiagram value={jobDetails.damageMarkers} onChange={() => {}} readOnly />
            ) : (
              <div className="text-[12px] text-slate-400">No damage marked at intake.</div>
            )}
          </div>
        </div>
      </div>

      {/* Inventory Allocation Modal */}
      <AddLineModal
        isOpen={showAdd}
        onClose={() => setShowAdd(false)}
        onAdd={addPart}
        inventoryItems={inventoryItems}
      />

      {/* Add Checklist Task Modal */}
      <AddTaskModal
        isOpen={showAddTask}
        onClose={() => setShowAddTask(false)}
        onAdd={addTask}
      />
    </div>
  )
}

export default JobCardDetails
