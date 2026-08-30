import React, { useState, useEffect } from 'react'
import { IconPlus, IconCalendarEvent, IconCheck, IconX } from '@tabler/icons-react'
import Modal from '../components/Modal'
import TextInput from '../components/TextInput'
import SelectBox from '../components/SelectBox'
import TextArea from '../components/TextArea'
import Badge from '../components/Badge'
import { useToast } from '../context/ToastContext'
import {
  getAppointments, createAppointment, getAvailability,
  rescheduleAppointment, cancelAppointment,
} from '../services/appointmentsService'

const todayDate = new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' })
const SERVICE_TYPES = ['Full Service', 'Oil Change', 'Brake Service', 'AC Service', 'Engine Diagnostics', 'Other']

const badgeVariant = (status) => {
  if (status === 'Completed') return 'success'
  if (status === 'Cancelled') return 'danger'
  if (status === 'No-show') return 'warning'
  return 'info' // Booked
}

const mapAppointment = (a) => ({
  id: a._id || a.id,
  customerName: a.customerName,
  vehicleRegNo: a.vehicleRegNo,
  vehicleDetails: a.vehicleDetails,
  serviceType: a.serviceType,
  scheduledDateTime: new Date(a.scheduledDateTime),
  status: a.status,
  technician: a.assignedTechnicianId?.name || 'Unassigned',
  rescheduleHistory: a.rescheduleHistory || [],
})

const dateISO = (d) => d.toISOString().slice(0, 10)
const timeLabel = (d) => d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })

