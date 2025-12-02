import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { ExecuteToolbarButton } from '../ExecuteToolbarButton'
import type { NodeExecutionError } from '../types'

// Mock the CSS import
vi.mock('../toolbar-buttons.css', () => ({}))

describe('ExecuteToolbarButton Error Handling and User Feedback', () => {
  const defaultProps = {
    nodeId: 'test-node',
    nodeType: 'Manual Trigger',
    isExecuting: false,
    canExecute: true,
    hasError: false,
    hasSuccess: false,
    onExecute: vi.fn(),
    onRetry: vi.fn()
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Error Display', () => {
    it('should display error icon for non-retryable errors', () => {
      const executionError: NodeExecutionError = {
        type: 'validation',
        message: 'Invalid parameters',
        userFriendlyMessage: 'Invalid input parameters. Please check your node configuration.',
        isRetryable: false,
        timestamp: Date.now()
      }

      render(
        <ExecuteToolbarButton
          {...defaultProps}
          hasError={true}
          executionError={executionError}
        />
      )

      // Should show alert circle icon for non-retryable errors
      const button = screen.getByRole('button')
      expect(button).toHaveClass('error')
      expect(button.querySelector('svg')).toBeTruthy()
    })

    it('should display retry icon for retryable errors', () => {
      const executionError: NodeExecutionError = {
        type: 'timeout',
        message: 'Request timed out',
        userFriendlyMessage: 'The request timed out. Please try again.',
        isRetryable: true,
        timestamp: Date.now()
      }

      render(
        <ExecuteToolbarButton
          {...defaultProps}
          hasError={true}
          executionError={executionError}
        />
      )

      // Should show retry icon for retryable errors
      const button = screen.getByRole('button')
      expect(button).toHaveClass('error-retryable')
    })

    it('should show user-friendly error message in tooltip', () => {
      const executionError: NodeExecutionError = {
        type: 'network',
        message: 'ECONNREFUSED',
        userFriendlyMessage: 'Connection was refused by the server. The service may be down.',
        isRetryable: true,
        timestamp: Date.now()
      }

      render(
        <ExecuteToolbarButton
          {...defaultProps}
          hasError={true}
          executionError={executionError}
        />
      )

      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('title', expect.stringContaining('Connection was refused by the server'))
    })

    it('should announce error to screen readers', () => {
      const executionError: NodeExecutionError = {
        type: 'security',
        message: 'Security validation failed',
        userFriendlyMessage: 'Security validation failed. The request was blocked.',
        isRetryable: false,
        timestamp: Date.now()
      }

      render(
        <ExecuteToolbarButton
          {...defaultProps}
          hasError={true}
          executionError={executionError}
        />
      )

      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('aria-label', expect.stringContaining('Security validation failed'))
    })
  })

  describe('Retry Functionality', () => {
    it('should call onRetry for retryable errors', () => {
      const onRetry = vi.fn()
      const executionError: NodeExecutionError = {
        type: 'timeout',
        message: 'Request timed out',
        userFriendlyMessage: 'The request timed out. Please try again.',
        isRetryable: true,
        timestamp: Date.now()
      }

      render(
        <ExecuteToolbarButton
          {...defaultProps}
          hasError={true}
          executionError={executionError}
          onRetry={onRetry}
        />
      )

      const button = screen.getByRole('button')
      fireEvent.click(button)

      expect(onRetry).toHaveBeenCalledWith('test-node')
      expect(defaultProps.onExecute).not.toHaveBeenCalled()
    })

    it('should not call onRetry for non-retryable errors', () => {
      const onRetry = vi.fn()
      const executionError: NodeExecutionError = {
        type: 'validation',
        message: 'Invalid parameters',
        userFriendlyMessage: 'Invalid input parameters. Please check your node configuration.',
        isRetryable: false,
        timestamp: Date.now()
      }

      render(
        <ExecuteToolbarButton
          {...defaultProps}
          hasError={true}
          executionError={executionError}
          onRetry={onRetry}
        />
      )

      const button = screen.getByRole('button')
      fireEvent.click(button)

      expect(onRetry).not.toHaveBeenCalled()
      // For non-retryable errors, neither onRetry nor onExecute should be called
      expect(defaultProps.onExecute).not.toHaveBeenCalled()
    })

    it('should handle retry with keyboard activation', () => {
      const onRetry = vi.fn()
      const executionError: NodeExecutionError = {
        type: 'network',
        message: 'Network error',
        userFriendlyMessage: 'Network error occurred. Please check your connection.',
        isRetryable: true,
        timestamp: Date.now()
      }

      render(
        <ExecuteToolbarButton
          {...defaultProps}
          hasError={true}
          executionError={executionError}
          onRetry={onRetry}
        />
      )

      const button = screen.getByRole('button')
      fireEvent.keyDown(button, { key: 'Enter' })

      expect(onRetry).toHaveBeenCalledWith('test-node')
    })
  })

  describe('Retry Countdown', () => {
    it('should show countdown for retryable errors with retryAfter', async () => {
      const executionError: NodeExecutionError = {
        type: 'server',
        message: 'Too many requests',
        userFriendlyMessage: 'Too many requests. Please wait before trying again.',
        isRetryable: true,
        retryAfter: 3000, // 3 seconds
        timestamp: Date.now()
      }

      render(
        <ExecuteToolbarButton
          {...defaultProps}
          hasError={true}
          executionError={executionError}
        />
      )

      // Should show countdown
      await waitFor(() => {
        const countdown = screen.getByText('3')
        expect(countdown).toBeTruthy()
      })

      // Button should be disabled during countdown
      const button = screen.getByRole('button')
      expect(button).toBeDisabled()
    })

    it('should enable retry after countdown expires', async () => {
      const executionError: NodeExecutionError = {
        type: 'server',
        message: 'Too many requests',
        userFriendlyMessage: 'Too many requests. Please wait before trying again.',
        isRetryable: true,
        retryAfter: 1000, // 1 second
        timestamp: Date.now()
      }

      render(
        <ExecuteToolbarButton
          {...defaultProps}
          hasError={true}
          executionError={executionError}
        />
      )

      const button = screen.getByRole('button')
      expect(button).toBeDisabled()

      // Wait for countdown to expire
      await waitFor(() => {
        expect(button).not.toBeDisabled()
      }, { timeout: 2000 })
    })

    it('should update aria-label during countdown', async () => {
      const executionError: NodeExecutionError = {
        type: 'server',
        message: 'Too many requests',
        userFriendlyMessage: 'Too many requests. Please wait before trying again.',
        isRetryable: true,
        retryAfter: 2000, // 2 seconds
        timestamp: Date.now()
      }

      render(
        <ExecuteToolbarButton
          {...defaultProps}
          hasError={true}
          executionError={executionError}
        />
      )

      const button = screen.getByRole('button')
      
      // Should mention countdown in aria-label
      await waitFor(() => {
        expect(button).toHaveAttribute('aria-label', expect.stringContaining('retry available in'))
      })
    })
  })

  describe('Error Type Handling', () => {
    const errorTypes: Array<{
      type: NodeExecutionError['type']
      message: string
      userFriendlyMessage: string
      isRetryable: boolean
    }> = [
      {
        type: 'timeout',
        message: 'Request timed out',
        userFriendlyMessage: 'The request timed out. Please try again.',
        isRetryable: true
      },
      {
        type: 'network',
        message: 'Network error',
        userFriendlyMessage: 'Network error occurred. Please check your connection.',
        isRetryable: true
      },
      {
        type: 'validation',
        message: 'Invalid parameters',
        userFriendlyMessage: 'Invalid input parameters. Please check your configuration.',
        isRetryable: false
      },
      {
        type: 'security',
        message: 'Security error',
        userFriendlyMessage: 'Security validation failed. The request was blocked.',
        isRetryable: false
      },
      {
        type: 'server',
        message: 'Server error',
        userFriendlyMessage: 'Server error occurred. Please try again later.',
        isRetryable: true
      },
      {
        type: 'unknown',
        message: 'Unknown error',
        userFriendlyMessage: 'An unexpected error occurred.',
        isRetryable: false
      }
    ]

    errorTypes.forEach(({ type, message, userFriendlyMessage, isRetryable }) => {
      it(`should handle ${type} errors correctly`, () => {
        const executionError: NodeExecutionError = {
          type,
          message,
          userFriendlyMessage,
          isRetryable,
          timestamp: Date.now()
        }

        render(
          <ExecuteToolbarButton
            {...defaultProps}
            hasError={true}
            executionError={executionError}
          />
        )

        const button = screen.getByRole('button')
        
        // Check correct CSS class
        if (isRetryable) {
          expect(button).toHaveClass('error-retryable')
        } else {
          expect(button).toHaveClass('error')
        }

        // Check tooltip contains user-friendly message
        expect(button).toHaveAttribute('title', expect.stringContaining(userFriendlyMessage))

        // Check aria-label contains appropriate information about the error
        const ariaLabel = button.getAttribute('aria-label')
        expect(ariaLabel).toContain('Manual Trigger execution failed')
      })
    })
  })

  describe('Live Region Announcements', () => {
    it('should announce error state changes to screen readers', () => {
      const executionError: NodeExecutionError = {
        type: 'timeout',
        message: 'Request timed out',
        userFriendlyMessage: 'The request timed out. Please try again.',
        isRetryable: true,
        timestamp: Date.now()
      }

      render(
        <ExecuteToolbarButton
          {...defaultProps}
          hasError={true}
          executionError={executionError}
        />
      )

      // Should have live region with error announcement
      const liveRegion = screen.getByText(/Manual Trigger execution failed/)
      expect(liveRegion).toHaveAttribute('aria-live', 'polite')
    })

    it('should clear announcements when error is resolved', () => {
      const executionError: NodeExecutionError = {
        type: 'timeout',
        message: 'Request timed out',
        userFriendlyMessage: 'The request timed out. Please try again.',
        isRetryable: true,
        timestamp: Date.now()
      }

      const { rerender } = render(
        <ExecuteToolbarButton
          {...defaultProps}
          hasError={true}
          executionError={executionError}
        />
      )

      // Should have error announcement
      expect(screen.getByText(/Manual Trigger execution failed/)).toBeTruthy()

      // Clear error
      rerender(
        <ExecuteToolbarButton
          {...defaultProps}
          hasError={false}
          executionError={undefined}
        />
      )

      // Should clear announcement
      const liveRegion = document.querySelector('[aria-live="polite"]')
      expect(liveRegion?.textContent).toBe('')
    })
  })

  describe('Accessibility', () => {
    it('should provide detailed aria-describedby for errors', () => {
      const executionError: NodeExecutionError = {
        type: 'network',
        message: 'Connection failed',
        userFriendlyMessage: 'Network error occurred. Please check your connection.',
        isRetryable: true,
        timestamp: Date.now()
      }

      render(
        <ExecuteToolbarButton
          {...defaultProps}
          hasError={true}
          executionError={executionError}
        />
      )

      const button = screen.getByRole('button')
      const describedBy = button.getAttribute('aria-describedby')
      expect(describedBy).toBeTruthy()

      const description = document.getElementById(describedBy!)
      expect(description?.textContent).toContain('network error')
      expect(description?.textContent).toContain('retry')
    })

    it('should indicate retry availability in aria-description', () => {
      const executionError: NodeExecutionError = {
        type: 'timeout',
        message: 'Request timed out',
        userFriendlyMessage: 'The request timed out. Please try again.',
        isRetryable: true,
        timestamp: Date.now()
      }

      render(
        <ExecuteToolbarButton
          {...defaultProps}
          hasError={true}
          executionError={executionError}
        />
      )

      const button = screen.getByRole('button')
      const describedBy = button.getAttribute('aria-describedby')
      const description = document.getElementById(describedBy!)
      
      expect(description?.textContent).toContain('You can retry by activating this button')
    })

    it('should indicate non-retryable errors in aria-description', () => {
      const executionError: NodeExecutionError = {
        type: 'validation',
        message: 'Invalid parameters',
        userFriendlyMessage: 'Invalid input parameters. Please check your configuration.',
        isRetryable: false,
        timestamp: Date.now()
      }

      render(
        <ExecuteToolbarButton
          {...defaultProps}
          hasError={true}
          executionError={executionError}
        />
      )

      const button = screen.getByRole('button')
      const describedBy = button.getAttribute('aria-describedby')
      const description = document.getElementById(describedBy!)
      
      expect(description?.textContent).toContain('This error is not retryable')
    })
  })
})
