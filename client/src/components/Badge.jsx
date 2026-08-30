import React from 'react'

export const Badge = ({
  children,
  variant = 'default',
  className = '',
  ...props
}) => {
  let variantClass = 'h-6 px-2.5 inline-flex items-center text-xs font-semibold rounded-full bg-slate-100 text-slate-700 border border-slate-200'

  if (variant === 'success' || variant === 'paid' || variant === 'active') {
    variantClass = 'badge-success'
  } else if (variant === 'warning' || variant === 'in-progress' || variant === 'awaiting') {
    variantClass = 'badge-warning'
  } else if (variant === 'danger' || variant === 'unpaid' || variant === 'low-stock') {
    variantClass = 'badge-danger'
  } else if (variant === 'info' || variant === 'open' || variant === 'booked') {
    variantClass = 'h-6 px-2.5 inline-flex items-center text-xs font-semibold rounded-full bg-blue-50 text-blue-700 border border-blue-100'
  } else if (variant === 'delivered') {
    variantClass = 'h-6 px-2.5 inline-flex items-center text-xs font-semibold rounded-full bg-slate-100 text-slate-600 border border-slate-200'
  }

  return (
    <span className={`${variantClass} ${className}`} {...props}>
      {children}
    </span>
  )
}

export default Badge
