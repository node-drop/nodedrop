import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ReactFlowProvider } from '@xyflow/react'
import { CustomNode } from '../CustomNode'
import { useWorkflowStore } from '@/stores/workflow'
import type { Workflow, WorkflowNode } from '@/types'

// Mock ReactFlow components
vi.mock('reactflow', async () => {
  const actual = await vi.importActual('reactflow')
  return {
    ...actual,
    NodeToolbar: ({ children, isVisible = true }: any) => (
      <div data-testid="node-toolbar" style={{ display: isVisible ? 'block' : 'none' }}>
        {children}
      </div>
    ),
    Handle: ({ type, position, className }: any) => (
      <div data-testid={`handle-${type}`} className={className} />
    ),
    Position: {
      Top: 'top',
      Bottom: 'bottom',
      Left: 'left',
      Right: 'right'
    }
  }
})

// Mock toolbar button components
vi.mock('../ExecuteToolbarButton', () => ({
  ExecuteToolbarButton: ({ nodeId, onExecute, canExecute }: any) => (
    <button
      data-testid={`execute-button-${nodeId}`}
      onClick={() => onExecute(nodeId)}
      disabled={!canExecute}
    >
      Execute
    </button>
  )
}))

vi.mock('../DisableToggleToolbarButton', () => ({
  DisableToggleToolbarButton: ({ nodeId, disabled, onToggle }: any) => (
    <button
      data-testid={`disable-button-${nodeId}`}
      onClick={() => onToggle(nodeId, !disabled)}
      aria-label={disabled ? 'Enable' : 'Disable'}
    >
      {disabled ? 'Enable' : 'Disable'}
    </button>
  )
}))

// Mock node type classification
vi.mock('@/utils/nodeTypeClassification', () => ({
  shouldShowExecuteButton: vi.fn(() => true),
  shouldShowDisableButton: vi.fn(() => true),
  canNodeExecuteIndividually: vi.fn(() => true)
}))

describe('Node Disable Integration', () => {
  const createMockWorkflow = (nodeDisabled: boolean): Workflow => ({
    id: 'test-workflow',
    name: 'Test Workflow',
    userId: 'user-1',
    nodes: [
      {
        id: 'test-node',
        type: 'manual-trigger',
        name: 'Test Node',
        parameters: {},
        position: { x: 100, y: 100 },
        disabled: nodeDisabled
      }
    ],
    connections: [],
    settings: {},
    active: true,
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-01-01T00:00:00Z'
  })

  const renderCustomNodeWithStore = (nodeDisabled: boolean) => {
    // Set up the workflow store with a test workflow
    const workflow = createMockWorkflow(nodeDisabled)
    useWorkflowStore.getState().setWorkflow(workflow)

    const nodeData = {
      label: 'Test Node',
      nodeType: 'manual-trigger',
      parameters: {},
      disabled: nodeDisabled
    }

    const nodeProps = {
      id: 'test-node',
      data: nodeData,
      selected: false
    }

    return render(
      <ReactFlowProvider>
        <CustomNode {...nodeProps} />
      </ReactFlowProvider>
    )
  }

  beforeEach(() => {
    // Reset the store before each test
    useWorkflowStore.getState().setWorkflow(null)
  })

  it('integrates with workflow store to disable node', () => {
    renderCustomNodeWithStore(false)

    // Verify initial state
    const workflow = useWorkflowStore.getState().workflow
    expect(workflow?.nodes[0].disabled).toBe(false)

    // Click disable button
    const disableButton = screen.getByTestId('disable-button-test-node')
    fireEvent.click(disableButton)

    // Verify node was disabled in the store
    const updatedWorkflow = useWorkflowStore.getState().workflow
    expect(updatedWorkflow?.nodes[0].disabled).toBe(true)
    expect(useWorkflowStore.getState().isDirty).toBe(true)
  })

  it('integrates with workflow store to enable node', () => {
    renderCustomNodeWithStore(true)

    // Verify initial state
    const workflow = useWorkflowStore.getState().workflow
    expect(workflow?.nodes[0].disabled).toBe(true)

    // Click enable button
    const enableButton = screen.getByTestId('disable-button-test-node')
    fireEvent.click(enableButton)

    // Verify node was enabled in the store
    const updatedWorkflow = useWorkflowStore.getState().workflow
    expect(updatedWorkflow?.nodes[0].disabled).toBe(false)
    expect(useWorkflowStore.getState().isDirty).toBe(true)
  })

  it('persists disabled state in workflow data', () => {
    renderCustomNodeWithStore(false)

    // Disable the node
    const disableButton = screen.getByTestId('disable-button-test-node')
    fireEvent.click(disableButton)

    // Get the workflow data
    const workflow = useWorkflowStore.getState().workflow
    expect(workflow?.nodes[0].disabled).toBe(true)

    // Verify the change is marked as dirty (would be saved)
    expect(useWorkflowStore.getState().isDirty).toBe(true)

    // Verify history was updated
    const history = useWorkflowStore.getState().history
    expect(history.length).toBeGreaterThan(0)
    expect(history[history.length - 1].action).toBe('Update node: test-node')
  })

  it('reflects disabled state in node visual appearance', () => {
    // Test with disabled node
    const { container } = renderCustomNodeWithStore(true)

    // Should have disabled styling
    const disabledElement = container.querySelector('.opacity-50')
    expect(disabledElement).not.toBeNull()
    expect(screen.getByTestId('disabled-overlay')).toBeInTheDocument()
  })

  it('disables execute button when node is disabled', () => {
    renderCustomNodeWithStore(true)

    const executeButton = screen.getByTestId('execute-button-test-node')
    expect(executeButton).toBeDisabled()
  })

  it('enables execute button when node is enabled', () => {
    renderCustomNodeWithStore(false)

    const executeButton = screen.getByTestId('execute-button-test-node')
    expect(executeButton).not.toBeDisabled()
  })
})
