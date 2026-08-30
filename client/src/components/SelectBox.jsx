import React from 'react'

export const SelectBox = ({
  label,
  id,
  options = [],
  error,
  required = false,
  className = '',
  ...props
}) => {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label htmlFor={id} className="form-label">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <select
        id={id}
        required={required}
        className={`form-input cursor-pointer ${error ? 'border-red-500 focus:ring-red-100 focus:border-red-500' : ''}`}
        {...props}
      >
        {options.map((option, index) => {
          const isObject = typeof option === 'object' && option !== null
          const val = isObject ? option.value : option
          const display = isObject ? option.label : option
          return (
            <option key={index} value={val}>
              {display}
            </option>
          )
        })}
      </select>
      {error && <span className="text-xs text-red-500 mt-0.5">{error}</span>}
    </div>
  )
}

export default SelectBox
