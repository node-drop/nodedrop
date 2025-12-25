/**
 * Git Service
 * 
 * Frontend service for Git version control operations on workflows.
 * Provides API client methods for all Git operations with error handling
 * and response transformation.
 * 
 * Requirements: All (1.1-8.5)
 */

import { apiClient } from './api';

/**
 * Git Type Definitions
 */

// Git credential from the unified credentials table
export interface GitCredential {
  id: string;
  name: string;
  type: 'githubOAuth2' | 'gitlabOAuth2' | 'bitbucketOAuth2' | 'githubPAT' | 'gitlabPAT' | 'bitbucketPAT';
  userId: string;
  workspaceId?: string;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  isOwner?: boolean;
  permission?: string;
}

// Git credential types (legacy - for backward compatibility)
export type GitCredentialType = 'personal_access_token' | 'oauth';
export type GitProvider = 'github' | 'gitlab' | 'bitbucket';

export interface GitCredentials {
  type: GitCredentialType;
  token: string;
  provider: GitProvider;
  refreshToken?: string;
  expiresAt?: Date;
}

// Git connection configuration
export interface GitConnectionConfig {
  repositoryUrl: string;
  branch?: string;
  credentialId: string; // Now uses credentialId instead of raw credentials
}

// Git repository information
export interface GitRepositoryInfo {
  workflowId: string;
  repositoryUrl: string;
  branch: string;
  connected: boolean;
  lastSyncAt?: Date;
  lastCommitHash?: string;
  unpushedCommits: number;
}

// Git status
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

export interface GitChange {
  path: string;
  type: 'added' | 'modified' | 'deleted';
  staged: boolean;
}

// Git commit
export interface GitCommit {
  hash: string;
  message: string;
  author: string;
  timestamp: Date;
  parents: string[];
}

// Git branch
export interface GitBranch {
  name: string;
  current: boolean;
  remote: boolean;
  lastCommit?: GitCommit;
}

// Git operation options
export interface PushOptions {
  force?: boolean;
  remote?: string;
  branch?: string;
}

export interface PushResult {
  success: boolean;
  pushed: number;
  error?: string;
}

export interface PullOptions {
  remote?: string;
  branch?: string;
  strategy?: 'merge' | 'rebase';
  environment?: 'development' | 'staging' | 'production';
}

export interface PullResult {
  success: boolean;
  conflicts: boolean;
  conflictFiles?: string[];
  commits: GitCommit[];
  error?: string;
}

export interface HistoryOptions {
  limit?: number;
  offset?: number;
}

// Workflow data for commit
export interface WorkflowData {
  id: string;
  name: string;
  description?: string;
  category?: string;
  tags: string[];
  nodes: any[];
  connections: any[];
  triggers: any[];
  settings: any;
}

// Conflict resolution
export interface ConflictFile {
  path: string;
  ours: string;
  theirs: string;
  base?: string;
  resolved: boolean;
  resolution?: string;
}

/**
 * Request/Response Types
 */

interface InitRepositoryRequest {
  workflowId: string;
}

interface ConnectRepositoryRequest {
  workflowId: string;
  repositoryUrl: string;
  branch?: string;
  credentialId: string; // Now uses credentialId
}

interface DisconnectRepositoryRequest {
  workflowId: string;
}

interface CommitRequest {
  workflowId: string;
  message: string;
  workflow: WorkflowData;
  environment?: 'development' | 'staging' | 'production';
}

interface PushRequest {
  workflowId: string;
  force?: boolean;
  remote?: string;
  branch?: string;
}

interface PullRequest {
  workflowId: string;
  remote?: string;
  branch?: string;
  strategy?: 'merge' | 'rebase';
  environment?: 'development' | 'staging' | 'production';
}

interface CreateBranchRequest {
  workflowId: string;
  branchName: string;
}

interface SwitchBranchRequest {
  workflowId: string;
  branchName: string;
}

interface RevertRequest {
  workflowId: string;
  commitHash: string;
}

