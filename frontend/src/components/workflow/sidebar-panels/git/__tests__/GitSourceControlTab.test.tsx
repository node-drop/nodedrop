/**
 * GitSourceControlTab Component Tests
 * 
 * Tests for the Git source control tab component.
 * Requirements: 2.1, 2.2, 2.5, 3.1, 3.2, 3.5, 7.1
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { GitSourceControlTab } from '../GitSourceControlTab'
import { useGitStore } from '@/stores/git'
import { useGlobalToast } from '@/hooks/useToast'

// Mock the stores and hooks
vi.mock('@/stores/git')
vi.mock('@/hooks/useToast')

describe('GitSourceControlTab', () => {
  const mockWorkflowId = 'test-workflow-123'
  
  const mockGitStore = {
    status: {
      workflowId: mockWorkflowId,
      branch: 'main',
      modified: true,
      staged: false,
      unpushedCommits: 2,
      ahead: 2,
      behind: 0,
      changes: [
        { path: 'workflow.json', type: 'modified' as const, staged: false },
        { path: 'nodes.json', type: 'added' as const, staged: true },
      ],
    },
    isLoadingStatus: false,
    statusError: null,
    isPushing: false,
    isPulling: false,
    isCommitting: false,
    operationError: null,
    lastPushResult: null,
    lastPullResult: null,
    refreshStatus: vi.fn().mockResolvedValue(undefined),
    push: vi.fn().mockResolvedValue(undefined),
    pull: vi.fn().mockResolvedValue(undefined),
    sync: vi.fn().mockResolvedValue(undefined),
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

  it('should render the component', () => {
    render(<GitSourceControlTab workflowId={mockWorkflowId} />)
    
    expect(screen.getByText(/2 changes/i)).toBeInTheDocument()
  })

  it('should display changes count correctly', () => {
    render(<GitSourceControlTab workflowId={mockWorkflowId} />)
    
    expect(screen.getByText(/2 changes/i)).toBeInTheDocument()
    expect(screen.getByText(/\(1 staged\)/i)).toBeInTheDocument()
  })

  it('should display unpushed commits count', () => {
    render(<GitSourceControlTab workflowId={mockWorkflowId} />)
    
    expect(screen.getByText(/2 unpushed commits/i)).toBeInTheDocument()
  })

  it('should show up to date status when no unpushed commits', () => {
    vi.mocked(useGitStore).mockReturnValue({
      ...mockGitStore,
      status: {
        ...mockGitStore.status,
        unpushedCommits: 0,
      },
    } as any)

    render(<GitSourceControlTab workflowId={mockWorkflowId} />)
    
    expect(screen.getByText(/up to date/i)).toBeInTheDocument()
  })

  it('should render action buttons', () => {
    render(<GitSourceControlTab workflowId={mockWorkflowId} />)
    
    expect(screen.getByRole('button', { name: /push/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /pull/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sync/i })).toBeInTheDocument()
  })

  it('should call push when push button is clicked', async () => {
    const user = userEvent.setup()
    render(<GitSourceControlTab workflowId={mockWorkflowId} />)
    
    const pushButton = screen.getByRole('button', { name: /push/i })
    await user.click(pushButton)
    
    await waitFor(() => {
      expect(mockGitStore.push).toHaveBeenCalledWith(mockWorkflowId)
    })
  })

  it('should call pull when pull button is clicked', async () => {
    const user = userEvent.setup()
    render(<GitSourceControlTab workflowId={mockWorkflowId} />)
    
    const pullButton = screen.getByRole('button', { name: /pull/i })
    await user.click(pullButton)
    
    await waitFor(() => {
      expect(mockGitStore.pull).toHaveBeenCalledWith(mockWorkflowId)
    })
  })

  it('should call sync when sync button is clicked', async () => {
    const user = userEvent.setup()
    render(<GitSourceControlTab workflowId={mockWorkflowId} />)
    
    const syncButton = screen.getByRole('button', { name: /sync/i })
    await user.click(syncButton)
    
    await waitFor(() => {
      expect(mockGitStore.sync).toHaveBeenCalledWith(mockWorkflowId)
    })
  })

  it('should disable push button when no unpushed commits', () => {
    vi.mocked(useGitStore).mockReturnValue({
      ...mockGitStore,
      status: {
        ...mockGitStore.status,
        unpushedCommits: 0,
      },
    } as any)

    render(<GitSourceControlTab workflowId={mockWorkflowId} />)
    
    const pushButton = screen.getByRole('button', { name: /push/i })
    expect(pushButton).toBeDisabled()
  })

  it('should show loading state when pushing', () => {
    vi.mocked(useGitStore).mockReturnValue({
      ...mockGitStore,
      isPushing: true,
    } as any)

    render(<GitSourceControlTab workflowId={mockWorkflowId} />)
    
    expect(screen.getByText(/pushing\.\.\./i)).toBeInTheDocument()
  })

  it('should show loading state when pulling', () => {
    vi.mocked(useGitStore).mockReturnValue({
      ...mockGitStore,
      isPulling: true,
    } as any)

    render(<GitSourceControlTab workflowId={mockWorkflowId} />)
    
    expect(screen.getByText(/pulling\.\.\./i)).toBeInTheDocument()
  })

  it('should display error when operation fails', () => {
    const errorMessage = 'Failed to push commits'
    vi.mocked(useGitStore).mockReturnValue({
      ...mockGitStore,
      operationError: errorMessage,
    } as any)

    render(<GitSourceControlTab workflowId={mockWorkflowId} />)
    
    expect(screen.getByText(errorMessage)).toBeInTheDocument()
  })

  it('should call refreshStatus on mount', () => {
    render(<GitSourceControlTab workflowId={mockWorkflowId} />)
    
    expect(mockGitStore.refreshStatus).toHaveBeenCalledWith(mockWorkflowId)
  })

  it('should refresh status when refresh button is clicked', async () => {
    const user = userEvent.setup()
    render(<GitSourceControlTab workflowId={mockWorkflowId} />)
    
    const refreshButton = screen.getByTitle('Refresh status')
    await user.click(refreshButton)
    
    await waitFor(() => {
      expect(mockGitStore.refreshStatus).toHaveBeenCalledTimes(2) // Once on mount, once on click
    })
  })

  it('should disable buttons in read-only mode', () => {
    render(<GitSourceControlTab workflowId={mockWorkflowId} readOnly={true} />)
    
    expect(screen.getByRole('button', { name: /push/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /pull/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /sync/i })).toBeDisabled()
  })

  it('should show empty state when no status available', () => {
    vi.mocked(useGitStore).mockReturnValue({
      ...mockGitStore,
      status: null,
    } as any)

    render(<GitSourceControlTab workflowId={mockWorkflowId} />)
    
    expect(screen.getByText(/no git status available/i)).toBeInTheDocument()
  })

  it('should show loading state when loading status', () => {
    vi.mocked(useGitStore).mockReturnValue({
      ...mockGitStore,
      status: null,
      isLoadingStatus: true,
    } as any)

    render(<GitSourceControlTab workflowId={mockWorkflowId} />)
    
    expect(screen.getByText(/loading status\.\.\./i)).toBeInTheDocument()
  })

  it('should render GitChangesList component', () => {
    render(<GitSourceControlTab workflowId={mockWorkflowId} />)
    
    // Check that changes are displayed (GitChangesList renders them)
    expect(screen.getByText('workflow.json')).toBeInTheDocument()
    expect(screen.getByText('nodes.json')).toBeInTheDocument()
  })

  it('should render GitCommitInput component', () => {
    render(<GitSourceControlTab workflowId={mockWorkflowId} />)
    
    // Check that commit input is present
    expect(screen.getByLabelText(/commit message/i)).toBeInTheDocument()
  })

  it('should show success notification after successful push', async () => {
    const { rerender } = render(<GitSourceControlTab workflowId={mockWorkflowId} />)
    
    // Simulate successful push by updating lastPushResult
    vi.mocked(useGitStore).mockReturnValue({
      ...mockGitStore,
      lastPushResult: {
        success: true,
        pushed: 2,
      },
    } as any)
    
    rerender(<GitSourceControlTab workflowId={mockWorkflowId} />)
    
    await waitFor(() => {
      expect(mockToast.showSuccess).toHaveBeenCalledWith(
        'Push Successful',
        expect.objectContaining({
          message: expect.stringContaining('2 commits'),
        })
      )
    })
  })

  it('should show error notification after failed push', async () => {
    const { rerender } = render(<GitSourceControlTab workflowId={mockWorkflowId} />)
    
    // Simulate failed push
    vi.mocked(useGitStore).mockReturnValue({
      ...mockGitStore,
      lastPushResult: {
        success: false,
        pushed: 0,
        error: 'Network error',
      },
    } as any)
    
    rerender(<GitSourceControlTab workflowId={mockWorkflowId} />)
    
    await waitFor(() => {
      expect(mockToast.showError).toHaveBeenCalledWith(
        'Push Failed',
        expect.objectContaining({
          message: 'Network error',
        })
      )
    })
  })

  it('should show warning notification for pull with conflicts', async () => {
    const { rerender } = render(<GitSourceControlTab workflowId={mockWorkflowId} />)
    
    // Simulate pull with conflicts
    vi.mocked(useGitStore).mockReturnValue({
      ...mockGitStore,
      lastPullResult: {
        success: true,
        conflicts: true,
        conflictFiles: ['workflow.json'],
        commits: [],
      },
    } as any)
    
    rerender(<GitSourceControlTab workflowId={mockWorkflowId} />)
    
    await waitFor(() => {
      expect(mockToast.showWarning).toHaveBeenCalledWith(
        'Pull Completed with Conflicts',
        expect.objectContaining({
          message: expect.stringContaining('1 file'),
        })
      )
    })
  })
})