// ── Booking Modal ──────────────────────────────────────────────────────────────
const BookingModal = ({ isOpen, onClose, onBook }) => {
  const [form, setForm] = useState({
    customer: '', phone: '', vehicleRegNo: '', vehicleDetails: '', service: 'Full Service',
    date: '', time: '', notes: '',
  })
  const [availability, setAvailability] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const set = (key) => (e) => {
    let val = e.target.value
    if (key === 'phone') {
      val = val.replace(/\D/g, '').slice(0, 10)
    } else if (key === 'vehicleRegNo') {
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

  useEffect(() => {
    if (!form.date) { setAvailability(null); return }
    let cancelled = false
    getAvailability({ date: form.date })
      .then((res) => { if (!cancelled) setAvailability(res?.data?.data || null) })
      .catch(() => { if (!cancelled) setAvailability(null) })
    return () => { cancelled = true }
  }, [form.date])

  const handleSubmit = async (e) => {
    e.preventDefault()
    const scheduledDateTime = form.date && form.time
      ? new Date(`${form.date}T${form.time}:00`).toISOString()
      : undefined

    setSubmitting(true)
    const ok = await onBook({
      customerName: form.customer,
      customerPhone: form.phone,
      vehicleRegNo: form.vehicleRegNo,
      vehicleDetails: form.vehicleDetails,
      serviceType: form.service,
      scheduledDateTime,
    })
    setSubmitting(false)
    if (ok) {
      onClose()
      setForm({ customer: '', phone: '', vehicleRegNo: '', vehicleDetails: '', service: 'Full Service', date: '', time: '', notes: '' })
    }
  }

  const dayFull = availability && availability.remaining <= 0

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Book Appointment"
      footer={
        <>
          <button className="btn-secondary" onClick={onClose} id="appt-cancel-btn">Cancel</button>
          <button className="btn-primary" form="booking-form" type="submit" id="appt-save-btn" disabled={submitting || dayFull}>
            <IconCalendarEvent size={14} /> {submitting ? 'Booking…' : 'Confirm Booking'}
          </button>
        </>
      }
    >
      <form id="booking-form" onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <TextInput
            label="Customer Name" id="appt-customer" placeholder="Full name"
            value={form.customer} onChange={set('customer')} required
          />
          <TextInput
            label="Phone Number" id="appt-phone" placeholder="0771234567"
            value={form.phone} onChange={set('phone')} required
          />
          <TextInput
            label="Vehicle Registration No." id="appt-vehicle-regno" placeholder="e.g. ABC-1234"
            value={form.vehicleRegNo} onChange={set('vehicleRegNo')} required
          />
          <TextInput
            label="Vehicle Details" id="appt-vehicle-details" placeholder="e.g. Toyota Aqua"
            value={form.vehicleDetails} onChange={set('vehicleDetails')} required
          />
          <SelectBox
            label="Service Type" id="appt-service"
            value={form.service} onChange={set('service')} options={SERVICE_TYPES}
          />
          <TextInput
            label="Date" id="appt-date" type="date"
            value={form.date} onChange={set('date')} required
          />
          <TextInput
            label="Time" id="appt-time" type="time"
            value={form.time} onChange={set('time')} required
          />
          <div className="col-span-2">
            <TextArea
              label="Notes" id="appt-notes" placeholder="Any special instructions or customer requests…"
              value={form.notes} onChange={set('notes')} rows={2}
            />
          </div>
        </div>

        {availability && (
          <div id="appt-availability" className={`text-[12px] rounded-lg px-3 py-2 ${dayFull ? 'bg-red-50 text-red-600' : 'bg-brandPale text-brandBlue'}`}>
            {dayFull
              ? `This day is fully booked (${availability.maxBookingsPerDay}/${availability.maxBookingsPerDay}). Please choose a different date.`
              : `${availability.remaining} of ${availability.maxBookingsPerDay} slots remaining on this day.`}
          </div>
        )}
      </form>
    </Modal>
  )
}

// ── Reschedule Modal ──────────────────────────────────────────────────────────
const RescheduleModal = ({ appointment, onClose, onReschedule }) => {
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [availability, setAvailability] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (appointment) {
      setDate(dateISO(appointment.scheduledDateTime))
      setTime(appointment.scheduledDateTime.toTimeString().slice(0, 5))
    }
  }, [appointment])

  useEffect(() => {
    if (!date) { setAvailability(null); return }
    let cancelled = false
    getAvailability({ date }).then((res) => { if (!cancelled) setAvailability(res?.data?.data || null) }).catch(() => {})
    return () => { cancelled = true }
  }, [date])

  if (!appointment) return null

  const dayFull = availability && availability.remaining <= 0 && date !== dateISO(appointment.scheduledDateTime)

  const handleSubmit = async () => {
    if (!date || !time) return
    setSubmitting(true)
    const ok = await onReschedule(appointment.id, new Date(`${date}T${time}:00`).toISOString())
    setSubmitting(false)
    if (ok) onClose()
  }

  return (
    <Modal
      isOpen={!!appointment}
      onClose={onClose}
      title={`Reschedule — ${appointment.customerName}`}
      footer={
        <>
          <button className="btn-secondary" onClick={onClose} id="resch-cancel-btn">Cancel</button>
          <button className="btn-primary" onClick={handleSubmit} id="resch-save-btn" disabled={submitting || dayFull}>
            <IconCalendarEvent size={14} /> {submitting ? 'Saving…' : 'Confirm New Date'}
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <TextInput label="New Date" id="resch-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          <TextInput label="New Time" id="resch-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} required />
        </div>
        {availability && (
          <div id="resch-availability" className={`text-[12px] rounded-lg px-3 py-2 ${dayFull ? 'bg-red-50 text-red-600' : 'bg-brandPale text-brandBlue'}`}>
            {dayFull
              ? `This day is fully booked (${availability.maxBookingsPerDay}/${availability.maxBookingsPerDay}). Please choose a different date.`
              : `${availability.remaining} of ${availability.maxBookingsPerDay} slots remaining on this day.`}
          </div>
        )}
      </div>
    </Modal>
  )
}

