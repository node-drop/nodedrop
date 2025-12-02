import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ReactFlowProvider, NodeProps } from '@xyflow/react'
import { CustomNode } from '../CustomNode'
import { shouldShowExecuteButton, shouldShowDisableButton } from '@/utils/nodeTypeClassification'

// Mock ReactFlow NodeToolbar
vi.mock('reactflow', async () => {
  const actual = await vi.importActual('reactflow')
  return {
    ...actual,
    NodeToolbar: ({ 
      children, 
      isVisible = true, 
      position, 
      offset 
    }: { 
      children: React.ReactNode
      isVisible?: boolean
      position?: string
      offset?: number
    }) => (
      <div 
        data-testid="node-toolbar" 
        data-position={position}
        data-offset={offset}
        style={{ display: isVisible ? 'block' : 'none' }}
      >
        {children}
      </div>
    )
  }
})

// Mock toolbar button components
vi.mock('../ExecuteToolbarButton', () => ({
  ExecuteToolbarButton: ({ nodeId, nodeType, onExecute, isExecuting, canExecute }: any) => (
    <button
      data-testid={`execute-button-${nodeId}`}
      onClick={() => onExecute(nodeId)}
      disabled={!canExecute || isExecuting}
      aria-label={isExecuting ? 'Executing...' : `Execute ${nodeType}`}
    >
      {isExecuting ? 'Loading...' : 'Execute'}
    </button>
  )
}))

vi.mock('../DisableToggleToolbarButton', () => ({
  DisableToggleToolbarButton: ({ nodeId, nodeLabel, disabled, onToggle }: any) => (
    <button
      data-testid={`disable-button-${nodeId}`}
      onClick={() => onToggle(nodeId, !disabled)}
      aria-label={disabled ? `Enable ${nodeLabel}` : `Disable ${nodeLabel}`}
    >
      {disabled ? 'Enable' : 'Disable'}
    </button>
  )
}))

// Mock workflow store
const mockExecuteNode = vi.fn()
const mockUpdateNode = vi.fn()

vi.mock('@/stores/workflow', () => ({
  useWorkflowStore: () => ({
    executeNode: mockExecuteNode,
    updateNode: mockUpdateNode,
    executionState: { status: 'idle' },
    getNodeExecutionResult: vi.fn(() => ({ status: 'idle' }))
  })
}))

// Enhanced CustomNode with toolbar integration
const CustomNodeWithToolbar = ({ data, selected, id }: NodeProps<any>) => {
  const [isExecuting, setIsExecuting] = React.useState(false)
  const [nodeData, setNodeData] = React.useState(data)

  const handleExecute = async (nodeId: string) => {
    setIsExecuting(true)
    try {
      await mockExecuteNode(nodeId)
    } finally {
      setTimeout(() => setIsExecuting(false), 100)
    }
  }

  const handleToggle = (nodeId: string, disabled: boolean) => {
    const updates = { disabled }
    setNodeData(prev => ({ ...prev, ...updates }))
    mockUpdateNode(nodeId, updates)
  }

  const canExecute = !nodeData.disabled && shouldShowExecuteButton(nodeData.nodeType)

  return (
    <div data-testid={`custom-node-${id}`}>
      <CustomNode data={nodeData} selected={selected} id={id} />
      
      {/* Simulated NodeToolbar integration */}
      <div data-testid="node-toolbar" data-position="top" data-offset={10}>
        {shouldShowExecuteButton(nodeData.nodeType) && (
          <button
            data-testid={`execute-button-${id}`}
            onClick={() => handleExecute(id)}
            disabled={!canExecute || isExecuting}
            aria-label={isExecuting ? 'Executing...' : `Execute ${nodeData.nodeType}`}
          >
            {isExecuting ? 'Loading...' : 'Execute'}
          </button>
        )}
        {shouldShowDisableButton(nodeData.nodeType) && (
          <button
            data-testid={`disable-button-${id}`}
            onClick={() => handleToggle(id, !nodeData.disabled)}
            aria-label={nodeData.disabled ? `Enable ${nodeData.label}` : `Disable ${nodeData.label}`}
          >
            {nodeData.disabled ? 'Enable' : 'Disable'}
          </button>
        )}
      </div>
    </div>
  )
}

