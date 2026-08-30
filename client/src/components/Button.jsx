import React from 'react'

export const Button = ({
  children,
  variant = 'primary',
  onClick,
  type = 'button',
  disabled = false,
  className = '',
  ...props
}) => {
  let variantClass = 'btn-primary'
  if (variant === 'secondary') variantClass = 'btn-secondary'
  else if (variant === 'small') variantClass = 'btn-small'
  else if (variant === 'destructive') variantClass = 'btn-destructive'

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${variantClass} cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

export default Button
