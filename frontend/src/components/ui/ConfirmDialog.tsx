/**
 * Confirmation dialog component for destructive operations
 * Provides customizable confirmation dialogs with different severity levels
 */

import { clsx } from 'clsx'
import { AlertCircle, AlertTriangle, Info, X } from 'lucide-react'
import React from 'react'
import { createPortal } from 'react-dom'

export interface ConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  severity?: 'info' | 'warning' | 'danger'
  details?: string[]
  loading?: boolean
  disabled?: boolean
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  severity = 'info',
  details = [],
  loading = false,
  disabled = false
}: ConfirmDialogProps) {
  // Handle escape key
  React.useEffect(() => {
    if (!isOpen) return

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, loading, onClose])

  // Prevent body scroll when dialog is open
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = 'unset'
      }
    }
  }, [isOpen])

  if (!isOpen) return null

  const getIcon = () => {
    switch (severity) {
      case 'danger':
        return <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
      case 'warning':
        return <AlertCircle className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
      case 'info':
        return <Info className="w-6 h-6 text-blue-600 dark:text-blue-400" />
    }
  }

  const getConfirmButtonClasses = () => {
    const baseClasses = 'px-4 py-2 text-sm font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800'
    
    switch (severity) {
      case 'danger':
        return clsx(
          baseClasses,
          'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 dark:bg-red-500 dark:hover:bg-red-600',
          (loading || disabled) && 'opacity-50 cursor-not-allowed'
        )
      case 'warning':
        return clsx(
          baseClasses,
          'bg-yellow-600 text-white hover:bg-yellow-700 focus:ring-yellow-500 dark:bg-yellow-500 dark:hover:bg-yellow-600',
          (loading || disabled) && 'opacity-50 cursor-not-allowed'
        )
      case 'info':
        return clsx(
          baseClasses,
          'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 dark:bg-blue-500 dark:hover:bg-blue-600',
          (loading || disabled) && 'opacity-50 cursor-not-allowed'
        )
    }
  }

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !loading) {
      onClose()
    }
  }

  const handleConfirm = () => {
    if (loading || disabled) return
    onConfirm()
  }

  const handleCancel = () => {
    if (loading) return
    onClose()
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/50 dark:bg-black/70"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-description"
      style={{ zIndex: 99999 }}
    >
      <div 
        className="relative z-[100000] bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto pointer-events-auto" 
        style={{ zIndex: 100000 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-6 pb-4">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 mt-1">
              {getIcon()}
            </div>
            <div className="flex-1 min-w-0">
              <h3 
                id="confirm-dialog-title"
                className="text-lg font-medium text-gray-900 dark:text-gray-100"
              >
                {title}
              </h3>
            </div>
          </div>
          
          <button
            onClick={handleCancel}
            disabled={loading}
            className={clsx(
              'p-1 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors',
              loading && 'opacity-50 cursor-not-allowed'
            )}
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 pb-4">
          <p 
            id="confirm-dialog-description"
            className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed"
          >
            {message}
          </p>

          {/* Details */}
          {details.length > 0 && (
            <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
              <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                {details.map((detail, index) => (
                  <li key={index} className="flex items-start">
                    <span className="inline-block w-1.5 h-1.5 bg-gray-400 dark:bg-gray-500 rounded-full mt-2 mr-2 flex-shrink-0" />
                    <span>{detail}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end space-x-3 px-6 py-4 bg-gray-50 dark:bg-gray-900 rounded-b-lg">
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleCancel();
            }}
            disabled={loading}
            className={clsx(
              'relative z-[100001] px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800 transition-colors pointer-events-auto',
              loading && 'opacity-50 cursor-not-allowed'
            )}
          >
            {cancelText}
          </button>
          
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleConfirm();
            }}
            disabled={loading || disabled}
            className={clsx(
              'relative z-[100001] pointer-events-auto',
              getConfirmButtonClasses()
            )}
          >
            {loading ? (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Processing...</span>
              </div>
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

/**
 * Hook for managing confirmation dialogs
 */
export interface UseConfirmDialogReturn {
  isOpen: boolean
  showConfirm: (options: Omit<ConfirmDialogProps, 'isOpen' | 'onClose' | 'onConfirm'>) => Promise<boolean>
  hideConfirm: () => void
  ConfirmDialog: React.ComponentType<{}>
}

export function useConfirmDialog(): UseConfirmDialogReturn {
  const [isOpen, setIsOpen] = React.useState(false)
  const [dialogProps, setDialogProps] = React.useState<Omit<ConfirmDialogProps, 'isOpen' | 'onClose' | 'onConfirm'>>({
    title: '',
    message: ''
  })
  const [resolvePromise, setResolvePromise] = React.useState<((value: boolean) => void) | null>(null)

  const showConfirm = React.useCallback((
    options: Omit<ConfirmDialogProps, 'isOpen' | 'onClose' | 'onConfirm'>
  ): Promise<boolean> => {
    return new Promise((resolve) => {
      setDialogProps(options)
      setResolvePromise(() => resolve)
      setIsOpen(true)
    })
  }, [])

  const hideConfirm = React.useCallback(() => {
    setIsOpen(false)
    if (resolvePromise) {
      resolvePromise(false)
      setResolvePromise(null)
    }
  }, [resolvePromise])

  const handleConfirm = React.useCallback(() => {
    setIsOpen(false)
    if (resolvePromise) {
      resolvePromise(true)
      setResolvePromise(null)
    }
  }, [resolvePromise])

  const DialogComponent = React.useCallback(() => (
    <ConfirmDialog
      {...dialogProps}
      isOpen={isOpen}
      onClose={hideConfirm}
      onConfirm={handleConfirm}
    />
  ), [dialogProps, isOpen, hideConfirm, handleConfirm])

  return {
    isOpen,
    showConfirm,
    hideConfirm,
    ConfirmDialog: DialogComponent
  }
}
