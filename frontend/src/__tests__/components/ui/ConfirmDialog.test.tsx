/**
 * Unit tests for ConfirmDialog component
 */

import React from 'react'
import { vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ConfirmDialog, useConfirmDialog } from '@/components/ui/ConfirmDialog'
import type { ConfirmDialogProps } from '@/components/ui/ConfirmDialog'

// Mock createPortal for testing
vi.mock('react-dom', async () => {
  const actual = await vi.importActual('react-dom')
  return {
    ...actual,
    createPortal: (children: React.ReactNode) => children
  }
})

describe('ConfirmDialog Component', () => {
  const mockOnClose = vi.fn()
  const mockOnConfirm = vi.fn()

  const defaultProps: ConfirmDialogProps = {
    isOpen: true,
    onClose: mockOnClose,
    onConfirm: mockOnConfirm,
    title: 'Confirm Action',
    message: 'Are you sure you want to proceed?'
  }

  beforeEach(() => {
    vi.clearAllMocks()
    // Mock body style for scroll prevention test
    Object.defineProperty(document.body, 'style', {
      value: { overflow: '' },
      writable: true
    })
  })

  describe('ConfirmDialog', () => {
    it('should not render when closed', () => {
      render(<ConfirmDialog {...defaultProps} isOpen={false} />)
      
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('should render when open', () => {
      render(<ConfirmDialog {...defaultProps} />)
      
      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(screen.getByText('Confirm Action')).toBeInTheDocument()
      expect(screen.getByText('Are you sure you want to proceed?')).toBeInTheDocument()
    })

    it('should render with custom button text', () => {
      render(
        <ConfirmDialog 
          {...defaultProps} 
          confirmText="Delete" 
          cancelText="Keep" 
        />
      )
      
      expect(screen.getByText('Delete')).toBeInTheDocument()
      expect(screen.getByText('Keep')).toBeInTheDocument()
    })

    it('should render with details list', () => {
      const details = ['Detail 1', 'Detail 2', 'Detail 3']
      render(<ConfirmDialog {...defaultProps} details={details} />)
      
      details.forEach(detail => {
        expect(screen.getByText(detail)).toBeInTheDocument()
      })
    })

    it('should call onConfirm when confirm button is clicked', () => {
      render(<ConfirmDialog {...defaultProps} />)
      
      fireEvent.click(screen.getByText('Confirm'))
      expect(mockOnConfirm).toHaveBeenCalled()
    })

    it('should call onClose when cancel button is clicked', () => {
      render(<ConfirmDialog {...defaultProps} />)
      
      fireEvent.click(screen.getByText('Cancel'))
      expect(mockOnClose).toHaveBeenCalled()
    })

    it('should call onClose when close button is clicked', () => {
      render(<ConfirmDialog {...defaultProps} />)
      
      fireEvent.click(screen.getByLabelText('Close dialog'))
      expect(mockOnClose).toHaveBeenCalled()
    })

    it('should call onClose when backdrop is clicked', () => {
      render(<ConfirmDialog {...defaultProps} />)
      
      const backdrop = screen.getByRole('dialog')
      fireEvent.click(backdrop)
      expect(mockOnClose).toHaveBeenCalled()
    })

    it('should not close when dialog content is clicked', () => {
      render(<ConfirmDialog {...defaultProps} />)
      
      const dialogContent = screen.getByText('Confirm Action').closest('div')
      fireEvent.click(dialogContent!)
      expect(mockOnClose).not.toHaveBeenCalled()
    })

    it('should handle escape key', () => {
      render(<ConfirmDialog {...defaultProps} />)
      
      fireEvent.keyDown(document, { key: 'Escape' })
      expect(mockOnClose).toHaveBeenCalled()
    })

    it('should not handle escape key when loading', () => {
      render(<ConfirmDialog {...defaultProps} loading />)
      
      fireEvent.keyDown(document, { key: 'Escape' })
      expect(mockOnClose).not.toHaveBeenCalled()
    })

    it('should prevent body scroll when open', () => {
      render(<ConfirmDialog {...defaultProps} />)
      
      expect(document.body.style.overflow).toBe('hidden')
    })

    it('should restore body scroll when closed', () => {
      const { rerender } = render(<ConfirmDialog {...defaultProps} />)
      
      rerender(<ConfirmDialog {...defaultProps} isOpen={false} />)
      
      expect(document.body.style.overflow).toBe('unset')
    })

    describe('Severity variants', () => {
      it('should render info severity correctly', () => {
        render(<ConfirmDialog {...defaultProps} severity="info" />)
        
        const confirmButton = screen.getByText('Confirm')
        expect(confirmButton).toHaveClass('bg-blue-600')
      })

      it('should render warning severity correctly', () => {
        render(<ConfirmDialog {...defaultProps} severity="warning" />)
        
        const confirmButton = screen.getByText('Confirm')
        expect(confirmButton).toHaveClass('bg-yellow-600')
      })

      it('should render danger severity correctly', () => {
        render(<ConfirmDialog {...defaultProps} severity="danger" />)
        
        const confirmButton = screen.getByText('Confirm')
        expect(confirmButton).toHaveClass('bg-red-600')
      })
    })

    describe('Loading state', () => {
      it('should show loading state on confirm button', () => {
        render(<ConfirmDialog {...defaultProps} loading />)
        
        const confirmButton = screen.getByText('Processing...')
        expect(confirmButton).toBeDisabled()
        expect(confirmButton).toHaveClass('opacity-50', 'cursor-not-allowed')
      })

      it('should disable cancel button when loading', () => {
        render(<ConfirmDialog {...defaultProps} loading />)
        
        const cancelButton = screen.getByText('Cancel')
        expect(cancelButton).toBeDisabled()
      })

      it('should not call onConfirm when loading and button is clicked', () => {
        render(<ConfirmDialog {...defaultProps} loading />)
        
        fireEvent.click(screen.getByText('Processing...'))
        expect(mockOnConfirm).not.toHaveBeenCalled()
      })

      it('should not close when loading and backdrop is clicked', () => {
        render(<ConfirmDialog {...defaultProps} loading />)
        
        const backdrop = screen.getByRole('dialog')
        fireEvent.click(backdrop)
        expect(mockOnClose).not.toHaveBeenCalled()
      })
    })

    describe('Disabled state', () => {
      it('should disable confirm button when disabled', () => {
        render(<ConfirmDialog {...defaultProps} disabled />)
        
        const confirmButton = screen.getByText('Confirm')
        expect(confirmButton).toBeDisabled()
        expect(confirmButton).toHaveClass('opacity-50', 'cursor-not-allowed')
      })

      it('should not call onConfirm when disabled and button is clicked', () => {
        render(<ConfirmDialog {...defaultProps} disabled />)
        
        fireEvent.click(screen.getByText('Confirm'))
        expect(mockOnConfirm).not.toHaveBeenCalled()
      })
    })

    describe('Accessibility', () => {
      it('should have correct ARIA attributes', () => {
        render(<ConfirmDialog {...defaultProps} />)
        
        const dialog = screen.getByRole('dialog')
        expect(dialog).toHaveAttribute('aria-modal', 'true')
        expect(dialog).toHaveAttribute('aria-labelledby', 'confirm-dialog-title')
        expect(dialog).toHaveAttribute('aria-describedby', 'confirm-dialog-description')
      })

      it('should have correct heading and description IDs', () => {
        render(<ConfirmDialog {...defaultProps} />)
        
        expect(screen.getByText('Confirm Action')).toHaveAttribute('id', 'confirm-dialog-title')
        expect(screen.getByText('Are you sure you want to proceed?')).toHaveAttribute('id', 'confirm-dialog-description')
      })
    })
  })

  describe('useConfirmDialog Hook', () => {
    function TestComponent() {
      const { showConfirm, ConfirmDialog } = useConfirmDialog()
      
      const handleShowConfirm = async () => {
        const result = await showConfirm({
          title: 'Test Confirm',
          message: 'Test message'
        })
        
        // Add result to DOM for testing
        const resultDiv = document.createElement('div')
        resultDiv.textContent = `Result: ${result}`
        resultDiv.setAttribute('data-testid', 'confirm-result')
        document.body.appendChild(resultDiv)
      }
      
      return (
        <div>
          <button onClick={handleShowConfirm}>Show Confirm</button>
          <ConfirmDialog />
        </div>
      )
    }

    it('should show and hide confirm dialog', async () => {
      render(<TestComponent />)
      
      // Dialog should not be visible initially
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      
      // Show dialog
      fireEvent.click(screen.getByText('Show Confirm'))
      
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
        expect(screen.getByText('Test Confirm')).toBeInTheDocument()
      })
    })

    it('should resolve with true when confirmed', async () => {
      render(<TestComponent />)
      
      // Show dialog
      fireEvent.click(screen.getByText('Show Confirm'))
      
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })
      
      // Confirm
      fireEvent.click(screen.getByText('Confirm'))
      
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
        expect(screen.getByTestId('confirm-result')).toHaveTextContent('Result: true')
      })
    })

    it('should resolve with false when cancelled', async () => {
      render(<TestComponent />)
      
      // Show dialog
      fireEvent.click(screen.getByText('Show Confirm'))
      
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })
      
      // Cancel
      fireEvent.click(screen.getByText('Cancel'))
      
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
        expect(screen.getByTestId('confirm-result')).toHaveTextContent('Result: false')
      })
    })

    it('should resolve with false when closed via backdrop', async () => {
      render(<TestComponent />)
      
      // Show dialog
      fireEvent.click(screen.getByText('Show Confirm'))
      
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })
      
      // Click backdrop
      const backdrop = screen.getByRole('dialog')
      fireEvent.click(backdrop)
      
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
        expect(screen.getByTestId('confirm-result')).toHaveTextContent('Result: false')
      })
    })
  })
})
