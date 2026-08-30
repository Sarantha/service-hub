import React from 'react'
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react'

export const DataTable = ({
  headers = [],
  data = [],
  renderRow,
  className = '',
  currentPage = 1,
  totalPages = 1,
  onPageChange,
  totalItems = 0,
  itemsPerPage = 10,
}) => {
  const showPagination = totalPages > 1 || totalItems > 0

  const startEntry = (currentPage - 1) * itemsPerPage + 1
  const endEntry = Math.min(currentPage * itemsPerPage, totalItems || (currentPage * data.length))

  return (
    <div className={`w-full overflow-x-auto rounded-xl border border-slate-100 bg-white shadow-sm ${className}`}>
      <table className="w-full border-collapse">
        <thead>
          <tr className="h-10 bg-slate-50 border-b border-slate-100">
            {headers.map((header, index) => {
              const isObject = typeof header === 'object' && header !== null
              const label = isObject ? header.label : header
              const align = isObject && header.align ? `text-${header.align}` : 'text-left'
              return (
                <th
                  key={index}
                  className={`text-xs font-bold text-slate-500 uppercase tracking-wider px-4 py-3 border-b border-slate-100 ${align}`}
                >
                  {label}
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={headers.length}
                className="h-14 px-4 py-3 text-center text-sm text-slate-400 font-normal"
              >
                No records found.
              </td>
            </tr>
          ) : (
            data.map((item, rowIndex) => {
              if (renderRow) {
                return renderRow(item, rowIndex)
              }

              return (
                <tr
                  key={rowIndex}
                  className="h-14 bg-white hover:bg-slate-50/70 transition-colors border-b border-slate-100 last:border-0"
                >
                  {headers.map((header, colIndex) => {
                    const isObject = typeof header === 'object' && header !== null
                    const key = isObject ? header.key : header
                    const align = isObject && header.align ? `text-${header.align}` : 'text-left'
                    return (
                      <td
                        key={colIndex}
                        className={`text-sm font-normal text-slate-800 px-4 py-3 ${align}`}
                      >
                        {item[key] !== undefined ? String(item[key]) : '—'}
                      </td>
                    )
                  })}
                </tr>
              )
            })
          )}
        </tbody>
      </table>

      {showPagination && (
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-white">
          <div className="text-xs font-normal text-slate-500">
            {totalItems > 0 ? (
              <>
                Showing <span className="font-semibold text-slate-800">{startEntry}</span> to{' '}
                <span className="font-semibold text-slate-800">{endEntry}</span> of{' '}
                <span className="font-semibold text-slate-800">{totalItems}</span> entries
              </>
            ) : (
              <>
                Page <span className="font-semibold text-slate-800">{currentPage}</span> of{' '}
                <span className="font-semibold text-slate-800">{totalPages}</span>
              </>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => onPageChange && onPageChange(currentPage - 1)}
              disabled={currentPage <= 1}
              className="h-[32px] px-3 flex items-center gap-1 bg-white text-slate-600 text-xs font-semibold border border-slate-200 rounded-md hover:border-brandBlue hover:text-brandBlue transition-all duration-200 ease-in-out cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Previous Page"
            >
              <IconChevronLeft size={14} stroke={2.5} />
              <span>Previous</span>
            </button>

            <button
              onClick={() => onPageChange && onPageChange(currentPage + 1)}
              disabled={currentPage >= totalPages}
              className="h-[32px] px-3 flex items-center gap-1 bg-white text-slate-600 text-xs font-semibold border border-slate-200 rounded-md hover:border-brandBlue hover:text-brandBlue transition-all duration-200 ease-in-out cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Next Page"
            >
              <span>Next</span>
              <IconChevronRight size={14} stroke={2.5} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default DataTable

