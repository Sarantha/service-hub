import React, { useState, useEffect } from 'react'
import {
  IconDeviceFloppy, IconBuilding, IconUsers,
  IconBell, IconReceipt, IconPlus, IconCheck, IconCalendarEvent,
  IconCopy, IconShieldLock, IconTrash, IconRotate,
} from '@tabler/icons-react'
import TextInput from '../components/TextInput'
import SelectBox from '../components/SelectBox'
import TextArea from '../components/TextArea'
import Checkbox from '../components/Checkbox'
import Modal from '../components/Modal'
import Badge from '../components/Badge'
import { useToast } from '../context/ToastContext'
import { useAuth } from '../context/AuthContext'
import { getSettings, updateSettings } from '../services/settingsService'
import { getUsers, createUser, updateUser, deleteUser } from '../services/usersService'
import { createBranch, deactivateBranch, activateBranch } from '../services/branchService'

const ROLES = ['Super Admin', 'Service Advisor', 'Technician']
const PAYMENT_METHODS = ['Cash', 'Card', 'Online']

// ── Toggle Row ────────────────────────────────────────────────────────────────
const ToggleRow = ({ label, id, checked, onChange, disabled }) => (
  <div className="flex items-center justify-between py-2.5 border-b border-slate-100 last:border-0">
    <label htmlFor={id} className="text-[13px] text-slate-700 cursor-pointer select-none">{label}</label>
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative w-9 h-5 rounded-full transition-colors duration-200 flex-shrink-0 disabled:opacity-50 ${
        checked ? 'bg-brandBlue' : 'bg-slate-200'
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${
          checked ? 'translate-x-4' : 'translate-x-0'
        }`}
      />
    </button>
  </div>
)

// ── Add / Edit User Modal ─────────────────────────────────────────────────────
const UserModal = ({ isOpen, onClose, onSaved, editUser, branches }) => {
  const { toastSuccess, toastError } = useToast()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('Technician')
  const [status, setStatus] = useState('Active')
  const [branchId, setBranchId] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [created, setCreated] = useState(null) // { email, temporaryPassword } after a successful create

  const needsBranch = role !== 'Super Admin'
  const activeBranches = branches.filter((b) => b.isActive)

  useEffect(() => {
    setName(editUser?.name || '')
    setEmail(editUser?.email || '')
    setRole(editUser?.role || 'Technician')
    setStatus(editUser?.status || 'Active')
    setBranchId(editUser?.branchId || '')
    setCurrentPassword('')
    setCreated(null)
  }, [editUser, isOpen])

  // Default the branch select once the list has loaded, for a fresh Add
  // (an edit already has editUser?.branchId set above).
  useEffect(() => {
    if (isOpen && !editUser && needsBranch && !branchId && activeBranches.length > 0) {
      setBranchId(activeBranches[0]._id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, needsBranch, activeBranches.length])

  const handleSave = async () => {
    if (!name.trim()) return
    if (needsBranch && !branchId) return
    setSaving(true)
    try {
      if (editUser) {
        await updateUser(editUser._id, { name: name.trim(), role, status, ...(needsBranch ? { branchId } : {}) })
        toastSuccess(`${name.trim()}'s account updated.`, 'User Updated')
        onSaved()
        onClose()
      } else {
        if (!email.trim() || !currentPassword) return
        const res = await createUser({ name: name.trim(), email: email.trim(), role, ...(needsBranch ? { branchId } : {}), currentPassword })
        const data = res?.data?.data
        toastSuccess(`${name.trim()}'s account has been created.`, 'User Created')
        setCreated({ email: data.user.email, temporaryPassword: data.temporaryPassword })
        onSaved()
      }
    } catch (err) {
      toastError(err.message || 'Failed to save user.')
    } finally {
      setSaving(false)
    }
  }

  const copyCredentials = () => {
    navigator.clipboard?.writeText(`Email: ${created.email}\nTemporary password: ${created.temporaryPassword}`)
    toastSuccess('Credentials copied to clipboard.', 'Copied')
  }

  const title = created ? 'Account Created' : editUser ? `Edit User — ${editUser.name}` : 'Add User'

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      footer={
        created ? (
          <button className="btn-primary" onClick={onClose} id="um-done-btn">Done</button>
        ) : (
          <>
            <button className="btn-secondary" onClick={onClose} id="um-cancel-btn">Cancel</button>
            <button className="btn-primary" onClick={handleSave} disabled={saving} id="um-save-btn">
              {editUser
                ? <><IconDeviceFloppy size={14} /> {saving ? 'Saving…' : 'Save Changes'}</>
                : <><IconPlus size={14} /> {saving ? 'Creating…' : 'Create Account'}</>}
            </button>
          </>
        )
      }
    >
      {created ? (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-emerald-600 text-[13px] font-semibold">
            <IconCheck size={16} /> Account created successfully
          </div>
          <div className="bg-slate-50 border border-slate-100 rounded-lg p-4 space-y-2">
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Email</div>
              <div className="text-[13px] font-semibold text-slate-800" id="um-created-email">{created.email}</div>
            </div>
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Temporary Password</div>
              <div className="text-[13px] font-mono font-semibold text-brandBlue" id="um-created-password">{created.temporaryPassword}</div>
            </div>
          </div>
          <button
            type="button"
            id="um-copy-credentials-btn"
            className="btn-secondary w-full flex items-center justify-center gap-1.5 !text-xs"
            onClick={copyCredentials}
          >
            <IconCopy size={13} /> Copy Credentials
          </button>
          <div className="bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 text-[11px] text-amber-700">
            This password is shown only once. Share it with {name.trim()} through a secure channel — it cannot be retrieved again after closing this dialog.
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <TextInput
            label="Full Name" id="um-name" placeholder="e.g. Nuwan Seneviratne"
            value={name} onChange={(e) => setName(e.target.value)} required
          />
          {editUser ? (
            <TextInput label="Email" id="um-email" value={email} disabled />
          ) : (
            <TextInput
              label="Email" id="um-email" type="email" placeholder="e.g. nuwan@servicehub.com"
              value={email} onChange={(e) => setEmail(e.target.value)} required
            />
          )}
          <SelectBox label="Role" id="um-role" value={role} onChange={(e) => setRole(e.target.value)} options={ROLES} />
          {needsBranch && (
            <SelectBox
              label="Branch" id="um-branch"
              value={branchId} onChange={(e) => setBranchId(e.target.value)}
              options={activeBranches.map((b) => ({ value: b._id, label: b.branchName }))}
              required
            />
          )}
          {editUser && (
            <SelectBox label="Status" id="um-status" value={status} onChange={(e) => setStatus(e.target.value)} options={['Active', 'Suspended']} />
          )}

          {!editUser && (
            <>
              <div className="border-t border-slate-100 pt-4">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 uppercase tracking-wide mb-2">
                  <IconShieldLock size={13} className="text-brandBlue" /> Confirm It's You
                </div>
                <TextInput
                  label="Your Password" id="um-current-password" type="password"
                  placeholder="Re-enter your password to confirm"
                  value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required
                />
              </div>
              <div className="bg-brandPale border border-brandBlue/10 rounded-lg px-3 py-2 text-[11px] text-brandBlue">
                A secure temporary password will be generated automatically — you'll see it once, right here, to share with {name.trim() || 'the new user'}.
              </div>
            </>
          )}
        </div>
      )}
    </Modal>
  )
}

