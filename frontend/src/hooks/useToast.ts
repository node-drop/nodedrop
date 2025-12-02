/**
 * Toast notification hook for managing user feedback
 * Provides methods to show success, error, warning, and info toasts
 */

import React, { useState, useCallback } from 'react'
import { ToastProps, ToastAction } from '@/components/ui/Toast'

export interface ToastOptions {
  message?: string
  duration?: number
  persistent?: boolean
  actions?: ToastAction[]
}

export interface UseToastReturn {
  toasts: ToastProps[]
  showToast: (type: ToastProps['type'], title: string, options?: ToastOptions) => string
  showSuccess: (title: string, options?: ToastOptions) => string
  showError: (title: string, options?: ToastOptions) => string
  showWarning: (title: string, options?: ToastOptions) => string
  showInfo: (title: string, options?: ToastOptions) => string
  hideToast: (id: string) => void
  hideAllToasts: () => void
}

let toastIdCounter = 0

export function useToast(): UseToastReturn {
  const [toasts, setToasts] = useState<ToastProps[]>([])

  const generateId = useCallback(() => {
    return `toast-${++toastIdCounter}-${Date.now()}`
  }, [])

  const showToast = useCallback((
    type: ToastProps['type'],
    title: string,
    options: ToastOptions = {}
  ): string => {
    const id = generateId()
    
    const toast: ToastProps = {
      id,
      type,
      title,
      message: options.message,
      duration: options.duration ?? (type === 'error' ? 8000 : 5000),
      persistent: options.persistent ?? false,
      actions: options.actions ?? [],
      onClose: hideToast
    }

    setToasts(prev => [...prev, toast])
    return id
  }, [generateId])

  const showSuccess = useCallback((title: string, options?: ToastOptions) => {
    return showToast('success', title, options)
  }, [showToast])

  const showError = useCallback((title: string, options?: ToastOptions) => {
    return showToast('error', title, {
      ...options,
      duration: options?.duration ?? 8000 // Longer duration for errors
    })
  }, [showToast])

  const showWarning = useCallback((title: string, options?: ToastOptions) => {
    return showToast('warning', title, options)
  }, [showToast])

  const showInfo = useCallback((title: string, options?: ToastOptions) => {
    return showToast('info', title, options)
  }, [showToast])

  const hideToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }, [])

  const hideAllToasts = useCallback(() => {
    setToasts([])
  }, [])

  return {
    toasts,
    showToast,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    hideToast,
    hideAllToasts
  }
}

/**
 * Global toast manager for use across the application
 */
class GlobalToastManager {
  private listeners: Set<(toasts: ToastProps[]) => void> = new Set()
  private toasts: ToastProps[] = []
  private idCounter = 0

  subscribe(listener: (toasts: ToastProps[]) => void) {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  private notify() {
    this.listeners.forEach(listener => listener([...this.toasts]))
  }

  private generateId(): string {
    return `global-toast-${++this.idCounter}-${Date.now()}`
  }

  showToast(
    type: ToastProps['type'],
    title: string,
    options: ToastOptions = {}
  ): string {
    const id = this.generateId()
    
    const toast: ToastProps = {
      id,
      type,
      title,
      message: options.message,
      duration: options.duration ?? (type === 'error' ? 8000 : 5000),
      persistent: options.persistent ?? false,
      actions: options.actions ?? [],
      onClose: (toastId) => this.hideToast(toastId)
    }

    this.toasts.push(toast)
    this.notify()
    return id
  }

  showSuccess(title: string, options?: ToastOptions): string {
    return this.showToast('success', title, options)
  }

  showError(title: string, options?: ToastOptions): string {
    return this.showToast('error', title, {
      ...options,
      duration: options?.duration ?? 8000
    })
  }

  showWarning(title: string, options?: ToastOptions): string {
    return this.showToast('warning', title, options)
  }

  showInfo(title: string, options?: ToastOptions): string {
    return this.showToast('info', title, options)
  }

  hideToast(id: string): void {
    this.toasts = this.toasts.filter(toast => toast.id !== id)
    this.notify()
  }

  hideAllToasts(): void {
    this.toasts = []
    this.notify()
  }
}

export const globalToastManager = new GlobalToastManager()

/**
 * Hook to use the global toast manager
 */
export function useGlobalToast(): UseToastReturn {
  const [toasts, setToasts] = useState<ToastProps[]>([])

  React.useEffect(() => {
    const unsubscribe = globalToastManager.subscribe(setToasts)
    return unsubscribe
  }, [])

  return {
    toasts,
    showToast: globalToastManager.showToast.bind(globalToastManager),
    showSuccess: globalToastManager.showSuccess.bind(globalToastManager),
    showError: globalToastManager.showError.bind(globalToastManager),
    showWarning: globalToastManager.showWarning.bind(globalToastManager),
    showInfo: globalToastManager.showInfo.bind(globalToastManager),
    hideToast: globalToastManager.hideToast.bind(globalToastManager),
    hideAllToasts: globalToastManager.hideAllToasts.bind(globalToastManager)
  }
}
