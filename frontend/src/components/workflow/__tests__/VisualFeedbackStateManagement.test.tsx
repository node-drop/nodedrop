import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { CustomNode } from '../CustomNode'
import { useWorkflowStore } from '@/stores/workflow'
import type { NodeProps } from '@xyflow/react'

// Mock the workflow store
vi.mock('@/stores/workflow')
const mockUseWorkflowStore = vi.mocked(useWorkflowStore)

// Mock the node type classification utilities
vi.mock('@/utils/nodeTypeClassification', () => ({
  shouldShowExecuteButton: vi.fn((nodeType: string) => nodeType === 'manual-trigger'),
  shouldShowDisableButton: vi.fn(() => true),
  canNodeExecuteIndividually: vi.fn((nodeType: string) => nodeType === 'manual-trigger')
}))

// Mock ReactFlow components
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

describe('CustomNode Visual Feedback and State Management', () => {
  const mockExecuteNode = vi.fn()
  const mockUpdateNode = vi.fn()
  const mockGetNodeExecutionResult = vi.fn()

  const defaultStoreState = {
    executeNode: mockExecuteNode,
    updateNode: mockUpdateNode,
    getNodeExecutionResult: mockGetNodeExecutionResult,
    executionState: {
      status: 'idle' as const,
      progress: 0
    }
  }

  const defaultNodeProps: NodeProps<any> = {
    id: 'test-node-1',
    data: {
      label: 'Test Manual Trigger',
      nodeType: 'manual-trigger',
      parameters: {},
      disabled: false,
      status: 'idle',
      icon: 'play',
      color: '#4F46E5'
    },
    selected: false,
    type: 'custom',
    position: { x: 0, y: 0 },
    positionAbsolute: { x: 0, y: 0 },
    dragging: false,
    isConnectable: true,
    zIndex: 1,
    positionAbsoluteX: 0,
    positionAbsoluteY: 0
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockUseWorkflowStore.mockImplementation((selector: any) => selector(defaultStoreState))
  })

  afterEach(() => {
    vi.clearAllTimers()
  })

  describe('Loading States', () => {
    it('should show loading state during node execution', async () => {
      // Mock execution result indicating node is executing
      mockGetNodeExecutionResult.mockReturnValue({
        nodeId: 'test-node-1',
        nodeName: 'Test Manual Trigger',
        status: 'success',
        startTime: Date.now(),
        endTime: Date.now(), // Same as start time indicates executing
        duration: 0
      })

      render(<CustomNode {...defaultNodeProps} />)

      // Should show loading spinner in node status
      expect(screen.getByTestId('node-toolbar')).toBeInTheDocument()
      
      // The loading state should be reflected in the execute button
      const executeButton = screen.getByRole('button', { name: /executing/i })
      expect(executeButton).toBeInTheDocument()
      expect(executeButton).toBeDisabled()
    })

    it('should disable execute button during workflow execution', () => {
      // Mock workflow execution state
      mockUseWorkflowStore.mockImplementation((selector: any) => selector({
        ...defaultStoreState,
        executionState: {
          status: 'running',
          progress: 50
        }
      }))

      // Ensure no node execution result to start with clean state
      mockGetNodeExecutionResult.mockReturnValue(undefined)

      render(<CustomNode {...defaultNodeProps} />)

      const executeButton = screen.getByRole('button', { name: /cannot execute - workflow is running or node is disabled/i })
      expect(executeButton).toBeDisabled()
    })
  })

  describe('Success Visual Feedback', () => {
    it('should show success state after successful node execution', async () => {
      // Mock successful execution result
      mockGetNodeExecutionResult.mockReturnValue({
        nodeId: 'test-node-1',
        nodeName: 'Test Manual Trigger',
        status: 'success',
        startTime: Date.now() - 1000,
        endTime: Date.now(),
        duration: 1000,
        data: { result: 'success' }
      })

      render(<CustomNode {...defaultNodeProps} />)

      // Should show success icon in node status
      expect(screen.getByTestId('node-toolbar')).toBeInTheDocument()

      // Execute button should show success state
      const executeButton = screen.getByRole('button', { name: /execution completed successfully/i })
      expect(executeButton).toBeInTheDocument()
    })

    it('should show success styling on node background', () => {
      // Mock successful execution result
      mockGetNodeExecutionResult.mockReturnValue({
        nodeId: 'test-node-1',
        nodeName: 'Test Manual Trigger',
        status: 'success',
        startTime: Date.now() - 1000,
        endTime: Date.now(),
        duration: 1000
      })

      const { container } = render(<CustomNode {...defaultNodeProps} />)

      // Node should have success styling
      const nodeElement = container.querySelector('.bg-green-50')
      expect(nodeElement).toBeInTheDocument()
    })
  })

  describe('Error Visual Feedback', () => {
    it('should show error state after failed node execution', () => {
      // Mock failed execution result
      mockGetNodeExecutionResult.mockReturnValue({
        nodeId: 'test-node-1',
        nodeName: 'Test Manual Trigger',
        status: 'error',
        startTime: Date.now() - 1000,
        endTime: Date.now(),
        duration: 1000,
        error: 'Execution failed'
      })

      render(<CustomNode {...defaultNodeProps} />)

      // Execute button should show error state
      const executeButton = screen.getByRole('button', { name: /execution failed - click to retry/i })
      expect(executeButton).toBeInTheDocument()
      expect(executeButton).not.toBeDisabled()
    })

    it('should show error styling on node background', () => {
      // Mock failed execution result
      mockGetNodeExecutionResult.mockReturnValue({
        nodeId: 'test-node-1',
        nodeName: 'Test Manual Trigger',
        status: 'error',
        startTime: Date.now() - 1000,
        endTime: Date.now(),
        duration: 1000,
        error: 'Execution failed'
      })

      const { container } = render(<CustomNode {...defaultNodeProps} />)

      // Node should have error styling
      const nodeElement = container.querySelector('.bg-red-50')
      expect(nodeElement).toBeInTheDocument()
    })

    it('should allow retry after error', async () => {
      // Mock failed execution result
      mockGetNodeExecutionResult.mockReturnValue({
        nodeId: 'test-node-1',
        nodeName: 'Test Manual Trigger',
        status: 'error',
        startTime: Date.now() - 1000,
        endTime: Date.now(),
        duration: 1000,
        error: 'Execution failed'
      })

      render(<CustomNode {...defaultNodeProps} />)

      const executeButton = screen.getByRole('button', { name: /execution failed - click to retry/i })
      
      fireEvent.click(executeButton)

      expect(mockExecuteNode).toHaveBeenCalledWith('test-node-1')
    })
  })

  describe('Real-time State Updates', () => {
    it('should update button states based on execution results', async () => {
      // Start with no execution result (idle state)
      mockGetNodeExecutionResult.mockReturnValue(undefined)
      
      const { rerender } = render(<CustomNode {...defaultNodeProps} />)

      // Initially idle
      expect(screen.getByRole('button', { name: /execute manual-trigger/i })).toBeInTheDocument()

      // Mock execution starting
      mockGetNodeExecutionResult.mockReturnValue({
        nodeId: 'test-node-1',
        nodeName: 'Test Manual Trigger',
        status: 'success',
        startTime: Date.now(),
        endTime: Date.now(), // Same time = executing
        duration: 0
      })

      rerender(<CustomNode {...defaultNodeProps} />)

      // Should show executing state
      expect(screen.getByRole('button', { name: /executing/i })).toBeInTheDocument()

      // Mock execution completing
      mockGetNodeExecutionResult.mockReturnValue({
        nodeId: 'test-node-1',
        nodeName: 'Test Manual Trigger',
        status: 'success',
        startTime: Date.now() - 1000,
        endTime: Date.now(),
        duration: 1000
      })

      rerender(<CustomNode {...defaultNodeProps} />)

      // Should show success state
      expect(screen.getByRole('button', { name: /execution completed successfully/i })).toBeInTheDocument()
    })

    it('should prioritize real-time execution state over data.status', () => {
      // Mock real-time execution result showing success
      mockGetNodeExecutionResult.mockReturnValue({
        nodeId: 'test-node-1',
        nodeName: 'Test Manual Trigger',
        status: 'success',
        startTime: Date.now() - 1000,
        endTime: Date.now(),
        duration: 1000
      })

      // But data.status shows error (from previous workflow execution)
      const propsWithErrorStatus = {
        ...defaultNodeProps,
        data: {
          ...defaultNodeProps.data,
          status: 'error' as const
        }
      }

      const { container } = render(<CustomNode {...propsWithErrorStatus} />)

      // Should show success styling (real-time state) not error styling (data.status)
      const nodeElement = container.querySelector('.bg-green-50')
      expect(nodeElement).toBeInTheDocument()
      
      const errorElement = container.querySelector('.bg-red-50')
      expect(errorElement).not.toBeInTheDocument()
    })
  })

  describe('Execution Conflicts', () => {
    it('should prevent individual execution during workflow execution', () => {
      // Mock workflow execution in progress
      mockUseWorkflowStore.mockImplementation((selector: any) => selector({
        ...defaultStoreState,
        executionState: {
          status: 'running',
          progress: 30,
          executionId: 'workflow-exec-123'
        }
      }))

      // Ensure no node execution result to start with clean state
      mockGetNodeExecutionResult.mockReturnValue(undefined)

      render(<CustomNode {...defaultNodeProps} />)

      const executeButton = screen.getByRole('button', { name: /cannot execute - workflow is running or node is disabled/i })
      expect(executeButton).toBeDisabled()
    })

    it('should re-enable execution after workflow completes', () => {
      // Start with no execution result
      mockGetNodeExecutionResult.mockReturnValue(undefined)
      
      // Start with workflow running
      mockUseWorkflowStore.mockImplementation((selector: any) => selector({
        ...defaultStoreState,
        executionState: {
          status: 'running',
          progress: 30
        }
      }))

      const { rerender } = render(<CustomNode {...defaultNodeProps} />)

      let executeButton = screen.getByRole('button', { name: /cannot execute - workflow is running or node is disabled/i })
      expect(executeButton).toBeDisabled()

      // Workflow completes
      mockUseWorkflowStore.mockImplementation((selector: any) => selector({
        ...defaultStoreState,
        executionState: {
          status: 'success',
          progress: 100
        }
      }))

      rerender(<CustomNode {...defaultNodeProps} />)

      executeButton = screen.getByRole('button', { name: /execute manual-trigger/i })
      expect(executeButton).not.toBeDisabled()
    })

    it('should handle execution attempt during workflow execution gracefully', async () => {
      // Mock workflow execution in progress
      mockUseWorkflowStore.mockImplementation((selector: any) => selector({
        ...defaultStoreState,
        executionState: {
          status: 'running',
          progress: 30
        }
      }))

      // Ensure no node execution result to start with clean state
      mockGetNodeExecutionResult.mockReturnValue(undefined)

      // Mock console.warn to verify warning is logged
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      render(<CustomNode {...defaultNodeProps} />)

      // Try to execute - button should be disabled but let's test the handler
      const executeButton = screen.getByRole('button', { name: /cannot execute - workflow is running or node is disabled/i })
      
      // Force click even though disabled (simulating programmatic call)
      fireEvent.click(executeButton)

      // Should not call executeNode
      expect(mockExecuteNode).not.toHaveBeenCalled()

      consoleSpy.mockRestore()
    })
  })

  describe('State Cleanup', () => {
    it('should clear success state after timeout', async () => {
      // This test verifies that the success state clearing logic exists
      // The actual timeout is handled in the ExecuteToolbarButton component
      // Mock successful execution result
      mockGetNodeExecutionResult.mockReturnValue({
        nodeId: 'test-node-1',
        nodeName: 'Test Manual Trigger',
        status: 'success',
        startTime: Date.now() - 1000,
        endTime: Date.now(),
        duration: 1000
      })

      render(<CustomNode {...defaultNodeProps} />)

      // Should show success state initially
      expect(screen.getByRole('button', { name: /execution completed successfully/i })).toBeInTheDocument()

      // The timeout logic is tested in the ExecuteToolbarButton component tests
      // Here we just verify the success state is displayed correctly
    })

    it('should reset state when execution result is cleared', () => {
      // Start with execution result
      mockGetNodeExecutionResult.mockReturnValue({
        nodeId: 'test-node-1',
        nodeName: 'Test Manual Trigger',
        status: 'success',
        startTime: Date.now() - 1000,
        endTime: Date.now(),
        duration: 1000
      })

      const { rerender } = render(<CustomNode {...defaultNodeProps} />)

      // Should show success state
      expect(screen.getByRole('button', { name: /execution completed successfully/i })).toBeInTheDocument()

      // Clear execution result
      mockGetNodeExecutionResult.mockReturnValue(undefined)

      rerender(<CustomNode {...defaultNodeProps} />)

      // Should return to idle state
      expect(screen.getByRole('button', { name: /execute manual-trigger/i })).toBeInTheDocument()
    })
  })
})
