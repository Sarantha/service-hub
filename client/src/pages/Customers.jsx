import React, { useState, useEffect, useRef, useCallback } from 'react'
import { IconPlus, IconUser, IconSearch, IconX, IconCar, IconEdit, IconCheck, IconArrowsExchange } from '@tabler/icons-react'
import Modal from '../components/Modal'
import TextInput from '../components/TextInput'
import SelectBox from '../components/SelectBox'
import Badge from '../components/Badge'
import { useToast } from '../context/ToastContext'
import { getCustomers, createCustomer, updateCustomer, addVehicle, transferVehicleOwnership } from '../services/customersService'

const FILTER_OPTIONS = [
  { value: 'all',      label: 'All customers' },
  { value: 'active',   label: 'Active this month' },
  { value: 'no-visit', label: 'No recent visits' },
]

const FUEL_TYPES = ['Petrol', 'Diesel', 'Hybrid', 'Electric']

// ── Add Customer Modal ─────────────────────────────────────────────────────────
const AddCustomerModal = ({ isOpen, onClose, onSave }) => {
  const [form, setForm] = useState({
    firstName: '', lastName: '', phone: '', email: '', nicPassport: '',
    vehicleReg: '', vehicleMake: '', vehicleModel: '', vehicleYear: '', fuelType: 'Petrol', vehicleOdometer: ''
  })

  const set = (key) => (e) => {
    let val = e.target.value
    if (key === 'phone') {
      val = val.replace(/\D/g, '').slice(0, 10)
    } else if (key === 'vehicleReg') {
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

  const handleSubmit = (e) => {
    e.preventDefault()
    onSave(form)
    onClose()
    setForm({
      firstName: '', lastName: '', phone: '', email: '', nicPassport: '',
      vehicleReg: '', vehicleMake: '', vehicleModel: '', vehicleYear: '', fuelType: 'Petrol', vehicleOdometer: ''
    })
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add New Customer"
      footer={
        <>
          <button className="btn-secondary" onClick={onClose} id="cust-cancel-btn">Cancel</button>
          <button className="btn-primary" form="add-customer-form" type="submit" id="cust-save-btn">
            <IconUser size={14} /> Save Customer
          </button>
        </>
      }
    >
      <form id="add-customer-form" onSubmit={handleSubmit} className="space-y-4">
        <div>
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2.5 pb-1.5 border-b border-slate-100">
            Customer Details
          </p>
          <div className="grid grid-cols-2 gap-3">
            <TextInput label="First Name"      id="cust-firstname"  placeholder="e.g. Amara"    value={form.firstName}  onChange={set('firstName')}  required />
            <TextInput label="Last Name"       id="cust-lastname"   placeholder="e.g. Silva"    value={form.lastName}   onChange={set('lastName')}   required />
            <TextInput label="Phone Number"    id="cust-phone"      placeholder="e.g. 0771234567"     value={form.phone}      onChange={set('phone')}      required />
            <TextInput label="Email Address"   id="cust-email"      type="email" placeholder="amara@email.com" value={form.email} onChange={set('email')} />
            <TextInput label="NIC / Passport"  id="cust-nic"        placeholder="e.g. 198912345678"   value={form.nicPassport} onChange={set('nicPassport')} required />
          </div>
        </div>

        <div>
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2.5 pb-1.5 border-b border-slate-100">
            Primary Vehicle
          </p>
          <div className="grid grid-cols-2 gap-3">
            <TextInput label="Registration No." id="cust-vreg"   placeholder="e.g. CBS-8154"    value={form.vehicleReg}      onChange={set('vehicleReg')} required />
            <TextInput label="Vehicle Make"     id="cust-vmake"  placeholder="e.g. Toyota"      value={form.vehicleMake}     onChange={set('vehicleMake')} required />
            <TextInput label="Vehicle Model"    id="cust-vmodel" placeholder="e.g. Aqua"        value={form.vehicleModel}    onChange={set('vehicleModel')} required />
            <TextInput label="Year"             id="cust-vyear"  placeholder="e.g. 2019"        value={form.vehicleYear}     onChange={set('vehicleYear')} required />
            <TextInput label="Odometer (km)"    id="cust-vodo"   placeholder="e.g. 48200"       value={form.vehicleOdometer} onChange={set('vehicleOdometer')} required />
            <SelectBox label="Fuel Type"        id="cust-vfuel"  value={form.fuelType}          onChange={set('fuelType')}   options={FUEL_TYPES} required />
          </div>
        </div>
      </form>
    </Modal>
  )
}

// ── Add Vehicle Modal (register an additional vehicle for a customer) ─────────
const AddVehicleModal = ({ isOpen, onClose, onAdd }) => {
  const [form, setForm] = useState({ regNo: '', make: '', model: '', year: '', fuelType: 'Petrol', odometer: '' })

  const set = (key) => (e) => {
    let val = e.target.value
    if (key === 'regNo') {
      const rawValue = val.toUpperCase()
      const alphanumericClean = rawValue.replace(/[^A-Z0-9]/g, '')
      const letters = alphanumericClean.replace(/[0-9]/g, '').slice(0, 3)
      const numbers = alphanumericClean.replace(/[A-Z]/g, '').slice(0, 4)
      let formattedResult = letters
      if (letters.length === 3) {
        formattedResult += '-'
        if (numbers.length > 0) formattedResult += numbers
      }
      val = formattedResult
    }
    setForm((f) => ({ ...f, [key]: val }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    onAdd({
      regNo: form.regNo,
      make: form.make,
      model: form.model,
      year: Number(form.year) || 2020,
      fuelType: form.fuelType,
      odometer: Number(form.odometer) || 0,
    })
    setForm({ regNo: '', make: '', model: '', year: '', fuelType: 'Petrol', odometer: '' })
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Vehicle"
      footer={
        <>
          <button className="btn-secondary" onClick={onClose} id="avm-cancel-btn">Cancel</button>
          <button className="btn-primary" form="add-vehicle-form" type="submit" id="avm-save-btn">
            <IconCar size={14} /> Add Vehicle
          </button>
        </>
      }
    >
      <form id="add-vehicle-form" onSubmit={handleSubmit} className="grid grid-cols-2 gap-3">
        <TextInput label="Registration No." id="avm-reg"   placeholder="e.g. CBS-8154" value={form.regNo}   onChange={set('regNo')}   required />
        <TextInput label="Make"             id="avm-make"  placeholder="e.g. Toyota"   value={form.make}    onChange={set('make')}    required />
        <TextInput label="Model"            id="avm-model" placeholder="e.g. Aqua"     value={form.model}   onChange={set('model')}   required />
        <TextInput label="Year"             id="avm-year"  placeholder="e.g. 2019"     value={form.year}    onChange={set('year')}    required />
        <TextInput label="Odometer (km)"    id="avm-odo"   placeholder="e.g. 48200"    value={form.odometer} onChange={set('odometer')} required />
        <SelectBox label="Fuel Type"        id="avm-fuel"  value={form.fuelType}       onChange={set('fuelType')} options={FUEL_TYPES} required />
      </form>
    </Modal>
  )
}

// ── Transfer Ownership Modal (vehicle sold to a new owner) ─────────────────────
const TransferOwnershipModal = ({ isOpen, onClose, vehicle, onTransfer }) => {
  const [mode, setMode] = useState('existing') // 'existing' | 'new'
  const [searchPhone, setSearchPhone] = useState('')
  const [foundCustomer, setFoundCustomer] = useState(null)
  const [searching, setSearching] = useState(false)
  const [newOwner, setNewOwner] = useState({ firstName: '', lastName: '', phone: '', email: '', nicPassport: '' })

  if (!isOpen || !vehicle) return null

  const handleSearch = async () => {
    setSearching(true)
    setFoundCustomer(null)
    try {
      const res = await getCustomers({ search: searchPhone.trim() })
      const list = Array.isArray(res.data) ? res.data : (Array.isArray(res.data?.data) ? res.data.data : [])
      const match = list.find((c) => c.phone === searchPhone.trim())
      setFoundCustomer(match || null)
    } catch {
      setFoundCustomer(null)
    } finally {
      setSearching(false)
    }
  }

  const setNewOwnerField = (key) => (e) => {
    let val = e.target.value
    if (key === 'phone') val = val.replace(/\D/g, '').slice(0, 10)
    setNewOwner((f) => ({ ...f, [key]: val }))
  }

  const handleSubmit = () => {
    if (mode === 'existing') {
      if (!foundCustomer) return
      onTransfer({ customerId: foundCustomer._id || foundCustomer.id })
    } else {
      onTransfer(newOwner)
    }
  }

  const canSubmit = mode === 'existing'
    ? !!foundCustomer
    : !!(newOwner.firstName && newOwner.lastName && newOwner.phone && newOwner.nicPassport)

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Transfer Ownership — ${vehicle.regNo}`}
      footer={
        <>
          <button className="btn-secondary" onClick={onClose} id="tvo-cancel-btn">Cancel</button>
          <button
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleSubmit}
            disabled={!canSubmit}
            id="tvo-submit-btn"
          >
            <IconArrowsExchange size={14} /> Transfer Vehicle
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-[12px] text-slate-500">
          Move <span className="font-semibold text-slate-700">{vehicle.make} {vehicle.model} ({vehicle.regNo})</span> to a new owner — use this when the vehicle has been sold.
        </p>

        <div className="flex rounded-lg border border-slate-200 overflow-hidden">
          {['existing', 'new'].map((m) => (
            <button
              key={m}
              type="button"
              id={`tvo-mode-${m}`}
              onClick={() => setMode(m)}
              className={`flex-1 py-2 text-[12px] font-semibold transition-colors ${
                mode === m ? 'bg-brandBlue text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              {m === 'existing' ? 'Existing Customer' : 'New Customer'}
            </button>
          ))}
        </div>

        {mode === 'existing' ? (
          <div className="space-y-2">
            <div className="flex gap-2 items-end">
              <TextInput
                label="Search by Phone Number"
                id="tvo-search-phone"
                placeholder="e.g. 0771234567"
                value={searchPhone}
                onChange={(e) => { setSearchPhone(e.target.value.replace(/\D/g, '').slice(0, 10)); setFoundCustomer(null) }}
                className="flex-1"
              />
              <button
                type="button"
                id="tvo-search-btn"
                className="btn-secondary !h-[42px] disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleSearch}
                disabled={searching || !searchPhone}
              >
                {searching ? 'Searching…' : 'Find'}
              </button>
            </div>
            {foundCustomer && (
              <div id="tvo-found-customer" className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-[12px] text-emerald-800">
                Found: <span className="font-semibold">{foundCustomer.firstName} {foundCustomer.lastName}</span> · {foundCustomer.phone}
              </div>
            )}
            {!foundCustomer && searchPhone && !searching && (
              <div className="text-[11px] text-slate-400">
                No matching customer found for this phone number — switch to "New Customer" to register them.
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <TextInput label="First Name"     id="tvo-firstname" value={newOwner.firstName} onChange={setNewOwnerField('firstName')} required />
            <TextInput label="Last Name"      id="tvo-lastname"  value={newOwner.lastName}  onChange={setNewOwnerField('lastName')}  required />
            <TextInput label="Phone Number"   id="tvo-phone"     value={newOwner.phone}     onChange={setNewOwnerField('phone')}      required />
            <TextInput label="Email Address"  id="tvo-email"     type="email" value={newOwner.email} onChange={setNewOwnerField('email')} />
            <TextInput label="NIC / Passport" id="tvo-nic"       value={newOwner.nicPassport} onChange={setNewOwnerField('nicPassport')} required className="col-span-2" />
          </div>
        )}
      </div>
    </Modal>
  )
}

// ── Customer Details / Edit Modal ──────────────────────────────────────────────
const CustomerDetailsModal = ({ isOpen, onClose, customer, onSaved }) => {
  const { toastSuccess, toastError } = useToast()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(null)
  const [showAddVehicle, setShowAddVehicle] = useState(false)
  const [transferVehicle, setTransferVehicle] = useState(null)

  // Hydrate form from customer prop whenever modal opens
  useEffect(() => {
    if (customer) {
      setForm({
        firstName: customer.firstName || '',
        lastName:  customer.lastName  || '',
        phone:     customer.phone     || '',
        email:     customer.email     || '',
        nicPassport: customer.nicPassport || '',
        vehicles:  customer.vehicles  ? customer.vehicles.map(v => ({ ...v })) : [],
      })
      setShowAddVehicle(false)
      setTransferVehicle(null)
    }
  }, [customer])

  if (!isOpen || !form) return null

  const setField = (key) => (e) => {
    let val = e.target.value
    if (key === 'phone') {
      val = val.replace(/\D/g, '').slice(0, 10)
    }
    setForm(f => ({ ...f, [key]: val }))
  }

  const setVehicleField = (idx, key) => (e) => {
    let val = e.target.value
    if (key === 'regNo') {
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
    setForm(f => ({
      ...f,
      vehicles: f.vehicles.map((v, i) => i === idx ? { ...v, [key]: val } : v)
    }))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await updateCustomer(customer._id || customer.id, {
        firstName: form.firstName,
        lastName:  form.lastName,
        phone:     form.phone,
        email:     form.email,
        nicPassport: form.nicPassport,
        vehicles:  form.vehicles,
      })
      toastSuccess(`Customer "${form.firstName} ${form.lastName}" updated successfully.`, 'Profile Updated')
      onSaved()
      onClose()
    } catch (err) {
      toastError(err.message || 'Failed to update customer profile.')
    } finally {
      setSaving(false)
    }
  }

  // Register an additional vehicle for this customer — goes through the
  // dedicated endpoint (not the bulk profile save) so the backend's
  // cross-customer registration-number uniqueness check still applies.
  const handleAddVehicle = async (vehiclePayload) => {
    try {
      await addVehicle(customer._id || customer.id, vehiclePayload)
      toastSuccess(`Vehicle "${vehiclePayload.regNo}" added to ${form.firstName} ${form.lastName}.`, 'Vehicle Added')
      setForm((f) => ({ ...f, vehicles: [...f.vehicles, vehiclePayload] }))
      setShowAddVehicle(false)
      onSaved()
    } catch (err) {
      toastError(err.message || 'Failed to add vehicle.')
    }
  }

  // Move a vehicle to a new owner (e.g. it was sold).
  const handleTransfer = async (targetPayload) => {
    if (!transferVehicle) return
    try {
      await transferVehicleOwnership(transferVehicle.regNo, targetPayload)
      toastSuccess(`${transferVehicle.regNo} ownership transferred successfully.`, 'Vehicle Transferred')
      setForm((f) => ({ ...f, vehicles: f.vehicles.filter((v) => v.regNo !== transferVehicle.regNo) }))
      setTransferVehicle(null)
      onSaved()
    } catch (err) {
      toastError(err.message || 'Failed to transfer vehicle ownership.')
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Customer Profile & Vehicle Assets"
      className="!max-w-2xl"
      footer={
        <>
          <button
            id="cust-edit-cancel-btn"
            className="btn-secondary"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            id="cust-edit-save-btn"
            className="btn-primary flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleSave}
            disabled={saving}
          >
            {saving
              ? <><div className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" /> Saving…</>
              : <><IconCheck size={14} /> Save Changes</>
            }
          </button>
        </>
      }
    >
      <div className="space-y-5">
        {/* Customer Primary Data */}
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3 pb-1.5 border-b border-slate-100">
            Customer Primary Data
          </p>
          <div className="grid grid-cols-2 gap-3">
            <TextInput
              label="First Name"
              id="cedit-firstname"
              placeholder="First name"
              value={form.firstName}
              onChange={setField('firstName')}
              required
            />
            <TextInput
              label="Last Name"
              id="cedit-lastname"
              placeholder="Last name"
              value={form.lastName}
              onChange={setField('lastName')}
              required
            />
            <TextInput
              label="Phone Number"
              id="cedit-phone"
              placeholder="e.g. 0771234567"
              value={form.phone}
              onChange={setField('phone')}
              required
            />
            <TextInput
              label="Email Address"
              id="cedit-email"
              type="email"
              placeholder="customer@email.com"
              value={form.email || ''}
              onChange={setField('email')}
            />
            <TextInput
              label="NIC / Passport"
              id="cedit-nic"
              placeholder="e.g. 198912345678"
              value={form.nicPassport}
              onChange={setField('nicPassport')}
              required
            />
          </div>
        </div>

        {/* Vehicle Inventory */}
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3 pb-1.5 border-b border-slate-100 flex items-center gap-1.5">
            <IconCar size={12} />
            Vehicle Inventory Tracking
            <span className="ml-auto flex items-center gap-2">
              <span className="text-[10px] text-slate-300 normal-case font-normal">
                {form.vehicles.length} vehicle{form.vehicles.length !== 1 ? 's' : ''}
              </span>
              <button
                type="button"
                id="cedit-add-vehicle-btn"
                onClick={() => setShowAddVehicle(true)}
                className="text-[11px] text-brandBlue hover:text-brandLight font-semibold normal-case flex items-center gap-1 transition-colors"
              >
                <IconPlus size={11} /> Add Vehicle
              </button>
            </span>
          </p>

          {form.vehicles.length === 0 ? (
            <div className="text-center py-6 text-[12px] text-slate-400 border border-dashed border-slate-200 rounded-lg">
              No vehicles linked to this profile.
            </div>
          ) : (
            <div className="space-y-3">
              {form.vehicles.map((v, idx) => (
                <div
                  key={idx}
                  className="bg-slate-50 border border-slate-200 rounded-lg p-3"
                >
                  <div className="flex items-center justify-between mb-2.5">
                    <p className="text-[10px] font-semibold text-brandBlue">
                      Vehicle {idx + 1}
                    </p>
                    {v.regNo && (
                      <button
                        type="button"
                        id={`cedit-v${idx}-transfer-btn`}
                        onClick={() => setTransferVehicle(v)}
                        className="text-[10px] text-slate-500 hover:text-brandBlue font-semibold flex items-center gap-1 transition-colors"
                      >
                        <IconArrowsExchange size={11} /> Transfer Ownership
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    <TextInput
                      label="Reg No."
                      id={`cedit-v${idx}-reg`}
                      placeholder="e.g. CBS-8154"
                      value={v.regNo || ''}
                      onChange={setVehicleField(idx, 'regNo')}
                      required
                    />
                    <TextInput
                      label="Make"
                      id={`cedit-v${idx}-make`}
                      placeholder="e.g. Toyota"
                      value={v.make || ''}
                      onChange={setVehicleField(idx, 'make')}
                      required
                    />
                    <TextInput
                      label="Model"
                      id={`cedit-v${idx}-model`}
                      placeholder="e.g. Aqua"
                      value={v.model || ''}
                      onChange={setVehicleField(idx, 'model')}
                      required
                    />
                    <TextInput
                      label="Year"
                      id={`cedit-v${idx}-year`}
                      placeholder="e.g. 2019"
                      value={v.year || ''}
                      onChange={setVehicleField(idx, 'year')}
                      required
                    />
                    <TextInput
                      label="Odometer (km)"
                      id={`cedit-v${idx}-odo`}
                      placeholder="e.g. 48200"
                      value={v.odometer || ''}
                      onChange={setVehicleField(idx, 'odometer')}
                      required
                    />
                    <SelectBox
                      label="Fuel Type"
                      id={`cedit-v${idx}-fuel`}
                      value={v.fuelType || 'Petrol'}
                      onChange={setVehicleField(idx, 'fuelType')}
                      options={FUEL_TYPES}
                      required
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add Vehicle Modal (nested) */}
      <AddVehicleModal
        isOpen={showAddVehicle}
        onClose={() => setShowAddVehicle(false)}
        onAdd={handleAddVehicle}
      />

      {/* Transfer Ownership Modal (nested) */}
      <TransferOwnershipModal
        isOpen={!!transferVehicle}
        onClose={() => setTransferVehicle(null)}
        vehicle={transferVehicle}
        onTransfer={handleTransfer}
      />
    </Modal>
  )
}

// ── Main Customers Page ────────────────────────────────────────────────────────
export const Customers = () => {
  const { toastSuccess, toastError } = useToast()
  const [filter,           setFilter]           = useState('all')
  const [showAddModal,     setShowAddModal]     = useState(false)
  const [customers,        setCustomers]        = useState([])
  const [rawCustomers,     setRawCustomers]     = useState([])   // Full API objects for edit modal
  const [searchQuery,      setSearchQuery]      = useState('')
  const [isSearching,      setIsSearching]      = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [isDetailsOpen,    setIsDetailsOpen]    = useState(false)
  const debounceRef = useRef(null)
  const fetchSeqRef = useRef(0) // guards against out-of-order fetch responses clobbering newer ones

  // ── Fetch all or filtered customers
  const fetchCustomers = useCallback(async (regNoFilter = '') => {
    const seq = ++fetchSeqRef.current
    setIsSearching(true)
    try {
      const params = regNoFilter ? { regNo: regNoFilter } : {}
      const res = await getCustomers(params)
      if (seq !== fetchSeqRef.current) return // a newer request has since superseded this one
      if (res && res.data) {
        const list = Array.isArray(res.data) ? res.data : (Array.isArray(res.data.data) ? res.data.data : [])
        setRawCustomers(list)
        setCustomers(list.map(c => ({
          id:          c._id || c.id,
          _id:         c._id || c.id,
          firstName:   c.firstName,
          lastName:    c.lastName,
          name:        `${c.firstName} ${c.lastName}`,
          phone:       c.phone,
          email:       c.email || '',
          vehicles:    c.vehicles || [],
          vehicleCount: c.vehicles?.length || 0,
          lastVisit:   'Recent',
          outstanding: c.outstandingBalance > 0 ? `LKR ${c.outstandingBalance.toLocaleString()}` : null,
          filter:      'active',
        })))
      }
    } catch (err) {
      console.warn('API error fetching customers', err)
    } finally {
      if (seq === fetchSeqRef.current) setIsSearching(false)
    }
  }, [])

  useEffect(() => {
    fetchCustomers()
  }, [fetchCustomers])

  // ── Debounced server-side search on regNo input
  const handleSearchChange = (e) => {
    const val = e.target.value
    setSearchQuery(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      fetchCustomers(val.trim())
    }, 300)
  }

  const handleClearSearch = () => {
    setSearchQuery('')
    fetchCustomers('')
  }

  // ── Open edit modal
  const handleViewClick = (customer) => {
    setSelectedCustomer(customer)
    setIsDetailsOpen(true)
  }

  // ── Create new customer
  const handleCustomerSaved = async (form) => {
    const payload = {
      firstName: form.firstName,
      lastName:  form.lastName,
      phone:     form.phone,
      email:     form.email,
      nicPassport: form.nicPassport,
      vehicles:  form.vehicleReg ? [{
        regNo:    form.vehicleReg,
        make:     form.vehicleMake,
        model:    form.vehicleModel,
        year:     Number(form.vehicleYear) || 2020,
        fuelType: form.fuelType || 'Petrol',
        odometer: Number(form.vehicleOdometer) || 0,
      }] : []
    }

    try {
      await createCustomer(payload)
      toastSuccess(`Customer "${form.firstName} ${form.lastName}" profile created successfully.`, 'Customer Added')
      fetchCustomers(searchQuery)
    } catch (err) {
      if (err.message?.startsWith('Network error') || err.message?.includes('refused')) {
        toastSuccess(`Customer "${form.firstName} ${form.lastName}" profile created successfully (Mock Mode).`, 'Customer Added')
        setCustomers(prev => [...prev, {
          id: Date.now(), name: `${form.firstName} ${form.lastName}`, phone: form.phone,
          vehicleCount: form.vehicleReg ? 1 : 0, lastVisit: 'Today', outstanding: null, filter: 'active'
        }])
      } else {
        toastError(err.message || 'Failed to create customer.')
      }
    }
  }

  const filtered = customers.filter((c) => {
    if (filter === 'all') return true
    return c.filter === filter
  })

  return (
    <div className="space-y-[18px]">
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[17px] font-semibold text-slate-800">Customers &amp; Vehicles</div>
          <div className="text-[12px] text-slate-500 mt-0.5">Manage customer profiles and linked vehicles</div>
        </div>
        <button
          className="btn-primary !h-8 !px-3 !text-xs flex items-center gap-1.5"
          id="cust-add-btn"
          onClick={() => setShowAddModal(true)}
        >
          <IconPlus size={13} /> Add Customer
        </button>
      </div>

      {/* Search Bar + Filter Row */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Server-side reg search */}
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
            {isSearching
              ? <div className="w-3 h-3 rounded-full border-[1.5px] border-brandBlue border-t-transparent animate-spin" />
              : <IconSearch size={13} />
            }
          </div>
          <input
            id="cust-search"
            type="text"
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder="Search by vehicle reg no…"
            className="w-full h-8 pl-8 pr-8 text-[12px] bg-white border border-slate-200 rounded-md text-slate-700 placeholder-slate-400 focus:outline-none focus:border-brandBlue transition-all"
          />
          {searchQuery && (
            <button
              onClick={handleClearSearch}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <IconX size={12} />
            </button>
          )}
        </div>

        {/* Filter pills */}
        {FILTER_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            id={`cust-filter-${opt.value}`}
            onClick={() => setFilter(opt.value)}
            className={`h-8 px-3 text-[12px] rounded-md border transition-colors ${
              filter === opt.value
                ? 'bg-brandBlue text-white border-brandBlue font-medium'
                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
            }`}
          >
            {opt.label}
          </button>
        ))}
        <span className="ml-auto text-[11px] text-slate-400">
          {filtered.length} record{filtered.length !== 1 ? 's' : ''}
          {searchQuery && <span className="ml-1 text-brandBlue font-medium">· filtered</span>}
        </span>
      </div>

      {/* Customer Table */}
      <div className="bg-white border border-slate-100 rounded-lg w-full overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-slate-50/60">
              {['Customer', 'Phone', 'Vehicles', 'Last Visit', 'Outstanding', 'Action'].map((h) => (
                <th
                  key={h}
                  className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider text-left px-4 py-3 border-b border-slate-100"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-[13px] text-slate-400">
                  {searchQuery
                    ? `No customers found for reg "${searchQuery}".`
                    : 'No customers found for this filter.'
                  }
                </td>
              </tr>
            ) : (
              filtered.map((c) => (
                <tr
                  key={c.id}
                  className="hover:bg-slate-50/70 transition-colors border-b border-slate-100 last:border-0"
                >
                  <td className="px-4 py-3">
                    <span className="text-[13px] font-semibold text-slate-800">{c.name}</span>
                  </td>
                  <td className="px-4 py-3 text-[12px] text-slate-600">{c.phone}</td>
                  <td className="px-4 py-3 text-[12px] text-slate-600">
                    {c.vehicleCount} vehicle{c.vehicleCount !== 1 ? 's' : ''}
                  </td>
                  <td className="px-4 py-3 text-[12px] text-slate-600">{c.lastVisit}</td>
                  <td className="px-4 py-3">
                    {c.outstanding ? (
                      <Badge variant="danger" className="!text-[10px]">{c.outstanding}</Badge>
                    ) : (
                      <span className="text-[12px] text-emerald-600 font-medium">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      id={`cust-view-${c.id}`}
                      onClick={() => handleViewClick(c)}
                      className="h-[28px] px-3 inline-flex items-center gap-1 bg-white text-slate-600 text-xs font-semibold border border-slate-200 rounded-md hover:border-brandBlue hover:text-brandBlue transition-all"
                    >
                      <IconEdit size={11} /> View
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add Customer Modal */}
      <AddCustomerModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSave={handleCustomerSaved}
      />

      {/* Customer Details / Edit Modal */}
      <CustomerDetailsModal
        isOpen={isDetailsOpen}
        onClose={() => { setIsDetailsOpen(false); setSelectedCustomer(null) }}
        customer={selectedCustomer}
        onSaved={() => fetchCustomers(searchQuery)}
      />
    </div>
  )
}

export default Customers
