import React, { useState } from 'react'
import { IconSearch, IconDownload, IconCar } from '@tabler/icons-react'
import TextInput from '../components/TextInput'
import Badge from '../components/Badge'
import { useToast } from '../context/ToastContext'
import { getStaffVehicleHistory, downloadStaffVehicleHistoryPdf } from '../services/portalService'

const badgeVariant = (status) => {
  if (status === 'Completed' || status === 'Delivered') return 'success'
  if (status === 'Awaiting Parts') return 'warning'
  if (status === 'In Progress') return 'info'
  return 'default' // Open
}

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'

export const VehicleHistory = () => {
  const { toastError } = useToast()
  const [regNo, setRegNo] = useState('')
  const [result, setResult] = useState(null)
  const [searched, setSearched] = useState(false)
  const [loading, setLoading] = useState(false)
  const [downloading, setDownloading] = useState(false)

  const handleSearch = async (e) => {
    e.preventDefault()
    if (!regNo.trim()) return
    setLoading(true)
    setSearched(true)
    try {
      const res = await getStaffVehicleHistory(regNo.trim())
      setResult(res?.data?.data || null)
    } catch (err) {
      setResult(null)
      toastError(err.message || 'No vehicle found with that registration number.')
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = async () => {
    if (!result) return
    setDownloading(true)
    try {
      const response = await downloadStaffVehicleHistoryPdf(result.vehicle.regNo)
      const blob = new Blob([response.data], { type: 'application/pdf' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `${result.vehicle.regNo}-service-history.pdf`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      toastError(err.message || 'Failed to download service history PDF.')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="space-y-[18px]">
      <div>
        <div className="text-[17px] font-semibold text-slate-800">Vehicle History</div>
        <div className="text-[12px] text-slate-500 mt-0.5">Look up any vehicle's full service history and download it as a PDF</div>
      </div>

      <form onSubmit={handleSearch} className="bg-white border border-slate-100 rounded-lg p-4 flex items-end gap-3">
        <div className="flex-1 max-w-xs">
          <TextInput
            label="Vehicle Registration Number" id="vh-regno" placeholder="e.g. ABC-1234"
            value={regNo} onChange={(e) => setRegNo(e.target.value)} required
          />
        </div>
        <button type="submit" className="btn-primary !h-[42px] !px-4 !text-xs flex items-center gap-1.5" id="vh-search-btn" disabled={loading}>
          <IconSearch size={14} /> {loading ? 'Searching…' : 'Search'}
        </button>
      </form>

      {searched && !loading && !result && (
        <div className="bg-white border border-slate-100 rounded-lg p-6 text-center text-[13px] text-slate-400">
          No vehicle found with that registration number.
        </div>
      )}

      {result && (
        <>
          <div className="bg-white border border-slate-100 rounded-lg p-4 flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-brandPale text-brandBlue flex items-center justify-center flex-shrink-0">
                <IconCar size={20} />
              </div>
              <div>
                <div className="text-[15px] font-bold text-slate-800">{result.vehicle.make} {result.vehicle.model}</div>
                <div className="text-[12px] text-slate-500">
                  {result.vehicle.regNo} · {result.vehicle.ownerName} · {result.vehicle.fuelType} · {result.vehicle.odometer?.toLocaleString()} km
                </div>
              </div>
            </div>
            <button
              id="vh-download-pdf-btn"
              className="btn-secondary !h-9 !px-4 !text-xs flex items-center gap-1.5"
              onClick={handleDownload}
              disabled={downloading}
            >
              <IconDownload size={13} /> {downloading ? 'Preparing…' : 'Download PDF'}
            </button>
          </div>

          <div className="bg-white border border-slate-100 rounded-lg p-4">
            <div className="text-[13px] font-semibold text-slate-800 mb-3">
              Service Records <span className="text-slate-400 font-normal">({result.totalServiceEntries})</span>
            </div>
            {result.timeline.length === 0 ? (
              <div className="text-[12px] text-slate-400">No service records for this vehicle yet.</div>
            ) : (
              <div className="w-full overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      {['Date', 'Job Card', 'Service', 'Mileage', 'Status', 'Invoice'].map((h) => (
                        <th key={h} className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-left py-2 border-b border-slate-100 px-2 first:pl-0">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {result.timeline.map((item) => (
                      <tr key={item.jobCardNumber} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60 transition-colors">
                        <td className="py-2.5 text-[12px] text-slate-600 pl-0 pr-2">{fmtDate(item.timestamps.completedAt || item.timestamps.openedAt)}</td>
                        <td className="py-2.5 text-[12px] font-semibold text-brandBlue px-2">{item.jobCardNumber}</td>
                        <td className="py-2.5 text-[12px] text-slate-800 px-2">{item.serviceType}</td>
                        <td className="py-2.5 text-[12px] text-slate-600 px-2">{item.odometerReading != null ? `${item.odometerReading.toLocaleString()} km` : '—'}</td>
                        <td className="py-2.5 px-2">
                          <Badge variant={badgeVariant(item.status)} className="!text-[10px]">{item.status}</Badge>
                        </td>
                        <td className="py-2.5 text-[12px] text-slate-600 px-2">
                          {item.invoice ? `${item.invoice.invoiceNumber} (${item.invoice.paymentStatus})` : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

export default VehicleHistory
