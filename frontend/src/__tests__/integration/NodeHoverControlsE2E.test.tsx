import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import userEvent from '@testing-library/user-event'
import { ReactFlowProvider, ReactFlow, Node, Edge } from '@xyflow/react'
import { CustomNode } from '@/components/workflow/CustomNode'
import { ExecuteToolbarButton } from '@/components/workflow/ExecuteToolbarButton'
import { DisableToggleToolbarButton } from '@/components/workflow/DisableToggleToolbarButton'
import { shouldShowExecuteButton, shouldShowDisableButton } from '@/utils/nodeTypeClassification'

// Mock ReactFlow NodeToolbar for testing
vi.mock('reactflow', async () => {
  const actual = await vi.importActual('reactflow')
  return {
    ...actual,
    NodeToolbar: ({ children, isVisible }: { children: React.ReactNode; isVisible?: boolean }) => (
      <div data-testid="node-toolbar" style={{ display: isVisible !== false ? 'block' : 'none' }}>
        {children}
      </div>
    )
  }
})

// Mock workflow store
const mockExecuteNode = vi.fn()
const mockUpdateNode = vi.fn()
const mockGetNodeExecutionResult = vi.fn()

vi.mock('@/stores/workflow', () => ({
  useWorkflowStore: () => ({
    executeNode: mockExecuteNode,
    updateNode: mockUpdateNode,
    getNodeExecutionResult: mockGetNodeExecutionResult,
    executionState: { status: 'idle' },
    workflow: {
      nodes: [
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
        }
      ]
    }
  })
}))

