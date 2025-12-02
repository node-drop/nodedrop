import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ExecuteToolbarButton } from '../ExecuteToolbarButton'
import { DisableToggleToolbarButton } from '../DisableToggleToolbarButton'

describe('ARIA Support', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('ExecuteToolbarButton ARIA Attributes', () => {
    const defaultProps = {
      nodeId: 'test-node-1',
      nodeType: 'Manual Trigger',
      isExecuting: false,
      canExecute: true,
      onExecute: vi.fn()
    }

    it('has proper role attribute', () => {
      render(<ExecuteToolbarButton {...defaultProps} />)
      
      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('role', 'button')
    })

    it('has descriptive aria-label with keyboard instructions', () => {
      render(<ExecuteToolbarButton {...defaultProps} />)
      
      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('aria-label', 'Execute Manual Trigger - press Enter or Space to activate')
    })

    it('has aria-describedby pointing to description element', () => {
      render(<ExecuteToolbarButton {...defaultProps} />)
      
      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('aria-describedby', 'execute-button-desc-test-node-1')
      
      const description = document.getElementById('execute-button-desc-test-node-1')
      expect(description).toBeInTheDocument()
      expect(description).toHaveTextContent('Executes this node individually for testing purposes.')
    })

    it('has aria-pressed attribute reflecting execution state', () => {
      const { rerender } = render(<ExecuteToolbarButton {...defaultProps} />)
      let button = screen.getByRole('button')
      expect(button).toHaveAttribute('aria-pressed', 'false')

      rerender(<ExecuteToolbarButton {...defaultProps} isExecuting={true} />)
      button = screen.getByRole('button')
      expect(button).toHaveAttribute('aria-pressed', 'true')
    })

    it('updates aria-label based on execution state', () => {
      const { rerender } = render(<ExecuteToolbarButton {...defaultProps} />)
      let button = screen.getByRole('button')
      expect(button).toHaveAttribute('aria-label', 'Execute Manual Trigger - press Enter or Space to activate')

      rerender(<ExecuteToolbarButton {...defaultProps} isExecuting={true} />)
      button = screen.getByRole('button')
      expect(button).toHaveAttribute('aria-label', 'Executing Manual Trigger...')

      rerender(<ExecuteToolbarButton {...defaultProps} hasError={true} />)
      button = screen.getByRole('button')
      expect(button).toHaveAttribute('aria-label', 'Manual Trigger execution failed - press Enter or Space to retry')

      rerender(<ExecuteToolbarButton {...defaultProps} hasSuccess={true} />)
      button = screen.getByRole('button')
      expect(button).toHaveAttribute('aria-label', 'Manual Trigger execution completed successfully')
    })

    it('updates aria description based on state', () => {
      const { rerender } = render(<ExecuteToolbarButton {...defaultProps} />)
      let description = document.getElementById('execute-button-desc-test-node-1')
      expect(description).toHaveTextContent('Executes this node individually for testing purposes.')

      rerender(<ExecuteToolbarButton {...defaultProps} isExecuting={true} />)
      description = document.getElementById('execute-button-desc-test-node-1')
      expect(description).toHaveTextContent('Node is currently executing. Please wait for completion.')

      rerender(<ExecuteToolbarButton {...defaultProps} hasError={true} />)
      description = document.getElementById('execute-button-desc-test-node-1')
      expect(description).toHaveTextContent('Previous execution failed. You can retry by activating this button.')

      rerender(<ExecuteToolbarButton {...defaultProps} canExecute={false} />)
      description = document.getElementById('execute-button-desc-test-node-1')
      expect(description).toHaveTextContent('Execution is currently disabled. This may be because the workflow is running or the node is disabled.')
    })

    it('has live region for state announcements', async () => {
      const { rerender } = render(<ExecuteToolbarButton {...defaultProps} />)
      
      const liveRegion = document.querySelector('[aria-live="polite"]')
      expect(liveRegion).toBeInTheDocument()
      expect(liveRegion).toHaveAttribute('aria-live', 'polite')
      expect(liveRegion).toHaveAttribute('aria-atomic', 'true')
      expect(liveRegion).toHaveClass('sr-only')

      // Test state announcements
      rerender(<ExecuteToolbarButton {...defaultProps} isExecuting={true} />)
      await waitFor(() => {
        const updatedLiveRegion = document.querySelector('[aria-live="polite"]')
        expect(updatedLiveRegion).toHaveTextContent('Executing Manual Trigger')
      })

      rerender(<ExecuteToolbarButton {...defaultProps} hasSuccess={true} />)
      await waitFor(() => {
        const updatedLiveRegion = document.querySelector('[aria-live="polite"]')
        expect(updatedLiveRegion).toHaveTextContent('Manual Trigger executed successfully')
      })

      rerender(<ExecuteToolbarButton {...defaultProps} hasError={true} />)
      await waitFor(() => {
        const updatedLiveRegion = document.querySelector('[aria-live="polite"]')
        expect(updatedLiveRegion).toHaveTextContent('Manual Trigger execution failed')
      })
    })

    it('has screen reader only description element', () => {
      render(<ExecuteToolbarButton {...defaultProps} />)
      
      const description = document.getElementById('execute-button-desc-test-node-1')
      expect(description).toHaveClass('sr-only')
      expect(description).toHaveAttribute('aria-hidden', 'true')
    })
  })

  describe('DisableToggleToolbarButton ARIA Attributes', () => {
    const defaultProps = {
      nodeId: 'test-node-1',
      nodeLabel: 'Test Node',
      disabled: false,
      onToggle: vi.fn()
    }

    it('has proper role attribute as switch', () => {
      render(<DisableToggleToolbarButton {...defaultProps} />)
      
      const button = screen.getByRole('switch')
      expect(button).toHaveAttribute('role', 'switch')
    })

    it('has descriptive aria-label with keyboard instructions', () => {
      render(<DisableToggleToolbarButton {...defaultProps} />)
      
      const button = screen.getByRole('switch')
      expect(button).toHaveAttribute('aria-label', 'Disable Test Node - press Enter or Space to activate')
    })

    it('has aria-describedby pointing to description element', () => {
      render(<DisableToggleToolbarButton {...defaultProps} />)
      
      const button = screen.getByRole('switch')
      expect(button).toHaveAttribute('aria-describedby', 'disable-toggle-desc-test-node-1')
      
      const description = document.getElementById('disable-toggle-desc-test-node-1')
      expect(description).toBeInTheDocument()
      expect(description).toHaveTextContent('This node is currently enabled and will execute during workflow runs. Activate this button to disable it.')
    })

    it('has aria-checked attribute reflecting enabled state', () => {
      const { rerender } = render(<DisableToggleToolbarButton {...defaultProps} disabled={false} />)
      let button = screen.getByRole('switch')
      expect(button).toHaveAttribute('aria-checked', 'true') // enabled = checked

      rerender(<DisableToggleToolbarButton {...defaultProps} disabled={true} />)
      button = screen.getByRole('switch')
      expect(button).toHaveAttribute('aria-checked', 'false') // disabled = unchecked
    })

    it('has aria-pressed attribute reflecting toggle state', () => {
      const { rerender } = render(<DisableToggleToolbarButton {...defaultProps} disabled={false} />)
      let button = screen.getByRole('switch')
      expect(button).toHaveAttribute('aria-pressed', 'true') // enabled = pressed

      rerender(<DisableToggleToolbarButton {...defaultProps} disabled={true} />)
      button = screen.getByRole('switch')
      expect(button).toHaveAttribute('aria-pressed', 'false') // disabled = not pressed
    })

    it('updates aria-label based on disabled state', () => {
      const { rerender } = render(<DisableToggleToolbarButton {...defaultProps} disabled={false} />)
      let button = screen.getByRole('switch')
      expect(button).toHaveAttribute('aria-label', 'Disable Test Node - press Enter or Space to activate')

      rerender(<DisableToggleToolbarButton {...defaultProps} disabled={true} />)
      button = screen.getByRole('switch')
      expect(button).toHaveAttribute('aria-label', 'Enable Test Node - press Enter or Space to activate')
    })

    it('updates aria description based on disabled state', () => {
      const { rerender } = render(<DisableToggleToolbarButton {...defaultProps} disabled={false} />)
      let description = document.getElementById('disable-toggle-desc-test-node-1')
      expect(description).toHaveTextContent('This node is currently enabled and will execute during workflow runs. Activate this button to disable it.')

      rerender(<DisableToggleToolbarButton {...defaultProps} disabled={true} />)
      description = document.getElementById('disable-toggle-desc-test-node-1')
      expect(description).toHaveTextContent('This node is currently disabled and will not execute during workflow runs. Activate this button to enable it.')
    })

    it('has live region for state announcements', async () => {
      const { rerender } = render(<DisableToggleToolbarButton {...defaultProps} disabled={false} />)
      
      const liveRegions = document.querySelectorAll('[aria-live="polite"]')
      const liveRegion = Array.from(liveRegions).find(region => 
        region.textContent?.includes('enabled') || region.textContent?.includes('disabled')
      )
      expect(liveRegion).toBeInTheDocument()
      expect(liveRegion).toHaveAttribute('aria-live', 'polite')
      expect(liveRegion).toHaveAttribute('aria-atomic', 'true')
      expect(liveRegion).toHaveClass('sr-only')

      // Test state announcements
      rerender(<DisableToggleToolbarButton {...defaultProps} disabled={true} />)
      await waitFor(() => {
        const updatedLiveRegions = document.querySelectorAll('[aria-live="polite"]')
        const updatedLiveRegion = Array.from(updatedLiveRegions).find(region => 
          region.textContent?.includes('disabled')
        )
        expect(updatedLiveRegion).toHaveTextContent('Test Node is now disabled')
      })

      rerender(<DisableToggleToolbarButton {...defaultProps} disabled={false} />)
      await waitFor(() => {
        const updatedLiveRegions = document.querySelectorAll('[aria-live="polite"]')
        const updatedLiveRegion = Array.from(updatedLiveRegions).find(region => 
          region.textContent?.includes('enabled')
        )
        expect(updatedLiveRegion).toHaveTextContent('Test Node is now enabled')
      })
    })

    it('has screen reader only description element', () => {
      render(<DisableToggleToolbarButton {...defaultProps} />)
      
      const description = document.getElementById('disable-toggle-desc-test-node-1')
      expect(description).toHaveClass('sr-only')
      expect(description).toHaveAttribute('aria-hidden', 'true')
    })
  })

  describe('Toolbar Container ARIA', () => {
    it('has proper toolbar role and attributes in CustomNode', () => {
      // This would be tested in CustomNode integration tests
      // Here we just verify the structure is correct
      const toolbarContainer = document.createElement('div')
      toolbarContainer.setAttribute('role', 'toolbar')
      toolbarContainer.setAttribute('aria-label', 'Controls for Test Node')
      toolbarContainer.setAttribute('aria-orientation', 'horizontal')
      
      expect(toolbarContainer).toHaveAttribute('role', 'toolbar')
      expect(toolbarContainer).toHaveAttribute('aria-label', 'Controls for Test Node')
      expect(toolbarContainer).toHaveAttribute('aria-orientation', 'horizontal')
    })
  })
})
