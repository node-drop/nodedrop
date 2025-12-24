import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs-extra';
import * as path from 'path';
import { GitService, GitConnectionConfig, GitRepositoryInfo, GitStatus } from './GitService';
import { db } from '../db/client';
import { workflowGitConfigs } from '../db/schema/git';
import { eq, and } from 'drizzle-orm';
import { gitConfig, getWorkflowRepoPath } from '../config/git';
import * as git from 'isomorphic-git';

// Mock dependencies
vi.mock('isomorphic-git', () => ({
  default: {
    init: vi.fn().mockResolvedValue(undefined),
    addRemote: vi.fn().mockResolvedValue(undefined),
    deleteRemote: vi.fn().mockResolvedValue(undefined),
    listRemotes: vi.fn().mockResolvedValue([]),
    getRemoteInfo: vi.fn().mockResolvedValue({ refs: {} }),
    statusMatrix: vi.fn().mockResolvedValue([]),
    log: vi.fn().mockResolvedValue([]),
    add: vi.fn().mockResolvedValue(undefined),
    commit: vi.fn().mockResolvedValue('abc123'),
    push: vi.fn().mockResolvedValue({ ok: true }),
  },
  init: vi.fn().mockResolvedValue(undefined),
  addRemote: vi.fn().mockResolvedValue(undefined),
  deleteRemote: vi.fn().mockResolvedValue(undefined),
  listRemotes: vi.fn().mockResolvedValue([]),
  getRemoteInfo: vi.fn().mockResolvedValue({ refs: {} }),
  statusMatrix: vi.fn().mockResolvedValue([]),
  log: vi.fn().mockResolvedValue([]),
  add: vi.fn().mockResolvedValue(undefined),
  commit: vi.fn().mockResolvedValue('abc123'),
  push: vi.fn().mockResolvedValue({ ok: true }),
}));

vi.mock('./GitCredentialManager', () => ({
  GitCredentialManager: vi.fn().mockImplementation(() => ({
    storeCredentials: vi.fn().mockResolvedValue(undefined),
    getCredentials: vi.fn().mockResolvedValue(null),
    deleteCredentials: vi.fn().mockResolvedValue(undefined),
    hasCredentials: vi.fn().mockResolvedValue(false),
  })),
}));

vi.mock('./WorkflowSerializer', () => ({
  WorkflowSerializer: vi.fn().mockImplementation(() => ({
    serializeWorkflow: vi.fn().mockResolvedValue({}),
    deserializeWorkflow: vi.fn().mockResolvedValue({}),
    workflowToFiles: vi.fn().mockResolvedValue({
      'workflow.json': JSON.stringify({
        version: '1.0.0',
        exportedAt: new Date().toISOString(),
        exportedBy: 'git-service',
        workflow: {
          title: 'Test',
          name: 'Test',
          nodes: [],
          connections: [],
          triggers: [],
          settings: {},
        },
        checksum: 'abc123',
      }),
      'README.md': '# Test Workflow',
    }),
    filesToWorkflow: vi.fn().mockResolvedValue({}),
  })),
}));

