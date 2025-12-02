import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ExecuteToolbarButton } from '../ExecuteToolbarButton'
import { DisableToggleToolbarButton } from '../DisableToggleToolbarButton'

describe('Keyboard Accessibility', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('ExecuteToolbarButton Keyboard Navigation', () => {
    const defaultProps = {
      nodeId: 'test-node-1',
      nodeType: 'Manual Trigger',
      isExecuting: false,
      canExecute: true,
      onExecute: vi.fn()
    }

    it('is focusable with Tab key', () => {
      render(<ExecuteToolbarButton {...defaultProps} />)
      
      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('tabIndex', '0')
      
      // Simulate tab navigation
      button.focus()
      expect(document.activeElement).toBe(button)
    })

    it('activates with Enter key', () => {
      const onExecute = vi.fn()
      render(<ExecuteToolbarButton {...defaultProps} onExecute={onExecute} />)
      
      const button = screen.getByRole('button')
      button.focus()
      
      fireEvent.keyDown(button, { key: 'Enter' })
      expect(onExecute).toHaveBeenCalledWith('test-node-1')
    })

    it('activates with Space key', () => {
      const onExecute = vi.fn()
      render(<ExecuteToolbarButton {...defaultProps} onExecute={onExecute} />)
      
      const button = screen.getByRole('button')
      button.focus()
      
      fireEvent.keyDown(button, { key: ' ' })
      expect(onExecute).toHaveBeenCalledWith('test-node-1')
    })

    it('allows Tab navigation without interference', () => {
      const onExecute = vi.fn()
      render(<ExecuteToolbarButton {...defaultProps} onExecute={onExecute} />)
      
      const button = screen.getByRole('button')
      button.focus()
      
      // Tab key should not trigger execution
      fireEvent.keyDown(button, { key: 'Tab' })
      expect(onExecute).not.toHaveBeenCalled()
    })

    it('prevents other keys from propagating', () => {
      const onExecute = vi.fn()
      const onParentKeyDown = vi.fn()
      
      render(
        <div onKeyDown={onParentKeyDown}>
          <ExecuteToolbarButton {...defaultProps} onExecute={onExecute} />
        </div>
      )
      
      const button = screen.getByRole('button')
      button.focus()
      
      fireEvent.keyDown(button, { key: 'Escape' })
      fireEvent.keyDown(button, { key: 'a' })
      
      expect(onExecute).not.toHaveBeenCalled()
      expect(onParentKeyDown).not.toHaveBeenCalled()
    })

    it('does not activate when disabled', () => {
      const onExecute = vi.fn()
      render(<ExecuteToolbarButton {...defaultProps} canExecute={false} onExecute={onExecute} />)
      
      const button = screen.getByRole('button')
      button.focus()
      
      fireEvent.keyDown(button, { key: 'Enter' })
      fireEvent.keyDown(button, { key: ' ' })
      
      expect(onExecute).not.toHaveBeenCalled()
    })

    it('does not activate when executing', () => {
      const onExecute = vi.fn()
      render(<ExecuteToolbarButton {...defaultProps} isExecuting={true} onExecute={onExecute} />)
      
      const button = screen.getByRole('button')
      button.focus()
      
      fireEvent.keyDown(button, { key: 'Enter' })
      fireEvent.keyDown(button, { key: ' ' })
      
      expect(onExecute).not.toHaveBeenCalled()
    })
  })

  describe('DisableToggleToolbarButton Keyboard Navigation', () => {
    const defaultProps = {
      nodeId: 'test-node-1',
      nodeLabel: 'Test Node',
      disabled: false,
      onToggle: vi.fn()
    }

    it('is focusable with Tab key', () => {
      render(<DisableToggleToolbarButton {...defaultProps} />)
      
      const button = screen.getByRole('switch')
      expect(button).toHaveAttribute('tabIndex', '0')
      
      // Simulate tab navigation
      button.focus()
      expect(document.activeElement).toBe(button)
    })

    it('toggles with Enter key', () => {
      const onToggle = vi.fn()
      render(<DisableToggleToolbarButton {...defaultProps} onToggle={onToggle} />)
      
      const button = screen.getByRole('switch')
      button.focus()
      
      fireEvent.keyDown(button, { key: 'Enter' })
      expect(onToggle).toHaveBeenCalledWith('test-node-1', true)
    })

    it('toggles with Space key', () => {
      const onToggle = vi.fn()
      render(<DisableToggleToolbarButton {...defaultProps} onToggle={onToggle} />)
      
      const button = screen.getByRole('switch')
      button.focus()
      
      fireEvent.keyDown(button, { key: ' ' })
      expect(onToggle).toHaveBeenCalledWith('test-node-1', true)
    })

    it('allows Tab navigation without interference', () => {
      const onToggle = vi.fn()
      render(<DisableToggleToolbarButton {...defaultProps} onToggle={onToggle} />)
      
      const button = screen.getByRole('switch')
      button.focus()
      
      // Tab key should not trigger toggle
      fireEvent.keyDown(button, { key: 'Tab' })
      expect(onToggle).not.toHaveBeenCalled()
    })

    it('prevents other keys from propagating', () => {
      const onToggle = vi.fn()
      const onParentKeyDown = vi.fn()
      
      render(
        <div onKeyDown={onParentKeyDown}>
          <DisableToggleToolbarButton {...defaultProps} onToggle={onToggle} />
        </div>
      )
      
      const button = screen.getByRole('switch')
      button.focus()
      
      fireEvent.keyDown(button, { key: 'Escape' })
      fireEvent.keyDown(button, { key: 'a' })
      
      expect(onToggle).not.toHaveBeenCalled()
      expect(onParentKeyDown).not.toHaveBeenCalled()
    })
  })

  describe('Sequential Keyboard Navigation', () => {
    it('allows tabbing between multiple toolbar buttons', () => {
      const executeProps = {
        nodeId: 'test-node-1',
        nodeType: 'Manual Trigger',
        isExecuting: false,
        canExecute: true,
        onExecute: vi.fn()
      }

      const disableProps = {
        nodeId: 'test-node-1',
        nodeLabel: 'Test Node',
        disabled: false,
        onToggle: vi.fn()
      }

      render(
        <div>
          <ExecuteToolbarButton {...executeProps} />
          <DisableToggleToolbarButton {...disableProps} />
        </div>
      )
      
      const executeButton = screen.getByRole('button')
      const disableButton = screen.getByRole('switch')
      
      // Both should be focusable
      expect(executeButton).toHaveAttribute('tabIndex', '0')
      expect(disableButton).toHaveAttribute('tabIndex', '0')
      
      // Focus first button
      executeButton.focus()
      expect(document.activeElement).toBe(executeButton)
      
      // Simulate tab to next button
      fireEvent.keyDown(executeButton, { key: 'Tab' })
      disableButton.focus()
      expect(document.activeElement).toBe(disableButton)
    })
  })
})
