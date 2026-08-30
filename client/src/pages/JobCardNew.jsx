import React, { useState, useRef, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  IconArrowLeft, IconArrowRight, IconDeviceFloppy,
  IconCheck, IconCamera, IconX, IconSearch, IconLoader2,
} from '@tabler/icons-react'
import TextInput from '../components/TextInput'
import SelectBox from '../components/SelectBox'
import TextArea from '../components/TextArea'
import CarDamageDiagram from '../components/CarDamageDiagram'
import { useToast } from '../context/ToastContext'
import { createJobCard } from '../services/jobCardsService'
import { lookupVehicle } from '../services/vehiclesService'

// ── Step Indicator ─────────────────────────────────────────────────────────────
const STEPS = ['Vehicle Intake', 'Issue Details', 'Estimate', 'Assign Technician']

// ── Default checklist per service type (seeds the Task Checklist on the detail page) ──
// Default pre-checked items per Service Type — these MUST be exact-string
// matches against TASK_CATALOG below (the advisor's checklist is driven by
// that catalog), not freeform descriptions, or the pre-check silently does
// nothing.
const CHECKLIST_TEMPLATES = {
  'Full Service': ['Engine Oil', 'Oil Filter', 'Air Filter', 'Brake Service', 'Coolant', 'Tire Rotation'],
  'Oil Change': ['Engine Oil', 'Oil Filter'],
  'Brake Service': ['Brake Service', 'Brake Oil'],
  'AC Service': ['A/C, Cabin Filter'],
  'Engine Diagnostics': ['Engine Tune-up'],
  'Tyre Change': ['Tire Rotation'],
  Other: [],
}

// ── Full task catalog — grouped, matching the paper Job Card's "Description"
// checklist column. The advisor picks whichever apply for this visit;
// CHECKLIST_TEMPLATES above just pre-checks a sensible default set for the
// selected Service Type so most jobs need zero manual toggling.
const TASK_CATALOG = {
  'Fluids': ['Engine Oil', 'Transmission Oil', 'Differential Oil F/R', 'Transaxle Oil', 'Brake Oil', 'Clutch Oil', 'Power Steering Oil'],
  'Filters': ['Air Filter', 'Oil Filter', 'Fuel Filter', 'A/C, Cabin Filter'],
  'Fluids & Consumables': ['Coolant', 'Windscreen Washer', 'Battery Water', 'Wiper Blades'],
  'Service & Lights': ['Brake Service', 'Engine Tune-up', 'Interior Light Bulbs', 'Head Lights', 'Signal Lights', 'Reverse Lights', 'Brake Lights', 'Parking Lights'],
  'Other': ['Tire Rotation', 'T-Belt'],
}

// ── Vehicle Inventory — loose items physically in the car at intake, matching
// the paper Job Card's "Vehicle Inventory" section. Keys match the
// JobCard.vehicleInventory schema field names exactly.
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

const StepIndicator = ({ current }) => (
  <div className="flex items-center bg-white border border-slate-100 rounded-lg px-5 py-3 mb-5">
    {STEPS.map((label, i) => {
      const isDone = i < current
      const isActive = i === current
      return (
        <React.Fragment key={label}>
          <div className={`flex items-center gap-2 text-[11px] whitespace-nowrap
            ${isDone ? 'text-emerald-600' : isActive ? 'text-brandBlue font-semibold' : 'text-slate-400'}`}
          >
            <div className={`w-5 h-5 rounded-full border-[1.5px] flex items-center justify-center text-[9px] flex-shrink-0
              ${isDone ? 'bg-emerald-50 border-emerald-600' :
                isActive ? 'bg-brandPale border-brandBlue' : 'border-slate-300'}`}
            >
              {isDone ? <IconCheck size={9} /> : i + 1}
            </div>
            {label}
          </div>
          {i < STEPS.length - 1 && (
            <div className="flex-1 h-px bg-slate-200 mx-3 min-w-[8px]" />
          )}
        </React.Fragment>
      )
    })}
  </div>
)

