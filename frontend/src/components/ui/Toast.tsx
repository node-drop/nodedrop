/**
 * Toast notification component for user feedback
 * Provides success, error, warning, and info notifications
 */

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { 
  CheckCircle, 
  AlertCircle, 
  AlertTriangle, 
  Info, 
  X 
} from 'lucide-react'
import { clsx } from 'clsx'

export interface ToastProps {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message?: string
  duration?: number
  persistent?: boolean
  actions?: ToastAction[]
  onClose: (id: string) => void
}

export interface ToastAction {
  label: string
  onClick: () => void
  variant?: 'primary' | 'secondary'
}

export function Toast({
  id,
  type,
  title,
  message,
  duration = 5000,
  persistent = false,
  actions = [],
  onClose
}: ToastProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [isExiting, setIsExiting] = useState(false)

  useEffect(() => {
    // Trigger entrance animation
    const timer = setTimeout(() => setIsVisible(true), 10)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (persistent) return

    const timer = setTimeout(() => {
      handleClose()
    }, duration)

    return () => clearTimeout(timer)
  }, [duration, persistent])

  const handleClose = () => {
    setIsExiting(true)
    setTimeout(() => {
      onClose(id)
    }, 300) // Match exit animation duration
  }

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />
      case 'info':
        return <Info className="w-5 h-5 text-blue-500" />
    }
  }

  const getBackgroundColor = () => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200'
      case 'error':
        return 'bg-red-50 border-red-200'
      case 'warning':
        return 'bg-yellow-50 border-yellow-200'
      case 'info':
        return 'bg-blue-50 border-blue-200'
    }
  }

  const getTitleColor = () => {
    switch (type) {
      case 'success':
        return 'text-green-800'
      case 'error':
        return 'text-red-800'
      case 'warning':
        return 'text-yellow-800'
      case 'info':
        return 'text-blue-800'
    }
  }

  const getMessageColor = () => {
    switch (type) {
      case 'success':
        return 'text-green-700'
      case 'error':
        return 'text-red-700'
      case 'warning':
        return 'text-yellow-700'
      case 'info':
        return 'text-blue-700'
    }
  }

  return (
    <div
      className={clsx(
        'flex items-start p-4 rounded-lg border shadow-lg max-w-md w-full transition-all duration-300 ease-in-out',
        getBackgroundColor(),
        isVisible && !isExiting
          ? 'transform translate-x-0 opacity-100'
          : 'transform translate-x-full opacity-0'
      )}
      role="alert"
      aria-live={type === 'error' ? 'assertive' : 'polite'}
    >
      {/* Icon */}
      <div className="flex-shrink-0 mr-3 mt-0.5">
        {getIcon()}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <h4 className={clsx('text-sm font-medium', getTitleColor())}>
          {title}
        </h4>
        
        {message && (
          <p className={clsx('mt-1 text-sm', getMessageColor())}>
            {message}
          </p>
        )}

        {/* Actions */}
        {actions.length > 0 && (
          <div className="mt-3 flex space-x-2">
            {actions.map((action, index) => (
              <button
                key={index}
                onClick={action.onClick}
                className={clsx(
                  'text-xs font-medium px-2 py-1 rounded transition-colors',
                  action.variant === 'primary'
                    ? type === 'success'
                      ? 'bg-green-600 text-white hover:bg-green-700'
                      : type === 'error'
                      ? 'bg-red-600 text-white hover:bg-red-700'
                      : type === 'warning'
                      ? 'bg-yellow-600 text-white hover:bg-yellow-700'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                    : type === 'success'
                    ? 'text-green-800 hover:bg-green-100'
                    : type === 'error'
                    ? 'text-red-800 hover:bg-red-100'
                    : type === 'warning'
                    ? 'text-yellow-800 hover:bg-yellow-100'
                    : 'text-blue-800 hover:bg-blue-100'
                )}
              >
                {action.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Close button */}
      <button
        onClick={handleClose}
        className={clsx(
          'flex-shrink-0 ml-3 p-1 rounded-md transition-colors',
          type === 'success'
            ? 'text-green-500 hover:bg-green-100'
            : type === 'error'
            ? 'text-red-500 hover:bg-red-100'
            : type === 'warning'
            ? 'text-yellow-500 hover:bg-yellow-100'
            : 'text-blue-500 hover:bg-blue-100'
        )}
        aria-label="Close notification"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}

export interface ToastContainerProps {
  toasts: ToastProps[]
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center'
}

export function ToastContainer({ 
  toasts, 
  position = 'top-right' 
}: ToastContainerProps) {
  const getPositionClasses = () => {
    switch (position) {
      case 'top-right':
        return 'top-4 right-4'
      case 'top-left':
        return 'top-4 left-4'
      case 'bottom-right':
        return 'bottom-4 right-4'
      case 'bottom-left':
        return 'bottom-4 left-4'
      case 'top-center':
        return 'top-4 left-1/2 transform -translate-x-1/2'
      case 'bottom-center':
        return 'bottom-4 left-1/2 transform -translate-x-1/2'
    }
  }

  if (toasts.length === 0) return null

  return createPortal(
    <div
      className={clsx(
        'fixed z-50 flex flex-col space-y-2 pointer-events-none',
        getPositionClasses()
      )}
      aria-live="polite"
      aria-label="Notifications"
    >
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <Toast {...toast} />
        </div>
      ))}
    </div>,
    document.body
  )
}
