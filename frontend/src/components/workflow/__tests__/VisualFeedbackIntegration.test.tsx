import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
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

describe('Visual Feedback Integration', () => {
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
    mockGetNodeExecutionResult.mockReturnValue(undefined)
  })

  it('should provide complete visual feedback flow for node execution', async () => {
    vi.useFakeTimers()

    // Start with idle state
    const { rerender } = render(<CustomNode {...defaultNodeProps} />)

    // Should show normal execute button
    expect(screen.getByRole('button', { name: /execute manual-trigger/i })).toBeInTheDocument()

    // Simulate clicking execute button
    const executeButton = screen.getByRole('button', { name: /execute manual-trigger/i })
    fireEvent.click(executeButton)

    // Should call executeNode
    expect(mockExecuteNode).toHaveBeenCalledWith('test-node-1')

    // Simulate execution starting - mock the execution result
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
    expect(screen.getByRole('button', { name: /executing/i })).toBeDisabled()

    // Simulate execution completing successfully
    mockGetNodeExecutionResult.mockReturnValue({
      nodeId: 'test-node-1',
      nodeName: 'Test Manual Trigger',
      status: 'success',
      startTime: Date.now() - 1000,
      endTime: Date.now(),
      duration: 1000,
      data: { result: 'success' }
    })

    rerender(<CustomNode {...defaultNodeProps} />)

    // Should show success state
    expect(screen.getByRole('button', { name: /execution completed successfully/i })).toBeInTheDocument()

    // Node should have success styling
    const nodeElement = screen.getByText('Test Manual Trigger').closest('.px-4')
    expect(nodeElement).toHaveClass('bg-green-50', 'border-green-300')

    // Success state should clear after timeout (handled by ExecuteToolbarButton)
    act(() => {
      vi.advanceTimersByTime(3100)
    })

    // Clear the execution result to simulate state cleanup
    mockGetNodeExecutionResult.mockReturnValue(undefined)
    rerender(<CustomNode {...defaultNodeProps} />)

    // Should return to normal state
    expect(screen.getByRole('button', { name: /execute manual-trigger/i })).toBeInTheDocument()

    vi.useRealTimers()
  })

  it('should provide complete visual feedback flow for failed execution', async () => {
    // Start with idle state
    const { rerender } = render(<CustomNode {...defaultNodeProps} />)

    // Should show normal execute button
    expect(screen.getByRole('button', { name: /execute manual-trigger/i })).toBeInTheDocument()

    // Simulate execution failing
    mockGetNodeExecutionResult.mockReturnValue({
      nodeId: 'test-node-1',
      nodeName: 'Test Manual Trigger',
      status: 'error',
      startTime: Date.now() - 1000,
      endTime: Date.now(),
      duration: 1000,
      error: 'Execution failed'
    })

    rerender(<CustomNode {...defaultNodeProps} />)

    // Should show error state
    expect(screen.getByRole('button', { name: /execution failed - click to retry/i })).toBeInTheDocument()

    // Node should have error styling
    const nodeElement = screen.getByText('Test Manual Trigger').closest('.px-4')
    expect(nodeElement).toHaveClass('bg-red-50', 'border-red-300')

    // Should allow retry
    const retryButton = screen.getByRole('button', { name: /execution failed - click to retry/i })
    expect(retryButton).not.toBeDisabled()

    // Click retry
    fireEvent.click(retryButton)
    expect(mockExecuteNode).toHaveBeenCalledWith('test-node-1')
  })

  it('should prevent execution during workflow execution', () => {
    // Mock workflow execution in progress
    mockUseWorkflowStore.mockImplementation((selector: any) => selector({
      ...defaultStoreState,
      executionState: {
        status: 'running',
        progress: 50,
        executionId: 'workflow-exec-123'
      }
    }))

    render(<CustomNode {...defaultNodeProps} />)

    // Should show disabled execute button
    const executeButton = screen.getByRole('button', { name: /cannot execute - workflow is running or node is disabled/i })
    expect(executeButton).toBeDisabled()

    // Click should not execute
    fireEvent.click(executeButton)
    expect(mockExecuteNode).not.toHaveBeenCalled()
  })

  it('should handle mixed states correctly', () => {
    // Test node with both execution result and workflow execution
    mockUseWorkflowStore.mockImplementation((selector: any) => selector({
      ...defaultStoreState,
      executionState: {
        status: 'running',
        progress: 30
      }
    }))

    // Mock previous execution result
    mockGetNodeExecutionResult.mockReturnValue({
      nodeId: 'test-node-1',
      nodeName: 'Test Manual Trigger',
      status: 'success',
      startTime: Date.now() - 2000,
      endTime: Date.now() - 1000,
      duration: 1000
    })

    render(<CustomNode {...defaultNodeProps} />)

    // Should show success state from previous execution but button should be disabled due to workflow execution
    const executeButton = screen.getByRole('button', { name: /execution completed successfully/i })
    expect(executeButton).toBeDisabled() // Disabled because workflow is running

    // Node should show success styling from previous execution
    const nodeElement = screen.getByText('Test Manual Trigger').closest('.px-4')
    expect(nodeElement).toHaveClass('bg-green-50', 'border-green-300')

    // Click should not execute because workflow is running
    fireEvent.click(executeButton)
    expect(mockExecuteNode).not.toHaveBeenCalled()
  })

  it('should handle disabled node state', () => {
    const disabledNodeProps = {
      ...defaultNodeProps,
      data: {
        ...defaultNodeProps.data,
        disabled: true
      }
    }

    render(<CustomNode {...disabledNodeProps} />)

    // Should show disabled execute button
    const executeButton = screen.getByRole('button', { name: /cannot execute - workflow is running or node is disabled/i })
    expect(executeButton).toBeDisabled()

    // Node should have disabled styling
    const nodeElement = screen.getByText('Test Manual Trigger').closest('.px-4')
    expect(nodeElement).toHaveClass('bg-gray-100', 'border-gray-300', 'text-gray-500', 'opacity-50')

    // Should show disabled overlay
    expect(screen.getByTestId('disabled-overlay')).toBeInTheDocument()
  })
})
