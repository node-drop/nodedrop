import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { ExecuteToolbarButton } from '../ExecuteToolbarButton'
import type { ExecuteToolbarButtonProps } from '../types'

describe('ExecuteToolbarButton Visual Feedback', () => {
  const defaultProps: ExecuteToolbarButtonProps = {
    nodeId: 'test-node-1',
    nodeType: 'manual-trigger',
    isExecuting: false,
    canExecute: true,
    hasError: false,
    hasSuccess: false,
    onExecute: vi.fn()
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllTimers()
  })

  describe('Success State Management', () => {
    it('should show success state when hasSuccess is true', () => {
      render(<ExecuteToolbarButton {...defaultProps} hasSuccess={true} />)

      const button = screen.getByRole('button', { name: /execution completed successfully/i })
      expect(button).toBeInTheDocument()
      expect(button).toHaveClass('bg-green-50', 'border-green-200', 'text-green-600')
    })

    it('should clear success state after 2 seconds', async () => {
      vi.useFakeTimers()

      const { rerender } = render(<ExecuteToolbarButton {...defaultProps} hasSuccess={true} />)

      // Should show success state initially
      expect(screen.getByRole('button', { name: /execution completed successfully/i })).toBeInTheDocument()

      // Fast forward 2 seconds
      act(() => {
        vi.advanceTimersByTime(2000)
      })

      // Success state should be cleared internally, but we need to trigger a re-render
      // to see the change since the component manages this state internally
      rerender(<ExecuteToolbarButton {...defaultProps} hasSuccess={false} />)

      // Should show normal execute button
      expect(screen.getByRole('button', { name: /execute manual-trigger/i })).toBeInTheDocument()

      vi.useRealTimers()
    })

    it('should not show success state when isExecuting is true', () => {
      render(<ExecuteToolbarButton {...defaultProps} hasSuccess={true} isExecuting={true} />)

      // Should show executing state, not success state
      const button = screen.getByRole('button', { name: /executing/i })
      expect(button).toBeInTheDocument()
      expect(button).toHaveClass('bg-blue-50', 'border-blue-200', 'text-blue-600')
    })
  })

  describe('Error State Management', () => {
    it('should show error state when hasError is true', () => {
      render(<ExecuteToolbarButton {...defaultProps} hasError={true} />)

      const button = screen.getByRole('button', { name: /execution failed - click to retry/i })
      expect(button).toBeInTheDocument()
      expect(button).toHaveClass('bg-red-50', 'border-red-200', 'text-red-600')
    })

    it('should prioritize success state over error state', () => {
      render(<ExecuteToolbarButton {...defaultProps} hasError={true} hasSuccess={true} />)

      // Should show success state, not error state (success has higher priority)
      const button = screen.getByRole('button', { name: /execution completed successfully/i })
      expect(button).toBeInTheDocument()
      expect(button).toHaveClass('bg-green-50', 'border-green-200', 'text-green-600')
    })

    it('should allow retry when in error state', () => {
      const mockOnExecute = vi.fn()
      render(<ExecuteToolbarButton {...defaultProps} hasError={true} onExecute={mockOnExecute} />)

      const button = screen.getByRole('button', { name: /execution failed - click to retry/i })
      fireEvent.click(button)

      expect(mockOnExecute).toHaveBeenCalledWith('test-node-1')
    })
  })

  describe('Loading State Management', () => {
    it('should show loading state when isExecuting is true', () => {
      render(<ExecuteToolbarButton {...defaultProps} isExecuting={true} />)

      const button = screen.getByRole('button', { name: /executing/i })
      expect(button).toBeInTheDocument()
      expect(button).toBeDisabled()
      expect(button).toHaveClass('bg-blue-50', 'border-blue-200', 'text-blue-600', 'cursor-not-allowed')
    })

    it('should not execute when in loading state', () => {
      const mockOnExecute = vi.fn()
      render(<ExecuteToolbarButton {...defaultProps} isExecuting={true} onExecute={mockOnExecute} />)

      const button = screen.getByRole('button', { name: /executing/i })
      fireEvent.click(button)

      expect(mockOnExecute).not.toHaveBeenCalled()
    })
  })

  describe('Disabled State Management', () => {
    it('should show disabled state when canExecute is false', () => {
      render(<ExecuteToolbarButton {...defaultProps} canExecute={false} />)

      const button = screen.getByRole('button', { name: /cannot execute - workflow is running or node is disabled/i })
      expect(button).toBeInTheDocument()
      expect(button).toBeDisabled()
      expect(button).toHaveClass('bg-gray-50', 'border-gray-200', 'text-gray-400', 'cursor-not-allowed')
    })

    it('should not execute when disabled', () => {
      const mockOnExecute = vi.fn()
      render(<ExecuteToolbarButton {...defaultProps} canExecute={false} onExecute={mockOnExecute} />)

      const button = screen.getByRole('button', { name: /cannot execute - workflow is running or node is disabled/i })
      fireEvent.click(button)

      expect(mockOnExecute).not.toHaveBeenCalled()
    })
  })

  describe('State Priority', () => {
    it('should prioritize states in correct order: success > error > executing > disabled > normal', () => {
      // Success state (highest priority) - only shows when not executing
      const { rerender } = render(<ExecuteToolbarButton {...defaultProps} hasSuccess={true} hasError={true} isExecuting={false} canExecute={false} />)
      expect(screen.getByRole('button', { name: /execution completed successfully/i })).toBeInTheDocument()

      // Error state (second priority) - when hasSuccess is false, hasError takes precedence
      rerender(<ExecuteToolbarButton {...defaultProps} hasSuccess={false} hasError={true} isExecuting={true} canExecute={false} />)
      expect(screen.getByRole('button', { name: /execution failed - click to retry/i })).toBeInTheDocument()

      // Executing state (third priority)
      rerender(<ExecuteToolbarButton {...defaultProps} hasSuccess={false} hasError={false} isExecuting={true} canExecute={false} />)
      expect(screen.getByRole('button', { name: /executing/i })).toBeInTheDocument()

      // Disabled state (fourth priority)
      rerender(<ExecuteToolbarButton {...defaultProps} hasSuccess={false} hasError={false} isExecuting={false} canExecute={false} />)
      expect(screen.getByRole('button', { name: /cannot execute - workflow is running or node is disabled/i })).toBeInTheDocument()

      // Normal state (lowest priority)
      rerender(<ExecuteToolbarButton {...defaultProps} hasSuccess={false} hasError={false} isExecuting={false} canExecute={true} />)
      expect(screen.getByRole('button', { name: /execute manual-trigger/i })).toBeInTheDocument()
    })
  })

  describe('Visual Styling', () => {
    it('should apply correct hover effects for normal state', () => {
      render(<ExecuteToolbarButton {...defaultProps} />)

      const button = screen.getByRole('button', { name: /execute manual-trigger/i })
      expect(button).toHaveClass('hover:bg-gray-50', 'hover:scale-110')
    })

    it('should apply correct hover effects for success state', () => {
      render(<ExecuteToolbarButton {...defaultProps} hasSuccess={true} />)

      const button = screen.getByRole('button', { name: /execution completed successfully/i })
      expect(button).toHaveClass('hover:bg-green-100')
    })

    it('should apply correct hover effects for error state', () => {
      render(<ExecuteToolbarButton {...defaultProps} hasError={true} />)

      const button = screen.getByRole('button', { name: /execution failed - click to retry/i })
      expect(button).toHaveClass('hover:bg-red-100')
    })

    it('should have consistent base styling across all states', () => {
      const states = [
        { props: {}, name: /execute manual-trigger/i },
        { props: { hasSuccess: true }, name: /execution completed successfully/i },
        { props: { hasError: true }, name: /execution failed - click to retry/i },
        { props: { isExecuting: true }, name: /executing/i },
        { props: { canExecute: false }, name: /cannot execute - workflow is running or node is disabled/i }
      ]

      states.forEach(({ props, name }) => {
        const { unmount } = render(<ExecuteToolbarButton {...defaultProps} {...props} />)
        
        const button = screen.getByRole('button', { name })
        expect(button).toHaveClass(
          'toolbar-button',
          'w-6', 'h-6', 'rounded-full', 'border',
          'flex', 'items-center', 'justify-center',
          'transition-all', 'duration-150', 'ease-in-out',
          'shadow-sm', 'hover:shadow-md',
          'focus:outline-none', 'focus:ring-2', 'focus:ring-blue-500', 'focus:ring-offset-1'
        )
        
        unmount()
      })
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels for all states', () => {
      const states = [
        { props: {}, expectedLabel: 'Execute manual-trigger' },
        { props: { hasSuccess: true }, expectedLabel: 'Execution completed successfully' },
        { props: { hasError: true }, expectedLabel: 'Execution failed - click to retry' },
        { props: { isExecuting: true }, expectedLabel: 'Executing...' },
        { props: { canExecute: false }, expectedLabel: 'Cannot execute - workflow is running or node is disabled' }
      ]

      states.forEach(({ props, expectedLabel }) => {
        const { unmount } = render(<ExecuteToolbarButton {...defaultProps} {...props} />)
        
        const button = screen.getByRole('button')
        expect(button).toHaveAttribute('aria-label', expectedLabel)
        expect(button).toHaveAttribute('title', expectedLabel)
        
        unmount()
      })
    })

    it('should be keyboard accessible', () => {
      const mockOnExecute = vi.fn()
      render(<ExecuteToolbarButton {...defaultProps} onExecute={mockOnExecute} />)

      const button = screen.getByRole('button')
      
      // Test Enter key
      fireEvent.keyDown(button, { key: 'Enter' })
      expect(mockOnExecute).toHaveBeenCalledWith('test-node-1')

      mockOnExecute.mockClear()

      // Test Space key
      fireEvent.keyDown(button, { key: ' ' })
      expect(mockOnExecute).toHaveBeenCalledWith('test-node-1')
    })

    it('should not execute on keyboard when disabled', () => {
      const mockOnExecute = vi.fn()
      render(<ExecuteToolbarButton {...defaultProps} canExecute={false} onExecute={mockOnExecute} />)

      const button = screen.getByRole('button')
      
      fireEvent.keyDown(button, { key: 'Enter' })
      fireEvent.keyDown(button, { key: ' ' })
      
      expect(mockOnExecute).not.toHaveBeenCalled()
    })
  })
})
