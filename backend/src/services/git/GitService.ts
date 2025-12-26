
import * as git from 'isomorphic-git';
import * as fs from 'fs-extra';
import * as path from 'path';
import { eq, and } from 'drizzle-orm';
import { db } from '../../db/client';
import { workflowGitConfigs } from '../../db/schema/git';
import { AppError } from '../../utils/errors';
import { getCredentialService } from '../CredentialService.factory';
import { logger } from '../../utils/logger';
import { getWorkflowRepoPath } from '../../config/git';
import { WorkflowSerializer, WorkflowData, WorkflowFiles } from '../WorkflowSerializer';

/**
 * Git connection configuration
 */
export interface GitConnectionConfig {
  repositoryUrl: string;
  branch?: string;
  credentialId: string; // Reference to unified credentials table
}

/**
 * Git credentials for authentication
 */
interface GitCredentials {
  type: 'personal_access_token' | 'oauth';
  token: string;
  provider: 'github' | 'gitlab' | 'bitbucket';
  refreshToken?: string;
  expiresAt?: Date;
}

/**
 * Git repository information
 */
export interface GitRepositoryInfo {
  workflowId: string;
  repositoryUrl: string;
  branch: string;
  connected: boolean;
  lastSyncAt?: Date;
  lastCommitHash?: string;
  unpushedCommits: number;
}

/**
 * Git status information
 */
export interface GitStatus {
  workflowId: string;
  branch: string;
  modified: boolean;
  staged: boolean;
  unpushedCommits: number;
  ahead: number;
  behind: number;
  changes: GitChange[];
}

/**
 * Git change information
 */
export interface GitChange {
  path: string;
  type: 'added' | 'modified' | 'deleted';
  staged: boolean;
}

/**
 * Git commit information
 */
export interface GitCommit {
  hash: string;
  message: string;
  author: string;
  timestamp: Date;
  parents: string[];
}

/**
 * Push operation options
 */
export interface PushOptions {
  force?: boolean;
  remote?: string;
  branch?: string;
}

/**
 * Push operation result
 */
export interface PushResult {
  success: boolean;
  pushed: number;
  error?: string;
}

/**
 * Pull operation options
 */
export interface PullOptions {
  remote?: string;
  branch?: string;
  strategy?: 'merge' | 'rebase';
}

/**
 * Pull operation result
 */
export interface PullResult {
  success: boolean;
  conflicts: boolean;
  conflictFiles?: string[];
  commits: GitCommit[];
  error?: string;
}

/**
 * Git branch information
 */
export interface GitBranch {
  name: string;
  current: boolean;
  remote: boolean;
  lastCommit?: GitCommit;
}

/**
 * History options for pagination
 */
export interface HistoryOptions {
  limit?: number;
  offset?: number;
}

/**
 * GitService
 * 
 * Manages Git operations for workflow version control including:
 * - Repository initialization and connection
 * - Commit, push, and pull operations
 * - Branch management
 * - Commit history
 * 
 * Uses unified credentials table for authentication.
 * 
 * Requirements: 1.1, 1.2, 1.3
 */
export class GitService {
  private workflowSerializer: WorkflowSerializer;

  constructor() {
    this.workflowSerializer = new WorkflowSerializer();
  }

  /**
   * Get credentials for a workflow from the unified credentials table
   * @private
   */
  private async getWorkflowCredentials(workflowId: string, userId: string) {
    // Get config with credential reference
    const config = await db.query.workflowGitConfigs.findFirst({
      where: eq(workflowGitConfigs.workflowId, workflowId),
    });

    if (!config || !config.credentialId) {
      throw new AppError('No credentials configured for this workflow', 401);
    }

    // Get credential from unified credentials table
    const credentialService = getCredentialService();
    const credential = await credentialService.getCredential(
      config.credentialId,
      userId
    );

    if (!credential) {
      throw new AppError('Git credentials not found. Please reconnect to the repository.', 401);
    }

    // Determine credential type and extract token
    const isPAT = credential.type.endsWith('PAT');
    const token = isPAT ? credential.data.token : credential.data.accessToken;
    
    // Map credential type to provider
    const providerMap: Record<string, string> = {
      'githubOAuth2': 'github',
      'githubPAT': 'github',
      'gitlabOAuth2': 'gitlab',
      'gitlabPAT': 'gitlab',
      'bitbucketOAuth2': 'bitbucket',
      'bitbucketPAT': 'bitbucket',
    };

    const provider = providerMap[credential.type] || 'github';

    return {
      type: isPAT ? ('personal_access_token' as const) : ('oauth' as const),
      token,
      provider: provider as 'github' | 'gitlab' | 'bitbucket',
      refreshToken: isPAT ? undefined : credential.data.refreshToken,
      expiresAt: credential.expiresAt || undefined,
    };
  }