describe('CustomNode Toolbar Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockExecuteNode.mockResolvedValue(undefined)
  })

  describe('Trigger Node Integration', () => {
    const triggerNodeProps: NodeProps<any> = {
      id: 'trigger-1',
      data: {
        label: 'Manual Trigger',
        nodeType: 'Manual Trigger',
        parameters: {},
        disabled: false,
        status: 'idle',
        icon: 'T',
        color: '#4CAF50'
      },
      selected: false,
      type: 'customNode',
      position: { x: 0, y: 0 },
      positionAbsolute: { x: 0, y: 0 },
      dragging: false,
      isConnectable: true,
      zIndex: 1,
      width: 150,
      height: 80
    }

    it('renders both execute and disable buttons for trigger nodes', () => {
      render(
        <ReactFlowProvider>
          <CustomNodeWithToolbar {...triggerNodeProps} />
        </ReactFlowProvider>
      )

      expect(screen.getByTestId('custom-node-trigger-1')).toBeInTheDocument()
      expect(screen.getByTestId('node-toolbar')).toBeInTheDocument()
      expect(screen.getByTestId('execute-button-trigger-1')).toBeInTheDocument()
      expect(screen.getByTestId('disable-button-trigger-1')).toBeInTheDocument()
    })

    it('executes trigger node when execute button is clicked', async () => {
      render(
        <ReactFlowProvider>
          <CustomNodeWithToolbar {...triggerNodeProps} />
        </ReactFlowProvider>
      )

      const executeButton = screen.getByTestId('execute-button-trigger-1')
      fireEvent.click(executeButton)

      expect(mockExecuteNode).toHaveBeenCalledWith('trigger-1')
      
      // Button should show executing state
      await waitFor(() => {
        expect(executeButton).toHaveAttribute('aria-label', 'Executing...')
        expect(executeButton).toBeDisabled()
        expect(executeButton).toHaveTextContent('Loading...')
      })

      // Button should return to normal state
      await waitFor(() => {
        expect(executeButton).toHaveAttribute('aria-label', 'Execute Manual Trigger')
        expect(executeButton).not.toBeDisabled()
        expect(executeButton).toHaveTextContent('Execute')
      }, { timeout: 200 })
    })

    it('disables trigger node when disable button is clicked', async () => {
      render(
        <ReactFlowProvider>
          <CustomNodeWithToolbar {...triggerNodeProps} />
        </ReactFlowProvider>
      )

      const disableButton = screen.getByTestId('disable-button-trigger-1')
      const executeButton = screen.getByTestId('execute-button-trigger-1')

      expect(disableButton).toHaveAttribute('aria-label', 'Disable Manual Trigger')
      expect(disableButton).toHaveTextContent('Disable')
      expect(executeButton).not.toBeDisabled()

      fireEvent.click(disableButton)

      expect(mockUpdateNode).toHaveBeenCalledWith('trigger-1', { disabled: true })

      await waitFor(() => {
        expect(disableButton).toHaveAttribute('aria-label', 'Enable Manual Trigger')
        expect(disableButton).toHaveTextContent('Enable')
        expect(executeButton).toBeDisabled()
      })
    })

    it('prevents execution when trigger node is disabled', () => {
      const disabledTriggerProps = {
        ...triggerNodeProps,
        data: { ...triggerNodeProps.data, disabled: true }
      }

      render(
        <ReactFlowProvider>
          <CustomNodeWithToolbar {...disabledTriggerProps} />
        </ReactFlowProvider>
      )

      const executeButton = screen.getByTestId('execute-button-trigger-1')
      expect(executeButton).toBeDisabled()

      fireEvent.click(executeButton)
      expect(mockExecuteNode).not.toHaveBeenCalled()
    })
  })

  describe('Action Node Integration', () => {
    const actionNodeProps: NodeProps<any> = {
      id: 'action-1',
      data: {
        label: 'HTTP Request',
        nodeType: 'HTTP Request',
        parameters: {},
        disabled: false,
        status: 'idle',
        icon: 'H',
        color: '#2196F3'
      },
      selected: false,
      type: 'customNode',
      position: { x: 200, y: 0 },
      positionAbsolute: { x: 200, y: 0 },
      dragging: false,
      isConnectable: true,
      zIndex: 1,
      width: 150,
      height: 80
    }

    it('renders only disable button for action nodes', () => {
      render(
        <ReactFlowProvider>
          <CustomNodeWithToolbar {...actionNodeProps} />
        </ReactFlowProvider>
      )

      expect(screen.getByTestId('custom-node-action-1')).toBeInTheDocument()
      expect(screen.getByTestId('node-toolbar')).toBeInTheDocument()
      expect(screen.queryByTestId('execute-button-action-1')).not.toBeInTheDocument()
      expect(screen.getByTestId('disable-button-action-1')).toBeInTheDocument()
    })

    it('disables action node when disable button is clicked', async () => {
      render(
        <ReactFlowProvider>
          <CustomNodeWithToolbar {...actionNodeProps} />
        </ReactFlowProvider>
      )

      const disableButton = screen.getByTestId('disable-button-action-1')
      expect(disableButton).toHaveAttribute('aria-label', 'Disable HTTP Request')

      fireEvent.click(disableButton)

      expect(mockUpdateNode).toHaveBeenCalledWith('action-1', { disabled: true })

      await waitFor(() => {
        expect(disableButton).toHaveAttribute('aria-label', 'Enable HTTP Request')
        expect(disableButton).toHaveTextContent('Enable')
      })
    })
  })

  describe('Transform Node Integration', () => {
    const transformNodeProps: NodeProps<any> = {
      id: 'transform-1',
      data: {
        label: 'JSON Transform',
        nodeType: 'JSON',
        parameters: {},
        disabled: false,
        status: 'idle',
        icon: 'J',
        color: '#FF9800'
      },
      selected: false,
      type: 'customNode',
      position: { x: 400, y: 0 },
      positionAbsolute: { x: 400, y: 0 },
      dragging: false,
      isConnectable: true,
      zIndex: 1,
      width: 150,
      height: 80
    }

    it('renders only disable button for transform nodes', () => {
      render(
        <ReactFlowProvider>
          <CustomNodeWithToolbar {...transformNodeProps} />
        </ReactFlowProvider>
      )

      expect(screen.getByTestId('custom-node-transform-1')).toBeInTheDocument()
      expect(screen.getByTestId('node-toolbar')).toBeInTheDocument()
      expect(screen.queryByTestId('execute-button-transform-1')).not.toBeInTheDocument()
      expect(screen.getByTestId('disable-button-transform-1')).toBeInTheDocument()
    })
  })

  describe('Condition Node Integration', () => {
    const conditionNodeProps: NodeProps<any> = {
      id: 'condition-1',
      data: {
        label: 'IF Condition',
        nodeType: 'IF',
        parameters: {},
        disabled: false,
        status: 'idle',
        icon: 'I',
        color: '#9C27B0'
      },
      selected: false,
      type: 'customNode',
      position: { x: 600, y: 0 },
      positionAbsolute: { x: 600, y: 0 },
      dragging: false,
      isConnectable: true,
      zIndex: 1,
      width: 150,
      height: 80
    }

    it('renders only disable button for condition nodes', () => {
      render(
        <ReactFlowProvider>
          <CustomNodeWithToolbar {...conditionNodeProps} />
        </ReactFlowProvider>
      )

      expect(screen.getByTestId('custom-node-condition-1')).toBeInTheDocument()
      expect(screen.getByTestId('node-toolbar')).toBeInTheDocument()
      expect(screen.queryByTestId('execute-button-condition-1')).not.toBeInTheDocument()
      expect(screen.getByTestId('disable-button-condition-1')).toBeInTheDocument()
    })
  })

  describe('Node State Synchronization', () => {
    it('synchronizes node visual state with disabled state', async () => {
      render(
        <ReactFlowProvider>
          <CustomNodeWithToolbar {...{
            id: 'sync-test',
            data: {
              label: 'Test Node',
              nodeType: 'Manual Trigger',
              parameters: {},
              disabled: false,
              status: 'idle'
            },
            selected: false,
            type: 'customNode',
            position: { x: 0, y: 0 },
            positionAbsolute: { x: 0, y: 0 },
            dragging: false,
            isConnectable: true,
            zIndex: 1,
            width: 150,
            height: 80
          }} />
        </ReactFlowProvider>
      )

      const customNode = screen.getByTestId('custom-node-sync-test')
      const disableButton = screen.getByTestId('disable-button-sync-test')
      const executeButton = screen.getByTestId('execute-button-sync-test')

      // Initially enabled
      expect(executeButton).not.toBeDisabled()

      // Disable the node
      fireEvent.click(disableButton)

      await waitFor(() => {
        expect(executeButton).toBeDisabled()
      })

      // Enable the node
      fireEvent.click(disableButton)

      await waitFor(() => {
        expect(executeButton).not.toBeDisabled()
      })
    })

    it('handles execution state changes correctly', async () => {
      render(
        <ReactFlowProvider>
          <CustomNodeWithToolbar {...{
            id: 'execution-test',
            data: {
              label: 'Execution Test',
              nodeType: 'Manual Trigger',
              parameters: {},
              disabled: false,
              status: 'idle'
            },
            selected: false,
            type: 'customNode',
            position: { x: 0, y: 0 },
            positionAbsolute: { x: 0, y: 0 },
            dragging: false,
            isConnectable: true,
            zIndex: 1,
            width: 150,
            height: 80
          }} />
        </ReactFlowProvider>
      )

      const executeButton = screen.getByTestId('execute-button-execution-test')

      // Start execution
      fireEvent.click(executeButton)

      // Should show executing state
      await waitFor(() => {
        expect(executeButton).toHaveAttribute('aria-label', 'Executing...')
        expect(executeButton).toBeDisabled()
        expect(executeButton).toHaveTextContent('Loading...')
      })

      // Should return to idle state
      await waitFor(() => {
        expect(executeButton).toHaveAttribute('aria-label', 'Execute Manual Trigger')
        expect(executeButton).not.toBeDisabled()
        expect(executeButton).toHaveTextContent('Execute')
      }, { timeout: 200 })
    })
  })

  describe('Toolbar Positioning and Visibility', () => {
    it('configures NodeToolbar with correct positioning', () => {
      render(
        <ReactFlowProvider>
          <CustomNodeWithToolbar {...{
            id: 'position-test',
            data: {
              label: 'Position Test',
              nodeType: 'Manual Trigger',
              parameters: {},
              disabled: false,
              status: 'idle'
            },
            selected: false,
            type: 'customNode',
            position: { x: 0, y: 0 },
            positionAbsolute: { x: 0, y: 0 },
            dragging: false,
            isConnectable: true,
            zIndex: 1,
            width: 150,
            height: 80
          }} />
        </ReactFlowProvider>
      )

      const toolbar = screen.getByTestId('node-toolbar')
      expect(toolbar).toHaveAttribute('data-position', 'top')
      expect(toolbar).toHaveAttribute('data-offset', '10')
    })

    it('shows toolbar buttons in correct order', () => {
      render(
        <ReactFlowProvider>
          <CustomNodeWithToolbar {...{
            id: 'order-test',
            data: {
              label: 'Order Test',
              nodeType: 'Manual Trigger',
              parameters: {},
              disabled: false,
              status: 'idle'
            },
            selected: false,
            type: 'customNode',
            position: { x: 0, y: 0 },
            positionAbsolute: { x: 0, y: 0 },
            dragging: false,
            isConnectable: true,
            zIndex: 1,
            width: 150,
            height: 80
          }} />
        </ReactFlowProvider>
      )

      const toolbar = screen.getByTestId('node-toolbar')
      const buttons = toolbar.querySelectorAll('button')
      
      expect(buttons).toHaveLength(2)
      expect(buttons[0]).toHaveAttribute('data-testid', 'execute-button-order-test')
      expect(buttons[1]).toHaveAttribute('data-testid', 'disable-button-order-test')
    })
  })
})