// Test component that combines toolbar buttons with hover behavior
const TestNodeWithToolbar = ({ 
  nodeId, 
  nodeType, 
  nodeLabel, 
  disabled = false, 
  isExecuting = false, 
  hasError = false 
}: {
  nodeId: string
  nodeType: string
  nodeLabel: string
  disabled?: boolean
  isExecuting?: boolean
  hasError?: boolean
}) => {
  const [isHovered, setIsHovered] = React.useState(false)
  const [currentDisabled, setCurrentDisabled] = React.useState(disabled)
  const [currentExecuting, setCurrentExecuting] = React.useState(isExecuting)

  const handleExecute = async (id: string) => {
    setCurrentExecuting(true)
    try {
      await mockExecuteNode(id)
      // Simulate execution completion
      setTimeout(() => setCurrentExecuting(false), 100)
    } catch (error) {
      setCurrentExecuting(false)
    }
  }

  const handleToggle = (id: string, newDisabled: boolean) => {
    setCurrentDisabled(newDisabled)
    mockUpdateNode(id, { disabled: newDisabled })
  }

  return (
    <div
      data-testid={`node-${nodeId}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        position: 'relative',
        width: 200,
        height: 80,
        border: '1px solid #ccc',
        borderRadius: 8,
        padding: 16,
        backgroundColor: currentDisabled ? '#f5f5f5' : '#fff',
        opacity: currentDisabled ? 0.6 : 1
      }}
    >
      <div>{nodeLabel}</div>
      <div style={{ fontSize: '12px', color: '#666' }}>{nodeType}</div>
      
      {isHovered && (
        <div 
          data-testid={`toolbar-${nodeId}`}
          style={{
            position: 'absolute',
            top: -40,
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            gap: 4,
            backgroundColor: 'white',
            padding: 4,
            borderRadius: 4,
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}
        >
          {shouldShowExecuteButton(nodeType) && (
            <ExecuteToolbarButton
              nodeId={nodeId}
              nodeType={nodeType}
              isExecuting={currentExecuting}
              canExecute={!currentDisabled}
              hasError={hasError}
              onExecute={handleExecute}
            />
          )}
          {shouldShowDisableButton(nodeType) && (
            <DisableToggleToolbarButton
              nodeId={nodeId}
              nodeLabel={nodeLabel}
              disabled={currentDisabled}
              onToggle={handleToggle}
            />
          )}
        </div>
      )}
    </div>
  )
}

describe('Node Hover Controls E2E Tests', () => {
  let user: ReturnType<typeof userEvent.setup>

  beforeEach(() => {
    user = userEvent.setup()
    vi.clearAllMocks()
    mockExecuteNode.mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Hover Interaction Flows', () => {
    it('shows toolbar on hover and hides on mouse leave', async () => {
      render(
        <ReactFlowProvider>
          <TestNodeWithToolbar
            nodeId="trigger-1"
            nodeType="Manual Trigger"
            nodeLabel="Manual Trigger"
          />
        </ReactFlowProvider>
      )

      const node = screen.getByTestId('node-trigger-1')
      
      // Initially toolbar should not be visible
      expect(screen.queryByTestId('toolbar-trigger-1')).not.toBeInTheDocument()

      // Hover over node
      await user.hover(node)
      
      // Toolbar should appear
      await waitFor(() => {
        expect(screen.getByTestId('toolbar-trigger-1')).toBeInTheDocument()
      })

      // Both buttons should be visible for trigger nodes
      const buttons = screen.getAllByRole('button')
      expect(buttons).toHaveLength(2)
      expect(buttons[0]).toHaveAttribute('aria-label', 'Execute Manual Trigger')
      expect(buttons[1]).toHaveAttribute('aria-label', 'Disable Manual Trigger')

      // Move mouse away
      await user.unhover(node)
      
      // Toolbar should disappear
      await waitFor(() => {
        expect(screen.queryByTestId('toolbar-trigger-1')).not.toBeInTheDocument()
      })
    })

    it('maintains toolbar visibility when hovering over toolbar buttons', async () => {
      render(
        <ReactFlowProvider>
          <TestNodeWithToolbar
            nodeId="trigger-1"
            nodeType="Manual Trigger"
            nodeLabel="Manual Trigger"
          />
        </ReactFlowProvider>
      )

      const node = screen.getByTestId('node-trigger-1')
      
      // Hover over node to show toolbar
      await user.hover(node)
      
      await waitFor(() => {
        expect(screen.getByTestId('toolbar-trigger-1')).toBeInTheDocument()
      })

      const executeButton = screen.getByLabelText('Execute Manual Trigger')
      
      // Hover over button
      await user.hover(executeButton)
      
      // Toolbar should still be visible
      expect(screen.getByTestId('toolbar-trigger-1')).toBeInTheDocument()
    })

    it('shows only disable button for action nodes', async () => {
      render(
        <ReactFlowProvider>
          <TestNodeWithToolbar
            nodeId="action-1"
            nodeType="HTTP Request"
            nodeLabel="HTTP Request"
          />
        </ReactFlowProvider>
      )

      const node = screen.getByTestId('node-action-1')
      
      await user.hover(node)
      
      await waitFor(() => {
        expect(screen.getByTestId('toolbar-action-1')).toBeInTheDocument()
      })

      // Only disable button should be visible for action nodes
      const buttons = screen.getAllByRole('button')
      expect(buttons).toHaveLength(1)
      expect(buttons[0]).toHaveAttribute('aria-label', 'Disable HTTP Request')
    })
  })

  describe('Click Interaction Flows', () => {
    it('executes node when execute button is clicked', async () => {
      render(
        <ReactFlowProvider>
          <TestNodeWithToolbar
            nodeId="trigger-1"
            nodeType="Manual Trigger"
            nodeLabel="Manual Trigger"
          />
        </ReactFlowProvider>
      )

      const node = screen.getByTestId('node-trigger-1')
      await user.hover(node)
      
      await waitFor(() => {
        expect(screen.getByTestId('toolbar-trigger-1')).toBeInTheDocument()
      })

      const executeButton = screen.getByLabelText('Execute Manual Trigger')
      await user.click(executeButton)

      expect(mockExecuteNode).toHaveBeenCalledWith('trigger-1')
      
      // Button should show executing state
      await waitFor(() => {
        expect(executeButton).toHaveAttribute('aria-label', 'Executing...')
        expect(executeButton).toBeDisabled()
      })

      // After execution completes, button should return to normal state
      await waitFor(() => {
        expect(executeButton).toHaveAttribute('aria-label', 'Execute Manual Trigger')
        expect(executeButton).not.toBeDisabled()
      }, { timeout: 200 })
    })

    it('toggles node disabled state when disable button is clicked', async () => {
      render(
        <ReactFlowProvider>
          <TestNodeWithToolbar
            nodeId="trigger-1"
            nodeType="Manual Trigger"
            nodeLabel="Manual Trigger"
          />
        </ReactFlowProvider>
      )

      const node = screen.getByTestId('node-trigger-1')
      await user.hover(node)
      
      await waitFor(() => {
        expect(screen.getByTestId('toolbar-trigger-1')).toBeInTheDocument()
      })

      const disableButton = screen.getByLabelText('Disable Manual Trigger')
      await user.click(disableButton)

      expect(mockUpdateNode).toHaveBeenCalledWith('trigger-1', { disabled: true })
      
      // Button should update to show enable state
      await waitFor(() => {
        expect(disableButton).toHaveAttribute('aria-label', 'Enable Manual Trigger')
      })

      // Node should show disabled visual state
      expect(node).toHaveStyle({ opacity: '0.6' })

      // Click again to enable
      await user.click(disableButton)
      
      expect(mockUpdateNode).toHaveBeenCalledWith('trigger-1', { disabled: false })
      
      await waitFor(() => {
        expect(disableButton).toHaveAttribute('aria-label', 'Disable Manual Trigger')
      })

      expect(node).toHaveStyle({ opacity: '1' })
    })

    it('prevents execution when node is disabled', async () => {
      render(
        <ReactFlowProvider>
          <TestNodeWithToolbar
            nodeId="trigger-1"
            nodeType="Manual Trigger"
            nodeLabel="Manual Trigger"
            disabled={true}
          />
        </ReactFlowProvider>
      )

      const node = screen.getByTestId('node-trigger-1')
      await user.hover(node)
      
      await waitFor(() => {
        expect(screen.getByTestId('toolbar-trigger-1')).toBeInTheDocument()
      })

      const executeButton = screen.getByLabelText('Cannot execute this node type')
      expect(executeButton).toBeDisabled()

      await user.click(executeButton)
      expect(mockExecuteNode).not.toHaveBeenCalled()
    })
  })

  describe('Keyboard Navigation Flows', () => {
    it('supports keyboard navigation through toolbar buttons', async () => {
      render(
        <ReactFlowProvider>
          <TestNodeWithToolbar
            nodeId="trigger-1"
            nodeType="Manual Trigger"
            nodeLabel="Manual Trigger"
          />
        </ReactFlowProvider>
      )

      const node = screen.getByTestId('node-trigger-1')
      await user.hover(node)
      
      await waitFor(() => {
        expect(screen.getByTestId('toolbar-trigger-1')).toBeInTheDocument()
      })

      // Tab to first button (execute)
      await user.tab()
      const executeButton = screen.getByLabelText('Execute Manual Trigger')
      expect(executeButton).toHaveFocus()

      // Tab to second button (disable)
      await user.tab()
      const disableButton = screen.getByLabelText('Disable Manual Trigger')
      expect(disableButton).toHaveFocus()
    })

    it('executes node with Enter key', async () => {
      render(
        <ReactFlowProvider>
          <TestNodeWithToolbar
            nodeId="trigger-1"
            nodeType="Manual Trigger"
            nodeLabel="Manual Trigger"
          />
        </ReactFlowProvider>
      )

      const node = screen.getByTestId('node-trigger-1')
      await user.hover(node)
      
      await waitFor(() => {
        expect(screen.getByTestId('toolbar-trigger-1')).toBeInTheDocument()
      })

      const executeButton = screen.getByLabelText('Execute Manual Trigger')
      executeButton.focus()
      
      await user.keyboard('{Enter}')
      expect(mockExecuteNode).toHaveBeenCalledWith('trigger-1')
    })

    it('executes node with Space key', async () => {
      render(
        <ReactFlowProvider>
          <TestNodeWithToolbar
            nodeId="trigger-1"
            nodeType="Manual Trigger"
            nodeLabel="Manual Trigger"
          />
        </ReactFlowProvider>
      )

      const node = screen.getByTestId('node-trigger-1')
      await user.hover(node)
      
      await waitFor(() => {
        expect(screen.getByTestId('toolbar-trigger-1')).toBeInTheDocument()
      })

      const executeButton = screen.getByLabelText('Execute Manual Trigger')
      executeButton.focus()
      
      await user.keyboard(' ')
      expect(mockExecuteNode).toHaveBeenCalledWith('trigger-1')
    })

    it('toggles node state with keyboard', async () => {
      render(
        <ReactFlowProvider>
          <TestNodeWithToolbar
            nodeId="trigger-1"
            nodeType="Manual Trigger"
            nodeLabel="Manual Trigger"
          />
        </ReactFlowProvider>
      )

      const node = screen.getByTestId('node-trigger-1')
      await user.hover(node)
      
      await waitFor(() => {
        expect(screen.getByTestId('toolbar-trigger-1')).toBeInTheDocument()
      })

      const disableButton = screen.getByLabelText('Disable Manual Trigger')
      disableButton.focus()
      
      await user.keyboard('{Enter}')
      expect(mockUpdateNode).toHaveBeenCalledWith('trigger-1', { disabled: true })
    })
  })

  describe('Error State Flows', () => {
    it('shows error state and allows retry', async () => {
      render(
        <ReactFlowProvider>
          <TestNodeWithToolbar
            nodeId="trigger-1"
            nodeType="Manual Trigger"
            nodeLabel="Manual Trigger"
            hasError={true}
          />
        </ReactFlowProvider>
      )

      const node = screen.getByTestId('node-trigger-1')
      await user.hover(node)
      
      await waitFor(() => {
        expect(screen.getByTestId('toolbar-trigger-1')).toBeInTheDocument()
      })

      const executeButton = screen.getByLabelText('Execution failed - click to retry')
      expect(executeButton).toHaveClass('bg-red-50', 'border-red-200', 'text-red-600')
      expect(executeButton).not.toBeDisabled()

      // Click to retry
      await user.click(executeButton)
      expect(mockExecuteNode).toHaveBeenCalledWith('trigger-1')
    })

    it('handles execution failure gracefully', async () => {
      mockExecuteNode.mockRejectedValueOnce(new Error('Execution failed'))

      render(
        <ReactFlowProvider>
          <TestNodeWithToolbar
            nodeId="trigger-1"
            nodeType="Manual Trigger"
            nodeLabel="Manual Trigger"
          />
        </ReactFlowProvider>
      )

      const node = screen.getByTestId('node-trigger-1')
      await user.hover(node)
      
      await waitFor(() => {
        expect(screen.getByTestId('toolbar-trigger-1')).toBeInTheDocument()
      })

      const executeButton = screen.getByLabelText('Execute Manual Trigger')
      await user.click(executeButton)

      expect(mockExecuteNode).toHaveBeenCalledWith('trigger-1')
      
      // Button should return to normal state after error
      await waitFor(() => {
        expect(executeButton).toHaveAttribute('aria-label', 'Execute Manual Trigger')
        expect(executeButton).not.toBeDisabled()
      }, { timeout: 200 })
    })
  })

  describe('Multiple Node Interactions', () => {
    it('handles interactions with multiple nodes independently', async () => {
      render(
        <ReactFlowProvider>
          <div style={{ display: 'flex', gap: 20 }}>
            <TestNodeWithToolbar
              nodeId="trigger-1"
              nodeType="Manual Trigger"
              nodeLabel="Manual Trigger 1"
            />
            <TestNodeWithToolbar
              nodeId="trigger-2"
              nodeType="Manual Trigger"
              nodeLabel="Manual Trigger 2"
            />
          </div>
        </ReactFlowProvider>
      )

      const node1 = screen.getByTestId('node-trigger-1')
      const node2 = screen.getByTestId('node-trigger-2')

      // Hover over first node
      await user.hover(node1)
      await waitFor(() => {
        expect(screen.getByTestId('toolbar-trigger-1')).toBeInTheDocument()
      })

      // Hover over second node
      await user.hover(node2)
      await waitFor(() => {
        expect(screen.getByTestId('toolbar-trigger-2')).toBeInTheDocument()
      })

      // Both toolbars should be visible
      expect(screen.getByTestId('toolbar-trigger-1')).toBeInTheDocument()
      expect(screen.getByTestId('toolbar-trigger-2')).toBeInTheDocument()

      // Execute first node
      const executeButton1 = screen.getByLabelText('Execute Manual Trigger 1')
      await user.click(executeButton1)
      expect(mockExecuteNode).toHaveBeenCalledWith('trigger-1')

      // Disable second node
      const disableButton2 = screen.getByLabelText('Disable Manual Trigger 2')
      await user.click(disableButton2)
      expect(mockUpdateNode).toHaveBeenCalledWith('trigger-2', { disabled: true })
    })
  })
})
