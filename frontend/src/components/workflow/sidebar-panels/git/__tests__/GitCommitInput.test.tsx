/**
 * GitCommitInput Component Tests
 * 
 * Tests for commit message input, validation, and commit action.
 * 
 * Requirements: 2.2, 2.3
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { GitCommitInput } from '../GitCommitInput'
import { useGitStore } from '@/stores/git'
import { useWorkflowStore } from '@/stores/workflow'
import { useGlobalToast } from '@/hooks/useToast'

// Mock stores and hooks
vi.mock('@/stores/git')
vi.mock('@/stores/workflow')
vi.mock('@/hooks/useToast')

describe('GitCommitInput', () => {
  const mockCommit = vi.fn()
  const mockShowSuccess = vi.fn()
  const mockShowError = vi.fn()

  const mockWorkflow = {
    id: 'test-workflow',
    name: 'Test Workflow',
    description: 'Test description',
    category: 'test',
    tags: ['test'],
    nodes: [{ id: 'node1', type: 'test', position: { x: 0, y: 0 } }],
    connections: [],
    triggers: [],
    settings: {},
  }

  beforeEach(() => {
    vi.clearAllMocks()

    vi.mocked(useGitStore).mockReturnValue({
      commit: mockCommit,
      isCommitting: false,
    } as any)

    vi.mocked(useWorkflowStore).mockReturnValue({
      workflow: mockWorkflow,
    } as any)

    vi.mocked(useGlobalToast).mockReturnValue({
      showSuccess: mockShowSuccess,
      showError: mockShowError,
      showWarning: vi.fn(),
      showInfo: vi.fn(),
    } as any)
  })

  describe('Rendering', () => {
    it('should render commit message textarea', () => {
      render(
        <GitCommitInput
          workflowId="test-workflow"
          stagedChangesCount={2}
          hasChanges={true}
        />
      )

      expect(screen.getByLabelText(/commit message/i)).toBeInTheDocument()
      expect(screen.getByPlaceholderText(/describe your changes/i)).toBeInTheDocument()
    })

    it('should render commit button', () => {
      render(
        <GitCommitInput
          workflowId="test-workflow"
          stagedChangesCount={2}
          hasChanges={true}
        />
      )

      expect(screen.getByRole('button', { name: /commit changes/i })).toBeInTheDocument()
    })

    it('should display staged changes count', () => {
      render(
        <GitCommitInput
          workflowId="test-workflow"
          stagedChangesCount={3}
          hasChanges={true}
        />
      )

      expect(screen.getByText('3 changes staged')).toBeInTheDocument()
    })

    it('should display singular form for one staged change', () => {
      render(
        <GitCommitInput
          workflowId="test-workflow"
          stagedChangesCount={1}
          hasChanges={true}
        />
      )

      expect(screen.getByText('1 change staged')).toBeInTheDocument()
    })

    it('should display "No changes staged" when count is zero', () => {
      render(
        <GitCommitInput
          workflowId="test-workflow"
          stagedChangesCount={0}
          hasChanges={false}
        />
      )

      expect(screen.getByText('No changes staged')).toBeInTheDocument()
    })

    it('should display character count', () => {
      render(
        <GitCommitInput
          workflowId="test-workflow"
          stagedChangesCount={2}
          hasChanges={true}
        />
      )

      expect(screen.getByText('0/500')).toBeInTheDocument()
    })
  })

  describe('Commit Message Input', () => {
    it('should update character count as user types', () => {
      render(
        <GitCommitInput
          workflowId="test-workflow"
          stagedChangesCount={2}
          hasChanges={true}
        />
      )

      const textarea = screen.getByLabelText(/commit message/i)
      fireEvent.change(textarea, { target: { value: 'Test commit' } })

      expect(screen.getByText('11/500')).toBeInTheDocument()
    })

    it('should highlight character count when near limit', () => {
      render(
        <GitCommitInput
          workflowId="test-workflow"
          stagedChangesCount={2}
          hasChanges={true}
        />
      )

      const textarea = screen.getByLabelText(/commit message/i)
      const longMessage = 'a'.repeat(460) // Over 90% of 500
      fireEvent.change(textarea, { target: { value: longMessage } })

      const charCount = screen.getByText('460/500')
      expect(charCount).toHaveClass('text-orange-600')
    })

    it('should disable textarea when committing', () => {
      vi.mocked(useGitStore).mockReturnValue({
        commit: mockCommit,
        isCommitting: true,
      } as any)

      render(
        <GitCommitInput
          workflowId="test-workflow"
          stagedChangesCount={2}
          hasChanges={true}
        />
      )

      expect(screen.getByLabelText(/commit message/i)).toBeDisabled()
    })

    it('should disable textarea when in read-only mode', () => {
      render(
        <GitCommitInput
          workflowId="test-workflow"
          stagedChangesCount={2}
          hasChanges={true}
          readOnly={true}
        />
      )

      expect(screen.getByLabelText(/commit message/i)).toBeDisabled()
    })

    it('should disable textarea when no changes', () => {
      render(
        <GitCommitInput
          workflowId="test-workflow"
          stagedChangesCount={0}
          hasChanges={false}
        />
      )

      expect(screen.getByLabelText(/commit message/i)).toBeDisabled()
    })
  })

  describe('Commit Button State', () => {
    it('should disable commit button when no changes', () => {
      render(
        <GitCommitInput
          workflowId="test-workflow"
          stagedChangesCount={0}
          hasChanges={false}
        />
      )

      expect(screen.getByRole('button', { name: /commit changes/i })).toBeDisabled()
    })

    it('should disable commit button when message is empty', () => {
      render(
        <GitCommitInput
          workflowId="test-workflow"
          stagedChangesCount={2}
          hasChanges={true}
        />
      )

      expect(screen.getByRole('button', { name: /commit changes/i })).toBeDisabled()
    })

    it('should enable commit button when message is valid and has changes', () => {
      render(
        <GitCommitInput
          workflowId="test-workflow"
          stagedChangesCount={2}
          hasChanges={true}
        />
      )

      const textarea = screen.getByLabelText(/commit message/i)
      fireEvent.change(textarea, { target: { value: 'Valid commit message' } })

      expect(screen.getByRole('button', { name: /commit changes/i })).not.toBeDisabled()
    })

    it('should disable commit button when committing', () => {
      vi.mocked(useGitStore).mockReturnValue({
        commit: mockCommit,
        isCommitting: true,
      } as any)

      render(
        <GitCommitInput
          workflowId="test-workflow"
          stagedChangesCount={2}
          hasChanges={true}
        />
      )

      expect(screen.getByRole('button', { name: /committing/i })).toBeDisabled()
    })

    it('should show loading state when committing', () => {
      vi.mocked(useGitStore).mockReturnValue({
        commit: mockCommit,
        isCommitting: true,
      } as any)

      render(
        <GitCommitInput
          workflowId="test-workflow"
          stagedChangesCount={2}
          hasChanges={true}
        />
      )

      expect(screen.getByText(/committing/i)).toBeInTheDocument()
    })
  })

  describe('Commit Message Validation', () => {
    it('should show error when committing with empty message', async () => {
      render(
        <GitCommitInput
          workflowId="test-workflow"
          stagedChangesCount={2}
          hasChanges={true}
        />
      )

      const textarea = screen.getByLabelText(/commit message/i)
      fireEvent.change(textarea, { target: { value: '   ' } }) // Whitespace only

      const button = screen.getByRole('button', { name: /commit changes/i })
      fireEvent.click(button)

      await waitFor(() => {
        expect(mockShowError).toHaveBeenCalledWith(
          'Invalid Commit Message',
          expect.objectContaining({
            message: 'Commit message cannot be empty',
          })
        )
      })

      expect(mockCommit).not.toHaveBeenCalled()
    })

    it('should show error when message exceeds max length', async () => {
      render(
        <GitCommitInput
          workflowId="test-workflow"
          stagedChangesCount={2}
          hasChanges={true}
        />
      )

      const textarea = screen.getByLabelText(/commit message/i)
      const longMessage = 'a'.repeat(501) // Over 500 characters
      fireEvent.change(textarea, { target: { value: longMessage } })

      const button = screen.getByRole('button', { name: /commit changes/i })
      fireEvent.click(button)

      await waitFor(() => {
        expect(mockShowError).toHaveBeenCalledWith(
          'Invalid Commit Message',
          expect.objectContaining({
            message: expect.stringContaining('cannot exceed 500 characters'),
          })
        )
      })

      expect(mockCommit).not.toHaveBeenCalled()
    })

    it('should clear validation error when user starts typing', async () => {
      render(
        <GitCommitInput
          workflowId="test-workflow"
          stagedChangesCount={2}
          hasChanges={true}
        />
      )

      const textarea = screen.getByLabelText(/commit message/i)
      const button = screen.getByRole('button', { name: /commit changes/i })

      // Trigger validation error
      fireEvent.change(textarea, { target: { value: '   ' } })
      fireEvent.click(button)

      await waitFor(() => {
        expect(screen.getByText(/commit message cannot be empty/i)).toBeInTheDocument()
      })

      // Start typing
      fireEvent.change(textarea, { target: { value: 'New message' } })

      await waitFor(() => {
        expect(screen.queryByText(/commit message cannot be empty/i)).not.toBeInTheDocument()
      })
    })
  })

  describe('Commit Action', () => {
    it('should call commit with correct parameters', async () => {
      mockCommit.mockResolvedValue(undefined)

      render(
        <GitCommitInput
          workflowId="test-workflow"
          stagedChangesCount={2}
          hasChanges={true}
        />
      )

      const textarea = screen.getByLabelText(/commit message/i)
      fireEvent.change(textarea, { target: { value: 'Test commit message' } })

      const button = screen.getByRole('button', { name: /commit changes/i })
      fireEvent.click(button)

      await waitFor(() => {
        expect(mockCommit).toHaveBeenCalledWith(
          'test-workflow',
          'Test commit message',
          expect.objectContaining({
            id: 'test-workflow',
            name: 'Test Workflow',
            nodes: expect.any(Array),
            connections: expect.any(Array),
          })
        )
      })
    })

    it('should trim commit message before submitting', async () => {
      mockCommit.mockResolvedValue(undefined)

      render(
        <GitCommitInput
          workflowId="test-workflow"
          stagedChangesCount={2}
          hasChanges={true}
        />
      )

      const textarea = screen.getByLabelText(/commit message/i)
      fireEvent.change(textarea, { target: { value: '  Test commit  ' } })

      const button = screen.getByRole('button', { name: /commit changes/i })
      fireEvent.click(button)

      await waitFor(() => {
        expect(mockCommit).toHaveBeenCalledWith(
          'test-workflow',
          'Test commit',
          expect.any(Object)
        )
      })
    })

    it('should clear message after successful commit', async () => {
      mockCommit.mockResolvedValue(undefined)

      render(
        <GitCommitInput
          workflowId="test-workflow"
          stagedChangesCount={2}
          hasChanges={true}
        />
      )

      const textarea = screen.getByLabelText(/commit message/i) as HTMLTextAreaElement
      fireEvent.change(textarea, { target: { value: 'Test commit' } })

      const button = screen.getByRole('button', { name: /commit changes/i })
      fireEvent.click(button)

      await waitFor(() => {
        expect(textarea.value).toBe('')
      })
    })

    it('should show success notification after commit', async () => {
      mockCommit.mockResolvedValue(undefined)

      render(
        <GitCommitInput
          workflowId="test-workflow"
          stagedChangesCount={2}
          hasChanges={true}
        />
      )

      const textarea = screen.getByLabelText(/commit message/i)
      fireEvent.change(textarea, { target: { value: 'Test commit' } })

      const button = screen.getByRole('button', { name: /commit changes/i })
      fireEvent.click(button)

      await waitFor(() => {
        expect(mockShowSuccess).toHaveBeenCalledWith(
          'Commit Created',
          expect.objectContaining({
            message: 'Changes committed successfully',
          })
        )
      })
    })

    it('should show error notification on commit failure', async () => {
      mockCommit.mockRejectedValue(new Error('Network error'))

      render(
        <GitCommitInput
          workflowId="test-workflow"
          stagedChangesCount={2}
          hasChanges={true}
        />
      )

      const textarea = screen.getByLabelText(/commit message/i)
      fireEvent.change(textarea, { target: { value: 'Test commit' } })

      const button = screen.getByRole('button', { name: /commit changes/i })
      fireEvent.click(button)

      await waitFor(() => {
        expect(mockShowError).toHaveBeenCalledWith(
          'Commit Failed',
          expect.objectContaining({
            message: 'Network error',
          })
        )
      })
    })

    it('should show error when workflow is not loaded', async () => {
      vi.mocked(useWorkflowStore).mockReturnValue({
        workflow: null,
      } as any)

      render(
        <GitCommitInput
          workflowId="test-workflow"
          stagedChangesCount={2}
          hasChanges={true}
        />
      )

      const textarea = screen.getByLabelText(/commit message/i)
      fireEvent.change(textarea, { target: { value: 'Test commit' } })

      const button = screen.getByRole('button', { name: /commit changes/i })
      fireEvent.click(button)

      await waitFor(() => {
        expect(mockShowError).toHaveBeenCalledWith(
          'Commit Failed',
          expect.objectContaining({
            message: 'No workflow loaded',
          })
        )
      })

      expect(mockCommit).not.toHaveBeenCalled()
    })
  })

  describe('Keyboard Shortcuts', () => {
    it('should commit on Ctrl+Enter', async () => {
      mockCommit.mockResolvedValue(undefined)

      render(
        <GitCommitInput
          workflowId="test-workflow"
          stagedChangesCount={2}
          hasChanges={true}
        />
      )

      const textarea = screen.getByLabelText(/commit message/i)
      fireEvent.change(textarea, { target: { value: 'Test commit' } })

      fireEvent.keyDown(textarea, { key: 'Enter', ctrlKey: true })

      await waitFor(() => {
        expect(mockCommit).toHaveBeenCalled()
      })
    })

    it('should commit on Cmd+Enter (Mac)', async () => {
      mockCommit.mockResolvedValue(undefined)

      render(
        <GitCommitInput
          workflowId="test-workflow"
          stagedChangesCount={2}
          hasChanges={true}
        />
      )

      const textarea = screen.getByLabelText(/commit message/i)
      fireEvent.change(textarea, { target: { value: 'Test commit' } })

      fireEvent.keyDown(textarea, { key: 'Enter', metaKey: true })

      await waitFor(() => {
        expect(mockCommit).toHaveBeenCalled()
      })
    })

    it('should not commit on Enter without modifier key', async () => {
      render(
        <GitCommitInput
          workflowId="test-workflow"
          stagedChangesCount={2}
          hasChanges={true}
        />
      )

      const textarea = screen.getByLabelText(/commit message/i)
      fireEvent.change(textarea, { target: { value: 'Test commit' } })

      fireEvent.keyDown(textarea, { key: 'Enter' })

      expect(mockCommit).not.toHaveBeenCalled()
    })
  })

  describe('Helper Text', () => {
    it('should show helper text when no changes', () => {
      render(
        <GitCommitInput
          workflowId="test-workflow"
          stagedChangesCount={0}
          hasChanges={false}
        />
      )

      expect(screen.getByText(/make changes to your workflow to enable commits/i)).toBeInTheDocument()
    })

    it('should not show helper text when has changes', () => {
      render(
        <GitCommitInput
          workflowId="test-workflow"
          stagedChangesCount={2}
          hasChanges={true}
        />
      )

      expect(screen.queryByText(/make changes to your workflow to enable commits/i)).not.toBeInTheDocument()
    })
  })
})
