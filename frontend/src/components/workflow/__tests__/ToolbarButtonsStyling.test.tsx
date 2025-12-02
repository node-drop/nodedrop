import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { ExecuteToolbarButton } from '../ExecuteToolbarButton'
import { DisableToggleToolbarButton } from '../DisableToggleToolbarButton'

describe('Toolbar Button Styling', () => {
  describe('ExecuteToolbarButton', () => {
    const defaultProps = {
      nodeId: 'test-node',
      nodeType: 'Manual Trigger',
      isExecuting: false,
      canExecute: true,
      onExecute: vi.fn()
    }

    it('applies base toolbar-button class', () => {
      render(<ExecuteToolbarButton {...defaultProps} />)
      const button = screen.getByRole('button')
      expect(button).toHaveClass('toolbar-button')
    })

    it('applies executing state class when executing', () => {
      render(<ExecuteToolbarButton {...defaultProps} isExecuting={true} />)
      const button = screen.getByRole('button')
      expect(button).toHaveClass('executing')
    })

    it('applies success state class when hasSuccess is true', () => {
      render(<ExecuteToolbarButton {...defaultProps} hasSuccess={true} />)
      const button = screen.getByRole('button')
      expect(button).toHaveClass('success')
    })

    it('applies error state class when hasError is true', () => {
      render(<ExecuteToolbarButton {...defaultProps} hasError={true} />)
      const button = screen.getByRole('button')
      expect(button).toHaveClass('error')
    })

    it('is disabled when canExecute is false', () => {
      render(<ExecuteToolbarButton {...defaultProps} canExecute={false} />)
      const button = screen.getByRole('button')
      expect(button).toBeDisabled()
    })

    it('is disabled when executing', () => {
      render(<ExecuteToolbarButton {...defaultProps} isExecuting={true} />)
      const button = screen.getByRole('button')
      expect(button).toBeDisabled()
    })

    it('has proper ARIA label', () => {
      render(<ExecuteToolbarButton {...defaultProps} />)
      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('aria-label', 'Execute Manual Trigger')
    })

    it('has proper tooltip', () => {
      render(<ExecuteToolbarButton {...defaultProps} />)
      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('title', 'Execute Manual Trigger')
    })

    it('shows executing tooltip when executing', () => {
      render(<ExecuteToolbarButton {...defaultProps} isExecuting={true} />)
      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('title', 'Executing...')
    })

    it('shows error tooltip when hasError is true', () => {
      render(<ExecuteToolbarButton {...defaultProps} hasError={true} />)
      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('title', 'Execution failed - click to retry')
    })

    it('shows success tooltip when hasSuccess is true', () => {
      render(<ExecuteToolbarButton {...defaultProps} hasSuccess={true} />)
      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('title', 'Execution completed successfully')
    })

    it('handles keyboard navigation', () => {
      const onExecute = vi.fn()
      render(<ExecuteToolbarButton {...defaultProps} onExecute={onExecute} />)
      const button = screen.getByRole('button')

      fireEvent.keyDown(button, { key: 'Enter' })
      expect(onExecute).toHaveBeenCalledWith('test-node')

      onExecute.mockClear()
      fireEvent.keyDown(button, { key: ' ' })
      expect(onExecute).toHaveBeenCalledWith('test-node')
    })

    it('applies custom className when provided', () => {
      render(<ExecuteToolbarButton {...defaultProps} className="custom-class" />)
      const button = screen.getByRole('button')
      expect(button).toHaveClass('custom-class')
    })
  })

  describe('DisableToggleToolbarButton', () => {
    const defaultProps = {
      nodeId: 'test-node',
      nodeLabel: 'Test Node',
      disabled: false,
      onToggle: vi.fn()
    }

    it('applies base toolbar-button class', () => {
      render(<DisableToggleToolbarButton {...defaultProps} />)
      const button = screen.getByRole('button')
      expect(button).toHaveClass('toolbar-button')
    })

    it('applies enabled-node class when node is enabled', () => {
      render(<DisableToggleToolbarButton {...defaultProps} disabled={false} />)
      const button = screen.getByRole('button')
      expect(button).toHaveClass('enabled-node')
    })

    it('applies disabled-node class when node is disabled', () => {
      render(<DisableToggleToolbarButton {...defaultProps} disabled={true} />)
      const button = screen.getByRole('button')
      expect(button).toHaveClass('disabled-node')
    })

    it('has proper ARIA label for enabled node', () => {
      render(<DisableToggleToolbarButton {...defaultProps} disabled={false} />)
      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('aria-label', 'Disable Test Node')
    })

    it('has proper ARIA label for disabled node', () => {
      render(<DisableToggleToolbarButton {...defaultProps} disabled={true} />)
      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('aria-label', 'Enable Test Node')
    })

    it('has proper tooltip for enabled node', () => {
      render(<DisableToggleToolbarButton {...defaultProps} disabled={false} />)
      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('title', 'Disable Test Node')
    })

    it('has proper tooltip for disabled node', () => {
      render(<DisableToggleToolbarButton {...defaultProps} disabled={true} />)
      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('title', 'Enable Test Node')
    })

    it('calls onToggle with correct parameters when clicked', () => {
      const onToggle = vi.fn()
      render(<DisableToggleToolbarButton {...defaultProps} onToggle={onToggle} disabled={false} />)
      const button = screen.getByRole('button')

      fireEvent.click(button)
      expect(onToggle).toHaveBeenCalledWith('test-node', true)
    })

    it('handles keyboard navigation', () => {
      const onToggle = vi.fn()
      render(<DisableToggleToolbarButton {...defaultProps} onToggle={onToggle} />)
      const button = screen.getByRole('button')

      fireEvent.keyDown(button, { key: 'Enter' })
      expect(onToggle).toHaveBeenCalledWith('test-node', true)

      onToggle.mockClear()
      fireEvent.keyDown(button, { key: ' ' })
      expect(onToggle).toHaveBeenCalledWith('test-node', true)
    })

    it('applies custom className when provided', () => {
      render(<DisableToggleToolbarButton {...defaultProps} className="custom-class" />)
      const button = screen.getByRole('button')
      expect(button).toHaveClass('custom-class')
    })
  })

  describe('CSS Class Integration', () => {
    it('ExecuteToolbarButton combines classes correctly', () => {
      render(
        <ExecuteToolbarButton
          nodeId="test"
          nodeType="Manual Trigger"
          isExecuting={false}
          canExecute={true}
          hasSuccess={true}
          onExecute={vi.fn()}
          className="additional-class"
        />
      )
      const button = screen.getByRole('button')
      expect(button).toHaveClass('toolbar-button', 'success', 'additional-class')
    })

    it('DisableToggleToolbarButton combines classes correctly', () => {
      render(
        <DisableToggleToolbarButton
          nodeId="test"
          nodeLabel="Test"
          disabled={true}
          onToggle={vi.fn()}
          className="additional-class"
        />
      )
      const button = screen.getByRole('button')
      expect(button).toHaveClass('toolbar-button', 'disabled-node', 'additional-class')
    })
  })

  describe('Accessibility Features', () => {
    it('ExecuteToolbarButton is focusable', () => {
      render(
        <ExecuteToolbarButton
          nodeId="test"
          nodeType="Manual Trigger"
          isExecuting={false}
          canExecute={true}
          onExecute={vi.fn()}
        />
      )
      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('tabIndex', '0')
    })

    it('DisableToggleToolbarButton is focusable', () => {
      render(
        <DisableToggleToolbarButton
          nodeId="test"
          nodeLabel="Test"
          disabled={false}
          onToggle={vi.fn()}
        />
      )
      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('tabIndex', '0')
    })

    it('buttons prevent event propagation on click', () => {
      const parentClick = vi.fn()
      const executeClick = vi.fn()

      render(
        <div onClick={parentClick}>
          <ExecuteToolbarButton
            nodeId="test"
            nodeType="Manual Trigger"
            isExecuting={false}
            canExecute={true}
            onExecute={executeClick}
          />
        </div>
      )

      const button = screen.getByRole('button')
      fireEvent.click(button)

      expect(executeClick).toHaveBeenCalled()
      expect(parentClick).not.toHaveBeenCalled()
    })
  })
})
