/**
 * Git Store Tests
 * 
 * Tests for the Git state management store.
 * Validates state management, actions, and persistence.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useGitStore } from '../git';
import { gitService } from '../../services/git.service';

// Mock the git service
vi.mock('@/services/git.service', () => ({
  gitService: {
    initRepository: vi.fn(),
    connectRepository: vi.fn(),
    disconnectRepository: vi.fn(),
    getRepositoryInfo: vi.fn(),
    getStatus: vi.fn(),
    commit: vi.fn(),
    push: vi.fn(),
    pull: vi.fn(),
    listBranches: vi.fn(),
    createBranch: vi.fn(),
    switchBranch: vi.fn(),
    getCommitHistory: vi.fn(),
    revertToCommit: vi.fn(),
    createBranchFromCommit: vi.fn(),
  },
}));

describe('Git Store', () => {
  beforeEach(() => {
    // Reset store state before each test
    useGitStore.getState().reset();
    vi.clearAllMocks();
  });

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const state = useGitStore.getState();

      expect(state.repositoryInfo).toBeNull();
      expect(state.isConnected).toBe(false);
      expect(state.isConnecting).toBe(false);
      expect(state.connectionError).toBeNull();
      expect(state.status).toBeNull();
      expect(state.branches).toEqual([]);
      expect(state.currentBranch).toBeNull();
      expect(state.commits).toEqual([]);
      expect(state.selectedCommit).toBeNull();
    });
  });

  describe('Connection Management', () => {
    it('should initialize repository successfully', async () => {
      const mockRepoInfo = {
        workflowId: 'workflow-1',
        repositoryUrl: 'https://github.com/user/repo.git',
        branch: 'main',
        connected: true,
        unpushedCommits: 0,
      };

      const mockStatus = {
        workflowId: 'workflow-1',
        branch: 'main',
        modified: false,
        staged: false,
        unpushedCommits: 0,
        ahead: 0,
        behind: 0,
        changes: [],
      };

      vi.mocked(gitService.initRepository).mockResolvedValue(mockRepoInfo);
      vi.mocked(gitService.getStatus).mockResolvedValue(mockStatus);

      await useGitStore.getState().initRepository('workflow-1');

      const state = useGitStore.getState();
      expect(state.repositoryInfo).toEqual(mockRepoInfo);
      expect(state.isConnected).toBe(true);
      expect(state.currentBranch).toBe('main');
      expect(gitService.initRepository).toHaveBeenCalledWith('workflow-1');
    });

    it('should handle initialization errors', async () => {
      const error = new Error('Failed to initialize');
      vi.mocked(gitService.initRepository).mockRejectedValue(error);

      await expect(
        useGitStore.getState().initRepository('workflow-1')
      ).rejects.toThrow('Failed to initialize');

      const state = useGitStore.getState();
      expect(state.isConnected).toBe(false);
      expect(state.connectionError).toBe('Failed to initialize');
    });

    it('should connect to repository successfully', async () => {
      const mockRepoInfo = {
        workflowId: 'workflow-1',
        repositoryUrl: 'https://github.com/user/repo.git',
        branch: 'main',
        connected: true,
        unpushedCommits: 0,
      };

      const mockStatus = {
        workflowId: 'workflow-1',
        branch: 'main',
        modified: false,
        staged: false,
        unpushedCommits: 0,
        ahead: 0,
        behind: 0,
        changes: [],
      };

      const mockBranches = [
        { name: 'main', current: true, remote: false },
      ];

      const mockCommits = [
        {
          hash: 'abc123',
          message: 'Initial commit',
          author: 'Test User',
          timestamp: new Date(),
          parents: [],
        },
      ];

      vi.mocked(gitService.connectRepository).mockResolvedValue(mockRepoInfo);
      vi.mocked(gitService.getStatus).mockResolvedValue(mockStatus);
      vi.mocked(gitService.listBranches).mockResolvedValue(mockBranches);
      vi.mocked(gitService.getCommitHistory).mockResolvedValue(mockCommits);

      const config = {
        repositoryUrl: 'https://github.com/user/repo.git',
        branch: 'main',
        credentials: {
          type: 'personal_access_token' as const,
          token: 'test-token',
          provider: 'github' as const,
        },
      };

      await useGitStore.getState().connectRepository('workflow-1', config);

      const state = useGitStore.getState();
      expect(state.isConnected).toBe(true);
      expect(state.repositoryInfo).toEqual(mockRepoInfo);
      expect(state.branches).toEqual(mockBranches);
      expect(state.commits).toEqual(mockCommits);
    });

    it('should disconnect repository successfully', async () => {
      // First connect
      const mockRepoInfo = {
        workflowId: 'workflow-1',
        repositoryUrl: 'https://github.com/user/repo.git',
        branch: 'main',
        connected: true,
        unpushedCommits: 0,
      };

      vi.mocked(gitService.initRepository).mockResolvedValue(mockRepoInfo);
      vi.mocked(gitService.getStatus).mockResolvedValue({
        workflowId: 'workflow-1',
        branch: 'main',
        modified: false,
        staged: false,
        unpushedCommits: 0,
        ahead: 0,
        behind: 0,
        changes: [],
      });

      await useGitStore.getState().initRepository('workflow-1');

      // Then disconnect
      vi.mocked(gitService.disconnectRepository).mockResolvedValue();

      await useGitStore.getState().disconnectRepository('workflow-1');

      const state = useGitStore.getState();
      expect(state.isConnected).toBe(false);
      expect(state.repositoryInfo).toBeNull();
      expect(gitService.disconnectRepository).toHaveBeenCalledWith('workflow-1');
    });
  });

  describe('Status Management', () => {
    it('should refresh status successfully', async () => {
      const mockStatus = {
        workflowId: 'workflow-1',
        branch: 'main',
        modified: true,
        staged: false,
        unpushedCommits: 2,
        ahead: 2,
        behind: 0,
        changes: [
          { path: 'workflow.json', type: 'modified' as const, staged: false },
        ],
      };

      vi.mocked(gitService.getStatus).mockResolvedValue(mockStatus);

      await useGitStore.getState().refreshStatus('workflow-1');

      const state = useGitStore.getState();
      expect(state.status).toEqual(mockStatus);
      expect(state.lastStatusUpdate).toBeInstanceOf(Date);
    });

    it('should clear status', () => {
      useGitStore.setState({
        status: {
          workflowId: 'workflow-1',
          branch: 'main',
          modified: true,
          staged: false,
          unpushedCommits: 1,
          ahead: 1,
          behind: 0,
          changes: [],
        },
        lastStatusUpdate: new Date(),
      });

      useGitStore.getState().clearStatus();

      const state = useGitStore.getState();
      expect(state.status).toBeNull();
      expect(state.lastStatusUpdate).toBeNull();
    });
  });

  describe('Branch Management', () => {
    it('should load branches successfully', async () => {
      const mockBranches = [
        { name: 'main', current: true, remote: false },
        { name: 'feature', current: false, remote: false },
      ];

      vi.mocked(gitService.listBranches).mockResolvedValue(mockBranches);

      await useGitStore.getState().loadBranches('workflow-1');

      const state = useGitStore.getState();
      expect(state.branches).toEqual(mockBranches);
      expect(state.currentBranch).toBe('main');
    });

    it('should create branch successfully', async () => {
      const mockBranch = {
        name: 'new-feature',
        current: true,
        remote: false,
      };

      const mockStatus = {
        workflowId: 'workflow-1',
        branch: 'new-feature',
        modified: false,
        staged: false,
        unpushedCommits: 0,
        ahead: 0,
        behind: 0,
        changes: [],
      };

      vi.mocked(gitService.createBranch).mockResolvedValue(mockBranch);
      vi.mocked(gitService.getStatus).mockResolvedValue(mockStatus);

      await useGitStore.getState().createBranch('workflow-1', 'new-feature');

      const state = useGitStore.getState();
      expect(state.branches).toContainEqual(mockBranch);
      expect(state.currentBranch).toBe('new-feature');
    });

    it('should switch branch successfully', async () => {
      const mockStatus = {
        workflowId: 'workflow-1',
        branch: 'feature',
        modified: false,
        staged: false,
        unpushedCommits: 0,
        ahead: 0,
        behind: 0,
        changes: [],
      };

      const mockCommits = [
        {
          hash: 'def456',
          message: 'Feature commit',
          author: 'Test User',
          timestamp: new Date(),
          parents: ['abc123'],
        },
      ];

      vi.mocked(gitService.switchBranch).mockResolvedValue();
      vi.mocked(gitService.getStatus).mockResolvedValue(mockStatus);
      vi.mocked(gitService.getCommitHistory).mockResolvedValue(mockCommits);

      await useGitStore.getState().switchBranch('workflow-1', 'feature');

      const state = useGitStore.getState();
      expect(state.currentBranch).toBe('feature');
      expect(gitService.switchBranch).toHaveBeenCalledWith('workflow-1', 'feature');
    });
  });

  describe('Commit Operations', () => {
    it('should create commit successfully', async () => {
      const mockCommit = {
        hash: 'abc123',
        message: 'Test commit',
        author: 'Test User',
        timestamp: new Date(),
        parents: [],
      };

      const mockStatus = {
        workflowId: 'workflow-1',
        branch: 'main',
        modified: false,
        staged: false,
        unpushedCommits: 1,
        ahead: 1,
        behind: 0,
        changes: [],
      };

      const mockWorkflow = {
        id: 'workflow-1',
        name: 'Test Workflow',
        tags: [],
        nodes: [],
        connections: [],
        triggers: [],
        settings: {},
      };

      vi.mocked(gitService.commit).mockResolvedValue(mockCommit);
      vi.mocked(gitService.getStatus).mockResolvedValue(mockStatus);

      await useGitStore.getState().commit('workflow-1', 'Test commit', mockWorkflow);

      const state = useGitStore.getState();
      expect(state.commits).toContainEqual(mockCommit);
      expect(gitService.commit).toHaveBeenCalledWith('workflow-1', 'Test commit', mockWorkflow);
    });

    it('should load commit history successfully', async () => {
      const mockCommits = [
        {
          hash: 'abc123',
          message: 'Commit 1',
          author: 'Test User',
          timestamp: new Date(),
          parents: [],
        },
        {
          hash: 'def456',
          message: 'Commit 2',
          author: 'Test User',
          timestamp: new Date(),
          parents: ['abc123'],
        },
      ];

      vi.mocked(gitService.getCommitHistory).mockResolvedValue(mockCommits);

      await useGitStore.getState().loadCommitHistory('workflow-1');

      const state = useGitStore.getState();
      expect(state.commits).toEqual(mockCommits);
    });

    it('should select commit', () => {
      const commit = {
        hash: 'abc123',
        message: 'Test commit',
        author: 'Test User',
        timestamp: new Date(),
        parents: [],
      };

      useGitStore.getState().selectCommit(commit);

      const state = useGitStore.getState();
      expect(state.selectedCommit).toEqual(commit);
    });
  });

  describe('Push/Pull Operations', () => {
    it('should push successfully', async () => {
      const mockResult = {
        success: true,
        pushed: 2,
      };

      const mockStatus = {
        workflowId: 'workflow-1',
        branch: 'main',
        modified: false,
        staged: false,
        unpushedCommits: 0,
        ahead: 0,
        behind: 0,
        changes: [],
      };

      vi.mocked(gitService.push).mockResolvedValue(mockResult);
      vi.mocked(gitService.getStatus).mockResolvedValue(mockStatus);

      await useGitStore.getState().push('workflow-1');

      const state = useGitStore.getState();
      expect(state.lastPushResult).toEqual(mockResult);
      expect(gitService.push).toHaveBeenCalledWith('workflow-1', undefined);
    });

    it('should pull successfully', async () => {
      const mockResult = {
        success: true,
        conflicts: false,
        commits: [
          {
            hash: 'abc123',
            message: 'Remote commit',
            author: 'Other User',
            timestamp: new Date(),
            parents: [],
          },
        ],
      };

      const mockStatus = {
        workflowId: 'workflow-1',
        branch: 'main',
        modified: false,
        staged: false,
        unpushedCommits: 0,
        ahead: 0,
        behind: 0,
        changes: [],
      };

      vi.mocked(gitService.pull).mockResolvedValue(mockResult);
      vi.mocked(gitService.getStatus).mockResolvedValue(mockStatus);
      vi.mocked(gitService.getCommitHistory).mockResolvedValue(mockResult.commits);

      await useGitStore.getState().pull('workflow-1');

      const state = useGitStore.getState();
      expect(state.lastPullResult).toEqual(mockResult);
      expect(gitService.pull).toHaveBeenCalledWith('workflow-1', undefined);
    });
  });

  describe('Error Handling', () => {
    it('should clear all errors', () => {
      useGitStore.setState({
        connectionError: 'Connection error',
        statusError: 'Status error',
        branchesError: 'Branches error',
        commitsError: 'Commits error',
        operationError: 'Operation error',
      });

      useGitStore.getState().clearErrors();

      const state = useGitStore.getState();
      expect(state.connectionError).toBeNull();
      expect(state.statusError).toBeNull();
      expect(state.branchesError).toBeNull();
      expect(state.commitsError).toBeNull();
      expect(state.operationError).toBeNull();
    });

    it('should set operation error', () => {
      useGitStore.getState().setOperationError('Test error');

      const state = useGitStore.getState();
      expect(state.operationError).toBe('Test error');
    });
  });

  describe('Reset', () => {
    it('should reset store to initial state', () => {
      // Set some state
      useGitStore.setState({
        isConnected: true,
        currentBranch: 'main',
        branches: [{ name: 'main', current: true, remote: false }],
        commits: [
          {
            hash: 'abc123',
            message: 'Test',
            author: 'User',
            timestamp: new Date(),
            parents: [],
          },
        ],
      });

      useGitStore.getState().reset();

      const state = useGitStore.getState();
      expect(state.isConnected).toBe(false);
      expect(state.currentBranch).toBeNull();
      expect(state.branches).toEqual([]);
      expect(state.commits).toEqual([]);
    });
  });
});