  /**
   * Initialize a new Git repository for a workflow
   * Creates a local Git repository and sets up initial structure
   * 
   * @param workflowId - The workflow ID
   * @param userId - The user ID
   * @returns Promise<GitRepositoryInfo>
   * 
   * Requirement 1.1: Initialize Git repository connection
   */
  async initRepository(
    workflowId: string,
    userId: string
  ): Promise<GitRepositoryInfo> {
    try {
      logger.info(`Initializing Git repository for workflow ${workflowId}`);

      // Get the local repository path
      const repoPath = getWorkflowRepoPath(workflowId);

      // Check if repository already exists
      const existingConfig = await db.query.workflowGitConfigs.findFirst({
        where: and(
          eq(workflowGitConfigs.workflowId, workflowId),
          eq(workflowGitConfigs.userId, userId)
        ),
      });

      if (existingConfig) {
        throw new AppError(
          'Git repository already initialized for this workflow',
          400
        );
      }

      // Ensure the directory exists and is empty
      await fs.ensureDir(repoPath);
      const files = await fs.readdir(repoPath);
      if (files.length > 0) {
        // Clean up existing files
        await fs.emptyDir(repoPath);
      }

      // Initialize Git repository
      await git.init({
        fs,
        dir: repoPath,
        defaultBranch: 'main',
      });

      logger.info(`Git repository initialized at ${repoPath}`);

      // Create initial configuration in database
      const result = await db
        .insert(workflowGitConfigs)
        .values({
          workflowId,
          userId,
          repositoryUrl: '', // Will be set when connecting to remote
          branch: 'main',
          remoteName: 'origin',
          localPath: repoPath,
          connected: false,
          unpushedCommits: 0,
        })
        .returning();

      if (!result[0]) {
        throw new Error('Failed to create Git configuration');
      }

      logger.info(`Git configuration created for workflow ${workflowId}`);

      return {
        workflowId: result[0].workflowId,
        repositoryUrl: result[0].repositoryUrl,
        branch: result[0].branch,
        connected: result[0].connected || false,
        lastSyncAt: result[0].lastSyncAt || undefined,
        lastCommitHash: result[0].lastCommitHash || undefined,
        unpushedCommits: result[0].unpushedCommits || 0,
      };
    } catch (error) {
      logger.error('Failed to initialize Git repository:', {
        workflowId,
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError('Failed to initialize Git repository', 500);
    }
  }

  /**
   * Connect a workflow to a remote Git repository
   * Validates credentials and establishes connection
   * 
   * @param workflowId - The workflow ID
   * @param userId - The user ID
   * @param config - Git connection configuration
   * @returns Promise<GitRepositoryInfo>
   * 
   * Requirement 1.2: Establish connection with valid credentials
   */
  async connectRepository(
    workflowId: string,
    userId: string,
    config: GitConnectionConfig
  ): Promise<GitRepositoryInfo> {
    try {
      logger.info(`Connecting workflow ${workflowId} to Git repository`);

      // Validate repository URL
      if (!config.repositoryUrl || !this.isValidGitUrl(config.repositoryUrl)) {
        throw new AppError('Invalid repository URL', 400);
      }

      // Get or create local repository configuration
      let gitConfigRecord = await db.query.workflowGitConfigs.findFirst({
        where: and(
          eq(workflowGitConfigs.workflowId, workflowId),
          eq(workflowGitConfigs.userId, userId)
        ),
      });

      const repoPath = getWorkflowRepoPath(workflowId);

      // If no config exists, initialize repository first
      if (!gitConfigRecord) {
        await this.initRepository(workflowId, userId);
        gitConfigRecord = await db.query.workflowGitConfigs.findFirst({
          where: and(
            eq(workflowGitConfigs.workflowId, workflowId),
            eq(workflowGitConfigs.userId, userId)
          ),
        });

        if (!gitConfigRecord) {
          throw new Error('Failed to initialize repository configuration');
        }
      }

      logger.info(`Git configuration stored for workflow ${workflowId}`);

      // Get credential directly from CredentialService for testing
      const credentialService = getCredentialService();
      const credential = await credentialService.getCredential(
        config.credentialId,
        userId
      );

      if (!credential) {
        throw new AppError('Git credentials not found', 404);
      }

      // Determine credential type and extract token
      const isPAT = credential.type.endsWith('PAT');
      const token = isPAT ? credential.data.token : credential.data.accessToken;
      
      // Map credential type to provider
      const providerMap: Record<string, string> = {
        'githubOAuth2': 'github',
        'githubPAT': 'github',
        'gitlabOAuth2': 'gitlab',
        'gitlabPAT': 'gitlab',
        'bitbucketOAuth2': 'bitbucket',
        'bitbucketPAT': 'bitbucket',
      };

      const provider = providerMap[credential.type] || 'github';

      const credentials = {
        type: isPAT ? ('personal_access_token' as const) : ('oauth' as const),
        token,
        provider: provider as 'github' | 'gitlab' | 'bitbucket',
        refreshToken: isPAT ? undefined : credential.data.refreshToken,
        expiresAt: credential.expiresAt || undefined,
      };

      // Test connection by attempting to list remote refs
      try {
        await this.testConnection(
          repoPath,
          config.repositoryUrl,
          credentials
        );
      } catch (error) {
        // Clean up config on connection failure
        await db
          .delete(workflowGitConfigs)
          .where(eq(workflowGitConfigs.workflowId, workflowId));
        
        logger.error('Git connection test failed:', {
          workflowId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });

        throw new AppError(
          'Failed to connect to Git repository. Please check your credentials and repository URL.',
          401
        );
      }

      // Add remote to local repository
      const remoteName = gitConfigRecord.remoteName || 'origin';
      await git.addRemote({
        fs,
        dir: repoPath,
        remote: remoteName,
        url: config.repositoryUrl,
        force: true, // Overwrite if exists
      });

      logger.info(`Remote '${remoteName}' added to repository`);

      // Update configuration with connection details
      const branch = config.branch || 'main';
      const updateResult = await db
        .update(workflowGitConfigs)
        .set({
          repositoryUrl: config.repositoryUrl,
          branch,
          credentialId: config.credentialId, // Store credential reference
          connected: true,
          lastError: null,
          updatedAt: new Date(),
        })
        .where(eq(workflowGitConfigs.id, gitConfigRecord.id))
        .returning();

      if (!updateResult[0]) {
        throw new Error('Failed to update Git configuration');
      }

      // Try to fetch and merge remote content if repository is not empty
      // This handles the case where remote has existing files (like README.md)
      try {
        logger.info(`Fetching remote content for workflow ${workflowId}`);
        
        // Fetch remote refs
        await git.fetch({
          fs,
          http: require('isomorphic-git/http/node'),
          dir: repoPath,
          remote: remoteName,
          ref: branch,
          onAuth: this.getAuthCallback(credentials),
          singleBranch: true,
        });

        // Check if remote branch exists and has commits
        try {
          const remoteRef = await git.resolveRef({
            fs,
            dir: repoPath,
            ref: `${remoteName}/${branch}`,
          });

          // Check if local branch has commits
          let localHasCommits = false;
          try {
            await git.resolveRef({
              fs,
              dir: repoPath,
              ref: branch,
            });
            localHasCommits = true;
          } catch {
            localHasCommits = false;
          }

          if (!localHasCommits) {
            // Local branch has no commits, just set it to track remote
            logger.info(`Setting local branch to track ${remoteName}/${branch}`);
            await git.branch({
              fs,
              dir: repoPath,
              ref: branch,
              checkout: true,
              object: remoteRef,
            });
          } else {
            // Both have commits, need to merge
            logger.info(`Merging remote branch ${remoteName}/${branch}`);
            
            try {
              await git.merge({
                fs,
                dir: repoPath,
                ours: branch,
                theirs: `${remoteName}/${branch}`,
                author: {
                  name: 'NodeDrop',
                  email: 'git@nodedrop.com',
                },
                fastForward: false,
              });
              logger.info(`Successfully merged remote content`);
            } catch (mergeError: any) {
              // Merge conflict or unrelated histories
              logger.warn(`Merge failed, will handle on first push: ${mergeError.message}`);
              // Don't fail the connection - user can resolve this later
            }
          }
        } catch (refError) {
          // Remote branch doesn't exist - this is fine
          logger.info(`Remote branch doesn't exist yet, will be created on first push`);
        }
      } catch (fetchError) {
        // Fetch failed - likely because remote is empty
        logger.info(`No remote content to fetch: ${fetchError instanceof Error ? fetchError.message : 'Unknown'}`);
      }

      logger.info(`Git repository connected successfully for workflow ${workflowId}`);

      return {
        workflowId: updateResult[0].workflowId,
        repositoryUrl: updateResult[0].repositoryUrl,
        branch: updateResult[0].branch,
        connected: updateResult[0].connected || false,
        lastSyncAt: updateResult[0].lastSyncAt || undefined,
        lastCommitHash: updateResult[0].lastCommitHash || undefined,
        unpushedCommits: updateResult[0].unpushedCommits || 0,
      };
    } catch (error) {
      logger.error('Failed to connect Git repository:', {
        workflowId,
        userId,
        repositoryUrl: config.repositoryUrl,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError('Failed to connect to Git repository', 500);
    }
  }

  /**
   * Disconnect a workflow from its Git repository
   * Removes remote connection and credentials
   * 
   * @param workflowId - The workflow ID
   * @param userId - The user ID
   * @returns Promise<void>
   * 
   * Requirement 1.3: Disconnect repository and clean up
   */
  async disconnectRepository(
    workflowId: string,
    userId: string
  ): Promise<void> {
    try {
      logger.info(`Disconnecting Git repository for workflow ${workflowId}`);

      // Get configuration
      const gitConfigRecord = await db.query.workflowGitConfigs.findFirst({
        where: and(
          eq(workflowGitConfigs.workflowId, workflowId),
          eq(workflowGitConfigs.userId, userId)
        ),
      });

      if (!gitConfigRecord) {
        throw new AppError('Git repository not found for this workflow', 404);
      }

      const repoPath = getWorkflowRepoPath(workflowId);

      // Remove remote from local repository if it exists
      try {
        const remoteName = gitConfigRecord.remoteName || 'origin';
        await git.deleteRemote({
          fs,
          dir: repoPath,
          remote: remoteName,
        });
        logger.info(`Remote '${remoteName}' removed from repository`);
      } catch (error) {
        // Remote might not exist, continue with cleanup
        logger.warn('Failed to remove remote (may not exist):', {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }

      // Update configuration to mark as disconnected
      // Note: Credential remains in credentials table for reuse
      await db
        .update(workflowGitConfigs)
        .set({
          connected: false,
          repositoryUrl: '',
          lastError: null,
          updatedAt: new Date(),
        })
        .where(eq(workflowGitConfigs.id, gitConfigRecord.id));

      logger.info(`Git repository disconnected successfully for workflow ${workflowId}`);
    } catch (error) {
      logger.error('Failed to disconnect Git repository:', {
        workflowId,
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError('Failed to disconnect Git repository', 500);
    }
  }

  /**
   * Get Git repository information for a workflow
   * 
   * @param workflowId - The workflow ID
   * @param userId - The user ID
   * @returns Promise<GitRepositoryInfo | null>
   */
  async getRepositoryInfo(
    workflowId: string,
    userId: string
  ): Promise<GitRepositoryInfo | null> {
    try {
      const gitConfigRecord = await db.query.workflowGitConfigs.findFirst({
        where: and(
          eq(workflowGitConfigs.workflowId, workflowId),
          eq(workflowGitConfigs.userId, userId)
        ),
      });

      if (!gitConfigRecord) {
        return null;
      }

      return {
        workflowId: gitConfigRecord.workflowId,
        repositoryUrl: gitConfigRecord.repositoryUrl,
        branch: gitConfigRecord.branch,
        connected: gitConfigRecord.connected || false,
        lastSyncAt: gitConfigRecord.lastSyncAt || undefined,
        lastCommitHash: gitConfigRecord.lastCommitHash || undefined,
        unpushedCommits: gitConfigRecord.unpushedCommits || 0,
      };
    } catch (error) {
      logger.error('Failed to get repository info:', {
        workflowId,
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return null;
    }
  }

  /**
   * Get workflow data from Git repository
   * Reads the workflow files from Git repository and deserializes them
   * 
   * @param workflowId - The workflow ID
   * @param userId - The user ID
   * @param environment - Optional environment to load specific workflow file from
   * @returns Promise<Partial<WorkflowData>>
   * 
   * Requirement 7.1: Load workflow from Git after pull
   */
  async getWorkflowFromGit(
    workflowId: string,
    userId: string,
    environment?: 'development' | 'staging' | 'production'
  ): Promise<Partial<WorkflowData>> {
    try {
      logger.info(`Loading workflow from Git for workflow ${workflowId}${environment ? ` (environment: ${environment}, file: workflow-${environment}.json)` : ''}`);

      // Get Git configuration
      const gitConfigRecord = await db.query.workflowGitConfigs.findFirst({
        where: and(
          eq(workflowGitConfigs.workflowId, workflowId),
          eq(workflowGitConfigs.userId, userId)
        ),
      });

      if (!gitConfigRecord) {
        throw new AppError('Git repository not configured for this workflow', 404);
      }

      if (!gitConfigRecord.connected) {
        throw new AppError('Git repository is not connected', 400);
      }

      const repoPath = getWorkflowRepoPath(workflowId);

      // Check if repository directory exists
      const repoExists = await fs.pathExists(repoPath);
      if (!repoExists) {
        throw new AppError('Git repository directory not found', 404);
      }

      // Determine which workflow file to read based on environment
      const workflowFileName = environment ? `workflow-${environment}.json` : 'workflow.json';
      const workflowFilePath = path.join(repoPath, workflowFileName);
      const workflowFileExists = await fs.pathExists(workflowFilePath);
      
      if (!workflowFileExists) {
        // If environment file doesn't exist, try fallback to base workflow.json
        if (environment) {
          const baseWorkflowPath = path.join(repoPath, 'workflow.json');
          const baseExists = await fs.pathExists(baseWorkflowPath);
          
          if (baseExists) {
            logger.info(`Environment file ${workflowFileName} not found, using base workflow.json`);
            const workflowFileContent = await fs.readFile(baseWorkflowPath, 'utf-8');
            const workflowFiles: WorkflowFiles = {
              'workflow.json': workflowFileContent,
            };
            const workflow = await this.workflowSerializer.filesToWorkflow(workflowFiles);
            logger.info(`Workflow loaded from Git successfully for workflow ${workflowId}`);
            return workflow;
          }
        }
        throw new AppError(`Workflow file ${workflowFileName} not found in Git repository`, 404);
      }

      const workflowFileContent = await fs.readFile(workflowFilePath, 'utf-8');

      // Deserialize workflow
      const workflowFiles: WorkflowFiles = {
        [workflowFileName]: workflowFileContent,
      };

      const workflow = await this.workflowSerializer.filesToWorkflow(workflowFiles);

      logger.info(`Workflow loaded from Git successfully for workflow ${workflowId}`);

      return workflow;
    } catch (error) {
      logger.error('Failed to load workflow from Git:', {
        workflowId,
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError('Failed to load workflow from Git', 500);
    }
  }

  /**
   * Get Git status for a workflow
   * Detects changes, calculates staged/unstaged changes, and determines ahead/behind counts
   * 
   * @param workflowId - The workflow ID
   * @param userId - The user ID
   * @param currentWorkflow - Current workflow data (optional, will fetch if not provided)
   * @param environment - Optional environment to get status for
   * @returns Promise<GitStatus>
   * 
   * Requirements: 2.1, 4.1, 4.2, 4.3
   */
  async getStatus(
    workflowId: string,
    userId: string,
    currentWorkflow?: WorkflowData,
    environment?: 'development' | 'staging' | 'production'
  ): Promise<GitStatus> {
    try {
      logger.debug(`Getting Git status for workflow ${workflowId}`);

      // Get Git configuration
      const gitConfigRecord = await db.query.workflowGitConfigs.findFirst({
        where: and(
          eq(workflowGitConfigs.workflowId, workflowId),
          eq(workflowGitConfigs.userId, userId)
        ),
      });

      if (!gitConfigRecord) {
        throw new AppError('Git repository not configured for this workflow', 404);
      }

      if (!gitConfigRecord.connected) {
        throw new AppError('Git repository is not connected', 400);
      }

      const repoPath = getWorkflowRepoPath(workflowId);

      // Check if repository directory exists
      const repoExists = await fs.pathExists(repoPath);
      if (!repoExists) {
        throw new AppError('Git repository directory not found', 404);
      }

      // Get current branch
      const branch = gitConfigRecord.branch;

      // Detect changes by comparing working directory with HEAD
      const changes = await this.detectChanges(repoPath, workflowId, currentWorkflow, environment);

      // Calculate if there are any modifications
      const modified = changes.length > 0;

      // Check if any changes are staged
      const staged = changes.some((change) => change.staged);

      // Get unpushed commits count (ahead count)
      const ahead = await this.getAheadCount(repoPath, branch, gitConfigRecord.remoteName || 'origin');

      // Get behind count (commits on remote not in local)
      const behind = await this.getBehindCount(repoPath, branch, gitConfigRecord.remoteName || 'origin');

      const status: GitStatus = {
        workflowId,
        branch,
        modified,
        staged,
        unpushedCommits: ahead,
        ahead,
        behind,
        changes,
      };

      logger.debug(`Git status retrieved for workflow ${workflowId}:`, {
        modified,
        staged,
        ahead,
        behind,
        changesCount: changes.length,
      });

      return status;
    } catch (error) {
      logger.error('Failed to get Git status:', {
        workflowId,
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError('Failed to get Git status', 500);
    }
  }

  /**
   * Detect changes in the working directory
   * Compares current workflow state with last commit
   * 
   * @param repoPath - Local repository path
   * @param workflowId - The workflow ID
   * @param currentWorkflow - Current workflow data (optional)
   * @param environment - Optional environment to detect changes for
   * @returns Promise<GitChange[]>
   */
  private async detectChanges(
    repoPath: string,
    workflowId: string,
    currentWorkflow?: WorkflowData,
    environment?: 'development' | 'staging' | 'production'
  ): Promise<GitChange[]> {
    try {
      const changes: GitChange[] = [];

      // If current workflow is provided, write it to disk first to detect changes
      if (currentWorkflow) {
        try {
          logger.debug('Writing current workflow to disk for change detection', {
            workflowId,
            hasNodes: !!currentWorkflow.nodes,
            nodeCount: currentWorkflow.nodes?.length || 0,
            environment,
          });
          
          const workflowFiles = await this.workflowSerializer.workflowToFiles(currentWorkflow, environment);
          
          logger.debug(`Generated workflow files: ${Object.keys(workflowFiles).join(', ')}`);
          
          for (const [filename, content] of Object.entries(workflowFiles)) {
            const filePath = path.join(repoPath, filename);
            await fs.writeFile(filePath, content, 'utf-8');
            logger.debug(`Wrote ${filename} for change detection`);
          }
        } catch (serializeError) {
          logger.error('Failed to serialize current workflow for change detection:', {
            error: serializeError instanceof Error ? serializeError.message : 'Unknown error',
            workflowId,
          });
          // Continue with file-based detection even if serialization fails
        }
      }

      // Get the status matrix from isomorphic-git
      // This shows us what files have changed
      const statusMatrix = await git.statusMatrix({
        fs,
        dir: repoPath,
      });

      // statusMatrix format: [filepath, HEADStatus, WorkdirStatus, StageStatus]
      // Status codes: 0 = absent, 1 = present, 2 = modified
      for (const [filepath, HEADStatus, WorkdirStatus, StageStatus] of statusMatrix) {
        // Skip .git directory and README.md (auto-generated)
        if (filepath.startsWith('.git') || filepath === 'README.md') {
          continue;
        }

        // Skip other environment files when a specific environment is active
        // For example, if development is active, skip workflow-staging.json and workflow-production.json
        if (environment) {
          const envFilePattern = /^workflow-(development|staging|production)\.json$/;
          const isEnvFile = envFilePattern.test(filepath);
          const isCurrentEnvFile = filepath === `workflow-${environment}.json`;
          
          // Skip other environment files
          if (isEnvFile && !isCurrentEnvFile) {
            continue;
          }
        }

        let changeType: 'added' | 'modified' | 'deleted' | null = null;
        let isStaged = false;

        // Determine change type based on status codes
        if (HEADStatus === 0 && WorkdirStatus === 1) {
          // File added (not in HEAD, present in workdir)
          changeType = 'added';
          isStaged = StageStatus === 2; // Staged if StageStatus is 2
        } else if (HEADStatus === 1 && WorkdirStatus === 0) {
          // File deleted (in HEAD, not in workdir)
          changeType = 'deleted';
          isStaged = StageStatus === 0; // Staged if StageStatus is 0
        } else if (HEADStatus === 1 && WorkdirStatus === 2) {
          // File modified (in HEAD, modified in workdir)
          changeType = 'modified';
          isStaged = StageStatus === 2; // Staged if StageStatus is 2
        } else if (HEADStatus === 1 && WorkdirStatus === 1 && StageStatus === 2) {
          // File staged but not modified in workdir
          changeType = 'modified';
          isStaged = true;
        }

        if (changeType) {
          changes.push({
            path: filepath,
            type: changeType,
            staged: isStaged,
          });
          logger.debug(`Detected change: ${filepath} (${changeType})`);
        }
      }

      logger.debug(`Detected ${changes.length} changes in repository`);
      return changes;
    } catch (error) {
      logger.error('Failed to detect changes:', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      // Return empty changes array on error rather than failing
      return [];
    }
  }

  /**
   * Get the diff for a specific file
   * Returns the old and new content for comparison
   * 
   * @param workflowId - Workflow ID
   * @param userId - User ID
   * @param filePath - Path to the file to diff
   * @param currentWorkflow - Optional current workflow data to compare against
   * @returns Promise<{ oldContent: string | null, newContent: string | null }>
   */
  async getDiff(
    workflowId: string,
    userId: string,
    filePath: string,
    currentWorkflow?: WorkflowData
  ): Promise<{ oldContent: string | null; newContent: string | null }> {
    try {
      const repoPath = getWorkflowRepoPath(workflowId);

      // Check if repository exists
      if (!(await fs.pathExists(repoPath))) {
        throw new AppError('Git repository not found', 404);
      }

      // Get the old content from HEAD
      let oldContent: string | null = null;
      try {
        const headContent = await git.readBlob({
          fs,
          dir: repoPath,
          oid: 'HEAD',
          filepath: filePath,
        });
        oldContent = new TextDecoder().decode(headContent.blob);
      } catch (error) {
        // File might not exist in HEAD (new file)
        logger.debug(`File ${filePath} not found in HEAD, treating as new file`);
      }

      // Get the new content from working directory
      let newContent: string | null = null;
      const workingFilePath = path.join(repoPath, filePath);

      // If current workflow is provided, serialize it first
      if (currentWorkflow) {
        try {
          const workflowFiles = await this.workflowSerializer.workflowToFiles(currentWorkflow);
          if (filePath in workflowFiles) {
            const content = workflowFiles[filePath as keyof WorkflowFiles];
            if (content !== undefined) {
              newContent = content;
            }
          }
        } catch (error) {
          logger.error('Failed to serialize workflow for diff:', {
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      // If not from current workflow, read from disk
      if (newContent === null && (await fs.pathExists(workingFilePath))) {
        newContent = await fs.readFile(workingFilePath, 'utf-8');
      }

      return { oldContent, newContent };
    } catch (error) {
      logger.error('Failed to get diff:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        workflowId,
        filePath,
      });
      throw error;
    }
  }

  /**
   * Get the number of commits ahead of remote
   * 
   * @param repoPath - Local repository path
   * @param branch - Current branch name
   * @param remoteName - Remote name (default: 'origin')
   * @returns Promise<number>
   */
  private async getAheadCount(
    repoPath: string,
    branch: string,
    remoteName: string = 'origin'
  ): Promise<number> {
    try {
      // Get local branch commits
      const localCommits = await git.log({
        fs,
        dir: repoPath,
        ref: branch,
      });

      // Try to get remote branch commits
      let remoteCommits: any[] = [];
      try {
        remoteCommits = await git.log({
          fs,
          dir: repoPath,
          ref: `${remoteName}/${branch}`,
        });
      } catch (error) {
        // Remote branch might not exist yet (first push)
        logger.debug('Remote branch not found, assuming all commits are ahead');
        return localCommits.length;
      }

      // Find commits in local that are not in remote
      const remoteCommitHashes = new Set(remoteCommits.map((c) => c.oid));
      const aheadCommits = localCommits.filter((c) => !remoteCommitHashes.has(c.oid));

      return aheadCommits.length;
    } catch (error) {
      logger.error('Failed to calculate ahead count:', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return 0;
    }
  }

  /**
   * Get the number of commits behind remote
   * 
   * @param repoPath - Local repository path
   * @param branch - Current branch name
   * @param remoteName - Remote name (default: 'origin')
   * @returns Promise<number>
   */
  private async getBehindCount(
    repoPath: string,
    branch: string,
    remoteName: string = 'origin'
  ): Promise<number> {
    try {
      // Get local branch commits
      const localCommits = await git.log({
        fs,
        dir: repoPath,
        ref: branch,
      });

      // Try to get remote branch commits
      let remoteCommits: any[] = [];
      try {
        remoteCommits = await git.log({
          fs,
          dir: repoPath,
          ref: `${remoteName}/${branch}`,
        });
      } catch (error) {
        // Remote branch might not exist yet
        logger.debug('Remote branch not found, behind count is 0');
        return 0;
      }

      // Find commits in remote that are not in local
      const localCommitHashes = new Set(localCommits.map((c) => c.oid));
      const behindCommits = remoteCommits.filter((c) => !localCommitHashes.has(c.oid));

      return behindCommits.length;
    } catch (error) {
      logger.error('Failed to calculate behind count:', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return 0;
    }
  }

  /**
   * Test connection to a Git repository
   * Validates that the repository exists and is accessible
   * 
   * Note: For public repositories, we cannot reliably validate credentials
   * during connection because they allow anonymous read access. Credentials
   * will be validated during actual push/pull operations.
   * 
   * @param repoPath - Local repository path
   * @param repositoryUrl - Remote repository URL
   * @param credentials - Git credentials
   * @returns Promise<void>
   * @throws Error if connection fails
   */
  private async testConnection(
    repoPath: string,
    repositoryUrl: string,
    credentials: GitCredentials
  ): Promise<void> {
    try {
      logger.info('Testing Git connection to repository...');

      // Test that we can access the repository (list refs)
      // This validates the URL is correct and the repository exists
      const refs = await git.listServerRefs({
        http: require('isomorphic-git/http/node'),
        url: repositoryUrl,
        onAuth: this.getAuthCallback(credentials),
      });

      if (!refs || refs.length === 0) {
        throw new Error('Unable to access remote repository - no refs found');
      }

      logger.info(`Git connection test successful - repository accessible with ${refs.length} refs`);
      
      // Note: We don't validate credentials here because:
      // 1. Public repos allow anonymous access, so invalid tokens won't fail
      // 2. Private repos will fail here if credentials are wrong
      // 3. For public repos, credentials will be validated on first push
    } catch (error: any) {
      logger.error('Git connection test failed:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        code: error.code,
        statusCode: error.statusCode,
      });

      const errorMessage = error.message?.toLowerCase() || '';
      
      // Check for authentication errors (private repos)
      if (
        error.statusCode === 401 ||
        error.statusCode === 403 ||
        errorMessage.includes('401') ||
        errorMessage.includes('403') ||
        errorMessage.includes('authentication') ||
        errorMessage.includes('unauthorized')
      ) {
        throw new Error('Authentication failed - invalid credentials or insufficient permissions');
      }

      // Check for network errors
      if (
        errorMessage.includes('enotfound') ||
        errorMessage.includes('etimedout') ||
        errorMessage.includes('econnrefused') ||
        errorMessage.includes('network')
      ) {
        throw new Error('Network error - unable to reach repository');
      }

      // Check for not found errors
      if (
        error.statusCode === 404 ||
        errorMessage.includes('not found') ||
        errorMessage.includes('404')
      ) {
        throw new Error('Repository not found - please check the URL');
      }

      // Re-throw with context
      throw new Error(`Failed to connect to repository: ${error.message || 'Unknown error'}`);
    }
  }

  /**
   * Validate Git repository URL format
   * 
   * @param url - Repository URL to validate
   * @returns boolean indicating if URL is valid
   */
  private isValidGitUrl(url: string): boolean {
    // Support HTTPS and SSH URLs
    const httpsPattern = /^https:\/\/.+\/.+\.git$/;
    const sshPattern = /^git@.+:.+\/.+\.git$/;
    const httpsWithoutGit = /^https:\/\/.+\/.+$/;

    return (
      httpsPattern.test(url) ||
      sshPattern.test(url) ||
      httpsWithoutGit.test(url)
    );
  }

  /**
   * Commit workflow changes with a message
   * Automatically stages all workflow changes and creates a commit
   * 
   * @param workflowId - The workflow ID
   * @param userId - The user ID
   * @param message - Commit message
   * @param workflow - Current workflow data to commit
   * @param environment - Optional environment (development, staging, production) for environment-specific commits
   * @returns Promise<GitCommit>
   * 
   * Requirements: 2.2, 2.3, 2.4
   */
  async commit(
    workflowId: string,
    userId: string,
    message: string,
    workflow: WorkflowData,
    environment?: 'development' | 'staging' | 'production'
  ): Promise<GitCommit> {
    try {
      logger.info(`Creating commit for workflow ${workflowId}${environment ? ` (environment: ${environment})` : ''}`);

      // Validate commit message (Requirement 2.3)
      if (!message || message.trim().length === 0) {
        throw new AppError('Commit message cannot be empty', 400);
      }

      // Get Git configuration
      const gitConfigRecord = await db.query.workflowGitConfigs.findFirst({
        where: and(
          eq(workflowGitConfigs.workflowId, workflowId),
          eq(workflowGitConfigs.userId, userId)
        ),
      });

      if (!gitConfigRecord) {
        throw new AppError('Git repository not configured for this workflow', 404);
      }

      if (!gitConfigRecord.connected) {
        throw new AppError('Git repository is not connected', 400);
      }

      const repoPath = getWorkflowRepoPath(workflowId);

      // Check if repository directory exists
      const repoExists = await fs.pathExists(repoPath);
      if (!repoExists) {
        throw new AppError('Git repository directory not found', 404);
      }

      // Serialize workflow to files (Requirement 2.2)
      // If environment is specified, write to environment-specific file
      const workflowFiles = await this.workflowSerializer.workflowToFiles(workflow, environment);

      logger.debug(`Workflow files to commit: ${JSON.stringify(Object.keys(workflowFiles))}, environment: ${environment || 'none'}`);

      // Write workflow files to repository
      for (const [filename, content] of Object.entries(workflowFiles)) {
        const filePath = path.join(repoPath, filename);
        await fs.writeFile(filePath, content, 'utf-8');
        logger.debug(`Wrote file: ${filename}${environment ? ` (for environment: ${environment})` : ''}`);
      }

      // Stage all workflow changes automatically (Requirement 2.2)
      const filesToStage = Object.keys(workflowFiles);
      for (const filepath of filesToStage) {
        await git.add({
          fs,
          dir: repoPath,
          filepath,
        });
        logger.debug(`Staged file: ${filepath}`);
      }

      // Get author information from user
      // In a real implementation, this would come from the user profile
      const author = {
        name: userId, // TODO: Replace with actual user name from database
        email: `${userId}@workflow.local`, // TODO: Replace with actual user email
      };

      // Create commit with proper metadata (Requirement 2.4)
      const commitHash = await git.commit({
        fs,
        dir: repoPath,
        message: message.trim(),
        author: {
          name: author.name,
          email: author.email,
          timestamp: Math.floor(Date.now() / 1000),
        },
      });

      logger.info(`Commit created: ${commitHash}`);

      // Update database with last commit hash and increment unpushed commits
      const currentUnpushed = gitConfigRecord.unpushedCommits || 0;
      await db
        .update(workflowGitConfigs)
        .set({
          lastCommitHash: commitHash,
          unpushedCommits: currentUnpushed + 1,
          lastSyncAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(workflowGitConfigs.id, gitConfigRecord.id));

      // Get commit details for return value
      // For the first commit, we need to handle the case where the branch doesn't exist yet
      let commits;
      try {
        commits = await git.log({
          fs,
          dir: repoPath,
          depth: 1,
          ref: gitConfigRecord.branch,
        });
      } catch (error: any) {
        // If branch doesn't exist yet (first commit), get the commit directly by hash
        if (error.code === 'NotFoundError' || error.message?.includes('Could not find')) {
          logger.info('First commit - branch does not exist yet, using commit hash');
          commits = await git.log({
            fs,
            dir: repoPath,
            depth: 1,
            ref: commitHash,
          });
        } else {
          throw error;
        }
      }

      if (!commits || commits.length === 0) {
        throw new Error('Failed to retrieve commit details');
      }

      const commitDetails = commits[0];

      const gitCommit: GitCommit = {
        hash: commitDetails.oid,
        message: commitDetails.commit.message,
        author: commitDetails.commit.author.name,
        timestamp: new Date(commitDetails.commit.author.timestamp * 1000),
        parents: commitDetails.commit.parent || [],
      };

      logger.info(`Commit created successfully for workflow ${workflowId}: ${commitHash}`);

      return gitCommit;
    } catch (error) {
      logger.error('Failed to create commit:', {
        workflowId,
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        errorDetails: error,
      });

      if (error instanceof AppError) {
        throw error;
      }

      // Provide more specific error message
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new AppError(`Failed to create commit: ${errorMessage}`, 500);
    }
  }

  /**
   * Get authentication callback for Git operations
   * 
   * @param credentials - Git credentials
   * @returns Authentication callback function
   */
  private getAuthCallback(credentials: GitCredentials) {
    // For Personal Access Tokens:
    // - GitHub Classic PAT (ghp_*): username='x-access-token', password=token
    // - GitHub Fine-grained PAT (github_pat_*): username=token, password=token OR username='', password=token
    // - GitLab: username='oauth2', password=token
    // - Bitbucket: username='x-token-auth', password=token
    
    if (credentials.provider === 'gitlab') {
      return () => ({
        username: 'oauth2',
        password: credentials.token,
      });
    } else if (credentials.provider === 'bitbucket') {
      return () => ({
        username: 'x-token-auth',
        password: credentials.token,
      });
    } else {
      // GitHub (default)
      // For Classic PAT (ghp_*), use 'x-access-token' as username
      // For Fine-grained PAT (github_pat_*), use token as username
      if (credentials.token.startsWith('ghp_')) {
        return () => ({
          username: 'x-access-token',
          password: credentials.token,
        });
      } else if (credentials.token.startsWith('github_pat_')) {
        return () => ({
          username: credentials.token,
          password: credentials.token,
        });
      } else {
        // Fallback: try x-access-token for unknown token types
        return () => ({
          username: 'x-access-token',
          password: credentials.token,
        });
      }
    }
  }

  /**
   * Push local commits to remote repository
   * Uploads all unpushed commits and updates sync status
   * 
   * @param workflowId - The workflow ID
   * @param userId - The user ID
   * @param options - Push options (optional)
   * @returns Promise<PushResult>
   * 
   * Requirements: 3.1, 3.2, 3.3, 3.4
   */
  async push(
    workflowId: string,
    userId: string,
    options?: PushOptions
  ): Promise<PushResult> {
    try {
      logger.info(`Pushing commits for workflow ${workflowId}`);

      // Get Git configuration
      const gitConfigRecord = await db.query.workflowGitConfigs.findFirst({
        where: and(
          eq(workflowGitConfigs.workflowId, workflowId),
          eq(workflowGitConfigs.userId, userId)
        ),
      });

      if (!gitConfigRecord) {
        throw new AppError('Git repository not configured for this workflow', 404);
      }

      if (!gitConfigRecord.connected) {
        throw new AppError('Git repository is not connected', 400);
      }

      if (!gitConfigRecord.repositoryUrl) {
        throw new AppError('Remote repository URL not configured', 400);
      }

      const repoPath = getWorkflowRepoPath(workflowId);

      // Check if repository directory exists
      const repoExists = await fs.pathExists(repoPath);
      if (!repoExists) {
        throw new AppError('Git repository directory not found', 404);
      }

      // Get credentials (Requirement 3.1: Handle authentication)
      const credentials = await this.getWorkflowCredentials(workflowId, userId);

      // Determine remote and branch
      const remoteName = options?.remote || gitConfigRecord.remoteName || 'origin';
      const branch = options?.branch || gitConfigRecord.branch;

      // Check if there are unpushed commits (Requirement 3.1)
      const unpushedCount = await this.getAheadCount(repoPath, branch, remoteName);
      
      if (unpushedCount === 0) {
        logger.info('No unpushed commits to push');
        return {
          success: true,
          pushed: 0,
        };
      }

      logger.info(`Pushing ${unpushedCount} commits to ${remoteName}/${branch}`);

      // Perform push operation (Requirement 3.1: Upload all local commits)
      try {
        const pushResult = await git.push({
          fs,
          http: require('isomorphic-git/http/node'),
          dir: repoPath,
          remote: remoteName,
          ref: branch,
          onAuth: this.getAuthCallback(credentials),
          force: options?.force || false,
        });

        logger.info(`Push completed successfully:`, pushResult);

        // Update sync status after successful push (Requirement 3.2)
        await db
          .update(workflowGitConfigs)
          .set({
            unpushedCommits: 0,
            lastSyncAt: new Date(),
            lastError: null,
            updatedAt: new Date(),
          })
          .where(eq(workflowGitConfigs.id, gitConfigRecord.id));

        logger.info(`Sync status updated for workflow ${workflowId}`);

        // Return success result (Requirement 3.2)
        return {
          success: true,
          pushed: unpushedCount,
        };
      } catch (pushError: any) {
        // Handle push-specific errors (Requirements 3.3, 3.4)
        logger.error('Push operation failed:', {
          workflowId,
          error: pushError.message || 'Unknown error',
          code: pushError.code,
        });

        // Check for conflict errors (Requirement 3.4)
        if (
          pushError.message?.includes('rejected') ||
          pushError.message?.includes('non-fast-forward') ||
          pushError.message?.includes('conflict')
        ) {
          // Store error in database for UI to display
          await db
            .update(workflowGitConfigs)
            .set({
              lastError: 'Push rejected: Remote has changes that are not in local branch. Please pull first.',
              updatedAt: new Date(),
            })
            .where(eq(workflowGitConfigs.id, gitConfigRecord.id));

          return {
            success: false,
            pushed: 0,
            error: 'Push rejected: Remote has changes that are not in local branch. Please pull first.',
          };
        }

        // Check for authentication errors
        if (
          pushError.message?.includes('authentication') ||
          pushError.message?.includes('401') ||
          pushError.message?.includes('403')
        ) {
          await db
            .update(workflowGitConfigs)
            .set({
              lastError: 'Authentication failed. Please check your credentials.',
              updatedAt: new Date(),
            })
            .where(eq(workflowGitConfigs.id, gitConfigRecord.id));

          return {
            success: false,
            pushed: 0,
            error: 'Authentication failed. Please check your credentials.',
          };
        }

        // Check for network errors (Requirement 3.3)
        if (
          pushError.message?.includes('network') ||
          pushError.message?.includes('ENOTFOUND') ||
          pushError.message?.includes('ETIMEDOUT') ||
          pushError.message?.includes('ECONNREFUSED')
        ) {
          // Store error but retain local commits (Requirement 3.3)
          await db
            .update(workflowGitConfigs)
            .set({
              lastError: 'Network error: Unable to connect to remote repository. Your commits are safe locally.',
              updatedAt: new Date(),
            })
            .where(eq(workflowGitConfigs.id, gitConfigRecord.id));

          return {
            success: false,
            pushed: 0,
            error: 'Network error: Unable to connect to remote repository. Your commits are safe locally.',
          };
        }

        // Generic error handling
        const errorMessage = `Push failed: ${pushError.message || 'Unknown error'}`;
        await db
          .update(workflowGitConfigs)
          .set({
            lastError: errorMessage,
            updatedAt: new Date(),
          })
          .where(eq(workflowGitConfigs.id, gitConfigRecord.id));

        return {
          success: false,
          pushed: 0,
          error: errorMessage,
        };
      }
    } catch (error) {
      logger.error('Failed to push commits:', {
        workflowId,
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError('Failed to push commits', 500);
    }
  }

  /**
   * Pull changes from remote repository
   * Fetches and merges changes from remote repository
   * 
   * @param workflowId - The workflow ID
   * @param userId - The user ID
   * @param options - Pull options (optional)
   * @param environment - Optional environment to pull for
   * @returns Promise<PullResult>
   * 
   * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5
   */
  async pull(
    workflowId: string,
    userId: string,
    options?: PullOptions,
    environment?: 'development' | 'staging' | 'production'
  ): Promise<PullResult> {
    try {
      logger.info(`Pulling changes for workflow ${workflowId}`);

      // Get Git configuration
      const gitConfigRecord = await db.query.workflowGitConfigs.findFirst({
        where: and(
          eq(workflowGitConfigs.workflowId, workflowId),
          eq(workflowGitConfigs.userId, userId)
        ),
      });

      if (!gitConfigRecord) {
        throw new AppError('Git repository not configured for this workflow', 404);
      }

      if (!gitConfigRecord.connected) {
        throw new AppError('Git repository is not connected', 400);
      }

      if (!gitConfigRecord.repositoryUrl) {
        throw new AppError('Remote repository URL not configured', 400);
      }

      const repoPath = getWorkflowRepoPath(workflowId);

      // Check if repository directory exists
      const repoExists = await fs.pathExists(repoPath);
      if (!repoExists) {
        throw new AppError('Git repository directory not found', 404);
      }

      // Get credentials
      const credentials = await this.getWorkflowCredentials(workflowId, userId);

      // Determine remote and branch
      const remoteName = options?.remote || gitConfigRecord.remoteName || 'origin';
      const branch = options?.branch || gitConfigRecord.branch;

      // Check for uncommitted changes (Requirement 7.4)
      const status = await this.getStatus(workflowId, userId, undefined, environment);
      if (status.modified) {
        throw new AppError(
          'Cannot pull with uncommitted changes. Please commit or discard your changes first.',
          400
        );
      }

      logger.info(`Fetching changes from ${remoteName}/${branch}`);

      // Fetch changes from remote (Requirement 7.1)
      try {
        await git.fetch({
          fs,
          http: require('isomorphic-git/http/node'),
          dir: repoPath,
          remote: remoteName,
          ref: branch,
          onAuth: this.getAuthCallback(credentials),
          singleBranch: true,
        });

        logger.info('Fetch completed successfully');
      } catch (fetchError: any) {
        logger.error('Fetch operation failed:', {
          workflowId,
          error: fetchError.message || 'Unknown error',
        });

        // Handle network errors (Requirement 7.5)
        if (
          fetchError.message?.includes('network') ||
          fetchError.message?.includes('ENOTFOUND') ||
          fetchError.message?.includes('ETIMEDOUT') ||
          fetchError.message?.includes('ECONNREFUSED')
        ) {
          return {
            success: false,
            conflicts: false,
            commits: [],
            error: 'Network error: Unable to connect to remote repository.',
          };
        }

        // Handle authentication errors
        if (
          fetchError.message?.includes('authentication') ||
          fetchError.message?.includes('401') ||
          fetchError.message?.includes('403')
        ) {
          return {
            success: false,
            conflicts: false,
            commits: [],
            error: 'Authentication failed. Please check your credentials.',
          };
        }

        return {
          success: false,
          conflicts: false,
          commits: [],
          error: `Fetch failed: ${fetchError.message || 'Unknown error'}`,
        };
      }

      // Get commits that will be merged
      const remoteRef = `${remoteName}/${branch}`;
      let newCommits: GitCommit[] = [];
      
      try {
        const remoteLogs = await git.log({
          fs,
          dir: repoPath,
          ref: remoteRef,
        });

        const localLogs = await git.log({
          fs,
          dir: repoPath,
          ref: branch,
        });

        const localCommitHashes = new Set(localLogs.map((c) => c.oid));
        const newRemoteCommits = remoteLogs.filter((c) => !localCommitHashes.has(c.oid));

        newCommits = newRemoteCommits.map((commit) => ({
          hash: commit.oid,
          message: commit.commit.message,
          author: commit.commit.author.name,
          timestamp: new Date(commit.commit.author.timestamp * 1000),
          parents: commit.commit.parent || [],
        }));

        logger.info(`Found ${newCommits.length} new commits to merge`);
      } catch (error) {
        logger.warn('Failed to get commit details:', {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        // Continue with merge even if we can't get commit details
      }

      // If no new commits, we're already up to date
      if (newCommits.length === 0) {
        logger.info('Already up to date');
        return {
          success: true,
          conflicts: false,
          commits: [],
        };
      }

      // Perform merge (Requirement 7.1)
      try {
        const strategy = options?.strategy || 'merge';

        if (strategy === 'merge') {
          // Perform merge
          await git.merge({
            fs,
            dir: repoPath,
            ours: branch,
            theirs: remoteRef,
            author: {
              name: userId, // TODO: Replace with actual user name
              email: `${userId}@workflow.local`, // TODO: Replace with actual user email
            },
          } as any);

          logger.info('Merge completed successfully');
        } else {
          // Rebase not fully supported by isomorphic-git, fall back to merge
          logger.warn('Rebase strategy not fully supported, using merge instead');
          await git.merge({
            fs,
            dir: repoPath,
            ours: branch,
            theirs: remoteRef,
            author: {
              name: userId,
              email: `${userId}@workflow.local`,
            },
          } as any);
        }

        // Read updated workflow files (single file approach)
        const workflowFileName = environment ? `workflow-${environment}.json` : 'workflow.json';
        const workflowFiles: WorkflowFiles = {
          [workflowFileName]: await fs.readFile(path.join(repoPath, workflowFileName), 'utf-8'),
        };
        
        // Read README if it exists
        const readmePath = path.join(repoPath, 'README.md');
        if (await fs.pathExists(readmePath)) {
          workflowFiles['README.md'] = await fs.readFile(readmePath, 'utf-8');
        }

        // Deserialize workflow from files
        const updatedWorkflow = await this.workflowSerializer.filesToWorkflow(workflowFiles);

        // Update sync status (Requirement 7.2)
        await db
          .update(workflowGitConfigs)
          .set({
            lastSyncAt: new Date(),
            lastError: null,
            updatedAt: new Date(),
          })
          .where(eq(workflowGitConfigs.id, gitConfigRecord.id));

        logger.info(`Pull completed successfully for workflow ${workflowId}`);

        // Return success result (Requirement 7.2)
        return {
          success: true,
          conflicts: false,
          commits: newCommits,
        };
      } catch (mergeError: any) {
        logger.error('Merge operation failed:', {
          workflowId,
          error: mergeError.message || 'Unknown error',
        });

        // Check for merge conflicts (Requirement 7.3)
        if (
          mergeError.message?.includes('conflict') ||
          mergeError.message?.includes('MERGE_CONFLICT') ||
          mergeError.code === 'MergeNotSupportedError'
        ) {
          // Get list of conflicting files
          const conflictFiles: string[] = [];
          
          try {
            const statusMatrix = await git.statusMatrix({
              fs,
              dir: repoPath,
            });

            // Files with conflicts will have specific status codes
            for (const [filepath, HEADStatus, WorkdirStatus, StageStatus] of statusMatrix) {
              // Conflict indicators in status matrix
              if (StageStatus === 1 && WorkdirStatus === 2) {
                conflictFiles.push(filepath);
              }
            }
          } catch (error) {
            logger.warn('Failed to get conflict files:', {
              error: error instanceof Error ? error.message : 'Unknown error',
            });
          }

          // Store error in database
          await db
            .update(workflowGitConfigs)
            .set({
              lastError: 'Merge conflicts detected. Please resolve conflicts before continuing.',
              updatedAt: new Date(),
            })
            .where(eq(workflowGitConfigs.id, gitConfigRecord.id));

          return {
            success: false,
            conflicts: true,
            conflictFiles: conflictFiles.length > 0 ? conflictFiles : ['workflow files'],
            commits: newCommits,
            error: 'Merge conflicts detected. Please resolve conflicts before continuing.',
          };
        }

        // Other merge errors (Requirement 7.5)
        const errorMessage = `Merge failed: ${mergeError.message || 'Unknown error'}`;
        await db
          .update(workflowGitConfigs)
          .set({
            lastError: errorMessage,
            updatedAt: new Date(),
          })
          .where(eq(workflowGitConfigs.id, gitConfigRecord.id));

        return {
          success: false,
          conflicts: false,
          commits: [],
          error: errorMessage,
        };
      }
    } catch (error) {
      logger.error('Failed to pull changes:', {
        workflowId,
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError('Failed to pull changes', 500);
    }
  }

  /**
   * List all branches (local and remote)
   * 
   * @param workflowId - The workflow ID
   * @param userId - The user ID
   * @returns Promise<GitBranch[]>
   * 
   * Requirements: 6.3
   */
  async listBranches(
    workflowId: string,
    userId: string
  ): Promise<GitBranch[]> {
    try {
      logger.info(`Listing branches for workflow ${workflowId}`);

      // Get Git configuration
      const gitConfigRecord = await db.query.workflowGitConfigs.findFirst({
        where: and(
          eq(workflowGitConfigs.workflowId, workflowId),
          eq(workflowGitConfigs.userId, userId)
        ),
      });

      if (!gitConfigRecord) {
        throw new AppError('Git repository not configured for this workflow', 404);
      }

      if (!gitConfigRecord.connected) {
        throw new AppError('Git repository is not connected', 400);
      }

      const repoPath = getWorkflowRepoPath(workflowId);

      // Check if repository directory exists
      const repoExists = await fs.pathExists(repoPath);
      if (!repoExists) {
        throw new AppError('Git repository directory not found', 404);
      }

      const branches: GitBranch[] = [];
      const currentBranch = gitConfigRecord.branch;

      // Get local branches
      const localBranches = await git.listBranches({
        fs,
        dir: repoPath,
      });

      for (const branchName of localBranches) {
        // Get last commit for this branch
        let lastCommit: GitCommit | undefined;
        try {
          const commits = await git.log({
            fs,
            dir: repoPath,
            ref: branchName,
            depth: 1,
          });

          if (commits && commits.length > 0) {
            const commit = commits[0];
            lastCommit = {
              hash: commit.oid,
              message: commit.commit.message,
              author: commit.commit.author.name,
              timestamp: new Date(commit.commit.author.timestamp * 1000),
              parents: commit.commit.parent || [],
            };
          }
        } catch (error) {
          logger.warn(`Failed to get last commit for branch ${branchName}:`, {
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }

        branches.push({
          name: branchName,
          current: branchName === currentBranch,
          remote: false,
          lastCommit,
        });
      }

      // Get remote branches
      try {
        const remoteName = gitConfigRecord.remoteName || 'origin';
        const remoteBranches = await git.listBranches({
          fs,
          dir: repoPath,
          remote: remoteName,
        });

        for (const branchName of remoteBranches) {
          // Skip if we already have this as a local branch
          if (localBranches.includes(branchName)) {
            continue;
          }

          // Get last commit for this remote branch
          let lastCommit: GitCommit | undefined;
          try {
            const commits = await git.log({
              fs,
              dir: repoPath,
              ref: `${remoteName}/${branchName}`,
              depth: 1,
            });

            if (commits && commits.length > 0) {
              const commit = commits[0];
              lastCommit = {
                hash: commit.oid,
                message: commit.commit.message,
                author: commit.commit.author.name,
                timestamp: new Date(commit.commit.author.timestamp * 1000),
                parents: commit.commit.parent || [],
              };
            }
          } catch (error) {
            logger.warn(`Failed to get last commit for remote branch ${branchName}:`, {
              error: error instanceof Error ? error.message : 'Unknown error',
            });
          }

          branches.push({
            name: branchName,
            current: false,
            remote: true,
            lastCommit,
          });
        }
      } catch (error) {
        logger.warn('Failed to list remote branches:', {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        // Continue without remote branches
      }

      logger.info(`Found ${branches.length} branches for workflow ${workflowId}`);
      return branches;
    } catch (error) {
      logger.error('Failed to list branches:', {
        workflowId,
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError('Failed to list branches', 500);
    }
  }

  /**
   * Create a new branch
   * 
   * @param workflowId - The workflow ID
   * @param userId - The user ID
   * @param branchName - Name of the new branch
   * @returns Promise<GitBranch>
   * 
   * Requirements: 6.1, 6.5
   */
  async createBranch(
    workflowId: string,
    userId: string,
    branchName: string
  ): Promise<GitBranch> {
    try {
      logger.info(`Creating branch ${branchName} for workflow ${workflowId}`);

      // Validate branch name (Requirement 6.5)
      if (!this.isValidBranchName(branchName)) {
        throw new AppError(
          'Invalid branch name. Branch names cannot contain spaces, special characters like ~, ^, :, ?, *, [, \\, or start with a dot or slash.',
          400
        );
      }

      // Get Git configuration
      const gitConfigRecord = await db.query.workflowGitConfigs.findFirst({
        where: and(
          eq(workflowGitConfigs.workflowId, workflowId),
          eq(workflowGitConfigs.userId, userId)
        ),
      });

      if (!gitConfigRecord) {
        throw new AppError('Git repository not configured for this workflow', 404);
      }

      if (!gitConfigRecord.connected) {
        throw new AppError('Git repository is not connected', 400);
      }

      const repoPath = getWorkflowRepoPath(workflowId);

      // Check if repository directory exists
      const repoExists = await fs.pathExists(repoPath);
      if (!repoExists) {
        throw new AppError('Git repository directory not found', 404);
      }

      // Check if branch already exists
      const existingBranches = await git.listBranches({
        fs,
        dir: repoPath,
      });

      if (existingBranches.includes(branchName)) {
        throw new AppError(`Branch '${branchName}' already exists`, 400);
      }

      // Create the branch (Requirement 6.1)
      await git.branch({
        fs,
        dir: repoPath,
        ref: branchName,
        checkout: true, // Automatically switch to the new branch
      });

      logger.info(`Branch ${branchName} created successfully`);

      // Update configuration to reflect current branch (Requirement 6.1)
      await db
        .update(workflowGitConfigs)
        .set({
          branch: branchName,
          updatedAt: new Date(),
        })
        .where(eq(workflowGitConfigs.id, gitConfigRecord.id));

      // Get last commit for the new branch
      let lastCommit: GitCommit | undefined;
      try {
        const commits = await git.log({
          fs,
          dir: repoPath,
          ref: branchName,
          depth: 1,
        });

        if (commits && commits.length > 0) {
          const commit = commits[0];
          lastCommit = {
            hash: commit.oid,
            message: commit.commit.message,
            author: commit.commit.author.name,
            timestamp: new Date(commit.commit.author.timestamp * 1000),
            parents: commit.commit.parent || [],
          };
        }
      } catch (error) {
        logger.warn('Failed to get last commit for new branch:', {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }

      return {
        name: branchName,
        current: true,
        remote: false,
        lastCommit,
      };
    } catch (error) {
      logger.error('Failed to create branch:', {
        workflowId,
        userId,
        branchName,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError('Failed to create branch', 500);
    }
  }

  /**
   * Switch to a different branch
   * 
   * @param workflowId - The workflow ID
   * @param userId - The user ID
   * @param branchName - Name of the branch to switch to
   * @returns Promise<void>
   * 
   * Requirements: 6.2, 6.4
   */
  async switchBranch(
    workflowId: string,
    userId: string,
    branchName: string
  ): Promise<void> {
    try {
      logger.info(`Switching to branch ${branchName} for workflow ${workflowId}`);

      // Get Git configuration
      const gitConfigRecord = await db.query.workflowGitConfigs.findFirst({
        where: and(
          eq(workflowGitConfigs.workflowId, workflowId),
          eq(workflowGitConfigs.userId, userId)
        ),
      });

      if (!gitConfigRecord) {
        throw new AppError('Git repository not configured for this workflow', 404);
      }

      if (!gitConfigRecord.connected) {
        throw new AppError('Git repository is not connected', 400);
      }

      const repoPath = getWorkflowRepoPath(workflowId);

      // Check if repository directory exists
      const repoExists = await fs.pathExists(repoPath);
      if (!repoExists) {
        throw new AppError('Git repository directory not found', 404);
      }

      // Check for uncommitted changes (Requirement 6.4)
      const status = await this.getStatus(workflowId, userId);
      if (status.modified) {
        throw new AppError(
          'Cannot switch branches with uncommitted changes. Please commit or discard your changes first.',
          400
        );
      }

      // Check if branch exists
      const branches = await git.listBranches({
        fs,
        dir: repoPath,
      });

      if (!branches.includes(branchName)) {
        // Check if it's a remote branch
        const remoteName = gitConfigRecord.remoteName || 'origin';
        const remoteBranches = await git.listBranches({
          fs,
          dir: repoPath,
          remote: remoteName,
        });

        if (remoteBranches.includes(branchName)) {
          // Create local branch from remote
          await git.branch({
            fs,
            dir: repoPath,
            ref: branchName,
            checkout: true,
          });
          logger.info(`Created local branch ${branchName} from remote`);
        } else {
          throw new AppError(`Branch '${branchName}' does not exist`, 404);
        }
      } else {
        // Switch to existing local branch (Requirement 6.2)
        await git.checkout({
          fs,
          dir: repoPath,
          ref: branchName,
        });
      }

      logger.info(`Switched to branch ${branchName}`);

      // Update configuration to reflect current branch
      await db
        .update(workflowGitConfigs)
        .set({
          branch: branchName,
          updatedAt: new Date(),
        })
        .where(eq(workflowGitConfigs.id, gitConfigRecord.id));

      // Load workflow configuration from the new branch (Requirement 6.2)
      // This will be handled by the frontend when it receives the success response
      // The frontend will need to reload the workflow data after branch switch

      logger.info(`Branch switch completed for workflow ${workflowId}`);
    } catch (error) {
      logger.error('Failed to switch branch:', {
        workflowId,
        userId,
        branchName,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError('Failed to switch branch', 500);
    }
  }

  /**
   * Get commit history for a workflow
   * 
   * @param workflowId - The workflow ID
   * @param userId - The user ID
   * @param options - History options for pagination
   * @returns Promise<GitCommit[]>
   * 
   * Requirements: 8.1, 8.4
   */
  async getCommitHistory(
    workflowId: string,
    userId: string,
    options?: HistoryOptions
  ): Promise<GitCommit[]> {
    try {
      logger.info(`Getting commit history for workflow ${workflowId}`);

      // Get Git configuration
      const gitConfigRecord = await db.query.workflowGitConfigs.findFirst({
        where: and(
          eq(workflowGitConfigs.workflowId, workflowId),
          eq(workflowGitConfigs.userId, userId)
        ),
      });

      if (!gitConfigRecord) {
        throw new AppError('Git repository not configured for this workflow', 404);
      }

      if (!gitConfigRecord.connected) {
        throw new AppError('Git repository is not connected', 400);
      }

      const repoPath = getWorkflowRepoPath(workflowId);

      // Check if repository directory exists
      const repoExists = await fs.pathExists(repoPath);
      if (!repoExists) {
        throw new AppError('Git repository directory not found', 404);
      }

      // Get commit history with pagination (Requirement 8.4)
      const depth = options?.limit || 50; // Default to 50 commits
      const skip = options?.offset || 0;

      try {
        const commits = await git.log({
          fs,
          dir: repoPath,
          ref: gitConfigRecord.branch,
          depth: depth + skip, // Get enough commits to skip
        });

        // Apply offset by slicing
        const paginatedCommits = commits.slice(skip, skip + depth);

        // Transform to GitCommit format (Requirement 8.1)
        const gitCommits: GitCommit[] = paginatedCommits.map((commit) => ({
          hash: commit.oid,
          message: commit.commit.message,
          author: commit.commit.author.name,
          timestamp: new Date(commit.commit.author.timestamp * 1000),
          parents: commit.commit.parent || [],
        }));

        logger.info(`Retrieved ${gitCommits.length} commits for workflow ${workflowId}`);
        return gitCommits;
      } catch (logError: any) {
        // If there are no commits yet, return empty array
        if (
          logError.message?.includes('no commits') ||
          logError.message?.includes('not found') ||
          logError.code === 'NotFoundError'
        ) {
          logger.info(`No commits found for workflow ${workflowId}`);
          return [];
        }
        throw logError;
      }
    } catch (error) {
      logger.error('Failed to get commit history:', {
        workflowId,
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError('Failed to get commit history', 500);
    }
  }

  /**
   * Revert workflow to a specific commit
   * Restores workflow configuration from specified commit
   * 
   * @param workflowId - The workflow ID
   * @param userId - The user ID
   * @param commitHash - Hash of commit to revert to
   * @param environment - Optional environment to revert for
   * @returns Promise<void>
   * 
   * Requirements: 8.3
   */
  async revertToCommit(
    workflowId: string,
    userId: string,
    commitHash: string,
    environment?: 'development' | 'staging' | 'production'
  ): Promise<void> {
    try {
      logger.info(`Reverting workflow ${workflowId} to commit ${commitHash}${environment ? ` (environment: ${environment}, file: workflow-${environment}.json)` : ''}`);

      // Get Git configuration
      const gitConfigRecord = await db.query.workflowGitConfigs.findFirst({
        where: and(
          eq(workflowGitConfigs.workflowId, workflowId),
          eq(workflowGitConfigs.userId, userId)
        ),
      });

      if (!gitConfigRecord) {
        throw new AppError('Git repository not configured for this workflow', 404);
      }

      if (!gitConfigRecord.connected) {
        throw new AppError('Git repository is not connected', 400);
      }

      const repoPath = getWorkflowRepoPath(workflowId);

      // Check if repository directory exists
      const repoExists = await fs.pathExists(repoPath);
      if (!repoExists) {
        throw new AppError('Git repository directory not found', 404);
      }

      // Check for uncommitted changes
      const status = await this.getStatus(workflowId, userId, undefined, environment);
      if (status.modified) {
        throw new AppError(
          'Cannot revert with uncommitted changes. Please commit or discard your changes first.',
          400
        );
      }

      // Verify commit exists
      try {
        await git.readCommit({
          fs,
          dir: repoPath,
          oid: commitHash,
        });
      } catch (error) {
        throw new AppError(`Commit ${commitHash} not found`, 404);
      }

      // Checkout the specific commit (Requirement 8.3)
      await git.checkout({
        fs,
        dir: repoPath,
        ref: commitHash,
        force: true, // Force checkout to overwrite local changes
      });

      logger.info(`Checked out commit ${commitHash}`);

      // Read workflow files from this commit (single file approach)
      const workflowFileName = environment ? `workflow-${environment}.json` : 'workflow.json';
      const workflowFiles: WorkflowFiles = {
        [workflowFileName]: await fs.readFile(path.join(repoPath, workflowFileName), 'utf-8'),
      };
      
      // Read README if it exists
      const readmePath = path.join(repoPath, 'README.md');
      if (await fs.pathExists(readmePath)) {
        workflowFiles['README.md'] = await fs.readFile(readmePath, 'utf-8');
      }

      // Deserialize workflow from files
      const revertedWorkflow = await this.workflowSerializer.filesToWorkflow(workflowFiles);

      // Return to the current branch (we don't want to stay in detached HEAD state)
      await git.checkout({
        fs,
        dir: repoPath,
        ref: gitConfigRecord.branch,
        force: true, // Force checkout to overwrite local changes
      });

      // Now write the reverted files back to the working directory
      for (const [filename, content] of Object.entries(workflowFiles)) {
        const filePath = path.join(repoPath, filename);
        await fs.writeFile(filePath, content, 'utf-8');
      }

      // Stage all changes
      const filesToStage = Object.keys(workflowFiles);
      for (const filepath of filesToStage) {
        await git.add({
          fs,
          dir: repoPath,
          filepath,
        });
      }

      // Create a revert commit
      const revertCommitHash = await git.commit({
        fs,
        dir: repoPath,
        message: `Revert to commit ${commitHash.substring(0, 7)}`,
        author: {
          name: userId, // TODO: Replace with actual user name
          email: `${userId}@workflow.local`, // TODO: Replace with actual user email
          timestamp: Math.floor(Date.now() / 1000),
        },
      });

      logger.info(`Created revert commit: ${revertCommitHash}`);

      // Update database
      const currentUnpushed = gitConfigRecord.unpushedCommits || 0;
      await db
        .update(workflowGitConfigs)
        .set({
          lastCommitHash: revertCommitHash,
          unpushedCommits: currentUnpushed + 1,
          lastSyncAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(workflowGitConfigs.id, gitConfigRecord.id));

      logger.info(`Workflow ${workflowId} reverted to commit ${commitHash}`);
    } catch (error) {
      logger.error('Failed to revert to commit:', {
        workflowId,
        userId,
        commitHash,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError('Failed to revert to commit', 500);
    }
  }

  /**
   * Create a new branch from a specific commit
   * 
   * @param workflowId - The workflow ID
   * @param userId - The user ID
   * @param commitHash - Hash of the commit to branch from
   * @param branchName - Name of the new branch
   * @returns Promise<GitBranch>
   * 
   * Requirements: 8.5
   */
  async createBranchFromCommit(
    workflowId: string,
    userId: string,
    commitHash: string,
    branchName: string
  ): Promise<GitBranch> {
    try {
      logger.info(`Creating branch ${branchName} from commit ${commitHash} for workflow ${workflowId}`);

      // Validate branch name
      if (!this.isValidBranchName(branchName)) {
        throw new AppError(
          'Invalid branch name. Branch names cannot contain spaces, special characters like ~, ^, :, ?, *, [, \\, or start with a dot or slash.',
          400
        );
      }

      // Get Git configuration
      const gitConfigRecord = await db.query.workflowGitConfigs.findFirst({
        where: and(
          eq(workflowGitConfigs.workflowId, workflowId),
          eq(workflowGitConfigs.userId, userId)
        ),
      });

      if (!gitConfigRecord) {
        throw new AppError('Git repository not configured for this workflow', 404);
      }

      if (!gitConfigRecord.connected) {
        throw new AppError('Git repository is not connected', 400);
      }

      const repoPath = getWorkflowRepoPath(workflowId);

      // Check if repository directory exists
      const repoExists = await fs.pathExists(repoPath);
      if (!repoExists) {
        throw new AppError('Git repository directory not found', 404);
      }

      // Check if branch already exists
      const existingBranches = await git.listBranches({
        fs,
        dir: repoPath,
      });

      if (existingBranches.includes(branchName)) {
        throw new AppError(`Branch '${branchName}' already exists`, 400);
      }

      // Verify commit exists
      let commitInfo;
      try {
        commitInfo = await git.readCommit({
          fs,
          dir: repoPath,
          oid: commitHash,
        });
      } catch (error) {
        throw new AppError(`Commit ${commitHash} not found`, 404);
      }

      // Create branch from the specific commit (Requirement 8.5)
      await git.branch({
        fs,
        dir: repoPath,
        ref: branchName,
        object: commitHash, // Create branch pointing to this commit
        checkout: false, // Don't switch to it automatically
      });

      logger.info(`Branch ${branchName} created from commit ${commitHash}`);

      // Get the commit details for the branch
      const lastCommit: GitCommit = {
        hash: commitInfo.oid,
        message: commitInfo.commit.message,
        author: commitInfo.commit.author.name,
        timestamp: new Date(commitInfo.commit.author.timestamp * 1000),
        parents: commitInfo.commit.parent || [],
      };

      return {
        name: branchName,
        current: false,
        remote: false,
        lastCommit,
      };
    } catch (error) {
      logger.error('Failed to create branch from commit:', {
        workflowId,
        userId,
        commitHash,
        branchName,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError('Failed to create branch from commit', 500);
    }
  }

  /**
   * Validate branch name against Git naming conventions
   * 
   * @param branchName - Branch name to validate
   * @returns boolean indicating if name is valid
   * 
   * Requirement 6.5: Validate branch names
   */
  private isValidBranchName(branchName: string): boolean {
    // Git branch naming rules:
    // - Cannot contain spaces
    // - Cannot contain special characters: ~, ^, :, ?, *, [, \
    // - Cannot start with a dot or slash
    // - Cannot end with a dot or slash
    // - Cannot contain consecutive dots (..)
    // - Cannot be empty

    if (!branchName || branchName.length === 0) {
      return false;
    }

    // Check for invalid characters
    const invalidChars = /[~^:?*[\\\s]/;
    if (invalidChars.test(branchName)) {
      return false;
    }

    // Check for starting/ending with dot or slash
    if (branchName.startsWith('.') || branchName.startsWith('/')) {
      return false;
    }

    if (branchName.endsWith('.') || branchName.endsWith('/')) {
      return false;
    }

    // Check for consecutive dots
    if (branchName.includes('..')) {
      return false;
    }

    // Check for @{ which is reserved
    if (branchName.includes('@{')) {
      return false;
    }

    return true;
  }

  /**
   * Handle Git operation errors and provide user-friendly messages
   * 
   * @param error - The error that occurred
   * @param operation - The operation that failed
   * @returns AppError with appropriate message
   */
  private handleGitError(error: any, operation: string): AppError {
    logger.error(`Git ${operation} failed:`, error);

    // Check for common Git errors
    if (error.code === 'ENOENT') {
      return new AppError('Git repository not found', 404);
    }

    if (error.code === 'EACCES' || error.code === 'EPERM') {
      return new AppError('Permission denied accessing Git repository', 403);
    }

    if (error.message?.includes('authentication') || error.message?.includes('401')) {
      return new AppError('Git authentication failed. Please check your credentials.', 401);
    }

    if (error.message?.includes('network') || error.message?.includes('ENOTFOUND')) {
      return new AppError('Network error connecting to Git repository', 503);
    }

    // Generic error
    return new AppError(`Git ${operation} failed: ${error.message || 'Unknown error'}`, 500);
  }
}
