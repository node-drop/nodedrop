/**
 * GitPanel Component Tests
 * 
 * Tests for the main GitPanel component.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { GitPanel } from '../GitPanel'
import { useGitStore } from '@/stores/git'

// Mock the Git store
vi.mock('@/stores/git', () => ({
  useGitStore: vi.fn(),
}))

// Mock child components
vi.mock('../git', () => ({
  GitConnectionSection: ({ workflowId }: { workflowId: string }) => (
    <div data-testid="git-connection-section">Connection Section for {workflowId}</div>
  ),
  GitSourceControlTab: ({ workflowId }: { workflowId: string }) => (
    <div data-testid="git-source-control-tab">Source Control for {workflowId}</div>
  ),
  GitHistoryTab: ({ workflowId }: { workflowId: string }) => (
    <div data-testid="git-history-tab">History for {workflowId}</div>
  ),
  GitBranchesTab: ({ workflowId }: { workflowId: string }) => (
    <div data-testid="git-branches-tab">Branches for {workflowId}</div>
  ),
}))

describe('GitPanel', () => {
  const mockGetRepositoryInfo = vi.fn()
  const mockSwitchBranch = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should show message when no workflow ID is provided', () => {
    vi.mocked(useGitStore).mockReturnValue({
      isConnected: false,
      repositoryInfo: null,
      currentBranch: null,
      branches: [],
      getRepositoryInfo: mockGetRepositoryInfo,
      switchBranch: mockSwitchBranch,
      isSwitchingBranch: false,
    } as any)

    render(<GitPanel />)

    expect(screen.getByText('No workflow loaded')).toBeInTheDocument()
    expect(screen.getByText('Open a workflow to use Git version control')).toBeInTheDocument()
  })

  it('should show connection section when not connected', () => {
    vi.mocked(useGitStore).mockReturnValue({
      isConnected: false,
      repositoryInfo: null,
      currentBranch: null,
      branches: [],
      getRepositoryInfo: mockGetRepositoryInfo,
      switchBranch: mockSwitchBranch,
      isSwitchingBranch: false,
    } as any)

    render(<GitPanel workflowId="test-workflow-123" />)

    expect(screen.getByTestId('git-connection-section')).toBeInTheDocument()
    expect(screen.getByText('Connection Section for test-workflow-123')).toBeInTheDocument()
  })

  it('should show Git tabs when connected', () => {
    vi.mocked(useGitStore).mockReturnValue({
      isConnected: true,
      repositoryInfo: {
        workflowId: 'test-workflow-123',
        repositoryUrl: 'https://github.com/user/repo.git',
        branch: 'main',
        connected: true,
        unpushedCommits: 0,
      },
      currentBranch: 'main',
      branches: [
        { name: 'main', current: true, remote: false },
        { name: 'develop', current: false, remote: false },
      ],
      getRepositoryInfo: mockGetRepositoryInfo,
      switchBranch: mockSwitchBranch,
      isSwitchingBranch: false,
    } as any)

    render(<GitPanel workflowId="test-workflow-123" />)

    // Should show branch selector
    expect(screen.getByText('Branch')).toBeInTheDocument()
    expect(screen.getByText('main')).toBeInTheDocument()

    // Should show repository URL
    expect(screen.getByText('https://github.com/user/repo.git')).toBeInTheDocument()

    // Should show tab triggers
    expect(screen.getByText('Source Control')).toBeInTheDocument()
    expect(screen.getByText('History')).toBeInTheDocument()
    expect(screen.getByText('Branches')).toBeInTheDocument()

    // Should show default tab content (Source Control)
    expect(screen.getByTestId('git-source-control-tab')).toBeInTheDocument()
  })

  it('should call getRepositoryInfo on mount with workflowId', () => {
    vi.mocked(useGitStore).mockReturnValue({
      isConnected: false,
      repositoryInfo: null,
      currentBranch: null,
      branches: [],
      getRepositoryInfo: mockGetRepositoryInfo,
      switchBranch: mockSwitchBranch,
      isSwitchingBranch: false,
    } as any)

    render(<GitPanel workflowId="test-workflow-123" />)

    expect(mockGetRepositoryInfo).toHaveBeenCalledWith('test-workflow-123')
  })

  it('should not call getRepositoryInfo when no workflowId', () => {
    vi.mocked(useGitStore).mockReturnValue({
      isConnected: false,
      repositoryInfo: null,
      currentBranch: null,
      branches: [],
      getRepositoryInfo: mockGetRepositoryInfo,
      switchBranch: mockSwitchBranch,
      isSwitchingBranch: false,
    } as any)

    render(<GitPanel />)

    expect(mockGetRepositoryInfo).not.toHaveBeenCalled()
  })
})
