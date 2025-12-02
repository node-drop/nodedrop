/**
 * Unit tests for useToast hook
 */

import { vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useToast, globalToastManager } from '@/hooks/useToast'

describe('useToast Hook', () => {
  beforeEach(() => {
    // Clear any existing toasts
    globalToastManager.hideAllToasts()
  })

  describe('useToast', () => {
    it('should initialize with empty toasts', () => {
      const { result } = renderHook(() => useToast())
      
      expect(result.current.toasts).toEqual([])
    })

    it('should show success toast', () => {
      const { result } = renderHook(() => useToast())
      
      act(() => {
        result.current.showSuccess('Success message')
      })
      
      expect(result.current.toasts).toHaveLength(1)
      expect(result.current.toasts[0].type).toBe('success')
      expect(result.current.toasts[0].title).toBe('Success message')
    })

    it('should show error toast with longer duration', () => {
      const { result } = renderHook(() => useToast())
      
      act(() => {
        result.current.showError('Error message')
      })
      
      expect(result.current.toasts).toHaveLength(1)
      expect(result.current.toasts[0].type).toBe('error')
      expect(result.current.toasts[0].title).toBe('Error message')
      expect(result.current.toasts[0].duration).toBe(8000)
    })

    it('should show warning toast', () => {
      const { result } = renderHook(() => useToast())
      
      act(() => {
        result.current.showWarning('Warning message')
      })
      
      expect(result.current.toasts).toHaveLength(1)
      expect(result.current.toasts[0].type).toBe('warning')
      expect(result.current.toasts[0].title).toBe('Warning message')
    })

    it('should show info toast', () => {
      const { result } = renderHook(() => useToast())
      
      act(() => {
        result.current.showInfo('Info message')
      })
      
      expect(result.current.toasts).toHaveLength(1)
      expect(result.current.toasts[0].type).toBe('info')
      expect(result.current.toasts[0].title).toBe('Info message')
    })

    it('should show toast with custom options', () => {
      const { result } = renderHook(() => useToast())
      const mockAction = jest.fn()
      
      act(() => {
        result.current.showToast('info', 'Custom toast', {
          message: 'Custom message',
          duration: 10000,
          persistent: true,
          actions: [{ label: 'Action', onClick: mockAction }]
        })
      })
      
      const toast = result.current.toasts[0]
      expect(toast.title).toBe('Custom toast')
      expect(toast.message).toBe('Custom message')
      expect(toast.duration).toBe(10000)
      expect(toast.persistent).toBe(true)
      expect(toast.actions).toHaveLength(1)
      expect(toast.actions![0].label).toBe('Action')
    })

    it('should hide specific toast', () => {
      const { result } = renderHook(() => useToast())
      
      let toastId: string
      act(() => {
        toastId = result.current.showSuccess('Success message')
      })
      
      expect(result.current.toasts).toHaveLength(1)
      
      act(() => {
        result.current.hideToast(toastId)
      })
      
      expect(result.current.toasts).toHaveLength(0)
    })

    it('should hide all toasts', () => {
      const { result } = renderHook(() => useToast())
      
      act(() => {
        result.current.showSuccess('Success 1')
        result.current.showError('Error 1')
        result.current.showWarning('Warning 1')
      })
      
      expect(result.current.toasts).toHaveLength(3)
      
      act(() => {
        result.current.hideAllToasts()
      })
      
      expect(result.current.toasts).toHaveLength(0)
    })

    it('should generate unique IDs for toasts', () => {
      const { result } = renderHook(() => useToast())
      
      let id1: string, id2: string
      act(() => {
        id1 = result.current.showSuccess('Toast 1')
        id2 = result.current.showSuccess('Toast 2')
      })
      
      expect(id1).not.toBe(id2)
      expect(result.current.toasts[0].id).toBe(id1)
      expect(result.current.toasts[1].id).toBe(id2)
    })

    it('should call onClose when toast is closed', () => {
      const { result } = renderHook(() => useToast())
      
      let toastId: string
      act(() => {
        toastId = result.current.showSuccess('Success message')
      })
      
      const toast = result.current.toasts[0]
      
      act(() => {
        toast.onClose(toastId)
      })
      
      expect(result.current.toasts).toHaveLength(0)
    })
  })

  describe('GlobalToastManager', () => {
    it('should manage toasts globally', () => {
      const { result: hook1 } = renderHook(() => useToast())
      const { result: hook2 } = renderHook(() => useToast())
      
      // Both hooks should start with empty toasts
      expect(hook1.current.toasts).toHaveLength(0)
      expect(hook2.current.toasts).toHaveLength(0)
      
      // Show toast from first hook
      act(() => {
        hook1.current.showSuccess('Global toast')
      })
      
      // Both hooks should see the toast
      expect(hook1.current.toasts).toHaveLength(1)
      expect(hook2.current.toasts).toHaveLength(1)
      
      // Hide toast from second hook
      act(() => {
        hook2.current.hideAllToasts()
      })
      
      // Both hooks should see empty toasts
      expect(hook1.current.toasts).toHaveLength(0)
      expect(hook2.current.toasts).toHaveLength(0)
    })

    it('should handle multiple subscribers', () => {
      const listener1 = vi.fn()
      const listener2 = vi.fn()
      
      const unsubscribe1 = globalToastManager.subscribe(listener1)
      const unsubscribe2 = globalToastManager.subscribe(listener2)
      
      globalToastManager.showSuccess('Test toast')
      
      expect(listener1).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'success',
            title: 'Test toast'
          })
        ])
      )
      expect(listener2).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'success',
            title: 'Test toast'
          })
        ])
      )
      
      unsubscribe1()
      unsubscribe2()
    })

    it('should unsubscribe listeners correctly', () => {
      const listener = vi.fn()
      const unsubscribe = globalToastManager.subscribe(listener)
      
      globalToastManager.showSuccess('Test toast 1')
      expect(listener).toHaveBeenCalledTimes(1)
      
      unsubscribe()
      
      globalToastManager.showSuccess('Test toast 2')
      expect(listener).toHaveBeenCalledTimes(1) // Should not be called again
    })
  })
})
