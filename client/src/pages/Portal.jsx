import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  IconTool, IconCalendarPlus, IconCar,
  IconArrowLeft, IconCheck, IconBell, IconX,
} from '@tabler/icons-react'
import Modal from '../components/Modal'
import TextInput from '../components/TextInput'
import SelectBox from '../components/SelectBox'
import Badge from '../components/Badge'
import { useToast } from '../context/ToastContext'
import {
  getVehicleTimeline, getMyAppointments, getPortalAvailability,
  bookMyAppointment, rescheduleMyAppointment, cancelMyAppointment,
} from '../services/portalService'

const SERVICE_TYPES = ['Full Service', 'Oil Change', 'Brake Service', 'AC Service', 'Engine Diagnostics', 'Other']

const badgeVariant = (status) => {
  if (status === 'Completed') return 'success'
  if (status === 'Cancelled') return 'danger'
  if (status === 'No-show') return 'warning'
  return 'info' // Booked
}

const dateISO = (d) => new Date(d).toISOString().slice(0, 10)
const fmtDate = (d) => new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
const fmtDateTime = (d) => new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })

// ── Booking Modal ──────────────────────────────────────────────────────────────
const BookingModal = ({ isOpen, onClose, token, vehicleReg, onBooked }) => {
  const { toastError } = useToast()
  const [form, setForm] = useState({ name: '', phone: '', service: 'Full Service', date: '', time: '' })
  const [availability, setAvailability] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  const set = (k) => (e) => {
    let val = e.target.value
    if (k === 'phone') val = val.replace(/\D/g, '').slice(0, 10)
    setForm((f) => ({ ...f, [k]: val }))
  }

  useEffect(() => {
    if (!form.date) { setAvailability(null); return }
    let cancelled = false
    getPortalAvailability(token, { date: form.date })
      .then((res) => { if (!cancelled) setAvailability(res?.data?.data || null) })
      .catch(() => { if (!cancelled) setAvailability(null) })
    return () => { cancelled = true }
  }, [form.date, token])

  const dayFull = availability && availability.remaining <= 0

  const handleBook = async () => {
    if (!form.name || !form.phone || !form.date || !form.time) return
    setSubmitting(true)
    try {
      await bookMyAppointment(token, {
        customerName: form.name,
        customerPhone: form.phone,
        serviceType: form.service,
        scheduledDateTime: new Date(`${form.date}T${form.time}:00`).toISOString()
      })
      setDone(true)
      onBooked()
    } catch (err) {
      toastError(err.message || 'Failed to confirm booking. Please try a different date/time.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleClose = () => {
    setDone(false)
    setForm({ name: '', phone: '', service: 'Full Service', date: '', time: '' })
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={done ? 'Booking Confirmed!' : 'Book a Service'}
      footer={
        done ? (
          <button className="btn-primary w-full" onClick={handleClose} id="bk-done-btn">Close</button>
        ) : (
          <>
            <button className="btn-secondary" onClick={handleClose} id="bk-cancel-btn">Cancel</button>
            <button className="btn-primary" onClick={handleBook} id="bk-submit-btn" disabled={submitting || dayFull}>
              <IconCalendarPlus size={14} /> {submitting ? 'Booking…' : 'Confirm Booking'}
            </button>
          </>
        )
      }
    >
      {done ? (
        <div className="text-center py-4 space-y-3">
          <div className="w-12 h-12 rounded-full bg-emerald-50 border-2 border-emerald-500 flex items-center justify-center mx-auto">
            <IconCheck size={22} className="text-emerald-600" />
          </div>
          <div className="text-[14px] font-semibold text-slate-800">Booking received!</div>
          <div className="text-[12px] text-slate-500">
            We've logged your request for <strong>{form.service}</strong> on <strong>{form.date}</strong>.
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-brandPale rounded-lg px-3 py-2 text-[12px] text-brandBlue font-medium">
            Vehicle: <span className="font-bold">{vehicleReg}</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TextInput label="Your Name" id="bk-name" placeholder="Full name" value={form.name} onChange={set('name')} required />
            <TextInput label="Phone" id="bk-phone" placeholder="0771234567" value={form.phone} onChange={set('phone')} required />
          </div>
          <SelectBox label="Service Type" id="bk-service" value={form.service} onChange={set('service')} options={SERVICE_TYPES} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TextInput label="Preferred Date" id="bk-date" type="date" value={form.date} onChange={set('date')} required />
            <TextInput label="Preferred Time" id="bk-time" type="time" value={form.time} onChange={set('time')} required />
          </div>
          {availability && (
            <div id="bk-availability" className={`text-[12px] rounded-lg px-3 py-2 ${dayFull ? 'bg-red-50 text-red-600' : 'bg-slate-50 text-slate-600'}`}>
              {dayFull
                ? `This day is fully booked (${availability.maxBookingsPerDay}/${availability.maxBookingsPerDay}). Please choose a different date.`
                : `${availability.remaining} of ${availability.maxBookingsPerDay} slots remaining on this day.`}
            </div>
          )}
        </div>
      )}
    </Modal>
  )
}

// ── Reschedule Modal ──────────────────────────────────────────────────────────
const RescheduleModal = ({ appointment, token, onClose, onDone }) => {
  const { toastError } = useToast()
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [availability, setAvailability] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (appointment) {
      const d = new Date(appointment.scheduledDateTime)
      setDate(dateISO(d))
      setTime(d.toTimeString().slice(0, 5))
    }
  }, [appointment])

  useEffect(() => {
    if (!date) { setAvailability(null); return }
    let cancelled = false
    getPortalAvailability(token, { date }).then((res) => { if (!cancelled) setAvailability(res?.data?.data || null) }).catch(() => {})
    return () => { cancelled = true }
  }, [date, token])

  if (!appointment) return null

  const dayFull = availability && availability.remaining <= 0 && date !== dateISO(appointment.scheduledDateTime)

  const handleSubmit = async () => {
    if (!date || !time) return
    setSubmitting(true)
    try {
      await rescheduleMyAppointment(token, appointment._id, new Date(`${date}T${time}:00`).toISOString())
      onDone()
      onClose()
    } catch (err) {
      toastError(err.message || 'Failed to reschedule.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      isOpen={!!appointment}
      onClose={onClose}
      title="Reschedule Appointment"
      footer={
        <>
          <button className="btn-secondary" onClick={onClose} id="portal-resch-cancel-btn">Cancel</button>
          <button className="btn-primary" onClick={handleSubmit} id="portal-resch-save-btn" disabled={submitting || dayFull}>
            {submitting ? 'Saving…' : 'Confirm New Date'}
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <TextInput label="New Date" id="portal-resch-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          <TextInput label="New Time" id="portal-resch-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} required />
        </div>
        {availability && (
          <div className={`text-[12px] rounded-lg px-3 py-2 ${dayFull ? 'bg-red-50 text-red-600' : 'bg-slate-50 text-slate-600'}`}>
            {dayFull
              ? `This day is fully booked. Please choose a different date.`
              : `${availability.remaining} of ${availability.maxBookingsPerDay} slots remaining on this day.`}
          </div>
        )}
      </div>
    </Modal>
  )
}

// ── KPI Card ──────────────────────────────────────────────────────────────────
const KPI = ({ label, value, valueColor }) => (
  <div className="bg-white border border-slate-100 rounded-lg px-4 py-3">
    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</div>
    <div className={`text-[20px] font-bold mt-0.5 ${valueColor || 'text-slate-800'}`}>{value}</div>
  </div>
)

// ── Main Component ────────────────────────────────────────────────────────────
export const Portal = () => {
  const { token } = useParams()
  const { toastSuccess, toastError } = useToast()
  const [vehicle, setVehicle] = useState(null)
  const [timeline, setTimeline] = useState([])
  const [appointments, setAppointments] = useState([])
  const [loadError, setLoadError] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showBooking, setShowBooking] = useState(false)
  const [rescheduleTarget, setRescheduleTarget] = useState(null)
  const [cancelTarget, setCancelTarget] = useState(null)

  const fetchAppointments = async () => {
    try {
      const res = await getMyAppointments(token)
      const list = Array.isArray(res?.data) ? res.data : (Array.isArray(res?.data?.data) ? res.data.data : [])
      setAppointments(list)
    } catch {
      // History is supplementary — a failure here shouldn't block the rest of the portal.
    }
  }

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const res = await getVehicleTimeline(token)
        const data = res?.data?.data
        setVehicle(data.vehicle)
        setTimeline(data.timeline || [])
        await fetchAppointments()
      } catch (err) {
        setLoadError(err.message || 'This portal link is invalid or has expired.')
      } finally {
        setLoading(false)
      }
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  const handleCancelAppointment = async (id) => {
    try {
      await cancelMyAppointment(token, id)
      toastSuccess('Your appointment has been cancelled.', 'Cancelled')
      await fetchAppointments()
    } catch (err) {
      toastError(err.message || 'Failed to cancel your appointment.')
    }
    setCancelTarget(null)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-7 h-7 rounded-full border-[2.5px] border-brandBlue border-t-transparent animate-spin" />
      </div>
    )
  }

  if (loadError || !vehicle) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="bg-white border border-slate-100 rounded-lg p-6 max-w-sm text-center space-y-2">
          <div className="text-[14px] font-semibold text-slate-800">Portal link unavailable</div>
          <div className="text-[12px] text-slate-500">{loadError || 'Vehicle not found.'}</div>
        </div>
      </div>
    )
  }

  const lastServiceEntry = timeline[0]
  const lastServiceDate = lastServiceEntry?.timestamps?.completedAt || lastServiceEntry?.createdAt

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-slate-100 shadow-sm px-6 h-[52px] flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <IconTool size={18} className="text-brandBlue" />
          <span className="text-[14px] font-bold text-navy tracking-tight">ServiceHub</span>
          <span className="text-[11px] text-slate-400 ml-1">Customer Portal</span>
        </div>
        <Link to="/login" id="portal-back-btn" className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-brandBlue transition-colors">
          <IconArrowLeft size={12} /> Back to console
        </Link>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto px-5 py-5 space-y-4">
        {/* Identity Banner */}
        <section className="bg-gradient-to-r from-navy via-brandBlue to-brandLight text-white rounded-xl p-6 relative overflow-hidden shadow-md">
          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white/15 rounded-md text-[11px] font-bold font-mono tracking-widest mb-2">
                <IconCar size={12} /> {vehicle.regNo}
              </div>
              <div className="text-[24px] font-extrabold tracking-tight leading-tight">{vehicle.make} {vehicle.model}</div>
              <div className="text-white/60 text-[12px] mt-1">{vehicle.ownerName}</div>
            </div>
            <button
              id="portal-book-service"
              className="h-[34px] px-4 inline-flex items-center gap-1.5 bg-white text-brandBlue text-[12px] font-semibold rounded-lg hover:bg-brandPale transition-all shadow flex-shrink-0"
              onClick={() => setShowBooking(true)}
            >
              <IconCalendarPlus size={13} /> Book Service
            </button>
          </div>
          <div className="absolute right-4 bottom-0 opacity-10 pointer-events-none translate-y-4">
            <IconCar size={160} />
          </div>
        </section>

        {/* KPI Grid */}
        <div className="grid grid-cols-3 gap-3">
          <KPI label="Total Services" value={timeline.length} />
          <KPI label="Last Service" value={lastServiceDate ? fmtDate(lastServiceDate) : '—'} />
          <KPI label="Next Service Due" value={vehicle.nextServiceReminderDate ? fmtDate(vehicle.nextServiceReminderDate) : 'Not set'} />
        </div>

        {/* Service History */}
        <div className="bg-white border border-slate-100 rounded-lg p-4">
          <div className="text-[13px] font-semibold text-slate-800 mb-4">Service History</div>
          {timeline.length === 0 ? (
            <div className="text-[12px] text-slate-400">No service history yet.</div>
          ) : (
            <div className="space-y-0">
              {timeline.map((item, i) => (
                <div key={item.jobCardNumber} className="flex gap-3">
                  <div className="flex flex-col items-center flex-shrink-0">
                    <div className="w-3 h-3 rounded-full bg-brandBlue border-2 border-white shadow flex-shrink-0 mt-1" />
                    {i !== timeline.length - 1 && <div className="w-px flex-1 bg-slate-200 my-1" />}
                  </div>
                  <div className="pb-5">
                    <div className="text-[11px] text-slate-400 font-medium">
                      {fmtDate(item.timestamps.completedAt || item.timestamps.openedAt || item.createdAt)}
                    </div>
                    <div className="text-[13px] font-semibold text-slate-800 mt-0.5">{item.serviceType} — {item.jobCardNumber}</div>
                    <div className="text-[12px] text-slate-500 mt-0.5">
                      {item.status}
                      {item.odometerReading != null && <> · {item.odometerReading.toLocaleString()} km</>}
                      {item.invoice && <> · Invoice {item.invoice.invoiceNumber} ({item.invoice.paymentStatus})</>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* My Appointments */}
        <div className="bg-white border border-slate-100 rounded-lg p-4">
          <div className="text-[13px] font-semibold text-slate-800 mb-3">My Appointments</div>
          {appointments.length === 0 ? (
            <div className="text-[12px] text-slate-400">No appointments booked yet.</div>
          ) : (
            <div className="w-full overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    {['Date & Time', 'Service', 'Status', ''].map((h) => (
                      <th key={h} className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-left py-2 border-b border-slate-100 px-2 first:pl-0">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {appointments.map((appt) => (
                    <tr key={appt._id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60 transition-colors">
                      <td className="py-2.5 text-[12px] text-slate-700 pl-0 pr-2">{fmtDateTime(appt.scheduledDateTime)}</td>
                      <td className="py-2.5 text-[12px] text-slate-600 px-2">
                        {appt.serviceType}
                        {appt.rescheduleHistory?.length > 0 && (
                          <div className="text-[10px] text-amber-600 mt-0.5">
                            Rescheduled from {fmtDateTime(appt.rescheduleHistory[appt.rescheduleHistory.length - 1].previousDateTime)}
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-2">
                        <Badge variant={badgeVariant(appt.status)} className="!text-[10px]">{appt.status}</Badge>
                      </td>
                      <td className="py-2.5 text-right pr-0 whitespace-nowrap">
                        {appt.status === 'Booked' && (
                          <>
                            <button id={`portal-appt-resch-${appt._id}`} className="text-[10px] font-semibold text-brandBlue hover:underline mr-2" onClick={() => setRescheduleTarget(appt)}>Reschedule</button>
                            <button id={`portal-appt-cxl-${appt._id}`} className="text-[10px] font-semibold text-red-500 hover:underline" onClick={() => setCancelTarget(appt)}>Cancel</button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {vehicle.nextServiceReminderDate && (
            <div className="mt-4 pt-4 border-t border-slate-100">
              <div className="flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2.5 text-[11px] text-amber-700">
                <IconBell size={13} className="mt-0.5 flex-shrink-0" />
                <span>
                  Next service reminder set for <strong className="text-slate-800">{fmtDate(vehicle.nextServiceReminderDate)}</strong>.
                </span>
              </div>
            </div>
          )}
        </div>
      </main>

      <footer className="border-t border-slate-100 bg-white py-5 text-center text-[11px] text-slate-400">
        © {new Date().getFullYear()} ServiceHub Inc. All rights reserved.
      </footer>

      <BookingModal isOpen={showBooking} onClose={() => setShowBooking(false)} token={token} vehicleReg={vehicle.regNo} onBooked={fetchAppointments} />
      <RescheduleModal appointment={rescheduleTarget} token={token} onClose={() => setRescheduleTarget(null)} onDone={fetchAppointments} />

      {/* Cancel confirmation */}
      <Modal
        isOpen={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        title="Cancel Appointment"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setCancelTarget(null)} id="portal-cancel-back-btn">Keep Appointment</button>
            <button
              className="h-[42px] px-5 flex items-center gap-1.5 bg-red-600 text-white text-[13px] font-semibold rounded-lg hover:bg-red-700 transition-all"
              onClick={() => handleCancelAppointment(cancelTarget._id)}
              id="portal-cancel-confirm-btn"
            >
              <IconX size={14} /> Cancel Appointment
            </button>
          </>
        }
      >
        {cancelTarget && (
          <p className="text-[13px] text-slate-600">
            Cancel your <strong>{cancelTarget.serviceType}</strong> appointment on{' '}
            <strong>{fmtDateTime(cancelTarget.scheduledDateTime)}</strong>?
          </p>
        )}
      </Modal>
    </div>
  )
}

export default Portal