// ── Cancel Confirm Modal ──────────────────────────────────────────────────────
const CancelConfirmModal = ({ appointment, onClose, onConfirm }) => {
  const [submitting, setSubmitting] = useState(false)
  if (!appointment) return null

  const handleConfirm = async () => {
    setSubmitting(true)
    await onConfirm(appointment.id)
    setSubmitting(false)
    onClose()
  }

  return (
    <Modal
      isOpen={!!appointment}
      onClose={onClose}
      title="Cancel Appointment"
      footer={
        <>
          <button className="btn-secondary" onClick={onClose} id="cancel-appt-back-btn">Keep Appointment</button>
          <button
            className="h-[42px] px-5 flex items-center gap-1.5 bg-red-600 text-white text-[13px] font-semibold rounded-lg hover:bg-red-700 transition-all disabled:opacity-50"
            onClick={handleConfirm} id="cancel-appt-confirm-btn" disabled={submitting}
          >
            <IconX size={14} /> {submitting ? 'Cancelling…' : 'Cancel Appointment'}
          </button>
        </>
      }
    >
      <p className="text-[13px] text-slate-600">
        Cancel the appointment for <strong>{appointment.customerName}</strong> ({appointment.vehicleRegNo}) on{' '}
        <strong>{appointment.scheduledDateTime.toLocaleDateString('en-US')}</strong>? This will free up the slot for another booking.
      </p>
    </Modal>
  )
}

