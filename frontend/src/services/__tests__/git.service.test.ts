import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GitService } from '../git.service';
import { apiClient } from '../api';

// Mock the API client
vi.mock('../api', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('GitService', () => {
  let gitService: GitService;

  beforeEach(() => {
    gitService = new GitService();
    vi.clearAllMocks();
  });

  describe('initRepository', () => {
    it('should initialize a repository successfully', async () => {
      const mockResponse = {
        success: true,
        data: {
          workflowId: 'workflow-1',
          repositoryUrl: '',
          branch: 'main',
          connected: false,
          unpushedCommits: 0,
        },
      };

      vi.mocked(apiClient.post).mockResolvedValue(mockResponse);

      const result = await gitService.initRepository('workflow-1');

      expect(apiClient.post).toHaveBeenCalledWith('/git/init', {
        workflowId: 'workflow-1',
      });
      expect(result.workflowId).toBe('workflow-1');
      expect(result.branch).toBe('main');
    });

    it('should throw error when initialization fails', async () => {
      const mockResponse = {
        success: false,
        error: { message: 'Failed to initialize' },
      };

      vi.mocked(apiClient.post).mockResolvedValue(mockResponse);

      await expect(gitService.initRepository('workflow-1')).rejects.toThrow(
        'Failed to initialize'
      );
    });
  });

  describe('connectRepository', () => {
    it('should connect to a repository successfully', async () => {
      const mockResponse = {
        success: true,
        data: {
          workflowId: 'workflow-1',
          repositoryUrl: 'https://github.com/user/repo.git',
          branch: 'main',
          connected: true,
          unpushedCommits: 0,
        },
      };

      vi.mocked(apiClient.post).mockResolvedValue(mockResponse);

      const config = {
        repositoryUrl: 'https://github.com/user/repo.git',
        branch: 'main',
        credentials: {
          type: 'personal_access_token' as const,
          token: 'test-token',
          provider: 'github' as const,
        },
      };

      const result = await gitService.connectRepository('workflow-1', config);

      expect(apiClient.post).toHaveBeenCalledWith('/git/connect', {
        workflowId: 'workflow-1',
        repositoryUrl: config.repositoryUrl,
        branch: config.branch,
        credentials: config.credentials,
      });
      expect(result.connected).toBe(true);
      expect(result.repositoryUrl).toBe(config.repositoryUrl);
    });
  });

  describe('getStatus', () => {
    it('should fetch Git status successfully', async () => {
      const mockResponse = {
        success: true,
        data: {
          workflowId: 'workflow-1',
          branch: 'main',
          modified: true,
          staged: false,
          unpushedCommits: 2,
          ahead: 2,
          behind: 0,
          changes: [
            { path: 'workflow.json', type: 'modified', staged: false },
          ],
        },
      };

      vi.mocked(apiClient.get).mockResolvedValue(mockResponse);

      const result = await gitService.getStatus('workflow-1');

      expect(apiClient.get).toHaveBeenCalledWith('/git/status/workflow-1');
      expect(result.modified).toBe(true);
      expect(result.unpushedCommits).toBe(2);
      expect(result.changes).toHaveLength(1);
    });
  });

  describe('commit', () => {
    it('should create a commit successfully', async () => {
      const mockResponse = {
        success: true,
        data: {
          hash: 'abc123',
          message: 'Test commit',
          author: 'Test User',
          timestamp: '2024-01-01T00:00:00Z',
          parents: [],
        },
      };

      vi.mocked(apiClient.post).mockResolvedValue(mockResponse);

      const workflow = {
        id: 'workflow-1',
        name: 'Test Workflow',
        tags: [],
        nodes: [],
        connections: [],
        triggers: [],
        settings: {},
      };

      const result = await gitService.commit('workflow-1', 'Test commit', workflow);

      expect(apiClient.post).toHaveBeenCalledWith('/git/commit', {
        workflowId: 'workflow-1',
        message: 'Test commit',
        workflow,
      });
      expect(result.hash).toBe('abc123');
      expect(result.message).toBe('Test commit');
      expect(result.timestamp).toBeInstanceOf(Date);
    });
  });

  describe('push', () => {
    it('should push commits successfully', async () => {
      const mockResponse = {
        success: true,
        data: {
          success: true,
          pushed: 2,
        },
      };

      vi.mocked(apiClient.post).mockResolvedValue(mockResponse);

      const result = await gitService.push('workflow-1');

      expect(apiClient.post).toHaveBeenCalledWith('/git/push', {
        workflowId: 'workflow-1',
      });
      expect(result.success).toBe(true);
      expect(result.pushed).toBe(2);
    });

    it('should handle push with options', async () => {
      const mockResponse = {
        success: true,
        data: {
          success: true,
          pushed: 1,
        },
      };

      vi.mocked(apiClient.post).mockResolvedValue(mockResponse);

      await gitService.push('workflow-1', { force: true, branch: 'develop' });

      expect(apiClient.post).toHaveBeenCalledWith('/git/push', {
        workflowId: 'workflow-1',
        force: true,
        branch: 'develop',
      });
    });
  });

  describe('listBranches', () => {
    it('should list branches successfully', async () => {
      const mockResponse = {
        success: true,
        data: [
          {
            name: 'main',
            current: true,
            remote: false,
            lastCommit: {
              hash: 'abc123',
              message: 'Latest commit',
              author: 'Test User',
              timestamp: '2024-01-01T00:00:00Z',
              parents: [],
            },
          },
          {
            name: 'develop',
            current: false,
            remote: false,
          },
        ],
      };

      vi.mocked(apiClient.get).mockResolvedValue(mockResponse);

      const result = await gitService.listBranches('workflow-1');

      expect(apiClient.get).toHaveBeenCalledWith('/git/branches/workflow-1');
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('main');
      expect(result[0].current).toBe(true);
      expect(result[0].lastCommit?.timestamp).toBeInstanceOf(Date);
    });
  });

  describe('getCommitHistory', () => {
    it('should fetch commit history successfully', async () => {
      const mockResponse = {
        success: true,
        data: [
          {
            hash: 'abc123',
            message: 'Commit 1',
            author: 'Test User',
            timestamp: '2024-01-01T00:00:00Z',
            parents: [],
          },
          {
            hash: 'def456',
            message: 'Commit 2',
            author: 'Test User',
            timestamp: '2024-01-02T00:00:00Z',
            parents: ['abc123'],
          },
        ],
      };

      vi.mocked(apiClient.get).mockResolvedValue(mockResponse);

      const result = await gitService.getCommitHistory('workflow-1', {
        limit: 10,
        offset: 0,
      });

      expect(apiClient.get).toHaveBeenCalledWith('/git/history/workflow-1', {
        params: { limit: 10, offset: 0 },
      });
      expect(result).toHaveLength(2);
      expect(result[0].timestamp).toBeInstanceOf(Date);
      expect(result[1].timestamp).toBeInstanceOf(Date);
    });
  });
});