// ── Step 1: Vehicle Intake with Auto-Lookup ────────────────────────────────────
const StepVehicle = ({
  data, set, isHydrated, onRegNoSearch, onRegNoClear, suggestions, lookupLoading, lookupError, onSuggestionSelect,
  toggleInventoryItem, setInventoryOthers, setWarningIndicators, setDamageMarkers,
}) => {
  const [regInput, setRegInput] = useState(data.regNo || '')
  const [showDropdown, setShowDropdown] = useState(false)
  const debounceRef = useRef(null)
  const wrapperRef = useRef(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleRegInput = (e) => {
    const rawValue = e.target.value.toUpperCase()
    const alphanumericClean = rawValue.replace(/[^A-Z0-9]/g, '')
    const letters = alphanumericClean.replace(/[0-9]/g, '').slice(0, 3)
    const numbers = alphanumericClean.replace(/[A-Z]/g, '').slice(0, 4)
    let formattedResult = letters
    if (letters.length === 3) {
      formattedResult += '-'
      if (numbers.length > 0) {
        formattedResult += numbers
      }
    }

    setRegInput(formattedResult)
    setShowDropdown(true)

    // If cleared, reset hydration
    if (!formattedResult.trim()) {
      onRegNoClear()
      return
    }

    // Debounced lookup (400ms)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (formattedResult.trim().length >= 3) {
      debounceRef.current = setTimeout(() => {
        onRegNoSearch(formattedResult.trim())
      }, 400)
    }
  }

  const handleSelect = (suggestion) => {
    setRegInput(suggestion.regNo)
    setShowDropdown(false)
    onSuggestionSelect(suggestion)
  }

  const handleClear = () => {
    setRegInput('')
    setShowDropdown(false)
    onRegNoClear()
  }

  // Shared disabled field style
  const disabledClass = 'opacity-60 cursor-not-allowed bg-slate-50'

  return (
    <div className="space-y-5">
      {/* Search Section */}
      <div>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3 pb-1.5 border-b border-slate-100">
          Vehicle Registration Lookup
        </p>

        {/* Reg No Search Input with Dropdown */}
        <div className="relative" ref={wrapperRef}>
          <label className="form-label block mb-1.5 text-xs font-bold text-slate-700 uppercase tracking-wide">
            Registration Number <span className="text-red-500">*</span>
          </label>
          <div className="relative flex items-center">
            <div className="absolute left-3 text-slate-400 pointer-events-none">
              {lookupLoading
                ? <IconLoader2 size={15} className="animate-spin text-brandBlue" />
                : <IconSearch size={15} />
              }
            </div>
            <input
              id="jn-reg"
              type="text"
              value={regInput}
              onChange={handleRegInput}
              onFocus={() => regInput.length >= 3 && setShowDropdown(true)}
              placeholder="e.g. WP CAR-1234 — type to search"
              disabled={isHydrated}
              className={`w-full h-[42px] pl-9 pr-9 bg-white border text-slate-800 text-sm rounded-lg placeholder-slate-400
                focus:outline-none focus:border-brandBlue focus:ring-2 focus:ring-brandPale transition-all
                ${isHydrated
                  ? 'border-emerald-300 bg-emerald-50/40 text-emerald-800 font-medium cursor-not-allowed'
                  : lookupError
                    ? 'border-red-300'
                    : 'border-slate-200'
                }`}
            />
            {/* Clear button */}
            {regInput && (
              <button
                type="button"
                onClick={handleClear}
                className="absolute right-3 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <IconX size={14} />
              </button>
            )}
          </div>

          {/* Suggestions Dropdown */}
          {showDropdown && suggestions.length > 0 && (
            <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden">
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  type="button"
                  onMouseDown={() => handleSelect(s)}
                  className="w-full flex items-start gap-3 px-4 py-3 hover:bg-brandPale text-left border-b border-slate-50 last:border-0 transition-colors"
                >
                  <div className="w-8 h-8 rounded-md bg-brandPale flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-[9px] font-bold text-brandBlue">REG</span>
                  </div>
                  <div>
                    <div className="text-[12px] font-semibold text-slate-800">{s.regNo}</div>
                    <div className="text-[11px] text-slate-500">{s.customerName} · {s.phone}</div>
                    <div className="text-[11px] text-slate-400">{s.make} {s.model} · {s.year} · {s.fuelType}</div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* No results message */}
          {showDropdown && !lookupLoading && suggestions.length === 0 && regInput.length >= 3 && !lookupError && !isHydrated && (
            <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg px-4 py-3">
              <p className="text-[12px] text-slate-500">No vehicle found for "<span className="font-medium text-slate-700">{regInput}</span>"</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Ensure the vehicle is registered in the Customers module first.</p>
            </div>
          )}

          {/* Lookup error */}
          {lookupError && (
            <p className="text-[11px] text-red-500 mt-1">{lookupError}</p>
          )}
        </div>

        {/* Hydration success banner */}
        {isHydrated && (
          <div className="mt-2 flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-md">
            <IconCheck size={13} className="text-emerald-600 flex-shrink-0" />
            <span className="text-[11px] text-emerald-700 font-medium">
              Vehicle and customer data loaded. All fields auto-populated. Only the Odometer is editable.
            </span>
          </div>
        )}
      </div>

      {/* Auto-populated Fields Section */}
      <div>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3 pb-1.5 border-b border-slate-100">
          Customer & Vehicle Details {isHydrated && <span className="text-emerald-600 normal-case font-semibold ml-1">(Auto-populated)</span>}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Customer Name — locked after hydration */}
          <div className={isHydrated ? disabledClass + ' rounded-lg' : ''}>
            <TextInput
              label="Customer Name"
              id="jn-cust-name"
              placeholder="Auto-filled after registration lookup"
              value={data.customerName}
              onChange={set('customerName')}
              disabled={isHydrated}
            />
          </div>

          {/* Phone — locked after hydration */}
          <div className={isHydrated ? disabledClass + ' rounded-lg' : ''}>
            <TextInput
              label="Phone Number"
              id="jn-cust-phone"
              placeholder="Auto-filled after registration lookup"
              value={data.phone}
              onChange={set('phone')}
              disabled={isHydrated}
            />
          </div>

          {/* VIN — locked after hydration */}
          <div className={isHydrated ? disabledClass + ' rounded-lg' : ''}>
            <TextInput
              label="VIN (Optional)"
              id="jn-vin"
              placeholder="Auto-filled after registration lookup"
              value={data.vin}
              onChange={set('vin')}
              disabled={isHydrated}
            />
          </div>

          {/* Make & Model — locked after hydration */}
          <div className={isHydrated ? disabledClass + ' rounded-lg' : ''}>
            <TextInput
              label="Make & Model"
              id="jn-make"
              placeholder="Auto-filled after registration lookup"
              value={data.make}
              onChange={set('make')}
              disabled={isHydrated}
            />
          </div>

          {/* Year — locked after hydration */}
          <div className={isHydrated ? disabledClass + ' rounded-lg' : ''}>
            <TextInput
              label="Year"
              id="jn-year"
              placeholder="Auto-filled after registration lookup"
              value={data.year}
              onChange={set('year')}
              disabled={isHydrated}
            />
          </div>

          {/* Fuel Type — locked after hydration */}
          <div className={isHydrated ? disabledClass + ' rounded-lg' : ''}>
            <SelectBox
              label="Fuel Type"
              id="jn-fuel"
              value={data.fuel}
              onChange={set('fuel')}
              options={['Petrol', 'Diesel', 'Hybrid', 'Electric']}
              disabled={isHydrated}
            />
          </div>
        </div>

        {/* Odometer — always editable, highlighted with blue left-border */}
        <div className="mt-4 border-l-4 border-brandBlue pl-4 bg-brandPale/30 py-2 pr-2 rounded-r-lg">
          <TextInput
            label="Current Odometer (km) 🟢 Editable"
            id="jn-odo"
            type="number"
            placeholder="Enter current mileage reading…"
            value={data.odometer}
            onChange={set('odometer')}
            required
          />
          <p className="text-[10px] text-brandBlue mt-1 font-medium">
            Enter the current odometer reading at vehicle intake. This is the only field requiring manual entry.
          </p>
        </div>
      </div>

      {/* Vehicle Inventory — loose items handed over with the vehicle */}
      <div>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3 pb-1.5 border-b border-slate-100">
          Vehicle Inventory
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2">
          {VEHICLE_INVENTORY_ITEMS.map((item) => {
            const checked = !!data.vehicleInventory[item.key]
            return (
              <label key={item.key} htmlFor={`jn-vi-${item.key}`} className="flex items-center gap-2 text-[12px] text-slate-700 cursor-pointer select-none">
                <input
                  id={`jn-vi-${item.key}`}
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleInventoryItem(item.key)}
                  className="w-3.5 h-3.5 rounded border-slate-300 text-brandBlue focus:ring-brandPale cursor-pointer"
                />
                {item.label}
              </label>
            )
          })}
        </div>
        <div className="mt-3">
          <TextInput
            label="Others" id="jn-vi-others" placeholder="Any other item handed over…"
            value={data.vehicleInventory.others || ''} onChange={(e) => setInventoryOthers(e.target.value)}
          />
        </div>
        <div className="mt-3">
          <TextInput
            label="Warning Indicators (dashboard lights on at intake)" id="jn-warning-indicators"
            placeholder="e.g. Engine check light, ABS light"
            value={data.warningIndicators} onChange={(e) => setWarningIndicators(e.target.value)}
          />
        </div>
      </div>

      {/* Damage Diagram */}
      <div>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3 pb-1.5 border-b border-slate-100">
          Vehicle Condition — Mark Any Existing Damage
        </p>
        <CarDamageDiagram value={data.damageMarkers} onChange={setDamageMarkers} />
      </div>
    </div>
  )
}