// ── Timeline Item ─────────────────────────────────────────────────────────────
const TimelineItem = ({ appt, isLast, onReschedule, onCancel }) => (
  <div className="flex gap-3">
    <div className="flex flex-col items-center flex-shrink-0">
      <div className={`w-[10px] h-[10px] rounded-full mt-0.5 flex-shrink-0 ${appt.status === 'Completed' ? 'bg-emerald-500' : appt.status === 'Cancelled' ? 'bg-slate-300' : 'bg-brandBlue'}`}>
        {appt.status === 'Completed' && <IconCheck size={7} className="text-white m-auto mt-[1.5px]" />}
      </div>
      {!isLast && <div className="w-px flex-1 bg-slate-100 mt-1" style={{ minHeight: 28 }} />}
    </div>

    <div className="pb-3 flex-1 min-w-0">
      <div className="text-[10px] text-slate-400 mb-0.5">{timeLabel(appt.scheduledDateTime)}</div>
      <div className={`text-[12px] font-semibold ${appt.status === 'Completed' ? 'text-slate-400 line-through' : appt.status === 'Cancelled' ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
        {appt.customerName} — {appt.serviceType}
      </div>
      <div className="text-[11px] text-slate-500 mt-0.5">{appt.vehicleRegNo} · {appt.technician}</div>
      {appt.status === 'Booked' && (
        <div className="flex gap-2 mt-1.5">
          <button id={`appt-resch-${appt.id}`} className="text-[10px] font-semibold text-brandBlue hover:underline" onClick={() => onReschedule(appt)}>Reschedule</button>
          <button id={`appt-cxl-${appt.id}`} className="text-[10px] font-semibold text-red-500 hover:underline" onClick={() => onCancel(appt)}>Cancel</button>
        </div>
      )}
    </div>
  </div>
)

// ── Main Component ─────────────────────────────────────────────────────────────
export const Appointments = () => {
  const { toastSuccess, toastError } = useToast()
  const [showModal, setShowModal] = useState(false)
  const [appointments, setAppointments] = useState([])
  const [rescheduleTarget, setRescheduleTarget] = useState(null)
  const [cancelTarget, setCancelTarget] = useState(null)

  const fetchAllAppointments = async () => {
    try {
      const res = await getAppointments()
      const list = Array.isArray(res?.data) ? res.data : (Array.isArray(res?.data?.data) ? res.data.data : [])
      setAppointments(list.map(mapAppointment))
    } catch (err) {
      toastError(err.message || 'Failed to load appointments.')
    }
  }

  useEffect(() => {
    fetchAllAppointments()
  }, [])

  const todayISOKey = dateISO(new Date())
  const todaySlots = appointments
    .filter((a) => dateISO(a.scheduledDateTime) === todayISOKey && a.status !== 'Cancelled')
    .sort((a, b) => a.scheduledDateTime - b.scheduledDateTime)
  const upcomingRows = appointments
    .filter((a) => dateISO(a.scheduledDateTime) !== todayISOKey)
    .sort((a, b) => a.scheduledDateTime - b.scheduledDateTime)

  const handleBook = async (payload) => {
    try {
      await createAppointment(payload)
      toastSuccess(`Appointment booked for ${payload.customerName || 'customer'} successfully.`, 'Booking Confirmed')
      await fetchAllAppointments()
      return true
    } catch (err) {
      toastError(err.message || 'Failed to confirm booking.')
      return false
    }
  }

  const handleReschedule = async (id, scheduledDateTime) => {
    try {
      await rescheduleAppointment(id, scheduledDateTime)
      toastSuccess('Appointment rescheduled successfully.', 'Reschedule Confirmed')
      await fetchAllAppointments()
      return true
    } catch (err) {
      toastError(err.message || 'Failed to reschedule appointment.')
      return false
    }
  }

  const handleCancel = async (id) => {
    try {
      await cancelAppointment(id)
      toastSuccess('Appointment cancelled.', 'Cancelled')
      await fetchAllAppointments()
    } catch (err) {
      toastError(err.message || 'Failed to cancel appointment.')
    }
  }

  return (
    <div className="space-y-[18px]">
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[17px] font-semibold text-slate-800">Appointments</div>
          <div className="text-[12px] text-slate-500 mt-0.5">Upcoming bookings and scheduling</div>
        </div>
        <button
          className="btn-primary !h-8 !px-3 !text-xs flex items-center gap-1.5"
          id="appt-book-btn"
          onClick={() => setShowModal(true)}
        >
          <IconPlus size={13} /> Book Appointment
        </button>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Today's Timeline */}
        <div className="bg-white border border-slate-100 rounded-lg p-4">
          <div className="text-[13px] font-semibold text-slate-800 mb-4">Today — {todayDate}</div>
          <div>
            {todaySlots.length === 0 && <div className="text-[12px] text-slate-400">No appointments scheduled for today.</div>}
            {todaySlots.map((appt, i) => (
              <TimelineItem key={appt.id} appt={appt} isLast={i === todaySlots.length - 1} onReschedule={setRescheduleTarget} onCancel={setCancelTarget} />
            ))}
          </div>
        </div>

        {/* Upcoming Table */}
        <div className="bg-white border border-slate-100 rounded-lg p-4">
          <div className="text-[13px] font-semibold text-slate-800 mb-3">Upcoming</div>
          <div className="w-full overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  {['Date & Time', 'Customer', 'Service', 'Status', ''].map((h) => (
                    <th key={h} className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider text-left px-3 py-2 border-b border-slate-100">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {upcomingRows.length === 0 && (
                  <tr><td colSpan={5} className="px-3 py-4 text-center text-[12px] text-slate-400">No upcoming appointments.</td></tr>
                )}
                {upcomingRows.map((appt) => (
                  <tr key={appt.id} className="hover:bg-slate-50/70 transition-colors border-b border-slate-100 last:border-0">
                    <td className="px-3 py-2 text-[12px] font-medium text-slate-700 whitespace-nowrap">
                      {appt.scheduledDateTime.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · {timeLabel(appt.scheduledDateTime)}
                    </td>
                    <td className="px-3 py-2 text-[12px] text-slate-800">{appt.customerName}</td>
                    <td className="px-3 py-2 text-[12px] text-slate-600">{appt.serviceType}</td>
                    <td className="px-3 py-2">
                      <Badge variant={badgeVariant(appt.status)} className="!text-[10px]">{appt.status}</Badge>
                    </td>
                    <td className="px-3 py-2 text-right whitespace-nowrap">
                      {appt.status === 'Booked' && (
                        <>
                          <button id={`appt-up-resch-${appt.id}`} className="text-[10px] font-semibold text-brandBlue hover:underline mr-2" onClick={() => setRescheduleTarget(appt)}>Reschedule</button>
                          <button id={`appt-up-cxl-${appt.id}`} className="text-[10px] font-semibold text-red-500 hover:underline" onClick={() => setCancelTarget(appt)}>Cancel</button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modals */}
      <BookingModal isOpen={showModal} onClose={() => setShowModal(false)} onBook={handleBook} />
      <RescheduleModal appointment={rescheduleTarget} onClose={() => setRescheduleTarget(null)} onReschedule={handleReschedule} />
      <CancelConfirmModal appointment={cancelTarget} onClose={() => setCancelTarget(null)} onConfirm={handleCancel} />
    </div>
  )
}

export default Appointments
