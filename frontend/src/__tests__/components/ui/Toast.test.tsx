/**
 * Unit tests for Toast component
 */

import React from 'react'
import { vi } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { Toast, ToastContainer } from '@/components/ui/Toast'
import type { ToastProps } from '@/components/ui/Toast'

// Mock createPortal for testing
vi.mock('react-dom', async () => {
  const actual = await vi.importActual('react-dom')
  return {
    ...actual,
    createPortal: (children: React.ReactNode) => children
  }
})

describe('Toast Component', () => {
  const mockOnClose = vi.fn()

  const defaultProps: ToastProps = {
    id: 'test-toast',
    type: 'info',
    title: 'Test Title',
    onClose: mockOnClose
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('Toast', () => {
    it('should render with basic props', () => {
      render(<Toast {...defaultProps} />)
      
      expect(screen.getByText('Test Title')).toBeInTheDocument()
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })

    it('should render with message', () => {
      render(<Toast {...defaultProps} message="Test message" />)
      
      expect(screen.getByText('Test Title')).toBeInTheDocument()
      expect(screen.getByText('Test message')).toBeInTheDocument()
    })

    it('should render success toast with correct styling', () => {
      render(<Toast {...defaultProps} type="success" />)
      
      const alert = screen.getByRole('alert')
      expect(alert).toHaveClass('bg-green-50', 'border-green-200')
    })

    it('should render error toast with correct styling', () => {
      render(<Toast {...defaultProps} type="error" />)
      
      const alert = screen.getByRole('alert')
      expect(alert).toHaveClass('bg-red-50', 'border-red-200')
    })

    it('should render warning toast with correct styling', () => {
      render(<Toast {...defaultProps} type="warning" />)
      
      const alert = screen.getByRole('alert')
      expect(alert).toHaveClass('bg-yellow-50', 'border-yellow-200')
    })

    it('should render info toast with correct styling', () => {
      render(<Toast {...defaultProps} type="info" />)
      
      const alert = screen.getByRole('alert')
      expect(alert).toHaveClass('bg-blue-50', 'border-blue-200')
    })

    it.skip('should auto-close after duration', async () => {
      render(<Toast {...defaultProps} duration={1000} />)
      
      expect(mockOnClose).not.toHaveBeenCalled()
      
      act(() => {
        vi.advanceTimersByTime(1000)
      })
      
      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalledWith('test-toast')
      })
    })

    it('should not auto-close when persistent', () => {
      render(<Toast {...defaultProps} persistent duration={1000} />)
      
      act(() => {
        vi.advanceTimersByTime(2000)
      })
      
      expect(mockOnClose).not.toHaveBeenCalled()
    })

    it('should close when close button is clicked', () => {
      render(<Toast {...defaultProps} />)
      
      const closeButton = screen.getByLabelText('Close notification')
      fireEvent.click(closeButton)
      
      // Should trigger exit animation, then call onClose after delay
      act(() => {
        vi.advanceTimersByTime(300)
      })
      
      expect(mockOnClose).toHaveBeenCalledWith('test-toast')
    })

    it('should render action buttons', () => {
      const mockAction = vi.fn()
      const actions = [
        { label: 'Retry', onClick: mockAction, variant: 'primary' as const },
        { label: 'Cancel', onClick: mockAction, variant: 'secondary' as const }
      ]
      
      render(<Toast {...defaultProps} actions={actions} />)
      
      expect(screen.getByText('Retry')).toBeInTheDocument()
      expect(screen.getByText('Cancel')).toBeInTheDocument()
    })

    it('should call action onClick when action button is clicked', () => {
      const mockAction = vi.fn()
      const actions = [{ label: 'Retry', onClick: mockAction }]
      
      render(<Toast {...defaultProps} actions={actions} />)
      
      fireEvent.click(screen.getByText('Retry'))
      expect(mockAction).toHaveBeenCalled()
    })

    it('should have correct aria attributes', () => {
      render(<Toast {...defaultProps} type="error" />)
      
      const alert = screen.getByRole('alert')
      expect(alert).toHaveAttribute('aria-live', 'assertive')
    })

    it('should have polite aria-live for non-error toasts', () => {
      render(<Toast {...defaultProps} type="success" />)
      
      const alert = screen.getByRole('alert')
      expect(alert).toHaveAttribute('aria-live', 'polite')
    })
  })

  describe('ToastContainer', () => {
    const createToast = (id: string, type: ToastProps['type'] = 'info'): ToastProps => ({
      id,
      type,
      title: `Toast ${id}`,
      onClose: mockOnClose
    })

    it('should render nothing when no toasts', () => {
      const { container } = render(<ToastContainer toasts={[]} />)
      expect(container.firstChild).toBeNull()
    })

    it('should render multiple toasts', () => {
      const toasts = [
        createToast('1', 'success'),
        createToast('2', 'error'),
        createToast('3', 'warning')
      ]
      
      render(<ToastContainer toasts={toasts} />)
      
      expect(screen.getByText('Toast 1')).toBeInTheDocument()
      expect(screen.getByText('Toast 2')).toBeInTheDocument()
      expect(screen.getByText('Toast 3')).toBeInTheDocument()
    })

    it('should position container correctly', () => {
      const toasts = [createToast('1')]
      
      render(<ToastContainer toasts={toasts} position="top-right" />)
      
      const container = screen.getByLabelText('Notifications')
      expect(container).toHaveClass('top-4', 'right-4')
    })

    it('should position container at bottom-left', () => {
      const toasts = [createToast('1')]
      
      render(<ToastContainer toasts={toasts} position="bottom-left" />)
      
      const container = screen.getByLabelText('Notifications')
      expect(container).toHaveClass('bottom-4', 'left-4')
    })

    it('should position container at top-center', () => {
      const toasts = [createToast('1')]
      
      render(<ToastContainer toasts={toasts} position="top-center" />)
      
      const container = screen.getByLabelText('Notifications')
      expect(container).toHaveClass('top-4', 'left-1/2', 'transform', '-translate-x-1/2')
    })

    it('should have correct accessibility attributes', () => {
      const toasts = [createToast('1')]
      
      render(<ToastContainer toasts={toasts} />)
      
      const container = screen.getByLabelText('Notifications')
      expect(container).toHaveAttribute('aria-live', 'polite')
      expect(container).toHaveAttribute('aria-label', 'Notifications')
    })
  })
})
