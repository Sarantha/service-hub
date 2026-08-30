import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
} from 'react'
import {
  IconCircleCheck,
  IconAlertTriangle,
  IconInfoCircle,
  IconX,
} from '@tabler/icons-react'

// ── Context ───────────────────────────────────────────────────────────────────
const ToastContext = createContext(null)

// ── Toast type config ─────────────────────────────────────────────────────────
const TOAST_CONFIG = {
  success: {
    icon: IconCircleCheck,
    bar:  'bg-emerald-500',
    icon_cls: 'text-emerald-600',
    bg:   'bg-white',
    border: 'border-emerald-100',
  },
  error: {
    icon: IconAlertTriangle,
    bar:  'bg-red-500',
    icon_cls: 'text-red-500',
    bg:   'bg-white',
    border: 'border-red-100',
  },
  warning: {
    icon: IconAlertTriangle,
    bar:  'bg-amber-400',
    icon_cls: 'text-amber-500',
    bg:   'bg-white',
    border: 'border-amber-100',
  },
  info: {
    icon: IconInfoCircle,
    bar:  'bg-brandBlue',
    icon_cls: 'text-brandBlue',
    bg:   'bg-white',
    border: 'border-blue-100',
  },
}

const DEFAULT_DURATION = 4000

// ── Individual Toast item ─────────────────────────────────────────────────────
const Toast = ({ id, type = 'info', title, message, onDismiss }) => {
  const cfg = TOAST_CONFIG[type] || TOAST_CONFIG.info
  const Icon = cfg.icon

  return (
    <div
      className={`
        relative flex items-start gap-3 w-[340px] max-w-[90vw] rounded-xl border
        ${cfg.bg} ${cfg.border}
        shadow-lg px-4 py-3.5 overflow-hidden
        animate-[slideIn_0.25s_ease-out]
      `}
      role="alert"
    >
      {/* Left colour bar */}
      <div className={`absolute left-0 top-0 bottom-0 w-[4px] rounded-l-xl ${cfg.bar}`} />

      {/* Icon */}
      <Icon size={18} className={`flex-shrink-0 mt-0.5 ${cfg.icon_cls}`} />

      {/* Content */}
      <div className="flex-1 min-w-0">
        {title && (
          <div className="text-[13px] font-semibold text-slate-800 leading-snug">
            {title}
          </div>
        )}
        {message && (
          <div className="text-[12px] text-slate-500 mt-0.5 leading-snug">
            {message}
          </div>
        )}
      </div>

      {/* Dismiss */}
      <button
        type="button"
        onClick={() => onDismiss(id)}
        className="flex-shrink-0 text-slate-300 hover:text-slate-500 transition-colors mt-0.5"
        aria-label="Dismiss notification"
      >
        <IconX size={14} />
      </button>
    </div>
  )
}

// ── Provider ──────────────────────────────────────────────────────────────────
export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([])
  const timersRef = useRef({})

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
    if (timersRef.current[id]) {
      clearTimeout(timersRef.current[id])
      delete timersRef.current[id]
    }
  }, [])

  /**
   * Show a toast notification.
   * @param {{ type?: 'success'|'error'|'warning'|'info', title?: string, message: string, duration?: number }} opts
   */
  const toast = useCallback(
    ({ type = 'info', title, message, duration = DEFAULT_DURATION }) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
      setToasts((prev) => [...prev, { id, type, title, message }])

      if (duration > 0) {
        timersRef.current[id] = setTimeout(() => dismiss(id), duration)
      }

      return id
    },
    [dismiss]
  )

  // Convenience helpers
  const toastSuccess = useCallback(
    (message, title = 'Success') => toast({ type: 'success', title, message }),
    [toast]
  )
  const toastError = useCallback(
    (message, title = 'Error') => toast({ type: 'error', title, message }),
    [toast]
  )
  const toastWarning = useCallback(
    (message, title = 'Warning') => toast({ type: 'warning', title, message }),
    [toast]
  )
  const toastInfo = useCallback(
    (message, title) => toast({ type: 'info', title, message }),
    [toast]
  )

  return (
    <ToastContext.Provider value={{ toast, toastSuccess, toastError, toastWarning, toastInfo, dismiss }}>
      {children}

      {/* Toast Stack — fixed bottom-right */}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2.5 items-end pointer-events-none"
      >
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto">
            <Toast {...t} onDismiss={dismiss} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export const useToast = () => {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within a ToastProvider')
  return ctx
}

export default ToastContext
