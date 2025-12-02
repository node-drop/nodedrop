import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { DisableToggleToolbarButton } from '../DisableToggleToolbarButton'

describe('DisableToggleToolbarButton', () => {
  const defaultProps = {
    nodeId: 'test-node-1',
    nodeLabel: 'Test Node',
    disabled: false,
    onToggle: vi.fn()
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering states', () => {
    it('renders with eye icon when enabled', () => {
      render(<DisableToggleToolbarButton {...defaultProps} />)
      
      const button = screen.getByRole('switch')
      expect(button).toBeInTheDocument()
      expect(button).toHaveAttribute('aria-label', 'Disable Test Node - press Enter or Space to activate')
      expect(button).toHaveAttribute('title', 'Disable Test Node')
      expect(button).not.toBeDisabled()
    })

    it('renders with eye-off icon when disabled', () => {
      render(<DisableToggleToolbarButton {...defaultProps} disabled={true} />)
      
      const button = screen.getByRole('switch')
      expect(button).toHaveAttribute('aria-label', 'Enable Test Node - press Enter or Space to activate')
      expect(button).toHaveAttribute('title', 'Enable Test Node')
      expect(button).not.toBeDisabled()
    })

    it('applies custom className when provided', () => {
      render(<DisableToggleToolbarButton {...defaultProps} className="custom-class" />)
      
      const button = screen.getByRole('switch')
      expect(button).toHaveClass('custom-class')
    })

    it('updates labels based on node label', () => {
      render(<DisableToggleToolbarButton {...defaultProps} nodeLabel="Custom Node Name" />)
      
      const button = screen.getByRole('switch')
      expect(button).toHaveAttribute('aria-label', 'Disable Custom Node Name - press Enter or Space to activate')
      expect(button).toHaveAttribute('title', 'Disable Custom Node Name')
    })
  })

  describe('user interactions', () => {
    it('calls onToggle with correct parameters when clicked (enable to disable)', () => {
      const onToggle = vi.fn()
      render(<DisableToggleToolbarButton {...defaultProps} onToggle={onToggle} />)
      
      const button = screen.getByRole('switch')
      fireEvent.click(button)
      
      expect(onToggle).toHaveBeenCalledWith('test-node-1', true)
      expect(onToggle).toHaveBeenCalledTimes(1)
    })

    it('calls onToggle to enable when disabled node is clicked', () => {
      const onToggle = vi.fn()
      render(<DisableToggleToolbarButton {...defaultProps} disabled={true} onToggle={onToggle} />)
      
      const button = screen.getByRole('switch')
      fireEvent.click(button)
      
      expect(onToggle).toHaveBeenCalledWith('test-node-1', false)
      expect(onToggle).toHaveBeenCalledTimes(1)
    })

    it('calls onToggle when Enter key is pressed', () => {
      const onToggle = vi.fn()
      render(<DisableToggleToolbarButton {...defaultProps} onToggle={onToggle} />)
      
      const button = screen.getByRole('switch')
      fireEvent.keyDown(button, { key: 'Enter' })
      
      expect(onToggle).toHaveBeenCalledWith('test-node-1', true)
      expect(onToggle).toHaveBeenCalledTimes(1)
    })

    it('calls onToggle when Space key is pressed', () => {
      const onToggle = vi.fn()
      render(<DisableToggleToolbarButton {...defaultProps} onToggle={onToggle} />)
      
      const button = screen.getByRole('switch')
      fireEvent.keyDown(button, { key: ' ' })
      
      expect(onToggle).toHaveBeenCalledWith('test-node-1', true)
      expect(onToggle).toHaveBeenCalledTimes(1)
    })

    it('does not call onToggle for other keys', () => {
      const onToggle = vi.fn()
      render(<DisableToggleToolbarButton {...defaultProps} onToggle={onToggle} />)
      
      const button = screen.getByRole('switch')
      fireEvent.keyDown(button, { key: 'Tab' })
      fireEvent.keyDown(button, { key: 'Escape' })
      fireEvent.keyDown(button, { key: 'a' })
      
      expect(onToggle).not.toHaveBeenCalled()
    })

    it('stops event propagation on click', () => {
      const onToggle = vi.fn()
      const onParentClick = vi.fn()
      
      render(
        <div onClick={onParentClick}>
          <DisableToggleToolbarButton {...defaultProps} onToggle={onToggle} />
        </div>
      )
      
      const button = screen.getByRole('switch')
      fireEvent.click(button)
      
      expect(onToggle).toHaveBeenCalled()
      expect(onParentClick).not.toHaveBeenCalled()
    })

    it('stops event propagation on keydown', () => {
      const onToggle = vi.fn()
      const onParentKeyDown = vi.fn()
      
      render(
        <div onKeyDown={onParentKeyDown}>
          <DisableToggleToolbarButton {...defaultProps} onToggle={onToggle} />
        </div>
      )
      
      const button = screen.getByRole('switch')
      fireEvent.keyDown(button, { key: 'Enter' })
      
      expect(onToggle).toHaveBeenCalled()
      expect(onParentKeyDown).not.toHaveBeenCalled()
    })
  })

  describe('toggle behavior', () => {
    it('toggles from enabled to disabled state', () => {
      const onToggle = vi.fn()
      const { rerender } = render(
        <DisableToggleToolbarButton {...defaultProps} disabled={false} onToggle={onToggle} />
      )
      
      let button = screen.getByRole('switch')
      expect(button).toHaveAttribute('aria-label', 'Disable Test Node - press Enter or Space to activate')
      
      fireEvent.click(button)
      expect(onToggle).toHaveBeenCalledWith('test-node-1', true)
      
      // Simulate state change
      rerender(<DisableToggleToolbarButton {...defaultProps} disabled={true} onToggle={onToggle} />)
      button = screen.getByRole('switch')
      expect(button).toHaveAttribute('aria-label', 'Enable Test Node - press Enter or Space to activate')
    })

    it('toggles from disabled to enabled state', () => {
      const onToggle = vi.fn()
      const { rerender } = render(
        <DisableToggleToolbarButton {...defaultProps} disabled={true} onToggle={onToggle} />
      )
      
      let button = screen.getByRole('switch')
      expect(button).toHaveAttribute('aria-label', 'Enable Test Node - press Enter or Space to activate')
      
      fireEvent.click(button)
      expect(onToggle).toHaveBeenCalledWith('test-node-1', false)
      
      // Simulate state change
      rerender(<DisableToggleToolbarButton {...defaultProps} disabled={false} onToggle={onToggle} />)
      button = screen.getByRole('switch')
      expect(button).toHaveAttribute('aria-label', 'Disable Test Node - press Enter or Space to activate')
    })
  })

  describe('accessibility', () => {
    it('has proper ARIA attributes', () => {
      render(<DisableToggleToolbarButton {...defaultProps} />)
      
      const button = screen.getByRole('switch')
      expect(button).toHaveAttribute('aria-label')
      expect(button).toHaveAttribute('title')
      expect(button).toHaveAttribute('tabIndex', '0')
    })

    it('has focus ring styles', () => {
      render(<DisableToggleToolbarButton {...defaultProps} />)
      
      const button = screen.getByRole('switch')
      expect(button).toHaveClass('toolbar-button')
      // Focus styles are applied via CSS, not classes
    })

    it('updates ARIA label based on disabled state', () => {
      const { rerender } = render(<DisableToggleToolbarButton {...defaultProps} disabled={false} />)
      let button = screen.getByRole('switch')
      expect(button).toHaveAttribute('aria-label', 'Disable Test Node - press Enter or Space to activate')

      rerender(<DisableToggleToolbarButton {...defaultProps} disabled={true} />)
      button = screen.getByRole('switch')
      expect(button).toHaveAttribute('aria-label', 'Enable Test Node - press Enter or Space to activate')
    })

    it('maintains consistent tabIndex for keyboard navigation', () => {
      const { rerender } = render(<DisableToggleToolbarButton {...defaultProps} disabled={false} />)
      let button = screen.getByRole('switch')
      expect(button).toHaveAttribute('tabIndex', '0')

      rerender(<DisableToggleToolbarButton {...defaultProps} disabled={true} />)
      button = screen.getByRole('switch')
      expect(button).toHaveAttribute('tabIndex', '0')
    })
  })

  describe('styling', () => {
    it('applies correct base styles', () => {
      render(<DisableToggleToolbarButton {...defaultProps} />)
      
      const button = screen.getByRole('switch')
      expect(button).toHaveClass('toolbar-button')
    })

    it('applies enabled styles when node is enabled', () => {
      render(<DisableToggleToolbarButton {...defaultProps} disabled={false} />)
      
      const button = screen.getByRole('switch')
      expect(button).toHaveClass('toolbar-button', 'enabled-node')
    })

    it('applies disabled styles when node is disabled', () => {
      render(<DisableToggleToolbarButton {...defaultProps} disabled={true} />)
      
      const button = screen.getByRole('switch')
      expect(button).toHaveClass('toolbar-button', 'disabled-node')
    })
  })

  describe('icon rendering', () => {
    it('renders Eye icon when node is enabled', () => {
      render(<DisableToggleToolbarButton {...defaultProps} disabled={false} />)
      
      const button = screen.getByRole('switch')
      const icon = button.querySelector('svg')
      expect(icon).toBeInTheDocument()
      expect(icon).toHaveClass('w-3', 'h-3')
    })

    it('renders EyeOff icon when node is disabled', () => {
      render(<DisableToggleToolbarButton {...defaultProps} disabled={true} />)
      
      const button = screen.getByRole('switch')
      const icon = button.querySelector('svg')
      expect(icon).toBeInTheDocument()
      expect(icon).toHaveClass('w-3', 'h-3')
    })
  })
})