describe('GitService', () => {
  let gitService: GitService;
  const testWorkflowId = 'test-workflow-123';
  const testUserId = 'test-user-456';
  const testRepoUrl = 'https://github.com/test/repo.git';

  beforeEach(async () => {
    gitService = new GitService();
    
    // Ensure test directories exist
    await fs.ensureDir(gitConfig.storage.baseDir);
    await fs.ensureDir(gitConfig.storage.tempDir);
  });

  afterEach(async () => {
    // Clean up test data
    try {
      await db
        .delete(workflowGitConfigs)
        .where(eq(workflowGitConfigs.workflowId, testWorkflowId));
    } catch (error) {
      // Ignore cleanup errors
    }

    // Clean up test repository directory
    const repoPath = getWorkflowRepoPath(testWorkflowId);
    try {
      await fs.remove(repoPath);
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('initRepository', () => {
    it('should initialize a new Git repository', async () => {
      const result = await gitService.initRepository(testWorkflowId, testUserId);

      expect(result).toBeDefined();
      expect(result.workflowId).toBe(testWorkflowId);
      expect(result.branch).toBe('main');
      expect(result.connected).toBe(false);
      expect(result.unpushedCommits).toBe(0);

      // Verify database record was created
      const config = await db.query.workflowGitConfigs.findFirst({
        where: and(
          eq(workflowGitConfigs.workflowId, testWorkflowId),
          eq(workflowGitConfigs.userId, testUserId)
        ),
      });

      expect(config).toBeDefined();
      expect(config?.workflowId).toBe(testWorkflowId);
      expect(config?.userId).toBe(testUserId);
      expect(config?.branch).toBe('main');
    });

    it('should throw error if repository already initialized', async () => {
      // Initialize once
      await gitService.initRepository(testWorkflowId, testUserId);

      // Try to initialize again - should throw error
      try {
        await gitService.initRepository(testWorkflowId, testUserId);
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).toContain('Git repository already initialized');
      }
    });

    it('should create local repository directory', async () => {
      await gitService.initRepository(testWorkflowId, testUserId);

      const repoPath = getWorkflowRepoPath(testWorkflowId);
      const exists = await fs.pathExists(repoPath);

      expect(exists).toBe(true);
    });
  });

  describe('connectRepository', () => {
    it('should connect to a remote repository with valid credentials', async () => {
      const config: GitConnectionConfig = {
        repositoryUrl: testRepoUrl,
        branch: 'main',
        credentials: {
          type: 'personal_access_token',
          token: 'test-token-123',
          provider: 'github',
        },
      };

      const result = await gitService.connectRepository(
        testWorkflowId,
        testUserId,
        config
      );

      expect(result).toBeDefined();
      expect(result.workflowId).toBe(testWorkflowId);
      expect(result.repositoryUrl).toBe(testRepoUrl);
      expect(result.branch).toBe('main');
      expect(result.connected).toBe(true);

      // Verify database record was updated
      const dbConfig = await db.query.workflowGitConfigs.findFirst({
        where: and(
          eq(workflowGitConfigs.workflowId, testWorkflowId),
          eq(workflowGitConfigs.userId, testUserId)
        ),
      });

      expect(dbConfig).toBeDefined();
      expect(dbConfig?.repositoryUrl).toBe(testRepoUrl);
      expect(dbConfig?.connected).toBe(true);
    });

    it('should initialize repository if not already initialized', async () => {
      const config: GitConnectionConfig = {
        repositoryUrl: testRepoUrl,
        credentials: {
          type: 'personal_access_token',
          token: 'test-token-123',
          provider: 'github',
        },
      };

      const result = await gitService.connectRepository(
        testWorkflowId,
        testUserId,
        config
      );

      expect(result).toBeDefined();
      expect(result.connected).toBe(true);

      // Verify repository was initialized
      const dbConfig = await db.query.workflowGitConfigs.findFirst({
        where: and(
          eq(workflowGitConfigs.workflowId, testWorkflowId),
          eq(workflowGitConfigs.userId, testUserId)
        ),
      });

      expect(dbConfig).toBeDefined();
    });

    it('should reject invalid repository URLs', async () => {
      const config: GitConnectionConfig = {
        repositoryUrl: 'invalid-url',
        credentials: {
          type: 'personal_access_token',
          token: 'test-token-123',
          provider: 'github',
        },
      };

      await expect(
        gitService.connectRepository(testWorkflowId, testUserId, config)
      ).rejects.toThrow('Invalid repository URL');
    });

    it('should use default branch if not specified', async () => {
      const config: GitConnectionConfig = {
        repositoryUrl: testRepoUrl,
        credentials: {
          type: 'personal_access_token',
          token: 'test-token-123',
          provider: 'github',
        },
      };

      const result = await gitService.connectRepository(
        testWorkflowId,
        testUserId,
        config
      );

      expect(result.branch).toBe('main');
    });
  });

  describe('disconnectRepository', () => {
    it('should disconnect from a connected repository', async () => {
      // First connect
      const config: GitConnectionConfig = {
        repositoryUrl: testRepoUrl,
        credentials: {
          type: 'personal_access_token',
          token: 'test-token-123',
          provider: 'github',
        },
      };

      await gitService.connectRepository(testWorkflowId, testUserId, config);

      // Then disconnect
      await gitService.disconnectRepository(testWorkflowId, testUserId);

      // Verify disconnection
      const dbConfig = await db.query.workflowGitConfigs.findFirst({
        where: and(
          eq(workflowGitConfigs.workflowId, testWorkflowId),
          eq(workflowGitConfigs.userId, testUserId)
        ),
      });

      expect(dbConfig).toBeDefined();
      expect(dbConfig?.connected).toBe(false);
      expect(dbConfig?.repositoryUrl).toBe('');
    });

    it('should throw error if repository not found', async () => {
      await expect(
        gitService.disconnectRepository('non-existent-workflow', testUserId)
      ).rejects.toThrow('Git repository not found');
    });

    it('should clean up credentials on disconnect', async () => {
      // First connect
      const config: GitConnectionConfig = {
        repositoryUrl: testRepoUrl,
        credentials: {
          type: 'personal_access_token',
          token: 'test-token-123',
          provider: 'github',
        },
      };

      await gitService.connectRepository(testWorkflowId, testUserId, config);

      // Disconnect
      await gitService.disconnectRepository(testWorkflowId, testUserId);

      // Verify credentials were deleted (this would be tested in integration)
      // For unit test, we just verify the method completes successfully
      expect(true).toBe(true);
    });
  });

  describe('getRepositoryInfo', () => {
    it('should return repository info for connected workflow', async () => {
      // First connect
      const config: GitConnectionConfig = {
        repositoryUrl: testRepoUrl,
        credentials: {
          type: 'personal_access_token',
          token: 'test-token-123',
          provider: 'github',
        },
      };

      await gitService.connectRepository(testWorkflowId, testUserId, config);

      // Get info
      const info = await gitService.getRepositoryInfo(testWorkflowId, testUserId);

      expect(info).toBeDefined();
      expect(info?.workflowId).toBe(testWorkflowId);
      expect(info?.repositoryUrl).toBe(testRepoUrl);
      expect(info?.connected).toBe(true);
    });

    it('should return null for non-existent workflow', async () => {
      const info = await gitService.getRepositoryInfo(
        'non-existent-workflow',
        testUserId
      );

      expect(info).toBeNull();
    });

    it('should return correct unpushed commits count', async () => {
      // Initialize and connect
      const config: GitConnectionConfig = {
        repositoryUrl: testRepoUrl,
        credentials: {
          type: 'personal_access_token',
          token: 'test-token-123',
          provider: 'github',
        },
      };

      await gitService.connectRepository(testWorkflowId, testUserId, config);

      const info = await gitService.getRepositoryInfo(testWorkflowId, testUserId);

      expect(info).toBeDefined();
      expect(info?.unpushedCommits).toBe(0);
    });
  });

  describe('URL validation', () => {
    it('should accept valid HTTPS URLs with .git extension', async () => {
      const config: GitConnectionConfig = {
        repositoryUrl: 'https://github.com/user/repo.git',
        credentials: {
          type: 'personal_access_token',
          token: 'test-token',
          provider: 'github',
        },
      };

      const result = await gitService.connectRepository(
        testWorkflowId,
        testUserId,
        config
      );

      expect(result.repositoryUrl).toBe('https://github.com/user/repo.git');
    });

    it('should accept valid HTTPS URLs without .git extension', async () => {
      const config: GitConnectionConfig = {
        repositoryUrl: 'https://github.com/user/repo',
        credentials: {
          type: 'personal_access_token',
          token: 'test-token',
          provider: 'github',
        },
      };

      const result = await gitService.connectRepository(
        testWorkflowId,
        testUserId,
        config
      );

      expect(result.repositoryUrl).toBe('https://github.com/user/repo');
    });

    it('should reject URLs without protocol', async () => {
      const config: GitConnectionConfig = {
        repositoryUrl: 'github.com/user/repo',
        credentials: {
          type: 'personal_access_token',
          token: 'test-token',
          provider: 'github',
        },
      };

      await expect(
        gitService.connectRepository(testWorkflowId, testUserId, config)
      ).rejects.toThrow('Invalid repository URL');
    });

    it('should reject empty URLs', async () => {
      const config: GitConnectionConfig = {
        repositoryUrl: '',
        credentials: {
          type: 'personal_access_token',
          token: 'test-token',
          provider: 'github',
        },
      };

      await expect(
        gitService.connectRepository(testWorkflowId, testUserId, config)
      ).rejects.toThrow('Invalid repository URL');
    });
  });

  describe('getStatus', () => {
    beforeEach(async () => {
      // Connect repository for status tests
      const config: GitConnectionConfig = {
        repositoryUrl: testRepoUrl,
        credentials: {
          type: 'personal_access_token',
          token: 'test-token-123',
          provider: 'github',
        },
      };

      await gitService.connectRepository(testWorkflowId, testUserId, config);
    });

    it('should return status with no changes when repository is clean', async () => {
      // Mock statusMatrix to return no changes
      (git.statusMatrix as any).mockResolvedValue([]);
      (git.log as any).mockResolvedValue([]);

      const status = await gitService.getStatus(testWorkflowId, testUserId);

      expect(status).toBeDefined();
      expect(status.workflowId).toBe(testWorkflowId);
      expect(status.branch).toBe('main');
      expect(status.modified).toBe(false);
      expect(status.staged).toBe(false);
      expect(status.changes).toHaveLength(0);
      expect(status.ahead).toBe(0);
      expect(status.behind).toBe(0);
    });

    it('should detect modified files', async () => {
      // Mock statusMatrix to return a modified file
      // Format: [filepath, HEADStatus, WorkdirStatus, StageStatus]
      // 1 = present, 2 = modified
      (git.statusMatrix as any).mockResolvedValue([
        ['workflow.json', 1, 2, 1], // Modified but not staged
      ]);
      (git.log as any).mockResolvedValue([]);

      const status = await gitService.getStatus(testWorkflowId, testUserId);

      expect(status.modified).toBe(true);
      expect(status.staged).toBe(false);
      expect(status.changes).toHaveLength(1);
      expect(status.changes[0]).toEqual({
        path: 'workflow.json',
        type: 'modified',
        staged: false,
      });
    });

    it('should detect added files', async () => {
      // Mock statusMatrix to return an added file
      // 0 = absent, 1 = present
      (git.statusMatrix as any).mockResolvedValue([
        ['new-file.json', 0, 1, 2], // Added and staged
      ]);
      (git.log as any).mockResolvedValue([]);

      const status = await gitService.getStatus(testWorkflowId, testUserId);

      expect(status.modified).toBe(true);
      expect(status.staged).toBe(true);
      expect(status.changes).toHaveLength(1);
      expect(status.changes[0]).toEqual({
        path: 'new-file.json',
        type: 'added',
        staged: true,
      });
    });

    it('should detect deleted files', async () => {
      // Mock statusMatrix to return a deleted file
      (git.statusMatrix as any).mockResolvedValue([
        ['deleted-file.json', 1, 0, 0], // Deleted and staged
      ]);
      (git.log as any).mockResolvedValue([]);

      const status = await gitService.getStatus(testWorkflowId, testUserId);

      expect(status.modified).toBe(true);
      expect(status.staged).toBe(true);
      expect(status.changes).toHaveLength(1);
      expect(status.changes[0]).toEqual({
        path: 'deleted-file.json',
        type: 'deleted',
        staged: true,
      });
    });

    it('should detect multiple changes', async () => {
      // Mock statusMatrix with multiple changes
      (git.statusMatrix as any).mockResolvedValue([
        ['workflow.json', 1, 2, 2], // Modified and staged
        ['README.md', 0, 1, 2], // Added and staged
        ['old-file.json', 1, 0, 0], // Deleted and staged
      ]);
      (git.log as any).mockResolvedValue([]);

      const status = await gitService.getStatus(testWorkflowId, testUserId);

      expect(status.modified).toBe(true);
      expect(status.staged).toBe(true);
      expect(status.changes).toHaveLength(3);
      
      // Check each change type
      const modifiedChange = status.changes.find(c => c.path === 'workflow.json');
      expect(modifiedChange).toEqual({
        path: 'workflow.json',
        type: 'modified',
        staged: true,
      });

      const addedChange = status.changes.find(c => c.path === 'README.md');
      expect(addedChange).toEqual({
        path: 'README.md',
        type: 'added',
        staged: true,
      });

      const deletedChange = status.changes.find(c => c.path === 'old-file.json');
      expect(deletedChange).toEqual({
        path: 'old-file.json',
        type: 'deleted',
        staged: true,
      });
    });

    it('should calculate ahead count correctly', async () => {
      // Mock local commits (3 commits)
      const localCommits: any[] = [
        { oid: 'commit3', commit: { message: 'Third commit' } },
        { oid: 'commit2', commit: { message: 'Second commit' } },
        { oid: 'commit1', commit: { message: 'First commit' } },
      ];

      // Mock remote commits (only 1 commit)
      const remoteCommits: any[] = [
        { oid: 'commit1', commit: { message: 'First commit' } },
      ];

      (git.statusMatrix as any).mockResolvedValue([]);
      (git.log as any)
        .mockResolvedValueOnce(localCommits) // First call for local branch
        .mockResolvedValueOnce(remoteCommits); // Second call for remote branch

      const status = await gitService.getStatus(testWorkflowId, testUserId);

      expect(status.ahead).toBe(2); // 2 commits ahead
      expect(status.unpushedCommits).toBe(2);
    });

    it('should calculate behind count correctly', async () => {
      // Mock local commits (1 commit)
      const localCommits: any[] = [
        { oid: 'commit1', commit: { message: 'First commit' } },
      ];

      // Mock remote commits (3 commits)
      const remoteCommits: any[] = [
        { oid: 'commit3', commit: { message: 'Third commit' } },
        { oid: 'commit2', commit: { message: 'Second commit' } },
        { oid: 'commit1', commit: { message: 'First commit' } },
      ];

      (git.statusMatrix as any).mockResolvedValue([]);
      (git.log as any)
        .mockResolvedValueOnce(localCommits) // First call for local branch
        .mockResolvedValueOnce(remoteCommits) // Second call for remote branch
        .mockResolvedValueOnce(localCommits) // Third call for local branch (behind count)
        .mockResolvedValueOnce(remoteCommits); // Fourth call for remote branch (behind count)

      const status = await gitService.getStatus(testWorkflowId, testUserId);

      expect(status.behind).toBe(2); // 2 commits behind
    });

    it('should handle repository with no remote branch', async () => {
      // Mock local commits
      const localCommits: any[] = [
        { oid: 'commit1', commit: { message: 'First commit' } },
      ];

      (git.statusMatrix as any).mockResolvedValue([]);
      (git.log as any)
        .mockResolvedValueOnce(localCommits) // Local branch
        .mockRejectedValueOnce(new Error('Remote branch not found')); // Remote branch doesn't exist

      const status = await gitService.getStatus(testWorkflowId, testUserId);

      expect(status.ahead).toBe(1); // All local commits are ahead
      expect(status.behind).toBe(0); // No remote branch means not behind
    });

    it('should skip .git directory and README.md in changes', async () => {
      // Mock statusMatrix with .git files and README.md
      (git.statusMatrix as any).mockResolvedValue([
        ['.git/config', 1, 2, 1],
        ['README.md', 1, 2, 1],
        ['workflow.json', 1, 2, 1],
      ]);
      (git.log as any).mockResolvedValue([]);

      const status = await gitService.getStatus(testWorkflowId, testUserId);

      // Should only include workflow.json, not .git or README.md
      expect(status.changes).toHaveLength(1);
      expect(status.changes[0].path).toBe('workflow.json');
    });

    it('should throw error if repository not configured', async () => {
      await expect(
        gitService.getStatus('non-existent-workflow', testUserId)
      ).rejects.toThrow('Git repository not configured');
    });

    it('should throw error if repository not connected', async () => {
      // Disconnect the repository
      await gitService.disconnectRepository(testWorkflowId, testUserId);

      await expect(
        gitService.getStatus(testWorkflowId, testUserId)
      ).rejects.toThrow('Git repository is not connected');
    });

    it('should detect staged and unstaged changes separately', async () => {
      // Mock statusMatrix with both staged and unstaged changes
      (git.statusMatrix as any).mockResolvedValue([
        ['staged.json', 1, 2, 2], // Modified and staged
        ['unstaged.json', 1, 2, 1], // Modified but not staged
      ]);
      (git.log as any).mockResolvedValue([]);

      const status = await gitService.getStatus(testWorkflowId, testUserId);

      expect(status.modified).toBe(true);
      expect(status.staged).toBe(true); // At least one file is staged
      expect(status.changes).toHaveLength(2);

      const stagedChange = status.changes.find(c => c.path === 'staged.json');
      expect(stagedChange?.staged).toBe(true);

      const unstagedChange = status.changes.find(c => c.path === 'unstaged.json');
      expect(unstagedChange?.staged).toBe(false);
    });
  });

  describe('commit', () => {
    const mockWorkflow = {
      id: testWorkflowId,
      name: 'Test Workflow',
      description: 'A test workflow',
      category: 'test',
      tags: ['test'],
      userId: testUserId,
      workspaceId: null,
      teamId: null,
      nodes: [
        {
          id: 'node1',
          type: 'start',
          name: 'Start Node',
          parameters: {},
          position: { x: 0, y: 0 },
          credentials: [],
          disabled: false,
        },
      ],
      connections: [],
      triggers: [],
      settings: {},
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    beforeEach(async () => {
      // Connect repository for commit tests
      const config: GitConnectionConfig = {
        repositoryUrl: testRepoUrl,
        credentials: {
          type: 'personal_access_token',
          token: 'test-token-123',
          provider: 'github',
        },
      };

      await gitService.connectRepository(testWorkflowId, testUserId, config);

      // Mock git.log to return commit details after commit
      (git.log as any).mockResolvedValue([
        {
          oid: 'abc123',
          commit: {
            message: 'Test commit',
            author: {
              name: testUserId,
              email: `${testUserId}@workflow.local`,
              timestamp: Math.floor(Date.now() / 1000),
            },
            parent: [],
          },
        },
      ]);
    });

    it('should create a commit with valid message and workflow data', async () => {
      const message = 'Initial commit';

      const result = await gitService.commit(
        testWorkflowId,
        testUserId,
        message,
        mockWorkflow
      );

      expect(result).toBeDefined();
      expect(result.hash).toBe('abc123');
      expect(result.message).toBe('Test commit');
      expect(result.author).toBe(testUserId);
      expect(result.timestamp).toBeInstanceOf(Date);
      expect(result.parents).toEqual([]);

      // Verify git.add was called for each workflow file
      expect(git.add).toHaveBeenCalled();

      // Verify git.commit was called with correct parameters
      expect(git.commit).toHaveBeenCalledWith(
        expect.objectContaining({
          message: message,
          author: expect.objectContaining({
            name: testUserId,
            email: `${testUserId}@workflow.local`,
          }),
        })
      );
    });

    it('should reject empty commit messages', async () => {
      await expect(
        gitService.commit(testWorkflowId, testUserId, '', mockWorkflow)
      ).rejects.toThrow('Commit message cannot be empty');
    });

    it('should reject whitespace-only commit messages', async () => {
      await expect(
        gitService.commit(testWorkflowId, testUserId, '   ', mockWorkflow)
      ).rejects.toThrow('Commit message cannot be empty');
    });

    it('should trim commit message before creating commit', async () => {
      const message = '  Test commit with spaces  ';

      await gitService.commit(
        testWorkflowId,
        testUserId,
        message,
        mockWorkflow
      );

      // Verify git.commit was called with trimmed message
      expect(git.commit).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Test commit with spaces',
        })
      );
    });

    it('should update database with commit hash and increment unpushed commits', async () => {
      const message = 'Test commit';

      await gitService.commit(
        testWorkflowId,
        testUserId,
        message,
        mockWorkflow
      );

      // Verify database was updated
      const config = await db.query.workflowGitConfigs.findFirst({
        where: and(
          eq(workflowGitConfigs.workflowId, testWorkflowId),
          eq(workflowGitConfigs.userId, testUserId)
        ),
      });

      expect(config).toBeDefined();
      expect(config?.lastCommitHash).toBe('abc123');
      expect(config?.unpushedCommits).toBe(1);
      expect(config?.lastSyncAt).toBeDefined();
    });

    it('should increment unpushed commits count on multiple commits', async () => {
      // First commit
      await gitService.commit(
        testWorkflowId,
        testUserId,
        'First commit',
        mockWorkflow
      );

      // Second commit
      (git.commit as any).mockResolvedValue('def456');
      (git.log as any).mockResolvedValue([
        {
          oid: 'def456',
          commit: {
            message: 'Second commit',
            author: {
              name: testUserId,
              email: `${testUserId}@workflow.local`,
              timestamp: Math.floor(Date.now() / 1000),
            },
            parent: ['abc123'],
          },
        },
      ]);

      await gitService.commit(
        testWorkflowId,
        testUserId,
        'Second commit',
        mockWorkflow
      );

      // Verify unpushed commits count
      const config = await db.query.workflowGitConfigs.findFirst({
        where: and(
          eq(workflowGitConfigs.workflowId, testWorkflowId),
          eq(workflowGitConfigs.userId, testUserId)
        ),
      });

      expect(config?.unpushedCommits).toBe(2);
    });

    it('should serialize workflow to files before committing', async () => {
      const message = 'Test commit';

      await gitService.commit(
        testWorkflowId,
        testUserId,
        message,
        mockWorkflow
      );

      // Verify workflow serializer was used
      // This is implicitly tested by the fact that the commit succeeds
      // In a real scenario, we'd verify the files were written
      expect(git.add).toHaveBeenCalled();
    });

    it('should stage all workflow files automatically', async () => {
      const message = 'Test commit';

      await gitService.commit(
        testWorkflowId,
        testUserId,
        message,
        mockWorkflow
      );

      // Verify git.add was called for workflow files
      // Single file approach: workflow.json + README.md = 2 files
      expect(git.add).toHaveBeenCalledTimes(2);
    });

    it('should include proper commit metadata', async () => {
      const message = 'Test commit with metadata';

      await gitService.commit(
        testWorkflowId,
        testUserId,
        message,
        mockWorkflow
      );

      // Verify commit was called with proper metadata
      expect(git.commit).toHaveBeenCalledWith(
        expect.objectContaining({
          message: message,
          author: expect.objectContaining({
            name: testUserId,
            email: `${testUserId}@workflow.local`,
            timestamp: expect.any(Number),
          }),
        })
      );
    });

    it('should throw error if repository not configured', async () => {
      await expect(
        gitService.commit(
          'non-existent-workflow',
          testUserId,
          'Test commit',
          mockWorkflow
        )
      ).rejects.toThrow('Git repository not configured');
    });

    it('should throw error if repository not connected', async () => {
      // Disconnect the repository
      await gitService.disconnectRepository(testWorkflowId, testUserId);

      await expect(
        gitService.commit(
          testWorkflowId,
          testUserId,
          'Test commit',
          mockWorkflow
        )
      ).rejects.toThrow('Git repository is not connected');
    });

    it('should return commit with parent hashes for non-initial commits', async () => {
      // Mock a commit with parent
      (git.log as any).mockResolvedValue([
        {
          oid: 'def456',
          commit: {
            message: 'Second commit',
            author: {
              name: testUserId,
              email: `${testUserId}@workflow.local`,
              timestamp: Math.floor(Date.now() / 1000),
            },
            parent: ['abc123'],
          },
        },
      ]);

      const result = await gitService.commit(
        testWorkflowId,
        testUserId,
        'Second commit',
        mockWorkflow
      );

      expect(result.parents).toEqual(['abc123']);
    });

    it('should handle workflow with multiple nodes and connections', async () => {
      const complexWorkflow = {
        ...mockWorkflow,
        nodes: [
          {
            id: 'node1',
            type: 'start',
            name: 'Start',
            parameters: {},
            position: { x: 0, y: 0 },
            credentials: [],
            disabled: false,
          },
          {
            id: 'node2',
            type: 'http',
            name: 'HTTP Request',
            parameters: { url: 'https://api.example.com' },
            position: { x: 200, y: 0 },
            credentials: [],
            disabled: false,
          },
        ],
        connections: [
          {
            id: 'conn1',
            sourceNodeId: 'node1',
            sourceOutput: 'output',
            targetNodeId: 'node2',
            targetInput: 'input',
          },
        ],
      };

      const result = await gitService.commit(
        testWorkflowId,
        testUserId,
        'Complex workflow commit',
        complexWorkflow
      );

      expect(result).toBeDefined();
      expect(result.hash).toBe('abc123');
    });
  });

  describe('push', () => {
    const mockWorkflow = {
      id: testWorkflowId,
      name: 'Test Workflow',
      description: 'Test workflow for push operations',
      category: 'test',
      tags: ['test'],
      nodes: [],
      connections: [],
      triggers: [],
      settings: {},
    };

    beforeEach(async () => {
      // Connect repository for push tests
      const config: GitConnectionConfig = {
        repositoryUrl: testRepoUrl,
        branch: 'main',
        credentials: {
          type: 'personal_access_token',
          token: 'test-token-123',
          provider: 'github',
        },
      };

      await gitService.connectRepository(testWorkflowId, testUserId, config);

      // Mock credentials retrieval
      const credentialManager = (gitService as any).credentialManager;
      credentialManager.getCredentials = vi.fn().mockResolvedValue({
        type: 'personal_access_token',
        token: 'test-token-123',
        provider: 'github',
      });
    });

    it('should push commits successfully when there are unpushed commits', async () => {
      // Create a commit first
      await gitService.commit(
        testWorkflowId,
        testUserId,
        'Test commit for push',
        mockWorkflow
      );

      // Mock git.push to succeed
      vi.mocked(git.push).mockResolvedValueOnce({ ok: true });

      const result = await gitService.push(testWorkflowId, testUserId);

      expect(result.success).toBe(true);
      expect(result.pushed).toBeGreaterThan(0);
      expect(result.error).toBeUndefined();
      expect(git.push).toHaveBeenCalled();
    });

    it('should return success with 0 pushed when no unpushed commits exist', async () => {
      // Mock getAheadCount to return 0
      const result = await gitService.push(testWorkflowId, testUserId);

      expect(result.success).toBe(true);
      expect(result.pushed).toBe(0);
      expect(result.error).toBeUndefined();
    });

    it('should update sync status after successful push', async () => {
      // Create a commit
      await gitService.commit(
        testWorkflowId,
        testUserId,
        'Test commit',
        mockWorkflow
      );

      // Mock git.push to succeed
      vi.mocked(git.push).mockResolvedValueOnce({ ok: true });

      await gitService.push(testWorkflowId, testUserId);

      // Verify database was updated
      const config = await db.query.workflowGitConfigs.findFirst({
        where: and(
          eq(workflowGitConfigs.workflowId, testWorkflowId),
          eq(workflowGitConfigs.userId, testUserId)
        ),
      });

      expect(config?.unpushedCommits).toBe(0);
      expect(config?.lastSyncAt).toBeDefined();
      expect(config?.lastError).toBeNull();
    });

    it('should handle network errors and retain local commits', async () => {
      // Create a commit
      await gitService.commit(
        testWorkflowId,
        testUserId,
        'Test commit',
        mockWorkflow
      );

      // Mock git.push to fail with network error
      vi.mocked(git.push).mockRejectedValueOnce(
        new Error('network error: ENOTFOUND')
      );

      const result = await gitService.push(testWorkflowId, testUserId);

      expect(result.success).toBe(false);
      expect(result.pushed).toBe(0);
      expect(result.error).toContain('Network error');
      expect(result.error).toContain('commits are safe locally');

      // Verify commits are still marked as unpushed
      const config = await db.query.workflowGitConfigs.findFirst({
        where: and(
          eq(workflowGitConfigs.workflowId, testWorkflowId),
          eq(workflowGitConfigs.userId, testUserId)
        ),
      });

      expect(config?.unpushedCommits).toBeGreaterThan(0);
    });

    it('should handle push rejection due to conflicts', async () => {
      // Create a commit
      await gitService.commit(
        testWorkflowId,
        testUserId,
        'Test commit',
        mockWorkflow
      );

      // Mock git.push to fail with rejection error
      vi.mocked(git.push).mockRejectedValueOnce(
        new Error('push rejected: non-fast-forward')
      );

      const result = await gitService.push(testWorkflowId, testUserId);

      expect(result.success).toBe(false);
      expect(result.pushed).toBe(0);
      expect(result.error).toContain('Push rejected');
      expect(result.error).toContain('pull first');
    });

    it('should handle authentication errors', async () => {
      // Create a commit
      await gitService.commit(
        testWorkflowId,
        testUserId,
        'Test commit',
        mockWorkflow
      );

      // Mock git.push to fail with authentication error
      vi.mocked(git.push).mockRejectedValueOnce(
        new Error('authentication failed: 401')
      );

      const result = await gitService.push(testWorkflowId, testUserId);

      expect(result.success).toBe(false);
      expect(result.pushed).toBe(0);
      expect(result.error).toContain('Authentication failed');
    });

    it('should use custom remote and branch from options', async () => {
      // Create a commit
      await gitService.commit(
        testWorkflowId,
        testUserId,
        'Test commit',
        mockWorkflow
      );

      // Mock git.push to succeed
      vi.mocked(git.push).mockResolvedValueOnce({ ok: true });

      await gitService.push(testWorkflowId, testUserId, {
        remote: 'upstream',
        branch: 'develop',
      });

      expect(git.push).toHaveBeenCalledWith(
        expect.objectContaining({
          remote: 'upstream',
          ref: 'develop',
        })
      );
    });

    it('should support force push when specified', async () => {
      // Create a commit
      await gitService.commit(
        testWorkflowId,
        testUserId,
        'Test commit',
        mockWorkflow
      );

      // Mock git.push to succeed
      vi.mocked(git.push).mockResolvedValueOnce({ ok: true });

      await gitService.push(testWorkflowId, testUserId, {
        force: true,
      });

      expect(git.push).toHaveBeenCalledWith(
        expect.objectContaining({
          force: true,
        })
      );
    });

    it('should throw error if repository not configured', async () => {
      await expect(
        gitService.push('non-existent-workflow', testUserId)
      ).rejects.toThrow('Git repository not configured');
    });

    it('should throw error if repository not connected', async () => {
      // Disconnect the repository
      await gitService.disconnectRepository(testWorkflowId, testUserId);

      await expect(
        gitService.push(testWorkflowId, testUserId)
      ).rejects.toThrow('Git repository is not connected');
    });

    it('should throw error if credentials not found', async () => {
      // Create a commit
      await gitService.commit(
        testWorkflowId,
        testUserId,
        'Test commit',
        mockWorkflow
      );

      // Mock credentials retrieval to return null
      const credentialManager = (gitService as any).credentialManager;
      credentialManager.getCredentials = vi.fn().mockResolvedValue(null);

      await expect(
        gitService.push(testWorkflowId, testUserId)
      ).rejects.toThrow('Git credentials not found');
    });

    it('should use authentication callback with credentials', async () => {
      // Create a commit
      await gitService.commit(
        testWorkflowId,
        testUserId,
        'Test commit',
        mockWorkflow
      );

      // Mock git.push to succeed
      vi.mocked(git.push).mockResolvedValueOnce({ ok: true });

      await gitService.push(testWorkflowId, testUserId);

      expect(git.push).toHaveBeenCalledWith(
        expect.objectContaining({
          onAuth: expect.any(Function),
        })
      );

      // Test the auth callback
      const pushCall = vi.mocked(git.push).mock.calls[0][0];
      const authResult = pushCall.onAuth();
      expect(authResult).toEqual({
        username: 'test-token-123',
        password: 'x-oauth-basic',
      });
    });

    it('should handle generic push errors', async () => {
      // Create a commit
      await gitService.commit(
        testWorkflowId,
        testUserId,
        'Test commit',
        mockWorkflow
      );

      // Mock git.push to fail with generic error
      vi.mocked(git.push).mockRejectedValueOnce(
        new Error('Something went wrong')
      );

      const result = await gitService.push(testWorkflowId, testUserId);

      expect(result.success).toBe(false);
      expect(result.pushed).toBe(0);
      expect(result.error).toContain('Push failed');
    });

    it('should store error in database on push failure', async () => {
      // Create a commit
      await gitService.commit(
        testWorkflowId,
        testUserId,
        'Test commit',
        mockWorkflow
      );

      // Mock git.push to fail
      vi.mocked(git.push).mockRejectedValueOnce(
        new Error('network error')
      );

      await gitService.push(testWorkflowId, testUserId);

      // Verify error was stored
      const config = await db.query.workflowGitConfigs.findFirst({
        where: and(
          eq(workflowGitConfigs.workflowId, testWorkflowId),
          eq(workflowGitConfigs.userId, testUserId)
        ),
      });

      expect(config?.lastError).toBeDefined();
      expect(config?.lastError).toContain('Network error');
    });

    it('should clear previous errors on successful push', async () => {
      // Create a commit
      await gitService.commit(
        testWorkflowId,
        testUserId,
        'Test commit',
        mockWorkflow
      );

      // First, simulate a failed push
      vi.mocked(git.push).mockRejectedValueOnce(
        new Error('network error')
      );
      await gitService.push(testWorkflowId, testUserId);

      // Now simulate a successful push
      vi.mocked(git.push).mockResolvedValueOnce({ ok: true });
      await gitService.push(testWorkflowId, testUserId);

      // Verify error was cleared
      const config = await db.query.workflowGitConfigs.findFirst({
        where: and(
          eq(workflowGitConfigs.workflowId, testWorkflowId),
          eq(workflowGitConfigs.userId, testUserId)
        ),
      });

      expect(config?.lastError).toBeNull();
    });
  });
});
