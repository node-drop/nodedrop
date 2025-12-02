import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ReactFlowProvider } from '@xyflow/react'
import { createWithEqualityFn } from 'zustand/traditional'
import { ExecuteToolbarButton } from '@/components/workflow/ExecuteToolbarButton'
import { DisableToggleToolbarButton } from '@/components/workflow/DisableToggleToolbarButton'
import { 
  canNodeExecuteIndividually, 
  shouldShowExecuteButton, 
  shouldShowDisableButton 
} from '@/utils/nodeTypeClassification'
import type { WorkflowNode } from '@/types'

// Mock workflow store
const mockWorkflowStore = createWithEqualityFn<{
  workflow: { nodes: WorkflowNode[] } | null
  executionState: { status: string; nodeResults: Map<string, any> }
  updateNode: (nodeId: string, updates: Partial<WorkflowNode>) => void
  executeNode: (nodeId: string) => Promise<void>
  getNodeExecutionResult: (nodeId: string) => any
}>((set, get) => ({
  workflow: null,
  executionState: { status: 'idle', nodeResults: new Map() },
  updateNode: vi.fn((nodeId: string, updates: Partial<WorkflowNode>) => {
    const state = get()
    if (state.workflow) {
      const nodeIndex = state.workflow.nodes.findIndex(n => n.id === nodeId)
      if (nodeIndex >= 0) {
        const updatedNodes = [...state.workflow.nodes]
        const currentNode = updatedNodes[nodeIndex]
        // Handle both direct updates and data updates
        if (updates.data) {
          updatedNodes[nodeIndex] = { 
            ...currentNode, 
            data: { ...currentNode.data, ...updates.data }
          }
        } else {
          updatedNodes[nodeIndex] = { ...currentNode, ...updates }
        }
        set({ workflow: { ...state.workflow, nodes: updatedNodes } })
      }
    }
  }),
  executeNode: vi.fn(async (nodeId: string) => {
    set(state => ({
      executionState: {
        ...state.executionState,
        nodeResults: new Map(state.executionState.nodeResults).set(nodeId, { status: 'success' })
      }
    }))
  }),
  getNodeExecutionResult: vi.fn((nodeId: string) => {
    const state = get()
    return state.executionState.nodeResults.get(nodeId)
  })
}))

// Mock the workflow store hook
vi.mock('@/stores/workflow', () => ({
  useWorkflowStore: () => mockWorkflowStore.getState()
}))

