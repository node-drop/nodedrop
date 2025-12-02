import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { CustomNode } from '@/components/workflow/CustomNode'
import { useWorkflowStore } from '@/stores/workflow'
import type { NodeProps } from '@xyflow/react'
import type { CustomNodeData } from '@/components/workflow/CustomNode'

// Mock ReactFlow
vi.mock('reactflow', () => ({
  Handle: ({ children, ...props }: any) => <div data-testid="handle" {...props}>{children}</div>,
  Position: {
    Left: 'left',
    Right: 'right',
    Top: 'top',
    Bottom: 'bottom'
  },
  NodeToolbar: ({ children, ...props }: any) => <div data-testid="node-toolbar" {...props}>{children}</div>
}))

// Mock the CSS import
vi.mock('@/components/workflow/toolbar-buttons.css', () => ({}))

// Mock the workflow store
vi.mock('@/stores/workflow')

// Mock the node type classification
vi.mock('@/utils/nodeTypeClassification', () => ({
  shouldShowExecuteButton: vi.fn(() => true),
  shouldShowDisableButton: vi.fn(() => true),
  canNodeExecuteIndividually: vi.fn(() => true)
}))

describe('Error Handling Integration', () => {
  const mockExecuteNode = vi.fn()
  const mockUpdateNode = vi.fn()
  const mockGetNodeExecutionResult = vi.fn()

  const defaultNodeProps: NodeProps<CustomNodeData> = {
    id: 'test-node',
    data: {
      label: 'Test Node',
      nodeType: 'Manual Trigger',
      parameters: {},
      disabled: false,
      status: 'idle'
    },
    selected: false,
    type: 'custom',
    positionAbsoluteX: 0,
    positionAbsoluteY: 0,
    zIndex: 1,
    isConnectable: true,
    sourcePosition: 'right' as any,
    targetPosition: 'left' as any,
    dragging: false
  }

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Mock the workflow store
    vi.mocked(useWorkflowStore).mockImplementation((selector: any) => {
      const state = {
        executeNode: mockExecuteNode,
        updateNode: mockUpdateNode,
        executionState: { status: 'idle' },
        getNodeExecutionResult: mockGetNodeExecutionResult
      }
      return selector(state)
    })

    mockGetNodeExecutionResult.mockReturnValue(undefined)
  })

  describe('Error Display and User Feedback', () => {
    it('should display error state when node execution fails', async () => {
      // Mock execution result with error
      const errorResult = {
        nodeId: 'test-node',
        nodeName: 'Test Node',
        status: 'error',
        startTime: Date.now() - 1000,
        endTime: Date.now(),
        duration: 1000,
        error: {
          httpErrorType: 'TIMEOUT',
          message: 'Request timeout for GET https://api.example.com',
          isRetryable: true
        }
      }

      mockGetNodeExecutionResult.mockReturnValue(errorResult)

      render(<CustomNode {...defaultNodeProps} />)

      // Should show error state in node
      await waitFor(() => {
        const node = screen.getByText('Test Node').closest('div')
        expect(node).toHaveClass('bg-red-50', 'border-red-300')
      })

      // Should show error icon
      const alertIcon = screen.getByTestId('node-toolbar').querySelector('svg')
      expect(alertIcon).toBeTruthy()

      // Should show user-friendly error message in tooltip
      const executeButton = screen.getByRole('button', { name: /execute/i })
      expect(executeButton).toHaveAttribute('title', expect.stringContaining('The request timed out'))
    })

    it('should show retry functionality for retryable errors', async () => {
      const retryableError = {
        nodeId: 'test-node',
        nodeName: 'Test Node',
        status: 'error',
        startTime: Date.now() - 1000,
        endTime: Date.now(),
        duration: 1000,
        error: {
          httpErrorType: 'CONNECTION_REFUSED',
          message: 'Connection refused to https://api.example.com',
          isRetryable: true
        }
      }

      mockGetNodeExecutionResult.mockReturnValue(retryableError)

      render(<CustomNode {...defaultNodeProps} />)

      // Should show retry button
      await waitFor(() => {
        const executeButton = screen.getByRole('button', { name: /retry/i })
        expect(executeButton).toHaveClass('error-retryable')
      })

      // Click retry should call executeNode again
      const retryButton = screen.getByRole('button', { name: /retry/i })
      fireEvent.click(retryButton)

      expect(mockExecuteNode).toHaveBeenCalledWith('test-node')
    })

    it('should not show retry for non-retryable errors', async () => {
      const nonRetryableError = {
        nodeId: 'test-node',
        nodeName: 'Test Node',
        status: 'error',
        startTime: Date.now() - 1000,
        endTime: Date.now(),
        duration: 1000,
        error: {
          httpErrorType: 'SECURITY_ERROR',
          message: 'Security validation failed',
          isRetryable: false
        }
      }

      mockGetNodeExecutionResult.mockReturnValue(nonRetryableError)

      render(<CustomNode {...defaultNodeProps} />)

      // Should show error button but not retry
      await waitFor(() => {
        const executeButton = screen.getByRole('button')
        expect(executeButton).toHaveClass('error')
        expect(executeButton).not.toHaveClass('error-retryable')
      })

      // Should not call executeNode when clicked
      const errorButton = screen.getByRole('button')
      fireEvent.click(errorButton)

      expect(mockExecuteNode).not.toHaveBeenCalled()
    })

    it('should handle rate limiting with countdown', async () => {
      const rateLimitError = {
        nodeId: 'test-node',
        nodeName: 'Test Node',
        status: 'error',
        startTime: Date.now() - 1000,
        endTime: Date.now(),
        duration: 1000,
        error: {
          httpErrorType: 'HTTP_ERROR',
          statusCode: 429,
          message: 'HTTP 429 Too Many Requests',
          isRetryable: true,
          retryAfter: 3000 // 3 seconds
        }
      }

      mockGetNodeExecutionResult.mockReturnValue(rateLimitError)

      render(<CustomNode {...defaultNodeProps} />)

      // Should show countdown
      await waitFor(() => {
        const countdown = screen.queryByText(/[1-3]/)
        expect(countdown).toBeTruthy()
      })

      // Button should be disabled during countdown
      const button = screen.getByRole('button')
      expect(button).toBeDisabled()

      // Should show appropriate tooltip
      expect(button).toHaveAttribute('title', expect.stringContaining('retry available in'))
    })
  })

  describe('Error Logging', () => {
    it('should log errors for debugging', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const errorResult = {
        nodeId: 'test-node',
        nodeName: 'Test Node',
        status: 'error',
        startTime: Date.now() - 1000,
        endTime: Date.now(),
        duration: 1000,
        error: {
          httpErrorType: 'NETWORK_UNREACHABLE',
          message: 'Network error connecting to https://api.example.com',
          isRetryable: true
        }
      }

      mockGetNodeExecutionResult.mockReturnValue(errorResult)

      render(<CustomNode {...defaultNodeProps} />)

      // Should log error details
      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('Node execution error [test-node]'),
          expect.objectContaining({
            nodeId: 'test-node',
            nodeType: 'Manual Trigger',
            errorType: 'network',
            isRetryable: true
          })
        )
      })

      consoleSpy.mockRestore()
    })

    it('should log execution errors from executeNode calls', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      // Mock executeNode to throw an error
      mockExecuteNode.mockRejectedValue({
        httpErrorType: 'TIMEOUT',
        message: 'Request timeout',
        isRetryable: true
      })

      render(<CustomNode {...defaultNodeProps} />)

      // Click execute button
      const executeButton = screen.getByRole('button', { name: /execute/i })
      fireEvent.click(executeButton)

      // Should log the error
      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('Node execution error [test-node]'),
          expect.objectContaining({
            nodeId: 'test-node',
            nodeType: 'Manual Trigger',
            errorType: 'timeout'
          })
        )
      })

      consoleSpy.mockRestore()
    })
  })

  describe('Accessibility', () => {
    it('should announce errors to screen readers', async () => {
      const errorResult = {
        nodeId: 'test-node',
        nodeName: 'Test Node',
        status: 'error',
        startTime: Date.now() - 1000,
        endTime: Date.now(),
        duration: 1000,
        error: {
          httpErrorType: 'VALIDATION_ERROR',
          message: 'Invalid parameters',
          isRetryable: false
        }
      }

      mockGetNodeExecutionResult.mockReturnValue(errorResult)

      render(<CustomNode {...defaultNodeProps} />)

      // Should have live region with error announcement
      await waitFor(() => {
        const liveRegion = screen.getByText(/Manual Trigger execution failed/)
        expect(liveRegion).toHaveAttribute('aria-live', 'polite')
      })
    })

    it('should provide detailed error descriptions', async () => {
      const errorResult = {
        nodeId: 'test-node',
        nodeName: 'Test Node',
        status: 'error',
        startTime: Date.now() - 1000,
        endTime: Date.now(),
        duration: 1000,
        error: {
          httpErrorType: 'HTTP_ERROR',
          statusCode: 401,
          message: 'HTTP 401 Unauthorized',
          isRetryable: false
        }
      }

      mockGetNodeExecutionResult.mockReturnValue(errorResult)

      render(<CustomNode {...defaultNodeProps} />)

      // Should have detailed aria-describedby
      await waitFor(() => {
        const button = screen.getByRole('button')
        const describedBy = button.getAttribute('aria-describedby')
        expect(describedBy).toBeTruthy()

        const description = document.getElementById(describedBy!)
        expect(description?.textContent).toContain('server error')
        expect(description?.textContent).toContain('not retryable')
      })
    })
  })

  describe('Error Recovery', () => {
    it('should clear error state on successful retry', async () => {
      // Start with error state
      const errorResult = {
        nodeId: 'test-node',
        nodeName: 'Test Node',
        status: 'error',
        startTime: Date.now() - 2000,
        endTime: Date.now() - 1000,
        duration: 1000,
        error: {
          httpErrorType: 'TIMEOUT',
          message: 'Request timeout',
          isRetryable: true
        }
      }

      mockGetNodeExecutionResult.mockReturnValue(errorResult)

      const { rerender } = render(<CustomNode {...defaultNodeProps} />)

      // Should show error state
      await waitFor(() => {
        const button = screen.getByRole('button')
        expect(button).toHaveClass('error-retryable')
      })

      // Mock successful execution result
      const successResult = {
        nodeId: 'test-node',
        nodeName: 'Test Node',
        status: 'success',
        startTime: Date.now() - 500,
        endTime: Date.now(),
        duration: 500,
        data: { result: 'success' }
      }

      mockGetNodeExecutionResult.mockReturnValue(successResult)

      // Re-render with success state
      rerender(<CustomNode {...defaultNodeProps} />)

      // Should show success state
      await waitFor(() => {
        const button = screen.getByRole('button')
        expect(button).toHaveClass('success')
        expect(button).not.toHaveClass('error-retryable')
      })
    })

    it('should handle multiple consecutive errors', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      // Mock executeNode to fail multiple times
      mockExecuteNode
        .mockRejectedValueOnce({ message: 'First error', isRetryable: true })
        .mockRejectedValueOnce({ message: 'Second error', isRetryable: true })
        .mockResolvedValueOnce(undefined) // Success on third try

      render(<CustomNode {...defaultNodeProps} />)

      const executeButton = screen.getByRole('button', { name: /execute/i })

      // First execution - should fail
      fireEvent.click(executeButton)
      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('Failed to execute node:'),
          expect.objectContaining({ message: 'First error' })
        )
      })

      // Second execution - should fail again
      fireEvent.click(executeButton)
      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('Failed to execute node:'),
          expect.objectContaining({ message: 'Second error' })
        )
      })

      // Third execution - should succeed
      fireEvent.click(executeButton)
      await waitFor(() => {
        expect(mockExecuteNode).toHaveBeenCalledTimes(3)
      })

      consoleSpy.mockRestore()
    })
  })
})
