/**
 * Unit tests for LoadingStates components
 */

import React from 'react'
import { vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import {
  LoadingSpinner,
  ProgressBar,
  CircularProgress,
  LoadingOverlay,
  OperationStatus,
  ButtonLoadingState
} from '@/components/ui/LoadingStates'

describe('LoadingStates Components', () => {
  describe('LoadingSpinner', () => {
    it('should render with default props', () => {
      render(<LoadingSpinner />)
      
      const spinner = screen.getByRole('img', { hidden: true }) // Lucide icons have img role
      expect(spinner).toHaveClass('animate-spin', 'w-6', 'h-6', 'text-blue-600')
    })

    it('should render with custom size', () => {
      render(<LoadingSpinner size="lg" />)
      
      const spinner = screen.getByRole('img', { hidden: true })
      expect(spinner).toHaveClass('w-8', 'h-8')
    })

    it('should render with custom color', () => {
      render(<LoadingSpinner color="white" />)
      
      const spinner = screen.getByRole('img', { hidden: true })
      expect(spinner).toHaveClass('text-white')
    })

    it('should apply custom className', () => {
      render(<LoadingSpinner className="custom-class" />)
      
      const spinner = screen.getByRole('img', { hidden: true })
      expect(spinner).toHaveClass('custom-class')
    })
  })

  describe('ProgressBar', () => {
    it('should render with progress value', () => {
      render(<ProgressBar progress={50} />)
      
      const progressBar = screen.getByRole('progressbar')
      expect(progressBar).toHaveAttribute('aria-valuenow', '50')
      expect(progressBar).toHaveAttribute('aria-valuemin', '0')
      expect(progressBar).toHaveAttribute('aria-valuemax', '100')
    })

    it('should clamp progress values', () => {
      const { rerender } = render(<ProgressBar progress={150} />)
      
      let progressBar = screen.getByRole('progressbar')
      expect(progressBar).toHaveAttribute('aria-valuenow', '100')
      
      rerender(<ProgressBar progress={-10} />)
      progressBar = screen.getByRole('progressbar')
      expect(progressBar).toHaveAttribute('aria-valuenow', '0')
    })

    it('should show percentage when enabled', () => {
      render(<ProgressBar progress={75} showPercentage />)
      
      expect(screen.getByText('75%')).toBeInTheDocument()
    })

    it('should show label when provided', () => {
      render(<ProgressBar progress={50} label="Loading..." />)
      
      expect(screen.getByText('Loading...')).toBeInTheDocument()
    })

    it('should apply correct color classes', () => {
      const { rerender } = render(<ProgressBar progress={50} color="success" />)
      
      let progressFill = document.querySelector('.bg-green-500')
      expect(progressFill).toBeInTheDocument()
      
      rerender(<ProgressBar progress={50} color="danger" />)
      progressFill = document.querySelector('.bg-red-500')
      expect(progressFill).toBeInTheDocument()
    })

    it('should apply correct size classes', () => {
      const { rerender } = render(<ProgressBar progress={50} size="sm" />)
      
      let container = document.querySelector('.h-1')
      expect(container).toBeInTheDocument()
      
      rerender(<ProgressBar progress={50} size="lg" />)
      container = document.querySelector('.h-3')
      expect(container).toBeInTheDocument()
    })
  })

  describe('CircularProgress', () => {
    it('should render with progress value', () => {
      render(<CircularProgress progress={60} />)
      
      const progressBar = screen.getByRole('progressbar')
      expect(progressBar).toHaveAttribute('aria-valuenow', '60')
    })

    it('should show percentage when enabled', () => {
      render(<CircularProgress progress={80} showPercentage />)
      
      expect(screen.getByText('80%')).toBeInTheDocument()
    })

    it('should apply custom size', () => {
      render(<CircularProgress progress={50} size={60} />)
      
      const svg = screen.getByRole('progressbar')
      expect(svg).toHaveAttribute('width', '60')
      expect(svg).toHaveAttribute('height', '60')
    })

    it('should apply correct color classes', () => {
      render(<CircularProgress progress={50} color="success" />)
      
      const coloredCircle = document.querySelector('.text-green-500')
      expect(coloredCircle).toBeInTheDocument()
    })
  })

  describe('LoadingOverlay', () => {
    it('should not render when not visible', () => {
      const { container } = render(<LoadingOverlay isVisible={false} />)
      
      expect(container.firstChild).toBeNull()
    })

    it('should render when visible', () => {
      render(<LoadingOverlay isVisible message="Loading data..." />)
      
      expect(screen.getByText('Loading data...')).toBeInTheDocument()
    })

    it('should show progress when enabled', () => {
      render(
        <LoadingOverlay 
          isVisible 
          progress={70} 
          showProgress 
          message="Processing..." 
        />
      )
      
      expect(screen.getByText('Processing...')).toBeInTheDocument()
      expect(screen.getByText('70%')).toBeInTheDocument()
    })

    it('should show spinner when progress is not shown', () => {
      render(<LoadingOverlay isVisible message="Loading..." />)
      
      const spinner = screen.getByRole('img', { hidden: true })
      expect(spinner).toHaveClass('animate-spin')
    })
  })

  describe('OperationStatus', () => {
    it('should not render when status is idle', () => {
      const { container } = render(<OperationStatus status="idle" />)
      
      expect(container.firstChild).toBeNull()
    })

    it('should render loading status', () => {
      render(<OperationStatus status="loading" message="Processing..." />)
      
      expect(screen.getByText('Processing...')).toBeInTheDocument()
      const spinner = screen.getByRole('img', { hidden: true })
      expect(spinner).toHaveClass('animate-spin')
    })

    it('should render success status', () => {
      render(<OperationStatus status="success" message="Completed successfully" />)
      
      expect(screen.getByText('Completed successfully')).toBeInTheDocument()
      // Check for success icon (CheckCircle)
      const icon = screen.getByRole('img', { hidden: true })
      expect(icon).toHaveClass('text-green-500')
    })

    it('should render error status', () => {
      render(<OperationStatus status="error" message="Operation failed" />)
      
      expect(screen.getByText('Operation failed')).toBeInTheDocument()
      // Check for error icon (AlertCircle)
      const icon = screen.getByRole('img', { hidden: true })
      expect(icon).toHaveClass('text-red-500')
    })

    it('should show progress when loading and enabled', () => {
      render(
        <OperationStatus 
          status="loading" 
          message="Processing..." 
          progress={45} 
          showProgress 
        />
      )
      
      expect(screen.getByText('Processing...')).toBeInTheDocument()
      const progressBar = screen.getByRole('progressbar')
      expect(progressBar).toHaveAttribute('aria-valuenow', '45')
    })

    it('should apply correct size classes', () => {
      const { rerender } = render(
        <OperationStatus status="success" message="Done" size="sm" />
      )
      
      let icon = screen.getByRole('img', { hidden: true })
      expect(icon).toHaveClass('w-4', 'h-4')
      
      rerender(<OperationStatus status="success" message="Done" size="lg" />)
      icon = screen.getByRole('img', { hidden: true })
      expect(icon).toHaveClass('w-8', 'h-8')
    })
  })

  describe('ButtonLoadingState', () => {
    const mockOnClick = vi.fn()

    beforeEach(() => {
      mockOnClick.mockClear()
    })

    it('should render children when not loading', () => {
      render(
        <ButtonLoadingState isLoading={false} onClick={mockOnClick}>
          Click me
        </ButtonLoadingState>
      )
      
      expect(screen.getByText('Click me')).toBeInTheDocument()
      expect(screen.queryByRole('img', { hidden: true })).not.toBeInTheDocument()
    })

    it('should show loading state', () => {
      render(
        <ButtonLoadingState isLoading loadingText="Processing...">
          Click me
        </ButtonLoadingState>
      )
      
      expect(screen.getByText('Processing...')).toBeInTheDocument()
      const spinner = screen.getByRole('img', { hidden: true })
      expect(spinner).toHaveClass('animate-spin')
    })

    it('should show children with spinner when no loading text', () => {
      render(
        <ButtonLoadingState isLoading>
          Click me
        </ButtonLoadingState>
      )
      
      expect(screen.getByText('Click me')).toBeInTheDocument()
      const spinner = screen.getByRole('img', { hidden: true })
      expect(spinner).toHaveClass('animate-spin')
    })

    it('should be disabled when loading', () => {
      render(
        <ButtonLoadingState isLoading onClick={mockOnClick}>
          Click me
        </ButtonLoadingState>
      )
      
      const button = screen.getByRole('button')
      expect(button).toBeDisabled()
      expect(button).toHaveClass('opacity-50', 'cursor-not-allowed')
    })

    it('should be disabled when disabled prop is true', () => {
      render(
        <ButtonLoadingState isLoading={false} disabled onClick={mockOnClick}>
          Click me
        </ButtonLoadingState>
      )
      
      const button = screen.getByRole('button')
      expect(button).toBeDisabled()
      expect(button).toHaveClass('opacity-50', 'cursor-not-allowed')
    })

    it('should call onClick when not loading or disabled', () => {
      render(
        <ButtonLoadingState isLoading={false} onClick={mockOnClick}>
          Click me
        </ButtonLoadingState>
      )
      
      const button = screen.getByRole('button')
      button.click()
      
      expect(mockOnClick).toHaveBeenCalled()
    })

    it('should not call onClick when loading', () => {
      render(
        <ButtonLoadingState isLoading onClick={mockOnClick}>
          Click me
        </ButtonLoadingState>
      )
      
      const button = screen.getByRole('button')
      button.click()
      
      expect(mockOnClick).not.toHaveBeenCalled()
    })

    it('should apply custom className', () => {
      render(
        <ButtonLoadingState isLoading={false} className="custom-button">
          Click me
        </ButtonLoadingState>
      )
      
      const button = screen.getByRole('button')
      expect(button).toHaveClass('custom-button')
    })
  })
})
