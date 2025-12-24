/**
 * Tests for GitConflictResolutionDialog Component
 * 
 * Requirements: 3.4, 7.3
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { GitConflictResolutionDialog, ConflictFile } from '../GitConflictResolutionDialog'

describe('GitConflictResolutionDialog', () => {
  const mockConflicts: ConflictFile[] = [
    {
      path: 'workflow.json',
      ours: '{"name": "My Workflow", "version": 1}',
      theirs: '{"name": "My Workflow", "version": 2}',
      resolved: false,
    },
    {
      path: 'nodes.json',
      ours: '[{"id": "1", "type": "trigger"}]',
      theirs: '[{"id": "1", "type": "action"}]',
      resolved: false,
    },
  ]

  const mockOnResolve = vi.fn()
  const mockOnCancel = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders conflict resolution dialog with file list', () => {
    render(
      <GitConflictResolutionDialog
        open={true}
        onOpenChange={vi.fn()}
        conflicts={mockConflicts}
        onResolve={mockOnResolve}
        onCancel={mockOnCancel}
      />
    )

    expect(screen.getByText('Resolve Merge Conflicts')).toBeInTheDocument()
    expect(screen.getByText('workflow.json')).toBeInTheDocument()
    expect(screen.getByText('nodes.json')).toBeInTheDocument()
  })

  it('displays progress indicator', () => {
    render(
      <GitConflictResolutionDialog
        open={true}
        onOpenChange={vi.fn()}
        conflicts={mockConflicts}
        onResolve={mockOnResolve}
        onCancel={mockOnCancel}
      />
    )

    expect(screen.getByText(/Progress: 0 of 2 resolved/)).toBeInTheDocument()
    expect(screen.getByText('0%')).toBeInTheDocument()
  })

  it('shows ours and theirs content for selected file', () => {
    render(
      <GitConflictResolutionDialog
        open={true}
        onOpenChange={vi.fn()}
        conflicts={mockConflicts}
        onResolve={mockOnResolve}
        onCancel={mockOnCancel}
      />
    )

    expect(screen.getByText('Your Changes (Ours)')).toBeInTheDocument()
    expect(screen.getByText('Their Changes (Theirs)')).toBeInTheDocument()
    expect(screen.getByText(mockConflicts[0].ours)).toBeInTheDocument()
    expect(screen.getByText(mockConflicts[0].theirs)).toBeInTheDocument()
  })

  it('allows selecting "Accept Ours" strategy', async () => {
    render(
      <GitConflictResolutionDialog
        open={true}
        onOpenChange={vi.fn()}
        conflicts={mockConflicts}
        onResolve={mockOnResolve}
        onCancel={mockOnCancel}
      />
    )

    const acceptOursButton = screen.getByRole('button', { name: /Accept Ours/i })
    fireEvent.click(acceptOursButton)

    await waitFor(() => {
      expect(screen.getByText('Selected Resolution')).toBeInTheDocument()
    })
  })

  it('allows selecting "Accept Theirs" strategy', async () => {
    render(
      <GitConflictResolutionDialog
        open={true}
        onOpenChange={vi.fn()}
        conflicts={mockConflicts}
        onResolve={mockOnResolve}
        onCancel={mockOnCancel}
      />
    )

    const acceptTheirsButton = screen.getByRole('button', { name: /Accept Theirs/i })
    fireEvent.click(acceptTheirsButton)

    await waitFor(() => {
      expect(screen.getByText('Selected Resolution')).toBeInTheDocument()
    })
  })

  it('allows manual editing', async () => {
    render(
      <GitConflictResolutionDialog
        open={true}
        onOpenChange={vi.fn()}
        conflicts={mockConflicts}
        onResolve={mockOnResolve}
        onCancel={mockOnCancel}
      />
    )

    const manualEditButton = screen.getByRole('button', { name: /Manual Edit/i })
    fireEvent.click(manualEditButton)

    await waitFor(() => {
      expect(screen.getByText('Manual Resolution')).toBeInTheDocument()
      const textarea = screen.getByPlaceholderText(/Edit the resolved content here/i)
      expect(textarea).toBeInTheDocument()
    })
  })

  it('disables resolve button until all conflicts are resolved', () => {
    render(
      <GitConflictResolutionDialog
        open={true}
        onOpenChange={vi.fn()}
        conflicts={mockConflicts}
        onResolve={mockOnResolve}
        onCancel={mockOnCancel}
      />
    )

    const resolveButton = screen.getByRole('button', { name: /Resolve All Conflicts/i })
    expect(resolveButton).toBeDisabled()
  })

  it('calls onCancel when cancel button is clicked', () => {
    render(
      <GitConflictResolutionDialog
        open={true}
        onOpenChange={vi.fn()}
        conflicts={mockConflicts}
        onResolve={mockOnResolve}
        onCancel={mockOnCancel}
      />
    )

    const cancelButton = screen.getByRole('button', { name: /Cancel/i })
    fireEvent.click(cancelButton)

    expect(mockOnCancel).toHaveBeenCalledTimes(1)
  })

  it('shows loading state when resolving', () => {
    render(
      <GitConflictResolutionDialog
        open={true}
        onOpenChange={vi.fn()}
        conflicts={mockConflicts}
        onResolve={mockOnResolve}
        onCancel={mockOnCancel}
        isResolving={true}
      />
    )

    expect(screen.getByText(/Resolving.../i)).toBeInTheDocument()
  })

  it('allows switching between conflicting files', async () => {
    render(
      <GitConflictResolutionDialog
        open={true}
        onOpenChange={vi.fn()}
        conflicts={mockConflicts}
        onResolve={mockOnResolve}
        onCancel={mockOnCancel}
      />
    )

    // Initially showing first file
    expect(screen.getByText(mockConflicts[0].ours)).toBeInTheDocument()

    // Click on second file
    const secondFileButton = screen.getByText('nodes.json')
    fireEvent.click(secondFileButton)

    await waitFor(() => {
      expect(screen.getByText(mockConflicts[1].ours)).toBeInTheDocument()
    })
  })
})