interface CreateBranchFromCommitRequest {
  workflowId: string;
  commitHash: string;
  branchName: string;
}

/**
 * Git Service Class
 */
export class GitService {
  /**
   * Get available Git credentials for the authenticated user
   * 
   * Requirements: 5.1
   * 
   * @returns List of Git credentials
   */
  async getGitCredentials(): Promise<GitCredential[]> {
    const response = await apiClient.get<GitCredential[]>('/git/credentials');
    
    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to fetch Git credentials');
    }
    
    return response.data.map(cred => ({
      ...cred,
      createdAt: new Date(cred.createdAt),
      updatedAt: new Date(cred.updatedAt),
      expiresAt: cred.expiresAt ? new Date(cred.expiresAt) : undefined,
    }));
  }

  /**
   * Initialize a new Git repository for a workflow
   * 
   * Requirements: 1.1
   * 
   * @param workflowId - The workflow ID
   * @returns Repository information
   */
  async initRepository(workflowId: string): Promise<GitRepositoryInfo> {
    const request: InitRepositoryRequest = { workflowId };
    
    const response = await apiClient.post<GitRepositoryInfo>('/git/init', request);
    
    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to initialize repository');
    }
    
    return this.transformRepositoryInfo(response.data);
  }

  /**
   * Connect a workflow to a remote Git repository
   * 
   * Requirements: 1.2, 1.3, 5.1, 5.4
   * 
   * @param workflowId - The workflow ID
   * @param config - Connection configuration with repository URL and credentialId
   * @returns Repository information
   */
  async connectRepository(
    workflowId: string,
    config: GitConnectionConfig
  ): Promise<GitRepositoryInfo> {
    const request: ConnectRepositoryRequest = {
      workflowId,
      repositoryUrl: config.repositoryUrl,
      branch: config.branch,
      credentialId: config.credentialId,
    };
    
    const response = await apiClient.post<GitRepositoryInfo>('/git/connect', request);
    
    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to connect repository');
    }
    
    return this.transformRepositoryInfo(response.data);
  }

  /**
   * Disconnect a workflow from its Git repository
   * 
   * Requirements: 1.3
   * 
   * @param workflowId - The workflow ID
   */
  async disconnectRepository(workflowId: string): Promise<void> {
    const request: DisconnectRepositoryRequest = { workflowId };
    
    const response = await apiClient.post('/git/disconnect', request);
    
    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to disconnect repository');
    }
  }

  /**
   * Get Git repository information for a workflow
   * 
   * Requirements: 1.4
   * 
   * @param workflowId - The workflow ID
   * @returns Repository information
   */
  async getRepositoryInfo(workflowId: string): Promise<GitRepositoryInfo> {
    const response = await apiClient.get<GitRepositoryInfo>(`/git/info/${workflowId}`);
    
    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to fetch repository info');
    }
    
    return this.transformRepositoryInfo(response.data);
  }

  /**
   * Get Git status for a workflow
   * 
   * Requirements: 2.1, 4.1, 4.2, 4.3
   * 
   * @param workflowId - The workflow ID
   * @param workflow - Optional current workflow data for change detection
   * @param environment - Optional environment for environment-specific status
   * @returns Git status with changes and sync information
   */
  async getStatus(workflowId: string, workflow?: any, environment?: 'development' | 'staging' | 'production'): Promise<GitStatus> {
    const response = await apiClient.post<GitStatus>('/git/status', {
      workflowId,
      workflow,
      environment,
    });
    
    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to fetch Git status');
    }
    
    return response.data;
  }

  /**
   * Get workflow data from Git repository
   * 
   * Requirements: 7.1
   * 
   * @param workflowId - The workflow ID
   * @param environment - Optional environment to load specific workflow from
   * @returns Workflow data from Git
   */
  async getWorkflowFromGit(workflowId: string, environment?: 'development' | 'staging' | 'production'): Promise<any> {
    const params = environment ? { environment } : {};
    const response = await apiClient.get<any>(`/git/workflow/${workflowId}`, { params });
    
    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to load workflow from Git');
    }
    
    return response.data;
  }

  /**
   * Get diff for a specific file
   * 
   * Requirements: 2.1
   * 
   * @param workflowId - The workflow ID
   * @param filePath - Path to the file to diff
   * @param workflow - Optional current workflow data for comparison
   * @param environment - Optional environment for environment-specific diffs
   * @returns Old and new content for comparison
   */
  async getDiff(
    workflowId: string,
    filePath: string,
    workflow?: any,
    environment?: 'development' | 'staging' | 'production'
  ): Promise<{ oldContent: string | null; newContent: string | null }> {
    const response = await apiClient.post<{ oldContent: string | null; newContent: string | null }>(
      '/git/diff',
      {
        workflowId,
        filePath,
        workflow,
        environment,
      }
    );
    
    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to get diff');
    }
    
    return response.data;
  }

  /**
   * Create a commit with workflow changes
   * 
   * Requirements: 2.2, 2.3, 2.4
   * 
   * @param workflowId - The workflow ID
   * @param message - Commit message
   * @param workflow - Workflow data to commit
   * @param environment - Optional environment for environment-specific commits
   * @returns Created commit information
   */
  async commit(
    workflowId: string,
    message: string,
    workflow: WorkflowData,
    environment?: 'development' | 'staging' | 'production'
  ): Promise<GitCommit> {
    const request: CommitRequest = {
      workflowId,
      message,
      workflow,
      environment,
    };
    
    const response = await apiClient.post<GitCommit>('/git/commit', request);
    
    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to create commit');
    }
    
    return this.transformCommit(response.data);
  }

  /**
   * Push local commits to remote repository
   * 
   * Requirements: 3.1, 3.2, 3.3, 3.4
   * 
   * @param workflowId - The workflow ID
   * @param options - Push options (force, remote, branch)
   * @returns Push result with success status
   */
  async push(workflowId: string, options?: PushOptions): Promise<PushResult> {
    const request: PushRequest = {
      workflowId,
      ...options,
    };
    
    const response = await apiClient.post<PushResult>('/git/push', request);
    
    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to push commits');
    }
    
    return response.data;
  }

  /**
   * Pull changes from remote repository
   * 
   * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5
   * 
   * @param workflowId - The workflow ID
   * @param options - Pull options (remote, branch, strategy)
   * @returns Pull result with conflicts information
   */
  async pull(workflowId: string, options?: PullOptions): Promise<PullResult> {
    const request: PullRequest = {
      workflowId,
      ...options,
    };
    
    const response = await apiClient.post<PullResult>('/git/pull', request);
    
    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to pull changes');
    }
    
    return {
      ...response.data,
      commits: response.data.commits.map(commit => this.transformCommit(commit)),
    };
  }

  /**
   * List all branches (local and remote)
   * 
   * Requirements: 6.3
   * 
   * @param workflowId - The workflow ID
   * @returns Array of branches
   */
  async listBranches(workflowId: string): Promise<GitBranch[]> {
    const response = await apiClient.get<GitBranch[]>(`/git/branches/${workflowId}`);
    
    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to list branches');
    }
    
    return response.data.map(branch => ({
      ...branch,
      lastCommit: branch.lastCommit ? this.transformCommit(branch.lastCommit) : undefined,
    }));
  }

  /**
   * Create a new branch
   * 
   * Requirements: 6.1, 6.5
   * 
   * @param workflowId - The workflow ID
   * @param branchName - Name for the new branch
   * @returns Created branch information
   */
  async createBranch(workflowId: string, branchName: string): Promise<GitBranch> {
    const request: CreateBranchRequest = {
      workflowId,
      branchName,
    };
    
    const response = await apiClient.post<GitBranch>('/git/branches', request);
    
    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to create branch');
    }
    
    return {
      ...response.data,
      lastCommit: response.data.lastCommit ? this.transformCommit(response.data.lastCommit) : undefined,
    };
  }

  /**
   * Switch to a different branch
   * 
   * Requirements: 6.2, 6.4
   * 
   * @param workflowId - The workflow ID
   * @param branchName - Name of the branch to switch to
   */
  async switchBranch(workflowId: string, branchName: string): Promise<void> {
    const request: SwitchBranchRequest = {
      workflowId,
      branchName,
    };
    
    const response = await apiClient.put('/git/branches/switch', request);
    
    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to switch branch');
    }
  }

  /**
   * Get commit history for a workflow
   * 
   * Requirements: 8.1, 8.4
   * 
   * @param workflowId - The workflow ID
   * @param options - History options (limit, offset for pagination)
   * @returns Array of commits
   */
  async getCommitHistory(
    workflowId: string,
    options?: HistoryOptions
  ): Promise<GitCommit[]> {
    const response = await apiClient.get<GitCommit[]>(`/git/history/${workflowId}`, {
      params: options,
    });
    
    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to fetch commit history');
    }
    
    return response.data.map(commit => this.transformCommit(commit));
  }

  /**
   * Revert workflow to a specific commit
   * 
   * Requirements: 8.3
   * 
   * @param workflowId - The workflow ID
   * @param commitHash - Hash of the commit to revert to
   */
  async revertToCommit(workflowId: string, commitHash: string): Promise<void> {
    const request: RevertRequest = {
      workflowId,
      commitHash,
    };
    
    const response = await apiClient.post('/git/revert', request);
    
    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to revert to commit');
    }
  }

  /**
   * Create a new branch from a specific commit
   * 
   * Requirements: 8.5
   * 
   * @param workflowId - The workflow ID
   * @param commitHash - Hash of the commit to branch from
   * @param branchName - Name for the new branch
   * @returns Created branch information
   */
  async createBranchFromCommit(
    workflowId: string,
    commitHash: string,
    branchName: string
  ): Promise<GitBranch> {
    const request: CreateBranchFromCommitRequest = {
      workflowId,
      commitHash,
      branchName,
    };
    
    const response = await apiClient.post<GitBranch>('/git/branches/from-commit', request);
    
    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to create branch from commit');
    }
    
    return {
      ...response.data,
      lastCommit: response.data.lastCommit ? this.transformCommit(response.data.lastCommit) : undefined,
    };
  }

  /**
   * Get conflict details for a workflow
   * 
   * Requirements: 3.4, 7.3
   * 
   * @param workflowId - The workflow ID
   * @returns Array of conflict files
   */
  async getConflicts(workflowId: string): Promise<ConflictFile[]> {
    const response = await apiClient.get<ConflictFile[]>(`/git/conflicts/${workflowId}`);
    
    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to fetch conflicts');
    }
    
    return response.data;
  }

  /**
   * Resolve conflicts with provided resolutions
   * 
   * Requirements: 3.4, 7.3
   * 
   * @param workflowId - The workflow ID
   * @param resolutions - Map of file paths to resolved content
   */
  async resolveConflicts(
    workflowId: string,
    resolutions: Map<string, string>
  ): Promise<void> {
    const request = {
      workflowId,
      resolutions: Object.fromEntries(resolutions),
    };
    
    const response = await apiClient.post('/git/conflicts/resolve', request);
    
    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to resolve conflicts');
    }
  }

  /**
   * Transform repository info to ensure Date objects
   * 
   * @private
   */
  private transformRepositoryInfo(data: any): GitRepositoryInfo {
    return {
      ...data,
      lastSyncAt: data.lastSyncAt ? new Date(data.lastSyncAt) : undefined,
    };
  }

  /**
   * Transform commit to ensure Date objects
   * 
   * @private
   */
  private transformCommit(commit: any): GitCommit {
    return {
      ...commit,
      timestamp: new Date(commit.timestamp),
    };
  }
}

// Export singleton instance
export const gitService = new GitService();
