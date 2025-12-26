/**
 * GitHistoryTab Component Tests
 * 
 * Tests for the Git history tab component including commit display,
 * selection, pagination, and actions (revert, create branch).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { GitHistoryTab } from '../GitHistoryTab'
import { useGitStore } from '@/stores/git'
import { useGlobalToast } from '@/hooks/useToast'
import { GitCommit } from '@/services/git.service'

// Mock dependencies
vi.mock('@/stores/git')
vi.mock('@/hooks/useToast')

// Mock UI components
vi.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children }: any) => <div data-testid="scroll-area">{children}</div>,
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, ...props }: any) => (
    <button onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  ),
}))

vi.mock('@/components/ui/separator', () => ({
  Separator: () => <hr data-testid="separator" />,
}))

vi.mock('@/components/ui/alert', () => ({
  Alert: ({ children }: any) => <div data-testid="alert">{children}</div>,
  AlertDescription: ({ children }: any) => <div>{children}</div>,
}))

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: any) => (open ? <div data-testid="dialog">{children}</div> : null),
  DialogContent: ({ children }: any) => <div data-testid="dialog-content">{children}</div>,
  DialogDescription: ({ children }: any) => <div>{children}</div>,
  DialogFooter: ({ children }: any) => <div>{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <h2>{children}</h2>,
}))

vi.mock('@/components/ui/input', () => ({
  Input: ({ value, onChange, ...props }: any) => (
    <input value={value} onChange={onChange} {...props} />
  ),
}))

vi.mock('@/components/ui/label', () => ({
  Label: ({ children, ...props }: any) => <label {...props}>{children}</label>,
}))

describe('GitHistoryTab', () => {
  const mockWorkflowId = 'test-workflow-123'

  const mockCommits: GitCommit[] = [
    {
      hash: 'abc123def456',
      message: 'Add new feature',
      author: 'John Doe',
      timestamp: new Date('2024-01-15T10:30:00Z'),
      parents: ['parent123'],
    },
    {
      hash: 'def456ghi789',
      message: 'Fix bug in workflow',
      author: 'Jane Smith',
      timestamp: new Date('2024-01-14T15:45:00Z'),
      parents: ['parent456'],
    },
    {
      hash: 'ghi789jkl012',
      message: 'Update configuration',
      author: 'Bob Johnson',
      timestamp: new Date('2024-01-13T09:15:00Z'),
      parents: ['parent789'],
    },
  ]

  const mockGitStore = {
    commits: mockCommits,
    isLoadingCommits: false,
    commitsError: null,
    selectedCommit: null,
    operationError: null,
    loadCommitHistory: vi.fn().mockResolvedValue(mockCommits),
    selectCommit: vi.fn(),
    revertToCommit: vi.fn().mockResolvedValue(undefined),
    createBranchFromCommit: vi.fn().mockResolvedValue({ name: 'new-branch', current: false, remote: false }),
    clearErrors: vi.fn(),
  }

  const mockToast = {
    showSuccess: vi.fn(),
    showError: vi.fn(),
    showWarning: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useGitStore).mockReturnValue(mockGitStore as any)
    vi.mocked(useGlobalToast).mockReturnValue(mockToast as any)
  })

  describe('Rendering', () => {
    it('should render commit history tab', () => {
      render(<GitHistoryTab workflowId={mockWorkflowId} />)

      expect(screen.getByText('3 commits')).toBeInTheDocument()
    })

    it('should display commit list with timeline view', () => {
      render(<GitHistoryTab workflowId={mockWorkflowId} />)

      // Check all commits are displayed
      expect(screen.getByText('Add new feature')).toBeInTheDocument()
      expect(screen.getByText('Fix bug in workflow')).toBeInTheDocument()
      expect(screen.getByText('Update configuration')).toBeInTheDocument()
    })

    it('should show commit details (hash, message, author, timestamp)', () => {
      render(<GitHistoryTab workflowId={mockWorkflowId} />)

      // Check commit message
      expect(screen.getByText('Add new feature')).toBeInTheDocument()

      // Check author
      expect(screen.getByText('John Doe')).toBeInTheDocument()

      // Check short hash
      expect(screen.getByText('abc123d')).toBeInTheDocument()
    })

    it('should show loading state when loading commits', () => {
      vi.mocked(useGitStore).mockReturnValue({
        ...mockGitStore,
        isLoadingCommits: true,
        commits: [],
      } as any)

      render(<GitHistoryTab workflowId={mockWorkflowId} />)

      expect(screen.getByText('Loading commits...')).toBeInTheDocument()
    })

    it('should show empty state when no commits', () => {
      vi.mocked(useGitStore).mockReturnValue({
        ...mockGitStore,
        commits: [],
        isLoadingCommits: false,
      } as any)

      render(<GitHistoryTab workflowId={mockWorkflowId} />)

      expect(screen.getByText('No commits yet')).toBeInTheDocument()
      expect(screen.getByText('Make your first commit to see history')).toBeInTheDocument()
    })

    it('should show error message when commits error occurs', () => {
      const errorMessage = 'Failed to load commits'
      vi.mocked(useGitStore).mockReturnValue({
        ...mockGitStore,
        commitsError: errorMessage,
      } as any)

      render(<GitHistoryTab workflowId={mockWorkflowId} />)

      expect(screen.getByText(errorMessage)).toBeInTheDocument()
    })
  })

  describe('Commit Selection', () => {
    it('should select commit when clicked', async () => {
      const user = userEvent.setup()
      render(<GitHistoryTab workflowId={mockWorkflowId} />)

      const firstCommit = screen.getByText('Add new feature')
      await user.click(firstCommit)

      expect(mockGitStore.selectCommit).toHaveBeenCalledWith(mockCommits[0])
    })

    it('should show expanded details when commit is selected', () => {
      vi.mocked(useGitStore).mockReturnValue({
        ...mockGitStore,
        selectedCommit: mockCommits[0],
      } as any)

      render(<GitHistoryTab workflowId={mockWorkflowId} />)

      // Check expanded details are shown
      expect(screen.getByText('Hash:')).toBeInTheDocument()
      expect(screen.getByText('abc123def456')).toBeInTheDocument()
      expect(screen.getByText('Author:')).toBeInTheDocument()
      expect(screen.getByText('Date:')).toBeInTheDocument()
      expect(screen.getByText('Parent:')).toBeInTheDocument()
    })

    it('should show action buttons when commit is selected', () => {
      vi.mocked(useGitStore).mockReturnValue({
        ...mockGitStore,
        selectedCommit: mockCommits[0],
      } as any)

      render(<GitHistoryTab workflowId={mockWorkflowId} />)

      expect(screen.getByText('Revert to this commit')).toBeInTheDocument()
      expect(screen.getByText('Create branch')).toBeInTheDocument()
    })

    it('should deselect commit when clicking selected commit again', async () => {
      const user = userEvent.setup()
      vi.mocked(useGitStore).mockReturnValue({
        ...mockGitStore,
        selectedCommit: mockCommits[0],
      } as any)

      render(<GitHistoryTab workflowId={mockWorkflowId} />)

      const firstCommit = screen.getByText('Add new feature')
      await user.click(firstCommit)

      expect(mockGitStore.selectCommit).toHaveBeenCalledWith(null)
    })
  })

  describe('Revert to Commit', () => {
    it('should open revert dialog when revert button clicked', async () => {
      const user = userEvent.setup()
      vi.mocked(useGitStore).mockReturnValue({
        ...mockGitStore,
        selectedCommit: mockCommits[0],
      } as any)

      render(<GitHistoryTab workflowId={mockWorkflowId} />)

      const revertButton = screen.getByText('Revert to this commit')
      await user.click(revertButton)

      await waitFor(() => {
        expect(screen.getByText('Revert to Commit')).toBeInTheDocument()
      })
    })

    it('should revert to commit when confirmed', async () => {
      const user = userEvent.setup()
      vi.mocked(useGitStore).mockReturnValue({
        ...mockGitStore,
        selectedCommit: mockCommits[0],
      } as any)

      render(<GitHistoryTab workflowId={mockWorkflowId} />)

      // Open dialog
      const revertButton = screen.getByText('Revert to this commit')
      await user.click(revertButton)

      // Confirm revert
      await waitFor(() => {
        const dialog = screen.getByTestId('dialog')
        const confirmButton = within(dialog).getByRole('button', { name: /Revert/i })
        return user.click(confirmButton)
      })

      await waitFor(() => {
        expect(mockGitStore.revertToCommit).toHaveBeenCalledWith(mockWorkflowId, 'abc123def456')
        expect(mockToast.showSuccess).toHaveBeenCalledWith('Revert Successful', expect.any(Object))
      })
    })

    it('should show error when revert fails', async () => {
      const user = userEvent.setup()
      const errorMessage = 'Revert failed'
      vi.mocked(useGitStore).mockReturnValue({
        ...mockGitStore,
        selectedCommit: mockCommits[0],
        revertToCommit: vi.fn().mockRejectedValue(new Error(errorMessage)),
      } as any)

      render(<GitHistoryTab workflowId={mockWorkflowId} />)

      // Open dialog
      const revertButton = screen.getByText('Revert to this commit')
      await user.click(revertButton)

      // Confirm revert
      await waitFor(() => {
        const dialog = screen.getByTestId('dialog')
        const confirmButton = within(dialog).getByRole('button', { name: /Revert/i })
        return user.click(confirmButton)
      })

      await waitFor(() => {
        expect(mockToast.showError).toHaveBeenCalledWith('Revert Failed', expect.any(Object))
      })
    })
  })

  describe('Create Branch from Commit', () => {
    it('should open create branch dialog when button clicked', async () => {
      const user = userEvent.setup()
      vi.mocked(useGitStore).mockReturnValue({
        ...mockGitStore,
        selectedCommit: mockCommits[0],
      } as any)

      render(<GitHistoryTab workflowId={mockWorkflowId} />)

      const createBranchButton = screen.getByText('Create branch')
      await user.click(createBranchButton)

      await waitFor(() => {
        expect(screen.getByText('Create Branch from Commit')).toBeInTheDocument()
      })
    })

    it('should create branch when confirmed with valid name', async () => {
      const user = userEvent.setup()
      vi.mocked(useGitStore).mockReturnValue({
        ...mockGitStore,
        selectedCommit: mockCommits[0],
      } as any)

      render(<GitHistoryTab workflowId={mockWorkflowId} />)

      // Open dialog
      const createBranchButton = screen.getByText('Create branch')
      await user.click(createBranchButton)

      // Enter branch name
      await waitFor(async () => {
        const input = screen.getByPlaceholderText('feature/my-branch')
        await user.type(input, 'feature/new-feature')
      })

      // Confirm creation
      await waitFor(() => {
        const dialog = screen.getByTestId('dialog')
        const confirmButton = within(dialog).getByRole('button', { name: /Create Branch/i })
        return user.click(confirmButton)
      })

      await waitFor(() => {
        expect(mockGitStore.createBranchFromCommit).toHaveBeenCalledWith(
          mockWorkflowId,
          'abc123def456',
          'feature/new-feature'
        )
        expect(mockToast.showSuccess).toHaveBeenCalledWith('Branch Created', expect.any(Object))
      })
    })

    it('should disable create button when branch name is empty', async () => {
      const user = userEvent.setup()
      vi.mocked(useGitStore).mockReturnValue({
        ...mockGitStore,
        selectedCommit: mockCommits[0],
      } as any)

      render(<GitHistoryTab workflowId={mockWorkflowId} />)

      // Open dialog
      const createBranchButton = screen.getByText('Create branch')
      await user.click(createBranchButton)

      await waitFor(() => {
        const dialog = screen.getByTestId('dialog')
        const confirmButton = within(dialog).getByRole('button', { name: /Create Branch/i })
        expect(confirmButton).toBeDisabled()
      })
    })
  })

  describe('Pagination', () => {
    it('should load initial commits on mount', () => {
      render(<GitHistoryTab workflowId={mockWorkflowId} />)

      expect(mockGitStore.loadCommitHistory).toHaveBeenCalledWith(mockWorkflowId, 20, 0)
    })

    it('should show load more button when there are more commits', () => {
      render(<GitHistoryTab workflowId={mockWorkflowId} />)

      expect(screen.getByText('Load more')).toBeInTheDocument()
    })

    it('should load more commits when load more button clicked', async () => {
      const user = userEvent.setup()
      render(<GitHistoryTab workflowId={mockWorkflowId} />)

      const loadMoreButton = screen.getByText('Load more')
      await user.click(loadMoreButton)

      await waitFor(() => {
        expect(mockGitStore.loadCommitHistory).toHaveBeenCalledWith(mockWorkflowId, 20, 20)
      })
    })
  })

  describe('Read-only Mode', () => {
    it('should not show action buttons in read-only mode', () => {
      vi.mocked(useGitStore).mockReturnValue({
        ...mockGitStore,
        selectedCommit: mockCommits[0],
      } as any)

      render(<GitHistoryTab workflowId={mockWorkflowId} readOnly={true} />)

      expect(screen.queryByText('Revert to this commit')).not.toBeInTheDocument()
      expect(screen.queryByText('Create branch')).not.toBeInTheDocument()
    })
  })

  describe('Data Loading', () => {
    it('should load commit history when workflowId changes', () => {
      const { rerender } = render(<GitHistoryTab workflowId={mockWorkflowId} />)

      expect(mockGitStore.loadCommitHistory).toHaveBeenCalledWith(mockWorkflowId, 20, 0)

      const newWorkflowId = 'new-workflow-456'
      rerender(<GitHistoryTab workflowId={newWorkflowId} />)

      expect(mockGitStore.loadCommitHistory).toHaveBeenCalledWith(newWorkflowId, 20, 0)
    })
  })
})