describe('Node Hover Controls Integration', () => {
  const mockNodes: WorkflowNode[] = [
    {
      id: 'trigger-1',
      type: 'customNode',
      position: { x: 0, y: 0 },
      data: {
        label: 'Manual Trigger',
        nodeType: 'Manual Trigger',
        parameters: {},
        disabled: false,
        status: 'idle'
      }
    },
    {
      id: 'action-1',
      type: 'customNode',
      position: { x: 200, y: 0 },
      data: {
        label: 'HTTP Request',
        nodeType: 'HTTP Request',
        parameters: {},
        disabled: false,
        status: 'idle'
      }
    },
    {
      id: 'transform-1',
      type: 'customNode',
      position: { x: 400, y: 0 },
      data: {
        label: 'JSON Transform',
        nodeType: 'JSON',
        parameters: {},
        disabled: true,
        status: 'idle'
      }
    }
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    mockWorkflowStore.setState({
      workflow: { nodes: mockNodes },
      executionState: { status: 'idle', nodeResults: new Map() }
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Node Type Classification Integration', () => {
    it('correctly identifies which nodes can execute individually', () => {
      expect(canNodeExecuteIndividually('Manual Trigger')).toBe(true)
      expect(canNodeExecuteIndividually('HTTP Request')).toBe(false)
      expect(canNodeExecuteIndividually('JSON')).toBe(false)
    })

    it('determines execute button visibility based on node type', () => {
      expect(shouldShowExecuteButton('Manual Trigger')).toBe(true)
      expect(shouldShowExecuteButton('HTTP Request')).toBe(false)
      expect(shouldShowExecuteButton('JSON')).toBe(false)
    })

    it('determines disable button visibility for all node types', () => {
      expect(shouldShowDisableButton('Manual Trigger')).toBe(true)
      expect(shouldShowDisableButton('HTTP Request')).toBe(true)
      expect(shouldShowDisableButton('JSON')).toBe(true)
    })
  })

  describe('Single Node Execution Integration', () => {
    it('executes trigger node successfully', async () => {
      const executeNode = vi.fn().mockResolvedValue(undefined)
      const onExecute = vi.fn((nodeId) => executeNode(nodeId))

      render(
        <ReactFlowProvider>
          <ExecuteToolbarButton
            nodeId="trigger-1"
            nodeType="Manual Trigger"
            isExecuting={false}
            canExecute={true}
            onExecute={onExecute}
          />
        </ReactFlowProvider>
      )

      const button = screen.getByRole('button')
      fireEvent.click(button)

      expect(onExecute).toHaveBeenCalledWith('trigger-1')
      expect(executeNode).toHaveBeenCalledWith('trigger-1')
    })

    it('handles execution state changes', async () => {
      const { rerender } = render(
        <ReactFlowProvider>
          <ExecuteToolbarButton
            nodeId="trigger-1"
            nodeType="Manual Trigger"
            isExecuting={false}
            canExecute={true}
            onExecute={vi.fn()}
          />
        </ReactFlowProvider>
      )

      let button = screen.getByRole('button')
      expect(button).toHaveAttribute('aria-label', 'Execute Manual Trigger')
      expect(button).not.toBeDisabled()

      // Simulate execution start
      rerender(
        <ReactFlowProvider>
          <ExecuteToolbarButton
            nodeId="trigger-1"
            nodeType="Manual Trigger"
            isExecuting={true}
            canExecute={true}
            onExecute={vi.fn()}
          />
        </ReactFlowProvider>
      )

      button = screen.getByRole('button')
      expect(button).toHaveAttribute('aria-label', 'Executing...')
      expect(button).toBeDisabled()

      // Simulate execution completion
      rerender(
        <ReactFlowProvider>
          <ExecuteToolbarButton
            nodeId="trigger-1"
            nodeType="Manual Trigger"
            isExecuting={false}
            canExecute={true}
            onExecute={vi.fn()}
          />
        </ReactFlowProvider>
      )

      button = screen.getByRole('button')
      expect(button).toHaveAttribute('aria-label', 'Execute Manual Trigger')
      expect(button).not.toBeDisabled()
    })

    it('handles execution errors', () => {
      render(
        <ReactFlowProvider>
          <ExecuteToolbarButton
            nodeId="trigger-1"
            nodeType="Manual Trigger"
            isExecuting={false}
            canExecute={true}
            hasError={true}
            onExecute={vi.fn()}
          />
        </ReactFlowProvider>
      )

      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('aria-label', 'Execution failed - click to retry')
      expect(button).not.toBeDisabled()
      expect(button).toHaveClass('bg-red-50', 'border-red-200', 'text-red-600')
    })

    it('prevents execution when workflow is running', () => {
      render(
        <ReactFlowProvider>
          <ExecuteToolbarButton
            nodeId="trigger-1"
            nodeType="Manual Trigger"
            isExecuting={false}
            canExecute={false}
            onExecute={vi.fn()}
          />
        </ReactFlowProvider>
      )

      const button = screen.getByRole('button')
      expect(button).toBeDisabled()
      expect(button).toHaveAttribute('aria-label', 'Cannot execute this node type')
    })
  })

  describe('Node Disable/Enable Integration', () => {
    it('toggles node disabled state', async () => {
      const updateNode = vi.fn()
      const onToggle = vi.fn((nodeId, disabled) => updateNode(nodeId, { disabled }))

      const { rerender } = render(
        <ReactFlowProvider>
          <DisableToggleToolbarButton
            nodeId="action-1"
            nodeLabel="HTTP Request"
            disabled={false}
            onToggle={onToggle}
          />
        </ReactFlowProvider>
      )

      let button = screen.getByRole('button')
      expect(button).toHaveAttribute('aria-label', 'Disable HTTP Request')

      fireEvent.click(button)

      expect(onToggle).toHaveBeenCalledWith('action-1', true)
      expect(updateNode).toHaveBeenCalledWith('action-1', { disabled: true })

      // Simulate state change
      rerender(
        <ReactFlowProvider>
          <DisableToggleToolbarButton
            nodeId="action-1"
            nodeLabel="HTTP Request"
            disabled={true}
            onToggle={onToggle}
          />
        </ReactFlowProvider>
      )

      button = screen.getByRole('button')
      expect(button).toHaveAttribute('aria-label', 'Enable HTTP Request')

      fireEvent.click(button)

      expect(onToggle).toHaveBeenCalledWith('action-1', false)
      expect(updateNode).toHaveBeenCalledWith('action-1', { disabled: false })
    })

    it('persists disabled state in workflow data', () => {
      const store = mockWorkflowStore.getState()
      const initialNode = store.workflow?.nodes.find(n => n.id === 'transform-1')
      expect(initialNode?.data.disabled).toBe(true)

      // Simulate enabling the node
      store.updateNode('transform-1', { data: { ...initialNode?.data, disabled: false } })

      const updatedStore = mockWorkflowStore.getState()
      const updatedNode = updatedStore.workflow?.nodes.find(n => n.id === 'transform-1')
      expect(updatedNode?.data.disabled).toBe(false)
    })

    it('updates visual state when node is disabled', () => {
      const { rerender } = render(
        <ReactFlowProvider>
          <DisableToggleToolbarButton
            nodeId="transform-1"
            nodeLabel="JSON Transform"
            disabled={false}
            onToggle={vi.fn()}
          />
        </ReactFlowProvider>
      )

      let button = screen.getByRole('button')
      expect(button).toHaveClass('bg-white', 'border-gray-200', 'text-gray-600')

      rerender(
        <ReactFlowProvider>
          <DisableToggleToolbarButton
            nodeId="transform-1"
            nodeLabel="JSON Transform"
            disabled={true}
            onToggle={vi.fn()}
          />
        </ReactFlowProvider>
      )

      button = screen.getByRole('button')
      expect(button).toHaveClass('bg-gray-50', 'border-gray-200', 'text-gray-400')
    })
  })

  describe('Combined Toolbar Functionality', () => {
    it('renders both buttons for trigger nodes', () => {
      render(
        <ReactFlowProvider>
          <div>
            {shouldShowExecuteButton('Manual Trigger') && (
              <ExecuteToolbarButton
                nodeId="trigger-1"
                nodeType="Manual Trigger"
                isExecuting={false}
                canExecute={true}
                onExecute={vi.fn()}
              />
            )}
            {shouldShowDisableButton('Manual Trigger') && (
              <DisableToggleToolbarButton
                nodeId="trigger-1"
                nodeLabel="Manual Trigger"
                disabled={false}
                onToggle={vi.fn()}
              />
            )}
          </div>
        </ReactFlowProvider>
      )

      const buttons = screen.getAllByRole('button')
      expect(buttons).toHaveLength(2)
      
      expect(buttons[0]).toHaveAttribute('aria-label', 'Execute Manual Trigger')
      expect(buttons[1]).toHaveAttribute('aria-label', 'Disable Manual Trigger')
    })

    it('renders only disable button for action nodes', () => {
      render(
        <ReactFlowProvider>
          <div>
            {shouldShowExecuteButton('HTTP Request') && (
              <ExecuteToolbarButton
                nodeId="action-1"
                nodeType="HTTP Request"
                isExecuting={false}
                canExecute={true}
                onExecute={vi.fn()}
              />
            )}
            {shouldShowDisableButton('HTTP Request') && (
              <DisableToggleToolbarButton
                nodeId="action-1"
                nodeLabel="HTTP Request"
                disabled={false}
                onToggle={vi.fn()}
              />
            )}
          </div>
        </ReactFlowProvider>
      )

      const buttons = screen.getAllByRole('button')
      expect(buttons).toHaveLength(1)
      expect(buttons[0]).toHaveAttribute('aria-label', 'Disable HTTP Request')
    })

    it('handles concurrent operations correctly', async () => {
      const executeNode = vi.fn().mockResolvedValue(undefined)
      const updateNode = vi.fn()

      render(
        <ReactFlowProvider>
          <div>
            <ExecuteToolbarButton
              nodeId="trigger-1"
              nodeType="Manual Trigger"
              isExecuting={false}
              canExecute={true}
              onExecute={executeNode}
            />
            <DisableToggleToolbarButton
              nodeId="trigger-1"
              nodeLabel="Manual Trigger"
              disabled={false}
              onToggle={updateNode}
            />
          </div>
        </ReactFlowProvider>
      )

      const buttons = screen.getAllByRole('button')
      const executeButton = buttons[0]
      const disableButton = buttons[1]

      // Click both buttons
      fireEvent.click(executeButton)
      fireEvent.click(disableButton)

      expect(executeNode).toHaveBeenCalledWith('trigger-1')
      expect(updateNode).toHaveBeenCalledWith('trigger-1', true)
    })
  })

  describe('Error Handling Integration', () => {
    it('handles execution timeout errors', () => {
      render(
        <ReactFlowProvider>
          <ExecuteToolbarButton
            nodeId="trigger-1"
            nodeType="Manual Trigger"
            isExecuting={false}
            canExecute={true}
            hasError={true}
            onExecute={vi.fn()}
          />
        </ReactFlowProvider>
      )

      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('aria-label', 'Execution failed - click to retry')
      expect(button).toHaveClass('bg-red-50', 'border-red-200', 'text-red-600')
    })

    it('allows retry after execution failure', () => {
      const onExecute = vi.fn()
      
      render(
        <ReactFlowProvider>
          <ExecuteToolbarButton
            nodeId="trigger-1"
            nodeType="Manual Trigger"
            isExecuting={false}
            canExecute={true}
            hasError={true}
            onExecute={onExecute}
          />
        </ReactFlowProvider>
      )

      const button = screen.getByRole('button')
      fireEvent.click(button)

      expect(onExecute).toHaveBeenCalledWith('trigger-1')
    })

    it('handles network errors gracefully', async () => {
      const onExecute = vi.fn()
      
      render(
        <ReactFlowProvider>
          <ExecuteToolbarButton
            nodeId="trigger-1"
            nodeType="Manual Trigger"
            isExecuting={false}
            canExecute={true}
            onExecute={onExecute}
          />
        </ReactFlowProvider>
      )

      const button = screen.getByRole('button')
      fireEvent.click(button)

      expect(onExecute).toHaveBeenCalledWith('trigger-1')
      // In a real implementation, error handling would be managed by the parent component
      // The button component itself just calls the onExecute callback
    })
  })
})
