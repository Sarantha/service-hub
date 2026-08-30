import React from 'react'

// Brand-styled replacement for Recharts' default black/white tooltip box —
// matches the app's card style (bg-white border border-slate-100 rounded-lg shadow-lg).
export const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null

  return (
    <div className="bg-white border border-slate-100 rounded-lg shadow-lg px-3 py-2 text-xs">
      {label && <div className="font-bold text-slate-800 mb-1">{label}</div>}
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-1.5 text-slate-500">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }} />
          <span>{entry.name}:</span>
          <span className="font-semibold text-slate-800">
            {typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value}
          </span>
        </div>
      ))}
    </div>
  )
}

export default ChartTooltip
