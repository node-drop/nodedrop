import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ReactFlowProvider } from '@xyflow/react'
import { CustomNode } from '../CustomNode'
import { useWorkflowStore } from '@/stores/workflow'

// Mock the workflow store
vi.mock('@/stores/workflow', () => ({
  useWorkflowStore: vi.fn()
}))

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
  ExecuteToolbarButton: ({ nodeId, onExecute }: any) => (
    <button
      data-testid={`execute-button-${nodeId}`}
      onClick={() => onExecute(nodeId)}
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

describe('CustomNode Disable Functionality', () => {
  const mockUpdateNode = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    ;(useWorkflowStore as any).mockReturnValue(mockUpdateNode)
  })

  const renderCustomNode = (nodeData: any) => {
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

  it('calls updateNode when disable button is clicked', () => {
    const nodeData = {
      label: 'Test Node',
      nodeType: 'manual-trigger',
      parameters: {},
      disabled: false
    }

    renderCustomNode(nodeData)

    const disableButton = screen.getByTestId('disable-button-test-node')
    fireEvent.click(disableButton)

    expect(mockUpdateNode).toHaveBeenCalledWith('test-node', { disabled: true })
  })

  it('calls updateNode to enable when enable button is clicked', () => {
    const nodeData = {
      label: 'Test Node',
      nodeType: 'manual-trigger',
      parameters: {},
      disabled: true
    }

    renderCustomNode(nodeData)

    const enableButton = screen.getByTestId('disable-button-test-node')
    fireEvent.click(enableButton)

    expect(mockUpdateNode).toHaveBeenCalledWith('test-node', { disabled: false })
  })

  it('applies disabled styling when node is disabled', () => {
    const nodeData = {
      label: 'Test Node',
      nodeType: 'manual-trigger',
      parameters: {},
      disabled: true
    }

    const { container } = renderCustomNode(nodeData)

    // Check that disabled styling is applied
    const nodeElement = container.querySelector('.opacity-50')
    expect(nodeElement).toBeInTheDocument()

    const disabledOverlay = screen.getByTestId('disabled-overlay')
    expect(disabledOverlay).toBeInTheDocument()
  })

  it('does not apply disabled styling when node is enabled', () => {
    const nodeData = {
      label: 'Test Node',
      nodeType: 'manual-trigger',
      parameters: {},
      disabled: false
    }

    const { container } = renderCustomNode(nodeData)

    // Check that disabled styling is not applied
    const nodeElement = container.querySelector('.opacity-50')
    expect(nodeElement).not.toBeInTheDocument()

    const disabledOverlay = screen.queryByTestId('disabled-overlay')
    expect(disabledOverlay).not.toBeInTheDocument()
  })
})