// ── Add Branch Modal ─────────────────────────────────────────────────────────
const AddBranchModal = ({ isOpen, onClose, onSave, saving }) => {
  const [branchName, setBranchName] = useState('')
  const [code, setCode] = useState('')

  const handleSave = () => {
    if (!branchName.trim() || !code.trim()) return
    onSave({ branchName: branchName.trim(), code: code.trim() }, () => {
      setBranchName('')
      setCode('')
    })
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Branch"
      footer={
        <>
          <button className="btn-secondary" onClick={onClose} id="branch-cancel-btn">Cancel</button>
          <button className="btn-primary" onClick={handleSave} disabled={saving} id="branch-save-btn">
            <IconPlus size={14} /> {saving ? 'Creating…' : 'Create Branch'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <TextInput
          label="Branch Name" id="branch-name" placeholder="e.g. Kandy Branch"
          value={branchName} onChange={(e) => setBranchName(e.target.value)} required
        />
        <TextInput
          label="Branch Code" id="branch-code" placeholder="e.g. KND-01"
          value={code} onChange={(e) => setCode(e.target.value)} required
        />
      </div>
    </Modal>
  )
}

// ── Section Card wrapper ──────────────────────────────────────────────────────
const Section = ({ icon: Icon, title, children, action }) => (
  <div className="bg-white border border-slate-100 rounded-lg p-4">
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2 text-[13px] font-semibold text-slate-800">
        <Icon size={14} className="text-brandBlue" />
        {title}
      </div>
      {action}
    </div>
    {children}
  </div>
)

const SaveButton = ({ onClick, saving, id, disabled }) => (
  <button
    id={id}
    className="h-[28px] px-3 inline-flex items-center gap-1 bg-white text-slate-600 text-xs font-semibold border border-slate-200 rounded-md hover:border-brandBlue hover:text-brandBlue transition-all disabled:opacity-50"
    onClick={onClick}
    disabled={saving || disabled}
  >
    <IconDeviceFloppy size={11} /> {saving ? 'Saving…' : 'Save'}
  </button>
)

// ── Main component ────────────────────────────────────────────────────────────
export const Settings = () => {
  const { toastSuccess, toastError } = useToast()
  const { user, branches, refreshBranches } = useAuth()
  const isSuperAdmin = user?.role === 'Super Admin'

  // Guards every Save action (and the notification toggles) against firing
  // before the real settings have finished loading — without this, an early
  // click sends the still-empty initial state and overwrites real saved
  // values (station's required text fields would fail validation outright;
  // notifications would silently revert the other toggles to stale defaults).
  const [settingsLoaded, setSettingsLoaded] = useState(false)

  // ── Station Details ───────────────────────────────────────────────────────
  const [station, setStation] = useState({ stationName: '', phone: '', vatRegistrationNumber: '', address: '' })
  const [stationSaving, setStationSaving] = useState(false)
  const setS = (k) => (e) => setStation((s) => ({ ...s, [k]: e.target.value }))

  // ── Booking Settings ──────────────────────────────────────────────────────
  const [maxBookingsPerDay, setMaxBookingsPerDay] = useState('')
  const [bookingSettingsSaving, setBookingSettingsSaving] = useState(false)

  // ── Billing Defaults ──────────────────────────────────────────────────────
  const [billing, setBilling] = useState({
    vatRatePercentage: '18', defaultCurrency: 'LKR', allowedPaymentMethods: ['Cash', 'Card', 'Online'],
    invoicePrefix: 'INV-', invoiceFooterNote: ''
  })
  const [billingSaving, setBillingSaving] = useState(false)
  const setB = (k) => (e) => setBilling((b) => ({ ...b, [k]: e.target.value }))
  const togglePaymentMethod = (method) => setBilling((b) => ({
    ...b,
    allowedPaymentMethods: b.allowedPaymentMethods.includes(method)
      ? b.allowedPaymentMethods.filter((m) => m !== method)
      : [...b.allowedPaymentMethods, method]
  }))

  // ── Notifications (save-on-toggle) ────────────────────────────────────────
  const [notifs, setNotifs] = useState({
    smsServiceReminders: true, emailEstimateApprovals: true, smsVehicleReadyAlerts: true,
    multiFactorAuthenticationEnabled: false, lowStockEmailAlerts: true
  })
  const [notifSaving, setNotifSaving] = useState('')

  const toggleNotif = async (key, value) => {
    if (!settingsLoaded) return
    const next = { ...notifs, [key]: value }
    setNotifs(next)
    setNotifSaving(key)
    try {
      await updateSettings({ notificationToggles: next })
    } catch (err) {
      setNotifs((n) => ({ ...n, [key]: !value })) // revert on failure
      toastError(err.message || 'Failed to update notification setting.')
    } finally {
      setNotifSaving('')
    }
  }

  // ── User Management ───────────────────────────────────────────────────────
  const [users, setUsers] = useState([])
  const [usersLoading, setUsersLoading] = useState(false)
  const [userModal, setUserModal] = useState(false)
  const [editUser, setEditUser] = useState(null)
  const [deleteUserTarget, setDeleteUserTarget] = useState(null)
  const [deletingUser, setDeletingUser] = useState(false)

  const fetchUsers = async () => {
    if (!isSuperAdmin) return
    setUsersLoading(true)
    try {
      const res = await getUsers()
      const list = Array.isArray(res?.data) ? res.data : (Array.isArray(res?.data?.data) ? res.data.data : [])
      setUsers(list)
    } catch (err) {
      toastError(err.message || 'Failed to load users.')
    } finally {
      setUsersLoading(false)
    }
  }

  const openAddUser = () => { setEditUser(null); setUserModal(true) }
  const openEditUser = (u) => { setEditUser(u); setUserModal(true) }

  const confirmDeleteUser = async () => {
    if (!deleteUserTarget) return
    setDeletingUser(true)
    try {
      await deleteUser(deleteUserTarget._id)
      toastSuccess(`"${deleteUserTarget.name}" has been removed.`, 'User Removed')
      await fetchUsers()
    } catch (err) {
      toastError(err.message || 'Failed to remove user.')
    } finally {
      setDeletingUser(false)
      setDeleteUserTarget(null)
    }
  }

  // ── Branch Management ─────────────────────────────────────────────────────
  // The branch list itself lives in AuthContext (shared with Topbar's
  // selector) so creating/deactivating a branch here updates the selector
  // immediately, instead of it holding a stale snapshot until reload.
  const [branchModal, setBranchModal] = useState(false)
  const [savingBranch, setSavingBranch] = useState(false)
  const [togglingBranchId, setTogglingBranchId] = useState(null)

  const handleAddBranch = async (payload, resetForm) => {
    setSavingBranch(true)
    try {
      await createBranch(payload)
      toastSuccess(`"${payload.branchName}" added.`, 'Branch Created')
      resetForm()
      setBranchModal(false)
      await refreshBranches()
    } catch (err) {
      toastError(err.message || 'Failed to create branch.')
    } finally {
      setSavingBranch(false)
    }
  }

  const toggleBranchActive = async (branch) => {
    setTogglingBranchId(branch._id)
    try {
      if (branch.isActive) {
        await deactivateBranch(branch._id)
        toastSuccess(`"${branch.branchName}" deactivated.`, 'Branch Updated')
      } else {
        await activateBranch(branch._id)
        toastSuccess(`"${branch.branchName}" reactivated.`, 'Branch Updated')
      }
      await refreshBranches()
    } catch (err) {
      toastError(err.message || 'Failed to update branch.')
    } finally {
      setTogglingBranchId(null)
    }
  }

  // ── Load real settings + users + branches on mount ────────────────────────
  useEffect(() => {
    if (!isSuperAdmin) return
    // StrictMode double-invokes this effect in dev, firing two concurrent
    // getSettings() calls. Without this guard, a stale duplicate resolving
    // after a user has already toggled/saved something can silently clobber
    // that change back to the pre-toggle state in the UI.
    let cancelled = false
    getSettings()
      .then((res) => {
        if (cancelled) return
        const data = res?.data?.data
        if (!data) return
        setStation({
          stationName: data.stationName || '',
          phone: data.phone || '',
          vatRegistrationNumber: data.vatRegistrationNumber || '',
          address: data.address || ''
        })
        if (data.maxBookingsPerDay !== undefined) setMaxBookingsPerDay(String(data.maxBookingsPerDay))
        setBilling({
          vatRatePercentage: String(data.vatRatePercentage ?? 18),
          defaultCurrency: data.defaultCurrency || 'LKR',
          allowedPaymentMethods: data.allowedPaymentMethods?.length ? data.allowedPaymentMethods : ['Cash', 'Card', 'Online'],
          invoicePrefix: data.invoicePrefix || 'INV-',
          invoiceFooterNote: data.invoiceFooterNote || ''
        })
        if (data.notificationToggles) setNotifs(data.notificationToggles)
      })
      .catch((err) => { if (!cancelled) toastError(err.message || 'Failed to load settings.') })
      .finally(() => { if (!cancelled) setSettingsLoaded(true) })
    fetchUsers()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuperAdmin])

  const saveStation = async () => {
    if (!settingsLoaded) return
    setStationSaving(true)
    try {
      await updateSettings(station)
      toastSuccess('Station details updated.', 'Settings Saved')
    } catch (err) {
      toastError(err.message || 'Failed to update station details.')
    } finally {
      setStationSaving(false)
    }
  }

  const saveBookingSettings = async () => {
    if (!settingsLoaded) return
    const value = Number(maxBookingsPerDay)
    if (!Number.isInteger(value) || value < 1) {
      toastError('Max bookings/day must be a whole number of at least 1.')
      return
    }
    setBookingSettingsSaving(true)
    try {
      await updateSettings({ maxBookingsPerDay: value })
      toastSuccess('Booking capacity updated successfully.', 'Booking Settings Saved')
    } catch (err) {
      toastError(err.message || 'Failed to update booking settings.')
    } finally {
      setBookingSettingsSaving(false)
    }
  }

  const saveBilling = async () => {
    if (!settingsLoaded) return
    setBillingSaving(true)
    try {
      await updateSettings({ ...billing, vatRatePercentage: Number(billing.vatRatePercentage) })
      toastSuccess('Billing defaults updated.', 'Settings Saved')
    } catch (err) {
      toastError(err.message || 'Failed to update billing defaults.')
    } finally {
      setBillingSaving(false)
    }
  }

  if (!isSuperAdmin) {
    return (
      <div className="bg-white border border-slate-100 rounded-lg p-8 text-center text-[13px] text-slate-400">
        Only Super Admin can access system settings.
      </div>
    )
  }

  return (
    <div className="space-y-[18px]">
      {/* Page Header */}
      <div>
        <div className="text-[17px] font-semibold text-slate-800">Settings</div>
        <div className="text-[12px] text-slate-500 mt-0.5">System configuration and administration</div>
      </div>

      {/* 2-column grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* ── Station Details ─────────────────────────────────────────────── */}
        <Section icon={IconBuilding} title="Station Details" action={<SaveButton id="settings-save-station-btn" onClick={saveStation} saving={stationSaving} disabled={!settingsLoaded} />}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <TextInput label="Station Name" id="set-name" value={station.stationName} onChange={setS('stationName')} disabled={!settingsLoaded} />
            </div>
            <TextInput label="Phone" id="set-phone" value={station.phone} onChange={setS('phone')} disabled={!settingsLoaded} />
            <TextInput label="VAT Registration" id="set-vatreg" value={station.vatRegistrationNumber} onChange={setS('vatRegistrationNumber')} disabled={!settingsLoaded} />
            <div className="md:col-span-2">
              <TextArea label="Address" id="set-address" value={station.address} onChange={setS('address')} rows={2} disabled={!settingsLoaded} />
            </div>
          </div>
        </Section>

        {/* ── Branch Management ───────────────────────────────────────────── */}
        <Section
          icon={IconBuilding}
          title="Branch Management"
          action={
            <button id="settings-add-branch-btn" className="h-[28px] px-3 inline-flex items-center gap-1 bg-white text-slate-600 text-xs font-semibold border border-slate-200 rounded-md hover:border-brandBlue hover:text-brandBlue transition-all" onClick={() => setBranchModal(true)}>
              <IconPlus size={11} /> Add Branch
            </button>
          }
        >
          <div className="w-full overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  {['Branch', 'Code', 'Status', ''].map((h) => (
                    <th key={h} className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-left py-2 border-b border-slate-100 px-1 first:pl-0">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {branches.length === 0 && (
                  <tr><td colSpan={4} className="py-4 text-center text-[12px] text-slate-400">No branches yet.</td></tr>
                )}
                {branches.map((b) => (
                  <tr key={b._id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60 transition-colors">
                    <td className="py-2.5 text-[13px] font-semibold text-slate-800 pl-0 pr-2">{b.branchName}</td>
                    <td className="py-2.5 text-[12px] font-mono text-slate-500 px-1">{b.code}</td>
                    <td className="py-2.5 px-1">
                      <Badge variant={b.isActive ? 'success' : 'danger'} className="!text-[10px]">{b.isActive ? 'Active' : 'Inactive'}</Badge>
                    </td>
                    <td className="py-2.5 text-right pr-0">
                      <button
                        id={`settings-toggle-branch-${b._id}`}
                        className="h-[24px] px-2 inline-flex items-center gap-1 bg-white text-slate-600 text-[11px] font-semibold border border-slate-200 rounded hover:border-brandBlue hover:text-brandBlue transition-all disabled:opacity-50"
                        onClick={() => toggleBranchActive(b)}
                        disabled={togglingBranchId === b._id}
                      >
                        {b.isActive ? <><IconTrash size={11} /> Deactivate</> : <><IconRotate size={11} /> Reactivate</>}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        {/* ── Booking Settings ────────────────────────────────────────────── */}
        <Section icon={IconCalendarEvent} title="Booking Settings" action={<SaveButton id="settings-save-booking-btn" onClick={saveBookingSettings} saving={bookingSettingsSaving} disabled={!settingsLoaded} />}>
          <TextInput
            label="Max Bookings / Day (per branch)" id="set-max-bookings-per-day" type="number" min="1"
            value={maxBookingsPerDay} onChange={(e) => setMaxBookingsPerDay(e.target.value)} disabled={!settingsLoaded}
          />
          <div className="text-[11px] text-slate-400 mt-2">
            The hard daily appointment cap for this branch. Changing this value never affects bookings already confirmed under the previous limit.
          </div>
        </Section>

        {/* ── User Management ─────────────────────────────────────────────── */}
        <Section
          icon={IconUsers}
          title="User Management"
          action={
            <button id="settings-add-user-btn" className="h-[28px] px-3 inline-flex items-center gap-1 bg-white text-slate-600 text-xs font-semibold border border-slate-200 rounded-md hover:border-brandBlue hover:text-brandBlue transition-all" onClick={openAddUser}>
              <IconPlus size={11} /> Add User
            </button>
          }
        >
          <div className="w-full overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  {['Name', 'Role', 'Status', ''].map((h) => (
                    <th key={h} className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-left py-2 border-b border-slate-100 px-1 first:pl-0">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {!usersLoading && users.length === 0 && (
                  <tr><td colSpan={4} className="py-4 text-center text-[12px] text-slate-400">No staff accounts yet.</td></tr>
                )}
                {users.map((u) => (
                  <tr key={u._id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60 transition-colors">
                    <td className="py-2.5 text-[13px] font-semibold text-slate-800 pl-0 pr-2">{u.name}</td>
                    <td className="py-2.5 text-[12px] text-slate-600 px-1">{u.role}</td>
                    <td className="py-2.5 px-1">
                      <Badge variant={u.status === 'Active' ? 'success' : 'danger'} className="!text-[10px]">{u.status}</Badge>
                    </td>
                    <td className="py-2.5 text-right pr-0">
                      <div className="flex items-center gap-1.5 justify-end">
                        <button
                          id={`settings-edit-user-${u._id}`}
                          className="h-[24px] px-2 inline-flex items-center gap-1 bg-white text-slate-600 text-[11px] font-semibold border border-slate-200 rounded hover:border-brandBlue hover:text-brandBlue transition-all"
                          onClick={() => openEditUser(u)}
                        >
                          Edit
                        </button>
                        {u._id !== user?._id && (
                          <button
                            id={`settings-remove-user-${u._id}`}
                            aria-label={`Remove ${u.name}`}
                            className="h-[24px] w-[24px] inline-flex items-center justify-center bg-white text-slate-400 border border-slate-200 rounded hover:border-red-300 hover:text-red-600 hover:bg-red-50 transition-all"
                            onClick={() => setDeleteUserTarget(u)}
                          >
                            <IconTrash size={12} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        {/* ── Notifications ───────────────────────────────────────────────── */}
        <Section icon={IconBell} title="Notifications">
          <ToggleRow id="notif-sms-reminders"   label="SMS — Service reminders"     checked={notifs.smsServiceReminders}   disabled={!settingsLoaded || notifSaving === 'smsServiceReminders'}   onChange={(v) => toggleNotif('smsServiceReminders', v)} />
          <ToggleRow id="notif-email-estimates" label="Email — Estimate approvals"  checked={notifs.emailEstimateApprovals} disabled={!settingsLoaded || notifSaving === 'emailEstimateApprovals'} onChange={(v) => toggleNotif('emailEstimateApprovals', v)} />
          <ToggleRow id="notif-sms-ready"       label="SMS — Vehicle ready alerts"  checked={notifs.smsVehicleReadyAlerts}  disabled={!settingsLoaded || notifSaving === 'smsVehicleReadyAlerts'}  onChange={(v) => toggleNotif('smsVehicleReadyAlerts', v)} />
          <ToggleRow id="notif-mfa"             label="Multi-factor authentication" checked={notifs.multiFactorAuthenticationEnabled} disabled={!settingsLoaded || notifSaving === 'multiFactorAuthenticationEnabled'} onChange={(v) => toggleNotif('multiFactorAuthenticationEnabled', v)} />
          <ToggleRow id="notif-low-stock"       label="Low stock email alerts"      checked={notifs.lowStockEmailAlerts}    disabled={!settingsLoaded || notifSaving === 'lowStockEmailAlerts'}    onChange={(v) => toggleNotif('lowStockEmailAlerts', v)} />
        </Section>

        {/* ── Billing Defaults ────────────────────────────────────────────── */}
        <Section icon={IconReceipt} title="Billing Defaults" action={<SaveButton id="settings-save-billing-btn" onClick={saveBilling} saving={billingSaving} disabled={!settingsLoaded} />}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TextInput label="VAT Rate (%)" id="bill-vat" type="number" min="0" max="100" value={billing.vatRatePercentage} onChange={setB('vatRatePercentage')} disabled={!settingsLoaded} />
            <SelectBox label="Default Currency" id="bill-currency" value={billing.defaultCurrency} onChange={setB('defaultCurrency')} options={['LKR', 'USD']} disabled={!settingsLoaded} />
            <div className="md:col-span-2">
              <div className="form-label">Accepted Payment Methods</div>
              <div className="flex gap-5 mt-1.5">
                {PAYMENT_METHODS.map((m) => (
                  <Checkbox key={m} id={`bill-method-${m.toLowerCase()}`} label={m} checked={billing.allowedPaymentMethods.includes(m)} onChange={() => togglePaymentMethod(m)} disabled={!settingsLoaded} />
                ))}
              </div>
            </div>
            <TextInput label="Invoice Prefix" id="bill-prefix" placeholder="e.g. INV-" value={billing.invoicePrefix} onChange={setB('invoicePrefix')} disabled={!settingsLoaded} />
            <div className="md:col-span-2">
              <TextArea label="Invoice Footer Note" id="bill-footer" value={billing.invoiceFooterNote} onChange={setB('invoiceFooterNote')} rows={2} disabled={!settingsLoaded} />
            </div>
          </div>
        </Section>
      </div>

      {/* User Modal */}
      <UserModal
        isOpen={userModal}
        onClose={() => setUserModal(false)}
        onSaved={fetchUsers}
        editUser={editUser}
        branches={branches}
      />

      {/* Add Branch Modal */}
      <AddBranchModal
        isOpen={branchModal}
        onClose={() => setBranchModal(false)}
        onSave={handleAddBranch}
        saving={savingBranch}
      />

      {/* Remove User confirmation */}
      {deleteUserTarget && (
        <Modal
          isOpen={!!deleteUserTarget}
          onClose={() => !deletingUser && setDeleteUserTarget(null)}
          title="Remove Staff Account"
          footer={
            <>
              <button
                className="btn-secondary"
                onClick={() => setDeleteUserTarget(null)}
                disabled={deletingUser}
                id="settings-remove-user-cancel-btn"
              >
                Cancel
              </button>
              <button
                className="btn-destructive"
                onClick={confirmDeleteUser}
                disabled={deletingUser}
                id="settings-remove-user-confirm-btn"
              >
                <IconTrash size={14} /> {deletingUser ? 'Removing…' : 'Remove Account'}
              </button>
            </>
          }
        >
          <p className="text-sm text-slate-600">
            Are you sure you want to remove <span className="font-semibold text-slate-800">"{deleteUserTarget.name}"</span> ({deleteUserTarget.role})? They will immediately lose access and will no longer be able to log in.
          </p>
        </Modal>
      )}
    </div>
  )
}

export default Settings
