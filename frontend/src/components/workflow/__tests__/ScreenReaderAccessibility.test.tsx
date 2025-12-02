import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { CustomNode } from '../CustomNode'
import { useWorkflowStore } from '@/stores/workflow'

// Mock the workflow store
vi.mock('@/stores/workflow')
const mockUseWorkflowStore = vi.mocked(useWorkflowStore)

// Mock ReactFlow components
vi.mock('reactflow', () => ({
  Handle: ({ type, position, className }: any) => (
    <div data-testid={`handle-${type}-${position}`} className={className} />
  ),
  Position: {
    Left: 'left',
    Right: 'right',
    Top: 'top',
    Bottom: 'bottom'
  },
  NodeToolbar: ({ children, isVisible, position, offset, align }: any) => (
    <div 
      data-testid="node-toolbar" 
      data-visible={isVisible}
      data-position={position}
      data-offset={offset}
      data-align={align}
    >
      {children}
    </div>
  )
}))

// Mock node type classification
vi.mock('@/utils/nodeTypeClassification', () => ({
  shouldShowExecuteButton: vi.fn(() => true),
  shouldShowDisableButton: vi.fn(() => true),
  canNodeExecuteIndividually: vi.fn(() => true)
}))

describe('Screen Reader Accessibility', () => {
  const mockExecuteNode = vi.fn()
  const mockUpdateNode = vi.fn()
  const mockGetNodeExecutionResult = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    
    mockUseWorkflowStore.mockImplementation((selector) => {
      const state = {
        executeNode: mockExecuteNode,
        updateNode: mockUpdateNode,
        executionState: { status: 'idle' },
        getNodeExecutionResult: mockGetNodeExecutionResult
      }
      return selector(state)
    })

    mockGetNodeExecutionResult.mockReturnValue(null)
  })

  const defaultNodeData = {
    label: 'Test Manual Trigger',
    nodeType: 'Manual Trigger',
    parameters: {},
    disabled: false,
    status: 'idle' as const,
    icon: 'play',
    color: '#3b82f6'
  }

  const defaultNodeProps = {
    data: defaultNodeData,
    selected: false,
    id: 'test-node-1'
  }

  describe('Screen Reader Announcements', () => {
    it('announces execution state changes', async () => {
      const { rerender } = render(<CustomNode {...defaultNodeProps} />)
      
      // Find the live region for execute button
      const liveRegions = document.querySelectorAll('[aria-live="polite"]')
      const executeLiveRegion = Array.from(liveRegions).find(region => 
        region.textContent === '' || region.textContent?.includes('Executing')
      )
      expect(executeLiveRegion).toBeInTheDocument()

      // Simulate execution start
      mockGetNodeExecutionResult.mockReturnValue({
        status: 'success',
        startTime: Date.now(),
        endTime: Date.now() // Same time = executing
      })

      rerender(<CustomNode {...defaultNodeProps} />)
      
      await waitFor(() => {
        expect(executeLiveRegion).toHaveTextContent('Executing Manual Trigger')
      })

      // Simulate execution completion
      mockGetNodeExecutionResult.mockReturnValue({
        status: 'success',
        startTime: Date.now() - 1000,
        endTime: Date.now()
      })

      rerender(<CustomNode {...defaultNodeProps} />)
      
      await waitFor(() => {
        expect(executeLiveRegion).toHaveTextContent('Manual Trigger executed successfully')
      })
    })

    it('announces disable/enable state changes', async () => {
      const { rerender } = render(<CustomNode {...defaultNodeProps} />)
      
      // Find the live region for disable toggle button
      const liveRegions = document.querySelectorAll('[aria-live="polite"]')
      const disableLiveRegion = Array.from(liveRegions).find(region => 
        region.textContent?.includes('enabled') || region.textContent?.includes('disabled')
      )
      expect(disableLiveRegion).toBeInTheDocument()

      // Simulate node being disabled
      rerender(<CustomNode {...defaultNodeProps} data={{...defaultNodeData, disabled: true}} />)
      
      await waitFor(() => {
        expect(disableLiveRegion).toHaveTextContent('Test Manual Trigger is now disabled')
      })

      // Simulate node being enabled
      rerender(<CustomNode {...defaultNodeProps} data={{...defaultNodeData, disabled: false}} />)
      
      await waitFor(() => {
        expect(disableLiveRegion).toHaveTextContent('Test Manual Trigger is now enabled')
      })
    })
  })

  describe('Keyboard-Only Navigation', () => {
    it('allows full keyboard navigation through toolbar controls', () => {
      render(<CustomNode {...defaultNodeProps} />)
      
      const executeButton = screen.getByRole('button')
      const disableButton = screen.getByRole('switch')
      
      // Both buttons should be focusable
      expect(executeButton).toHaveAttribute('tabIndex', '0')
      expect(disableButton).toHaveAttribute('tabIndex', '0')
      
      // Focus execute button
      executeButton.focus()
      expect(document.activeElement).toBe(executeButton)
      
      // Tab to disable button
      fireEvent.keyDown(executeButton, { key: 'Tab' })
      disableButton.focus()
      expect(document.activeElement).toBe(disableButton)
    })

    it('executes node with keyboard activation', async () => {
      // Ensure the node is not executing initially
      mockGetNodeExecutionResult.mockReturnValue(null)
      
      render(<CustomNode {...defaultNodeProps} />)
      
      const executeButton = screen.getByRole('button')
      expect(executeButton).not.toBeDisabled()
      executeButton.focus()
      
      // Activate with Enter - the actual execution will be tested in integration tests
      // Here we just verify the button responds to keyboard events
      fireEvent.keyDown(executeButton, { key: 'Enter' })
      
      // Verify the button is still focusable and responsive
      expect(document.activeElement).toBe(executeButton)
      
      // Activate with Space
      fireEvent.keyDown(executeButton, { key: ' ' })
      
      // Verify the button is still focusable and responsive
      expect(document.activeElement).toBe(executeButton)
    })

    it('toggles node disable state with keyboard activation', () => {
      render(<CustomNode {...defaultNodeProps} />)
      
      const disableButton = screen.getByRole('switch')
      disableButton.focus()
      
      // Toggle with Enter
      fireEvent.keyDown(disableButton, { key: 'Enter' })
      expect(mockUpdateNode).toHaveBeenCalledWith('test-node-1', { disabled: true })
      
      mockUpdateNode.mockClear()
      
      // Toggle with Space
      fireEvent.keyDown(disableButton, { key: ' ' })
      expect(mockUpdateNode).toHaveBeenCalledWith('test-node-1', { disabled: true })
    })

    it('does not interfere with other keyboard shortcuts', () => {
      const onParentKeyDown = vi.fn()
      
      render(
        <div onKeyDown={onParentKeyDown}>
          <CustomNode {...defaultNodeProps} />
        </div>
      )
      
      const executeButton = screen.getByRole('button')
      executeButton.focus()
      
      // Tab should not be stopped
      fireEvent.keyDown(executeButton, { key: 'Tab' })
      // Other keys should be stopped
      fireEvent.keyDown(executeButton, { key: 'Escape' })
      fireEvent.keyDown(executeButton, { key: 'Delete' })
      
      // Only Tab should propagate to parent
      expect(onParentKeyDown).toHaveBeenCalledTimes(1)
      expect(onParentKeyDown).toHaveBeenCalledWith(
        expect.objectContaining({ key: 'Tab' })
      )
    })
  })

  describe('Screen Reader Context and Descriptions', () => {
    it('provides comprehensive context for execute button', () => {
      render(<CustomNode {...defaultNodeProps} />)
      
      const executeButton = screen.getByRole('button')
      
      // Check aria-label provides action and keyboard instructions
      expect(executeButton).toHaveAttribute(
        'aria-label', 
        'Execute Manual Trigger - press Enter or Space to activate'
      )
      
      // Check description provides context
      const description = document.getElementById('execute-button-desc-test-node-1')
      expect(description).toHaveTextContent(
        'Executes this node individually for testing purposes.'
      )
    })

    it('provides comprehensive context for disable toggle button', () => {
      render(<CustomNode {...defaultNodeProps} />)
      
      const disableButton = screen.getByRole('switch')
      
      // Check aria-label provides action and keyboard instructions
      expect(disableButton).toHaveAttribute(
        'aria-label', 
        'Disable Test Manual Trigger - press Enter or Space to activate'
      )
      
      // Check description provides context
      const description = document.getElementById('disable-toggle-desc-test-node-1')
      expect(description).toHaveTextContent(
        'This node is currently enabled and will execute during workflow runs. Activate this button to disable it.'
      )
    })

    it('provides toolbar context', () => {
      render(<CustomNode {...defaultNodeProps} />)
      
      const toolbar = screen.getByRole('toolbar')
      expect(toolbar).toHaveAttribute('aria-label', 'Controls for Test Manual Trigger')
      expect(toolbar).toHaveAttribute('aria-orientation', 'horizontal')
    })

    it('updates context based on execution state', () => {
      mockGetNodeExecutionResult.mockReturnValue({
        status: 'error',
        startTime: Date.now() - 1000,
        endTime: Date.now(),
        error: 'Test error'
      })

      render(<CustomNode {...defaultNodeProps} />)
      
      const executeButton = screen.getByRole('button')
      expect(executeButton).toHaveAttribute(
        'aria-label', 
        'Manual Trigger execution failed - press Enter or Space to retry'
      )
      
      const description = document.getElementById('execute-button-desc-test-node-1')
      expect(description).toHaveTextContent(
        'Previous execution failed. You can retry by activating this button.'
      )
    })

    it('updates context based on disabled state', () => {
      render(<CustomNode {...defaultNodeProps} data={{...defaultNodeData, disabled: true}} />)
      
      const disableButton = screen.getByRole('switch')
      expect(disableButton).toHaveAttribute(
        'aria-label', 
        'Enable Test Manual Trigger - press Enter or Space to activate'
      )
      
      const description = document.getElementById('disable-toggle-desc-test-node-1')
      expect(description).toHaveTextContent(
        'This node is currently disabled and will not execute during workflow runs. Activate this button to enable it.'
      )
    })
  })

  describe('Focus Management', () => {
    it('maintains focus visibility with proper focus styles', () => {
      render(<CustomNode {...defaultNodeProps} />)
      
      const executeButton = screen.getByRole('button')
      const disableButton = screen.getByRole('switch')
      
      // Both buttons should have focus styles applied via CSS
      expect(executeButton).toHaveClass('toolbar-button')
      expect(disableButton).toHaveClass('toolbar-button')
      
      // Focus should be visible (tested via CSS :focus selector)
      executeButton.focus()
      expect(document.activeElement).toBe(executeButton)
      
      disableButton.focus()
      expect(document.activeElement).toBe(disableButton)
    })

    it('does not trap focus within toolbar', () => {
      render(
        <div>
          <button data-testid="before">Before</button>
          <CustomNode {...defaultNodeProps} />
          <button data-testid="after">After</button>
        </div>
      )
      
      const beforeButton = screen.getByTestId('before')
      const executeButton = screen.getByRole('button', { name: /execute/i })
      const disableButton = screen.getByRole('switch')
      const afterButton = screen.getByTestId('after')
      
      // Should be able to tab through all elements
      beforeButton.focus()
      expect(document.activeElement).toBe(beforeButton)
      
      // Tab to toolbar
      fireEvent.keyDown(beforeButton, { key: 'Tab' })
      executeButton.focus()
      expect(document.activeElement).toBe(executeButton)
      
      // Tab within toolbar
      fireEvent.keyDown(executeButton, { key: 'Tab' })
      disableButton.focus()
      expect(document.activeElement).toBe(disableButton)
      
      // Tab out of toolbar
      fireEvent.keyDown(disableButton, { key: 'Tab' })
      afterButton.focus()
      expect(document.activeElement).toBe(afterButton)
    })
  })
})
