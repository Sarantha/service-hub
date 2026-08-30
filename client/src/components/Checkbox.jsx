import React from 'react'
import { IconCheck } from '@tabler/icons-react'

export const Checkbox = ({
  label,
  id,
  checked,
  onChange,
  disabled = false,
  className = '',
  ...props
}) => {
  const handleClick = () => {
    if (!disabled && onChange) {
      onChange(!checked)
    }
  }

  return (
    <div
      id={id}
      role="checkbox"
      aria-checked={checked}
      aria-disabled={disabled}
      className={`flex items-center gap-2.5 cursor-pointer ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
      onClick={handleClick}
      {...props}
    >
      <div
        className={`w-[18px] h-[18px] border rounded flex items-center justify-center transition-all ${
          checked
            ? 'bg-brandBlue border-brandBlue text-white'
            : 'bg-white border-slate-300 hover:border-brandBlue'
        }`}
      >
        {checked && <IconCheck size={12} stroke={3} />}
      </div>
      {label && (
        <span className="text-sm font-normal text-slate-800 select-none">
          {label}
        </span>
      )}
    </div>
  )
}

export default Checkbox
