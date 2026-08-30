import React, { useState } from 'react'
import { IconDownload } from '@tabler/icons-react'

// Shared shell for every Reports & Analytics report card — header (title +
// description) + PDF/XLSX export buttons + a chart/table slot. Matches the
// flat card style already used on this page (bg-white border rounded-lg),
// not ui-guides.md's aspirational rounded-xl+shadow-md.
export const ReportCard = ({ reportType, title, description, onExport, children }) => {
  const [exporting, setExporting] = useState(null) // 'pdf' | 'xls' | null

  const handleExport = async (format) => {
    setExporting(format)
    try {
      await onExport(format)
    } finally {
      setExporting(null)
    }
  }

  return (
    <div className="bg-white border border-slate-100 rounded-lg p-4 flex flex-col">
      <div className="flex items-start justify-between mb-3 gap-2">
        <div className="min-w-0">
          <div className="text-[13px] font-semibold text-slate-800">{title}</div>
          {description && <div className="text-[11px] text-slate-400 mt-0.5">{description}</div>}
        </div>
        <div className="flex gap-1.5 flex-shrink-0">
          <button
            id={`rpt-download-${reportType}-pdf`}
            type="button"
            disabled={!!exporting}
            onClick={() => handleExport('pdf')}
            className="h-[28px] px-3 inline-flex items-center gap-1 bg-white text-slate-600 text-xs font-semibold border border-slate-200 rounded-md hover:border-brandBlue hover:text-brandBlue transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <IconDownload size={11} /> {exporting === 'pdf' ? '…' : 'PDF'}
          </button>
          <button
            id={`rpt-download-${reportType}-xls`}
            type="button"
            disabled={!!exporting}
            onClick={() => handleExport('xls')}
            className="h-[28px] px-3 inline-flex items-center gap-1 bg-white text-slate-600 text-xs font-semibold border border-slate-200 rounded-md hover:border-brandBlue hover:text-brandBlue transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <IconDownload size={11} /> {exporting === 'xls' ? '…' : 'XLSX'}
          </button>
        </div>
      </div>
      <div className="flex-1 min-h-[240px]">
        {children}
      </div>
    </div>
  )
}

export default ReportCard
