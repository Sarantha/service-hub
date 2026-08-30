import React from 'react'

export const TextArea = ({
  label,
  id,
  error,
  required = false,
  className = '',
  rows = 3,
  ...props
}) => {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label htmlFor={id} className="form-label">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <textarea
        id={id}
        required={required}
        rows={rows}
        className={`w-full p-3.5 bg-white border border-slate-200 text-slate-800 text-sm rounded-lg placeholder-slate-400 focus:outline-none focus:border-brandBlue focus:ring-2 focus:ring-brandPale transition-all duration-200 ease-in-out ${error ? 'border-red-500 focus:ring-red-100 focus:border-red-500' : ''}`}
        {...props}
      />
      {error && <span className="text-xs text-red-500 mt-0.5">{error}</span>}
    </div>
  )
}

export default TextArea
