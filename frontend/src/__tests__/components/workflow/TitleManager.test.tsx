import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { TitleManager } from '@/components/workflow/TitleManager'

const mockProps = {
  title: 'Test Workflow',
  onChange: vi.fn(),
  onSave: vi.fn(),
  isDirty: false
}

describe('TitleManager', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllTimers()
  })

  describe('Display Mode', () => {
    it('should render title in display mode by default', () => {
      render(<TitleManager {...mockProps} />)
      
      expect(screen.getByText('Test Workflow')).toBeInTheDocument()
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    })

    it('should show placeholder when title is empty', () => {
      render(<TitleManager {...mockProps} title="" placeholder="My Placeholder" />)
      
      expect(screen.getByText('My Placeholder')).toBeInTheDocument()
      expect(screen.getByText('My Placeholder')).toHaveClass('text-gray-500', 'italic')
    })

    it('should show default placeholder when no custom placeholder provided', () => {
      render(<TitleManager {...mockProps} title="" />)
      
      expect(screen.getByText('Untitled Workflow')).toBeInTheDocument()
    })

    it('should show dirty indicator when isDirty is true', () => {
      render(<TitleManager {...mockProps} isDirty={true} />)
      
      const dirtyIndicator = screen.getByTitle('Unsaved title changes')
      expect(dirtyIndicator).toBeInTheDocument()
      expect(dirtyIndicator).toHaveClass('bg-orange-400')
    })

    it('should show edit icon on hover', () => {
      render(<TitleManager {...mockProps} />)
      
      const titleButton = screen.getByRole('button')
      fireEvent.mouseEnter(titleButton)
      
      expect(screen.getByTitle('Click to edit title')).toBeInTheDocument()
    })

    it('should show tooltip on hover', async () => {
      render(<TitleManager {...mockProps} />)
      
      const titleButton = screen.getByRole('button')
      fireEvent.mouseEnter(titleButton)
      
      await waitFor(() => {
        expect(screen.getByText('Click to edit workflow title')).toBeInTheDocument()
      })
    })

    it('should enter edit mode when clicked', () => {
      render(<TitleManager {...mockProps} />)
      
      fireEvent.click(screen.getByRole('button'))
      
      expect(screen.getByRole('textbox')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Test Workflow')).toBeInTheDocument()
    })
  })

  describe('Edit Mode', () => {
    it('should render input field in edit mode', () => {
      render(<TitleManager {...mockProps} isEditing={true} />)
      
      const input = screen.getByRole('textbox')
      expect(input).toBeInTheDocument()
      expect(input).toHaveValue('Test Workflow')
      expect(input).toHaveFocus()
    })

    it('should select all text when entering edit mode', () => {
      render(<TitleManager {...mockProps} />)
      
      fireEvent.click(screen.getByRole('button'))
      
      const input = screen.getByRole('textbox') as HTMLInputElement
      expect(input.selectionStart).toBe(0)
      expect(input.selectionEnd).toBe('Test Workflow'.length)
    })

    it('should show save and cancel buttons in edit mode', () => {
      render(<TitleManager {...mockProps} isEditing={true} />)
      
      expect(screen.getByTitle('Save (Enter)')).toBeInTheDocument()
      expect(screen.getByTitle('Cancel (Escape)')).toBeInTheDocument()
    })

    it('should call onChange when input value changes', () => {
      render(<TitleManager {...mockProps} isEditing={true} />)
      
      const input = screen.getByRole('textbox')
      fireEvent.change(input, { target: { value: 'New Title' } })
      
      expect(mockProps.onChange).toHaveBeenCalledWith('New Title')
    })

    it('should save on Enter key press', () => {
      render(<TitleManager {...mockProps} isEditing={true} />)
      
      const input = screen.getByRole('textbox')
      fireEvent.change(input, { target: { value: 'New Title' } })
      fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' })
      
      expect(mockProps.onSave).toHaveBeenCalledWith('New Title')
    })

    it('should cancel on Escape key press', () => {
      render(<TitleManager {...mockProps} />)
      
      // Enter edit mode first
      fireEvent.click(screen.getByRole('button'))
      
      const input = screen.getByRole('textbox')
      fireEvent.change(input, { target: { value: 'New Title' } })
      fireEvent.keyDown(input, { key: 'Escape', code: 'Escape' })
      
      expect(mockProps.onSave).not.toHaveBeenCalled()
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    })

    it('should save when clicking save button', () => {
      render(<TitleManager {...mockProps} isEditing={true} />)
      
      const input = screen.getByRole('textbox')
      fireEvent.change(input, { target: { value: 'New Title' } })
      
      fireEvent.click(screen.getByTitle('Save (Enter)'))
      
      expect(mockProps.onSave).toHaveBeenCalledWith('New Title')
    })

    it('should cancel when clicking cancel button', () => {
      render(<TitleManager {...mockProps} />)
      
      // Enter edit mode first
      fireEvent.click(screen.getByRole('button'))
      
      const input = screen.getByRole('textbox')
      fireEvent.change(input, { target: { value: 'New Title' } })
      
      fireEvent.click(screen.getByTitle('Cancel (Escape)'))
      
      expect(mockProps.onSave).not.toHaveBeenCalled()
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    })

    it('should disable save button when input is empty', () => {
      render(<TitleManager {...mockProps} isEditing={true} />)
      
      const input = screen.getByRole('textbox')
      fireEvent.change(input, { target: { value: '' } })
      
      const saveButton = screen.getByTitle('Save (Enter)')
      expect(saveButton).toBeDisabled()
      expect(saveButton).toHaveClass('cursor-not-allowed')
    })

    it('should disable save button when validation error exists', () => {
      render(<TitleManager {...mockProps} isEditing={true} validationError="Title too long" />)
      
      const saveButton = screen.getByTitle('Save (Enter)')
      expect(saveButton).toBeDisabled()
      expect(saveButton).toHaveClass('cursor-not-allowed')
    })

    it('should show validation error tooltip', () => {
      render(<TitleManager {...mockProps} isEditing={true} validationError="Title too long" />)
      
      expect(screen.getByText('Title too long')).toBeInTheDocument()
      expect(screen.getByText('Title too long').closest('div')).toHaveClass('text-red-600')
    })

    it('should apply error styling to input when validation error exists', () => {
      render(<TitleManager {...mockProps} isEditing={true} validationError="Title too long" />)
      
      const input = screen.getByRole('textbox')
      expect(input).toHaveClass('border-red-300', 'focus:ring-red-500')
    })

    it('should limit input to maxLength', () => {
      render(<TitleManager {...mockProps} isEditing={true} />)
      
      const input = screen.getByRole('textbox')
      expect(input).toHaveAttribute('maxLength', '100')
    })
  })

  describe('Auto-save Functionality', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('should auto-save after delay when autoSave is enabled', () => {
      render(<TitleManager {...mockProps} isEditing={true} autoSave={true} autoSaveDelay={1000} />)
      
      const input = screen.getByRole('textbox')
      fireEvent.change(input, { target: { value: 'Auto Save Title' } })
      
      // Fast-forward time
      vi.advanceTimersByTime(1000)
      
      expect(mockProps.onSave).toHaveBeenCalledWith('Auto Save Title')
    })

    it('should not auto-save when autoSave is disabled', () => {
      render(<TitleManager {...mockProps} isEditing={true} autoSave={false} />)
      
      const input = screen.getByRole('textbox')
      fireEvent.change(input, { target: { value: 'No Auto Save' } })
      
      vi.advanceTimersByTime(2000)
      
      expect(mockProps.onSave).not.toHaveBeenCalled()
    })

    it('should debounce auto-save calls', () => {
      render(<TitleManager {...mockProps} isEditing={true} autoSave={true} autoSaveDelay={1000} />)
      
      const input = screen.getByRole('textbox')
      fireEvent.change(input, { target: { value: 'A' } })
      
      vi.advanceTimersByTime(500)
      
      fireEvent.change(input, { target: { value: 'AB' } })
      
      vi.advanceTimersByTime(500)
      
      // Should not have saved yet
      expect(mockProps.onSave).not.toHaveBeenCalled()
      
      vi.advanceTimersByTime(500)
      
      // Should save now
      expect(mockProps.onSave).toHaveBeenCalledWith('AB')
    })

    it('should not auto-save empty titles', () => {
      render(<TitleManager {...mockProps} isEditing={true} autoSave={true} autoSaveDelay={1000} />)
      
      const input = screen.getByRole('textbox')
      fireEvent.change(input, { target: { value: '' } })
      
      vi.advanceTimersByTime(1000)
      
      expect(mockProps.onSave).not.toHaveBeenCalled()
    })

    it('should not auto-save when validation error exists', () => {
      render(<TitleManager {...mockProps} isEditing={true} autoSave={true} autoSaveDelay={1000} validationError="Error" />)
      
      const input = screen.getByRole('textbox')
      fireEvent.change(input, { target: { value: 'Invalid Title' } })
      
      vi.advanceTimersByTime(1000)
      
      expect(mockProps.onSave).not.toHaveBeenCalled()
    })

    it('should auto-save on blur when conditions are met', () => {
      render(<TitleManager {...mockProps} isEditing={true} autoSave={true} />)
      
      const input = screen.getByRole('textbox')
      fireEvent.change(input, { target: { value: 'Blur Save Title' } })
      
      fireEvent.blur(input)
      
      expect(mockProps.onSave).toHaveBeenCalledWith('Blur Save Title')
    })

    it('should cancel on blur when title unchanged', () => {
      render(<TitleManager {...mockProps} autoSave={true} />)
      
      // Enter edit mode first
      fireEvent.click(screen.getByRole('button'))
      
      const input = screen.getByRole('textbox')
      
      fireEvent.blur(input)
      
      expect(mockProps.onSave).not.toHaveBeenCalled()
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    })
  })

  describe('Props and State Management', () => {
    it('should update edit value when title prop changes and not editing', () => {
      const { rerender } = render(<TitleManager {...mockProps} title="Original" />)
      
      rerender(<TitleManager {...mockProps} title="Updated" />)
      
      expect(screen.getByText('Updated')).toBeInTheDocument()
    })

    it('should not update edit value when title prop changes while editing', () => {
      const { rerender } = render(<TitleManager {...mockProps} title="Original" isEditing={true} />)
      
      rerender(<TitleManager {...mockProps} title="Updated" isEditing={true} />)
      
      const input = screen.getByRole('textbox')
      expect(input).toHaveValue('Original')
    })

    it('should apply custom className', () => {
      render(<TitleManager {...mockProps} className="custom-class" />)
      
      const container = screen.getByRole('button').closest('div')
      expect(container).toHaveClass('custom-class')
    })

    it('should use custom autoSaveDelay', () => {
      vi.useFakeTimers()
      render(<TitleManager {...mockProps} isEditing={true} autoSave={true} autoSaveDelay={2000} />)
      
      const input = screen.getByRole('textbox')
      fireEvent.change(input, { target: { value: 'Custom Delay' } })
      
      vi.advanceTimersByTime(1000)
      expect(mockProps.onSave).not.toHaveBeenCalled()
      
      vi.advanceTimersByTime(1000)
      expect(mockProps.onSave).toHaveBeenCalledWith('Custom Delay')
      
      vi.useRealTimers()
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(<TitleManager {...mockProps} />)
      
      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('title', 'Click to edit title')
    })

    it('should have proper input attributes in edit mode', () => {
      render(<TitleManager {...mockProps} isEditing={true} placeholder="Custom Placeholder" />)
      
      const input = screen.getByRole('textbox')
      expect(input).toHaveAttribute('placeholder', 'Custom Placeholder')
      expect(input).toHaveAttribute('maxLength', '100')
    })

    it('should have proper button titles for save and cancel', () => {
      render(<TitleManager {...mockProps} isEditing={true} />)
      
      expect(screen.getByTitle('Save (Enter)')).toBeInTheDocument()
      expect(screen.getByTitle('Cancel (Escape)')).toBeInTheDocument()
    })

    it('should have proper tooltip for dirty indicator', () => {
      render(<TitleManager {...mockProps} isDirty={true} />)
      
      expect(screen.getByTitle('Unsaved title changes')).toBeInTheDocument()
    })
  })
})
