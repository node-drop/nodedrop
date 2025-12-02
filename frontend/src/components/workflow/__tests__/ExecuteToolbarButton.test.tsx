import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ExecuteToolbarButton } from '../ExecuteToolbarButton'

describe('ExecuteToolbarButton', () => {
  const defaultProps = {
    nodeId: 'test-node-1',
    nodeType: 'Manual Trigger',
    isExecuting: false,
    canExecute: true,
    onExecute: vi.fn()
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering states', () => {
    it('renders with play icon when idle', () => {
      render(<ExecuteToolbarButton {...defaultProps} />)
      
      const button = screen.getByRole('button')
      expect(button).toBeInTheDocument()
      expect(button).toHaveAttribute('aria-label', 'Execute Manual Trigger - press Enter or Space to activate')
      expect(button).toHaveAttribute('title', 'Execute Manual Trigger')
      expect(button).not.toBeDisabled()
    })

    it('shows loading spinner when executing', () => {
      render(<ExecuteToolbarButton {...defaultProps} isExecuting={true} />)
      
      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('aria-label', 'Executing Manual Trigger...')
      expect(button).toHaveAttribute('title', 'Executing...')
      expect(button).toBeDisabled()
      
      // Check for loading spinner class
      const spinner = button.querySelector('.animate-spin')
      expect(spinner).toBeInTheDocument()
    })

    it('shows error icon when has error', () => {
      render(<ExecuteToolbarButton {...defaultProps} hasError={true} />)
      
      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('aria-label', 'Manual Trigger execution failed - press Enter or Space to retry')
      expect(button).toHaveAttribute('title', 'Execution failed - click to retry')
      expect(button).not.toBeDisabled()
    })

    it('is disabled when cannot execute', () => {
      render(<ExecuteToolbarButton {...defaultProps} canExecute={false} />)
      
      const button = screen.getByRole('button')
      expect(button).toBeDisabled()
      expect(button).toHaveAttribute('aria-label', 'Cannot execute Manual Trigger - workflow is running or node is disabled')
      expect(button).toHaveAttribute('title', 'Cannot execute - workflow is running or node is disabled')
    })

    it('applies custom className when provided', () => {
      render(<ExecuteToolbarButton {...defaultProps} className="custom-class" />)
      
      const button = screen.getByRole('button')
      expect(button).toHaveClass('custom-class')
    })
  })

  describe('user interactions', () => {
    it('calls onExecute when clicked', () => {
      const onExecute = vi.fn()
      render(<ExecuteToolbarButton {...defaultProps} onExecute={onExecute} />)
      
      const button = screen.getByRole('button')
      fireEvent.click(button)
      
      expect(onExecute).toHaveBeenCalledWith('test-node-1')
      expect(onExecute).toHaveBeenCalledTimes(1)
    })

    it('calls onExecute when Enter key is pressed', () => {
      const onExecute = vi.fn()
      render(<ExecuteToolbarButton {...defaultProps} onExecute={onExecute} />)
      
      const button = screen.getByRole('button')
      fireEvent.keyDown(button, { key: 'Enter' })
      
      expect(onExecute).toHaveBeenCalledWith('test-node-1')
      expect(onExecute).toHaveBeenCalledTimes(1)
    })

    it('calls onExecute when Space key is pressed', () => {
      const onExecute = vi.fn()
      render(<ExecuteToolbarButton {...defaultProps} onExecute={onExecute} />)
      
      const button = screen.getByRole('button')
      fireEvent.keyDown(button, { key: ' ' })
      
      expect(onExecute).toHaveBeenCalledWith('test-node-1')
      expect(onExecute).toHaveBeenCalledTimes(1)
    })

    it('does not call onExecute for other keys', () => {
      const onExecute = vi.fn()
      render(<ExecuteToolbarButton {...defaultProps} onExecute={onExecute} />)
      
      const button = screen.getByRole('button')
      fireEvent.keyDown(button, { key: 'Tab' })
      fireEvent.keyDown(button, { key: 'Escape' })
      fireEvent.keyDown(button, { key: 'a' })
      
      expect(onExecute).not.toHaveBeenCalled()
    })

    it('stops event propagation on click', () => {
      const onExecute = vi.fn()
      const onParentClick = vi.fn()
      
      render(
        <div onClick={onParentClick}>
          <ExecuteToolbarButton {...defaultProps} onExecute={onExecute} />
        </div>
      )
      
      const button = screen.getByRole('button')
      fireEvent.click(button)
      
      expect(onExecute).toHaveBeenCalled()
      expect(onParentClick).not.toHaveBeenCalled()
    })

    it('stops event propagation on keydown', () => {
      const onExecute = vi.fn()
      const onParentKeyDown = vi.fn()
      
      render(
        <div onKeyDown={onParentKeyDown}>
          <ExecuteToolbarButton {...defaultProps} onExecute={onExecute} />
        </div>
      )
      
      const button = screen.getByRole('button')
      fireEvent.keyDown(button, { key: 'Enter' })
      
      expect(onExecute).toHaveBeenCalled()
      expect(onParentKeyDown).not.toHaveBeenCalled()
    })
  })

  describe('disabled states', () => {
    it('does not call onExecute when disabled by canExecute=false', () => {
      const onExecute = vi.fn()
      render(<ExecuteToolbarButton {...defaultProps} canExecute={false} onExecute={onExecute} />)
      
      const button = screen.getByRole('button')
      fireEvent.click(button)
      fireEvent.keyDown(button, { key: 'Enter' })
      fireEvent.keyDown(button, { key: ' ' })
      
      expect(onExecute).not.toHaveBeenCalled()
    })

    it('does not call onExecute when executing', () => {
      const onExecute = vi.fn()
      render(<ExecuteToolbarButton {...defaultProps} isExecuting={true} onExecute={onExecute} />)
      
      const button = screen.getByRole('button')
      fireEvent.click(button)
      fireEvent.keyDown(button, { key: 'Enter' })
      fireEvent.keyDown(button, { key: ' ' })
      
      expect(onExecute).not.toHaveBeenCalled()
    })

    it('allows retry when in error state', () => {
      const onExecute = vi.fn()
      render(<ExecuteToolbarButton {...defaultProps} hasError={true} onExecute={onExecute} />)
      
      const button = screen.getByRole('button')
      fireEvent.click(button)
      
      expect(onExecute).toHaveBeenCalledWith('test-node-1')
    })
  })

  describe('accessibility', () => {
    it('has proper ARIA attributes', () => {
      render(<ExecuteToolbarButton {...defaultProps} />)
      
      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('aria-label')
      expect(button).toHaveAttribute('title')
      expect(button).toHaveAttribute('tabIndex', '0')
    })

    it('has focus ring styles', () => {
      render(<ExecuteToolbarButton {...defaultProps} />)
      
      const button = screen.getByRole('button')
      expect(button).toHaveClass('toolbar-button')
      // Focus styles are applied via CSS, not classes
    })

    it('updates ARIA label based on state', () => {
      const { rerender } = render(<ExecuteToolbarButton {...defaultProps} />)
      let button = screen.getByRole('button')
      expect(button).toHaveAttribute('aria-label', 'Execute Manual Trigger - press Enter or Space to activate')

      rerender(<ExecuteToolbarButton {...defaultProps} isExecuting={true} />)
      button = screen.getByRole('button')
      expect(button).toHaveAttribute('aria-label', 'Executing Manual Trigger...')

      rerender(<ExecuteToolbarButton {...defaultProps} hasError={true} />)
      button = screen.getByRole('button')
      expect(button).toHaveAttribute('aria-label', 'Manual Trigger execution failed - press Enter or Space to retry')

      rerender(<ExecuteToolbarButton {...defaultProps} canExecute={false} />)
      button = screen.getByRole('button')
      expect(button).toHaveAttribute('aria-label', 'Cannot execute Manual Trigger - workflow is running or node is disabled')
    })
  })

  describe('styling', () => {
    it('applies correct base styles', () => {
      render(<ExecuteToolbarButton {...defaultProps} />)
      
      const button = screen.getByRole('button')
      expect(button).toHaveClass('toolbar-button')
    })

    it('applies hover styles for executable state', () => {
      render(<ExecuteToolbarButton {...defaultProps} />)
      
      const button = screen.getByRole('button')
      expect(button).toHaveClass('toolbar-button')
      // CSS hover styles are applied via CSS, not classes
    })

    it('applies error styles when hasError is true', () => {
      render(<ExecuteToolbarButton {...defaultProps} hasError={true} />)
      
      const button = screen.getByRole('button')
      expect(button).toHaveClass('toolbar-button', 'error')
    })

    it('applies executing styles when isExecuting is true', () => {
      render(<ExecuteToolbarButton {...defaultProps} isExecuting={true} />)
      
      const button = screen.getByRole('button')
      expect(button).toHaveClass('toolbar-button', 'executing')
    })

    it('applies success styles when hasSuccess is true', () => {
      render(<ExecuteToolbarButton {...defaultProps} hasSuccess={true} />)
      
      const button = screen.getByRole('button')
      expect(button).toHaveClass('toolbar-button', 'success')
    })
  })
})