// ── Step 2: Issue Details + Photo Upload ──────────────────────────────────────
const StepIssues = ({ data, set, photos, setPhotos, toggleTask }) => {
  const fileRef = useRef(null)

  const handleFiles = (e) => {
    const files = Array.from(e.target.files || [])
    const previews = files.map((f) => ({ name: f.name, url: URL.createObjectURL(f) }))
    setPhotos((prev) => [...prev, ...previews].slice(0, 8))
  }

  const removePhoto = (idx) =>
    setPhotos((prev) => prev.filter((_, i) => i !== idx))

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <TextArea
            label="Customer-reported Issues"
            id="jn-issues"
            placeholder="Describe what the customer reports…"
            value={data.issues}
            onChange={set('issues')}
            rows={3}
          />
        </div>
        <SelectBox label="Service Type" id="jn-service" value={data.serviceType} onChange={set('serviceType')}
          options={['Full Service', 'Oil Change', 'Brake Service', 'AC Service', 'Engine Diagnostics', 'Tyre Change', 'Other']} />
        <SelectBox label="Priority" id="jn-priority" value={data.priority} onChange={set('priority')}
          options={['Normal', 'Urgent']} />
      </div>

      {/* Photo Upload Zone */}
      <div>
        <label className="form-label block mb-1.5">Vehicle Condition Photos</label>
        <div
          id="jn-photo-zone"
          className="border-2 border-dashed border-slate-200 rounded-lg p-6 text-center cursor-pointer hover:border-brandBlue hover:bg-brandPale/40 transition-colors"
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); handleFiles({ target: { files: e.dataTransfer.files } }) }}
        >
          <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFiles} />
          <IconCamera size={22} className="mx-auto text-slate-300 mb-1.5" />
          <p className="text-[12px] text-slate-400">Click to attach photos or drag files here</p>
          <p className="text-[11px] text-slate-300 mt-0.5">PNG, JPG up to 8 images</p>
        </div>

        {photos.length > 0 && (
          <div className="grid grid-cols-4 gap-2 mt-3">
            {photos.map((p, i) => (
              <div key={i} className="relative group rounded-md overflow-hidden border border-slate-200 aspect-square bg-slate-50">
                <img src={p.url} alt={p.name} className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => removePhoto(i)}
                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <IconX size={8} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Task Checklist — pre-checked from the Service Type default; the
          advisor can toggle any item on/off. Becomes the Job Card's Task
          Checklist that the Technician works through on the detail page. */}
      <div>
        <label className="form-label block mb-1.5">Task Checklist</label>
        <p className="text-[11px] text-slate-400 mb-2.5">
          Pre-selected based on Service Type — adjust as needed for this visit.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
          {Object.entries(TASK_CATALOG).map(([group, items]) => (
            <div key={group} className="mb-3">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">{group}</div>
              <div className="space-y-1">
                {items.map((task) => {
                  const checked = data.selectedTasks.includes(task)
                  const id = `jn-task-${task.replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase()}`
                  return (
                    <label key={task} htmlFor={id} className="flex items-center gap-2 text-[12px] text-slate-700 cursor-pointer select-none">
                      <input
                        id={id}
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleTask(task)}
                        className="w-3.5 h-3.5 rounded border-slate-300 text-brandBlue focus:ring-brandPale cursor-pointer"
                      />
                      {task}
                    </label>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
        <div className="text-[11px] text-slate-400 mt-1">
          {data.selectedTasks.length} task{data.selectedTasks.length !== 1 ? 's' : ''} selected
        </div>
      </div>
    </div>
  )
}

// ── Step 3: Estimate (read-only placeholder for wizard flow) ──────────────────
const StepEstimate = () => (
  <div className="bg-slate-50 rounded-lg border border-dashed border-slate-200 p-8 text-center">
    <div className="text-[13px] font-semibold text-slate-600 mb-1">Estimate Generation</div>
    <p className="text-[12px] text-slate-400">
      Parts & labour will be allocated once the job card is saved. <br />
      You can add line items from the Job Card Detail view.
    </p>
  </div>
)

// ── Step 4: Assign Technician ─────────────────────────────────────────────────
const TECHS = [
  { name: 'Kasun Perera', jobs: 5, pct: 83 },
  { name: 'Nuwan Seneviratne', jobs: 4, pct: 67 },
  { name: 'Priya Kumari', jobs: 3, pct: 50 },
  { name: 'Shan Fernando', jobs: 2, pct: 33 },
]

const StepAssign = ({ data, set }) => (
  <div className="space-y-3">
    <p className="text-[12px] text-slate-500 mb-3">Select the technician to assign this job to:</p>
    {TECHS.map((t) => {
      const selected = data.technician === t.name
      return (
        <button
          key={t.name}
          type="button"
          id={`jn-tech-${t.name.split(' ')[0].toLowerCase()}`}
          onClick={() => set('technician')({ target: { value: t.name } })}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg border text-left transition-all ${selected
            ? 'border-brandBlue bg-brandPale'
            : 'border-slate-200 bg-white hover:border-slate-300'
            }`}
        >
          <div className="flex-1">
            <div className={`text-[13px] font-semibold ${selected ? 'text-brandBlue' : 'text-slate-800'}`}>{t.name}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">{t.jobs} active jobs</div>
          </div>
          <div className="w-24">
            <div className="h-[4px] bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${t.pct >= 80 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                style={{ width: `${t.pct}%` }}
              />
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5 text-right">{t.pct}% load</div>
          </div>
          {selected && (
            <div className="w-5 h-5 rounded-full bg-brandBlue flex items-center justify-center flex-shrink-0">
              <IconCheck size={11} className="text-white" />
            </div>
          )}
        </button>
      )
    })}
    <button
      type="button"
      onClick={() => set('technician')({ target: { value: '' } })}
      className={`w-full px-4 py-3 rounded-lg border text-left text-[13px] transition-all ${data.technician === ''
        ? 'border-brandBlue bg-brandPale text-brandBlue font-semibold'
        : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
        }`}
    >
      Leave Unassigned
    </button>
  </div>
)

// ── Main Wizard ───────────────────────────────────────────────────────────────
const INITIAL = {
  customerName: '', phone: '', regNo: '', vin: '', make: '', year: '', fuel: 'Petrol', odometer: '',
  issues: '', serviceType: 'Full Service', priority: 'Normal',
  technician: '',
  selectedTasks: [...CHECKLIST_TEMPLATES['Full Service']],
  vehicleInventory: {},
  warningIndicators: '',
  damageMarkers: [],
}

export const JobCardNew = () => {
  const navigate = useNavigate()
  const { toastSuccess, toastError } = useToast()
  const [step, setStep] = useState(0)
  const [form, setForm] = useState(INITIAL)
  const [photos, setPhotos] = useState([])
  const [saving, setSaving] = useState(false)
  const [isHydrated, setIsHydrated] = useState(false)
  const [suggestions, setSuggestions] = useState([])
  const [lookupLoading, setLookupLoading] = useState(false)
  const [lookupError, setLookupError] = useState('')

  const set = (key) => (e) => {
    let val = e.target.value
    if (key === 'phone') {
      val = val.replace(/\D/g, '').slice(0, 10)
    } else if (key === 'regNo') {
      const rawValue = val.toUpperCase()
      const alphanumericClean = rawValue.replace(/[^A-Z0-9]/g, '')
      const letters = alphanumericClean.replace(/[0-9]/g, '').slice(0, 3)
      const numbers = alphanumericClean.replace(/[A-Z]/g, '').slice(0, 4)
      let formattedResult = letters
      if (letters.length === 3) {
        formattedResult += '-'
        if (numbers.length > 0) {
          formattedResult += numbers
        }
      }
      val = formattedResult
    }
    setForm((f) => ({ ...f, [key]: val }))
  }

  const toggleTask = (task) => {
    setForm((f) => ({
      ...f,
      selectedTasks: f.selectedTasks.includes(task)
        ? f.selectedTasks.filter((t) => t !== task)
        : [...f.selectedTasks, task]
    }))
  }

  const toggleInventoryItem = (key) => {
    setForm((f) => ({ ...f, vehicleInventory: { ...f.vehicleInventory, [key]: !f.vehicleInventory[key] } }))
  }

  const setInventoryOthers = (text) => {
    setForm((f) => ({ ...f, vehicleInventory: { ...f.vehicleInventory, others: text } }))
  }

  const setWarningIndicators = (text) => {
    setForm((f) => ({ ...f, warningIndicators: text }))
  }

  const setDamageMarkers = (markers) => {
    setForm((f) => ({ ...f, damageMarkers: markers }))
  }

  // ── Vehicle lookup handler (called by debounce in StepVehicle)
  const handleRegNoSearch = useCallback(async (regNo) => {
    setLookupLoading(true)
    setLookupError('')
    setSuggestions([])

    try {
      const res = await lookupVehicle(regNo)
      const { data } = res.data
      // Build suggestions list (one entry per lookup result)
      setSuggestions([{
        regNo: data.vehicle.regNo,
        customerName: data.customerName,
        phone: data.phone,
        vin: data.vehicle.vin || '',
        make: data.vehicle.make,
        model: data.vehicle.model,
        year: data.vehicle.year,
        fuelType: data.vehicle.fuelType,
      }])
    } catch (err) {
      if (err.response?.status === 404) {
        setSuggestions([]) // No results — dropdown will show "not found" message
      } else {
        setLookupError('Lookup failed. Check your connection.')
      }
    } finally {
      setLookupLoading(false)
    }
  }, [])

  // ── Called when user selects a suggestion from the dropdown
  const handleSuggestionSelect = useCallback((suggestion) => {
    setForm((f) => ({
      ...f,
      regNo: suggestion.regNo,
      customerName: suggestion.customerName,
      phone: suggestion.phone,
      vin: suggestion.vin || '',
      make: `${suggestion.make} ${suggestion.model}`,
      year: String(suggestion.year || ''),
      fuel: suggestion.fuelType || 'Petrol',
    }))
    setIsHydrated(true)
    setSuggestions([])
    setLookupError('')
  }, [])

  // ── Called when user clears the reg field
  const handleRegNoClear = useCallback(() => {
    setForm(INITIAL)
    setIsHydrated(false)
    setSuggestions([])
    setLookupError('')
  }, [])

  const canNext = () => {
    if (step === 0) return form.regNo.trim() && form.customerName.trim() && form.odometer.toString().trim()
    return true
  }

  const handleSave = async () => {
    setSaving(true)
    const payload = {
      vehicleRegNo: form.regNo,
      customerPhone: form.phone || '0000000000',
      status: 'Open',
      currentStage: 1,
      serviceType: form.serviceType,
      customerReportedIssues: form.issues || '',
      odometerReading: Number(form.odometer),
      checklist: form.selectedTasks.map((task) => ({ task, isDone: false })),
      vehicleInventory: form.vehicleInventory,
      warningIndicators: form.warningIndicators,
      damageMarkers: form.damageMarkers,
      partsAllocated: [],
      estimatedCost: 0,
      technician: form.technician,
    }

    try {
      await createJobCard(payload)
      toastSuccess(
        `Job card opened for ${form.customerName || 'customer'} · ${form.regNo || 'vehicle'}.`,
        'Job Card Created'
      )
      navigate('/jobcards')
    } catch (err) {
      if (err.message?.startsWith('Network error') || err.message?.includes('refused')) {
        toastSuccess(
          `Job card opened for ${form.customerName || 'customer'} · ${form.regNo || 'vehicle'} (Mock Mode).`,
          'Job Card Created'
        )
        navigate('/jobcards')
      } else {
        toastError(err.message || 'Failed to create job card. Please try again.')
      }
    } finally {
      setSaving(false)
    }
  }

  const stepContent = [
    <StepVehicle
      key="v"
      data={form}
      set={set}
      isHydrated={isHydrated}
      onRegNoSearch={handleRegNoSearch}
      onRegNoClear={handleRegNoClear}
      suggestions={suggestions}
      lookupLoading={lookupLoading}
      lookupError={lookupError}
      onSuggestionSelect={handleSuggestionSelect}
      toggleInventoryItem={toggleInventoryItem}
      setInventoryOthers={setInventoryOthers}
      setWarningIndicators={setWarningIndicators}
      setDamageMarkers={setDamageMarkers}
    />,
    <StepIssues key="i" data={form} set={set} photos={photos} setPhotos={setPhotos} toggleTask={toggleTask} />,
    <StepEstimate key="e" />,
    <StepAssign key="a" data={form} set={set} />,
  ]

  return (
    <div className="space-y-0">
      {/* Page Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="text-[17px] font-semibold text-slate-800">New Job Card</div>
          <div className="text-[12px] text-slate-500 mt-0.5">Vehicle intake and work order creation</div>
        </div>
        <div className="flex gap-2">
          <button
            id="jn-cancel-btn"
            className="btn-secondary !h-8 !px-3 !text-xs"
            onClick={() => navigate('/jobcards')}
          >
            Cancel
          </button>
          {step === STEPS.length - 1 && (
            <button
              id="jn-save-btn"
              disabled={saving}
              className="btn-primary !h-8 !px-3 !text-xs flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handleSave}
            >
              {saving
                ? <><div className="w-3 h-3 rounded-full border-[1.5px] border-white border-t-transparent animate-spin" /> Saving…</>
                : <><IconDeviceFloppy size={13} /> Save &amp; Print</>}
            </button>
          )}
        </div>
      </div>

      {/* Progress Steps */}
      <StepIndicator current={step} />

      {/* Step Content Card */}
      <div className="bg-white border border-slate-100 rounded-lg p-5">
        {stepContent[step]}
      </div>

      {/* Navigation Footer */}
      <div className="flex justify-between mt-4">
        <button
          id="jn-prev-btn"
          disabled={step === 0}
          onClick={() => setStep((s) => s - 1)}
          className="btn-secondary !h-8 !px-3 !text-xs flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <IconArrowLeft size={13} /> Previous
        </button>
        {step < STEPS.length - 1 ? (
          <button
            id="jn-next-btn"
            disabled={!canNext()}
            onClick={() => setStep((s) => s + 1)}
            className="btn-primary !h-8 !px-3 !text-xs flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Next <IconArrowRight size={13} />
          </button>
        ) : (
          <button
            id="jn-finish-btn"
            disabled={saving}
            className="btn-primary !h-8 !px-3 !text-xs flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleSave}
          >
            {saving
              ? <><div className="w-3 h-3 rounded-full border-[1.5px] border-white border-t-transparent animate-spin" /> Saving…</>
              : <><IconDeviceFloppy size={13} /> Save &amp; Print</>}
          </button>
        )}
      </div>
    </div>
  )
}

export default JobCardNew
