/**
 * GitBranchesTab Component Tests
 * 
 * Tests for branch management functionality including listing, creation,
 * switching, and deletion with proper validation and error handling.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { GitBranchesTab } from '../GitBranchesTab'
import { useGitStore } from '@/stores/git'
import { useGlobalToast } from '@/hooks/useToast'
import { GitBranch } from '@/services/git.service'

// Mock dependencies
vi.mock('@/stores/git')
vi.mock('@/hooks/useToast')

describe('GitBranchesTab', () => {
  const mockWorkflowId = 'test-workflow-123'
  
  const mockBranches: GitBranch[] = [
    {
      name: 'main',
      current: true,
      remote: false,
      lastCommit: {
        hash: 'abc123def456',
        message: 'Initial commit',
        author: 'Test User',
        timestamp: new Date('2024-01-01T12:00:00Z'),
        parents: [],
      },
    },
    {
      name: 'feature/test',
      current: false,
      remote: false,
      lastCommit: {
        hash: 'def456ghi789',
        message: 'Add test feature',
        author: 'Test User',
        timestamp: new Date('2024-01-02T12:00:00Z'),
        parents: ['abc123def456'],
      },
    },
    {
      name: 'origin/main',
      current: false,
      remote: true,
      lastCommit: {
        hash: 'abc123def456',
        message: 'Initial commit',
        author: 'Test User',
        timestamp: new Date('2024-01-01T12:00:00Z'),
        parents: [],
      },
    },
  ]

  const mockLoadBranches = vi.fn()
  const mockCreateBranch = vi.fn()
  const mockSwitchBranch = vi.fn()
  const mockClearErrors = vi.fn()
  const mockShowSuccess = vi.fn()
  const mockShowError = vi.fn()
  const mockShowWarning = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()

    // Setup default mock implementations
    vi.mocked(useGitStore).mockReturnValue({
      branches: mockBranches,
      currentBranch: 'main',
      isLoadingBranches: false,
      branchesError: null,
      isSwitchingBranch: false,
      isCreatingBranch: false,
      operationError: null,
      status: null,
      loadBranches: mockLoadBranches,
      createBranch: mockCreateBranch,
      switchBranch: mockSwitchBranch,
      clearErrors: mockClearErrors,
    } as any)

    vi.mocked(useGlobalToast).mockReturnValue({
      showSuccess: mockShowSuccess,
      showError: mockShowError,
      showWarning: mockShowWarning,
    } as any)

    mockLoadBranches.mockResolvedValue(undefined)
    mockCreateBranch.mockResolvedValue(undefined)
    mockSwitchBranch.mockResolvedValue(undefined)
  })

  describe('Branch List Display', () => {
    it('should display local and remote branches separately', () => {
      render(<GitBranchesTab workflowId={mockWorkflowId} />)

      // Check for section headers
      expect(screen.getByText(/local branches/i)).toBeInTheDocument()
      expect(screen.getByText(/remote branches/i)).toBeInTheDocument()

      // Check for branch names
      expect(screen.getByText('main')).toBeInTheDocument()
      expect(screen.getByText('feature/test')).toBeInTheDocument()
      expect(screen.getByText('origin/main')).toBeInTheDocument()
    })

    it('should highlight current branch', () => {
      render(<GitBranchesTab workflowId={mockWorkflowId} />)

      // Current branch should have a "Current" badge
      const currentBadge = screen.getByText('Current')
      expect(currentBadge).toBeInTheDocument()
    })

    it('should display last commit info for each branch', () => {
      render(<GitBranchesTab workflowId={mockWorkflowId} />)

      // Check for commit hashes (shortened)
      expect(screen.getAllByText(/abc123d/i).length).toBeGreaterThan(0)
      expect(screen.getByText(/def456g/i)).toBeInTheDocument()

      // Check for commit messages
      expect(screen.getByText('Initial commit')).toBeInTheDocument()
      expect(screen.getByText('Add test feature')).toBeInTheDocument()
    })

    it('should show branch count in header', () => {
      render(<GitBranchesTab workflowId={mockWorkflowId} />)

      expect(screen.getByText('3 branches')).toBeInTheDocument()
    })
  })

  describe('Branch Creation', () => {
    it('should open create dialog when clicking New Branch button', async () => {
      const user = userEvent.setup()
      render(<GitBranchesTab workflowId={mockWorkflowId} />)

      const newBranchButton = screen.getByRole('button', { name: /new branch/i })
      await user.click(newBranchButton)

      expect(screen.getByText('Create New Branch')).toBeInTheDocument()
      expect(screen.getByLabelText(/branch name/i)).toBeInTheDocument()
    })

    it('should create branch with valid name', async () => {
      const user = userEvent.setup()
      render(<GitBranchesTab workflowId={mockWorkflowId} />)

      // Open dialog
      const newBranchButton = screen.getByRole('button', { name: /new branch/i })
      await user.click(newBranchButton)

      // Enter branch name
      const input = screen.getByLabelText(/branch name/i)
      await user.type(input, 'feature/new-feature')

      // Click create
      const createButton = screen.getByRole('button', { name: /^create branch$/i })
      await user.click(createButton)

      await waitFor(() => {
        expect(mockCreateBranch).toHaveBeenCalledWith(mockWorkflowId, 'feature/new-feature')
        expect(mockShowSuccess).toHaveBeenCalled()
      })
    })

    it('should validate branch name and show error for invalid names', async () => {
      const user = userEvent.setup()
      render(<GitBranchesTab workflowId={mockWorkflowId} />)

      // Open dialog
      const newBranchButton = screen.getByRole('button', { name: /new branch/i })
      await user.click(newBranchButton)

      // Test invalid name with spaces
      const input = screen.getByLabelText(/branch name/i)
      await user.type(input, 'invalid branch name')

      const createButton = screen.getByRole('button', { name: /^create branch$/i })
      await user.click(createButton)

      await waitFor(() => {
        expect(mockShowError).toHaveBeenCalledWith(
          'Invalid Branch Name',
          expect.objectContaining({
            message: expect.stringContaining('spaces'),
          })
        )
        expect(mockCreateBranch).not.toHaveBeenCalled()
      })
    })

    it('should prevent creating branch with existing name', async () => {
      const user = userEvent.setup()
      render(<GitBranchesTab workflowId={mockWorkflowId} />)

      // Open dialog
      const newBranchButton = screen.getByRole('button', { name: /new branch/i })
      await user.click(newBranchButton)

      // Try to create branch with existing name
      const input = screen.getByLabelText(/branch name/i)
      await user.type(input, 'main')

      const createButton = screen.getByRole('button', { name: /^create branch$/i })
      await user.click(createButton)

      await waitFor(() => {
        expect(mockShowError).toHaveBeenCalledWith(
          'Invalid Branch Name',
          expect.objectContaining({
            message: expect.stringContaining('already exists'),
          })
        )
        expect(mockCreateBranch).not.toHaveBeenCalled()
      })
    })

    it('should disable create button when branch name is empty', async () => {
      const user = userEvent.setup()
      render(<GitBranchesTab workflowId={mockWorkflowId} />)

      // Open dialog
      const newBranchButton = screen.getByRole('button', { name: /new branch/i })
      await user.click(newBranchButton)

      const createButton = screen.getByRole('button', { name: /^create branch$/i })
      expect(createButton).toBeDisabled()
    })
  })

  describe('Branch Switching', () => {
    it('should switch to branch when clicking on non-current branch', async () => {
      const user = userEvent.setup()
      render(<GitBranchesTab workflowId={mockWorkflowId} />)

      // Click on feature/test branch
      const featureBranch = screen.getByText('feature/test')
      await user.click(featureBranch.closest('div[class*="cursor-pointer"]')!)

      await waitFor(() => {
        expect(mockSwitchBranch).toHaveBeenCalledWith(mockWorkflowId, 'feature/test')
        expect(mockShowSuccess).toHaveBeenCalled()
      })
    })

    it('should show warning dialog when switching with uncommitted changes', async () => {
      const user = userEvent.setup()
      
      // Mock uncommitted changes
      vi.mocked(useGitStore).mockReturnValue({
        branches: mockBranches,
        currentBranch: 'main',
        isLoadingBranches: false,
        branchesError: null,
        isSwitchingBranch: false,
        isCreatingBranch: false,
        operationError: null,
        status: {
          workflowId: mockWorkflowId,
          branch: 'main',
          modified: true,
          staged: false,
          unpushedCommits: 0,
          ahead: 0,
          behind: 0,
          changes: [
            { path: 'workflow.json', type: 'modified', staged: false },
          ],
        },
        loadBranches: mockLoadBranches,
        createBranch: mockCreateBranch,
        switchBranch: mockSwitchBranch,
        clearErrors: mockClearErrors,
      } as any)

      render(<GitBranchesTab workflowId={mockWorkflowId} />)

      // Click on feature/test branch
      const featureBranch = screen.getByText('feature/test')
      await user.click(featureBranch.closest('div[class*="cursor-pointer"]')!)

      // Should show uncommitted changes dialog
      await waitFor(() => {
        expect(screen.getByText('Uncommitted Changes')).toBeInTheDocument()
      })

      // Should not switch yet
      expect(mockSwitchBranch).not.toHaveBeenCalled()
    })

    it('should not allow switching to current branch', async () => {
      const user = userEvent.setup()
      render(<GitBranchesTab workflowId={mockWorkflowId} />)

      // Try to click on current branch (main)
      const mainBranch = screen.getByText('main')
      await user.click(mainBranch.closest('div[class*="cursor-pointer"]')!)

      // Should not trigger switch
      expect(mockSwitchBranch).not.toHaveBeenCalled()
    })
  })

  describe('Branch Deletion', () => {
    it('should show delete button on hover for non-current branches', () => {
      render(<GitBranchesTab workflowId={mockWorkflowId} />)

      // Delete buttons should be present (even if hidden by opacity)
      const deleteButtons = screen.getAllByTitle('Delete branch')
      expect(deleteButtons.length).toBeGreaterThan(0)
    })

    it('should prevent deleting current branch', async () => {
      const user = userEvent.setup()
      render(<GitBranchesTab workflowId={mockWorkflowId} />)

      // Find the main branch (current) and try to delete
      const mainBranchContainer = screen.getByText('main').closest('div[class*="group"]')
      const deleteButton = mainBranchContainer?.querySelector('button[title="Delete branch"]')

      // Current branch should not have a visible delete button or it should be disabled
      // In this implementation, we show a warning instead
      if (deleteButton) {
        await user.click(deleteButton)
        
        await waitFor(() => {
          expect(mockShowWarning).toHaveBeenCalledWith(
            'Cannot Delete Current Branch',
            expect.any(Object)
          )
        })
      }
    })
  })

  describe('Loading and Error States', () => {
    it('should show loading state while fetching branches', () => {
      vi.mocked(useGitStore).mockReturnValue({
        branches: [],
        currentBranch: null,
        isLoadingBranches: true,
        branchesError: null,
        isSwitchingBranch: false,
        isCreatingBranch: false,
        operationError: null,
        status: null,
        loadBranches: mockLoadBranches,
        createBranch: mockCreateBranch,
        switchBranch: mockSwitchBranch,
        clearErrors: mockClearErrors,
      } as any)

      render(<GitBranchesTab workflowId={mockWorkflowId} />)

      expect(screen.getByText(/loading branches/i)).toBeInTheDocument()
    })

    it('should display error message when branch loading fails', () => {
      vi.mocked(useGitStore).mockReturnValue({
        branches: [],
        currentBranch: null,
        isLoadingBranches: false,
        branchesError: 'Failed to load branches',
        isSwitchingBranch: false,
        isCreatingBranch: false,
        operationError: null,
        status: null,
        loadBranches: mockLoadBranches,
        createBranch: mockCreateBranch,
        switchBranch: mockSwitchBranch,
        clearErrors: mockClearErrors,
      } as any)

      render(<GitBranchesTab workflowId={mockWorkflowId} />)

      expect(screen.getByText('Failed to load branches')).toBeInTheDocument()
    })

    it('should show empty state when no branches exist', () => {
      vi.mocked(useGitStore).mockReturnValue({
        branches: [],
        currentBranch: null,
        isLoadingBranches: false,
        branchesError: null,
        isSwitchingBranch: false,
        isCreatingBranch: false,
        operationError: null,
        status: null,
        loadBranches: mockLoadBranches,
        createBranch: mockCreateBranch,
        switchBranch: mockSwitchBranch,
        clearErrors: mockClearErrors,
      } as any)

      render(<GitBranchesTab workflowId={mockWorkflowId} />)

      expect(screen.getByText('No branches found')).toBeInTheDocument()
    })
  })

  describe('Read-Only Mode', () => {
    it('should hide action buttons in read-only mode', () => {
      render(<GitBranchesTab workflowId={mockWorkflowId} readOnly={true} />)

      // New Branch button should not be present
      expect(screen.queryByRole('button', { name: /new branch/i })).not.toBeInTheDocument()
    })

    it('should not allow branch switching in read-only mode', async () => {
      const user = userEvent.setup()
      render(<GitBranchesTab workflowId={mockWorkflowId} readOnly={true} />)

      // Try to click on a branch
      const featureBranch = screen.getByText('feature/test')
      await user.click(featureBranch.closest('div')!)

      // Should not trigger switch
      expect(mockSwitchBranch).not.toHaveBeenCalled()
    })
  })

  describe('Branch Name Validation', () => {
    it('should reject branch names with double dots', async () => {
      const user = userEvent.setup()
      render(<GitBranchesTab workflowId={mockWorkflowId} />)

      const newBranchButton = screen.getByRole('button', { name: /new branch/i })
      await user.click(newBranchButton)

      const input = screen.getByLabelText(/branch name/i)
      await user.type(input, 'feature..test')

      const createButton = screen.getByRole('button', { name: /^create branch$/i })
      await user.click(createButton)

      await waitFor(() => {
        expect(mockShowError).toHaveBeenCalledWith(
          'Invalid Branch Name',
          expect.objectContaining({
            message: expect.stringContaining('..'),
          })
        )
      })
    })

    it('should reject branch names with invalid characters', async () => {
      const user = userEvent.setup()
      render(<GitBranchesTab workflowId={mockWorkflowId} />)

      const newBranchButton = screen.getByRole('button', { name: /new branch/i })
      await user.click(newBranchButton)

      const input = screen.getByLabelText(/branch name/i)
      await user.type(input, 'feature:test')

      const createButton = screen.getByRole('button', { name: /^create branch$/i })
      await user.click(createButton)

      await waitFor(() => {
        expect(mockShowError).toHaveBeenCalledWith(
          'Invalid Branch Name',
          expect.objectContaining({
            message: expect.stringContaining('invalid characters'),
          })
        )
      })
    })
  })
})
