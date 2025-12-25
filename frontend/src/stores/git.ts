/**
 * Git State Management Store
 * 
 * Zustand store for managing Git version control state in the workflow editor.
 * Handles connection status, branches, changes, commits, and Git operations.
 * 
 * Requirements: 1.4, 4.1, 4.2, 4.3
 */

import { persist } from 'zustand/middleware';
import { shallow } from 'zustand/shallow';
import { createWithEqualityFn } from 'zustand/traditional';
import {
  gitService,
  GitRepositoryInfo,
  GitStatus,
  GitCommit,
  GitBranch,
  GitConnectionConfig,
  PushOptions,
  PullOptions,
  PushResult,
  PullResult,
  WorkflowData,
  ConflictFile,
} from '@/services/git.service';
import { EnvironmentType } from '@nodedrop/types';

/**
 * Git Store State Interface
 */
interface GitStore {
  // Connection state
  repositoryInfo: GitRepositoryInfo | null;
  isConnected: boolean;
  isConnecting: boolean;
  connectionError: string | null;

  // Environment state
  activeEnvironment: EnvironmentType | null;

  // Git status state
  status: GitStatus | null;
  isLoadingStatus: boolean;
  statusError: string | null;
  lastStatusUpdate: Date | null;

  // Branch state
  branches: GitBranch[];
  currentBranch: string | null;
  isLoadingBranches: boolean;
  branchesError: string | null;

  // Commit history state
  commits: GitCommit[];
  isLoadingCommits: boolean;
  commitsError: string | null;
  selectedCommit: GitCommit | null;

  // Operation states
  isCommitting: boolean;
  isPushing: boolean;
  isPulling: boolean;
  isSwitchingBranch: boolean;
  isCreatingBranch: boolean;
  operationError: string | null;

  // Last operation results
  lastPushResult: PushResult | null;
  lastPullResult: PullResult | null;

  // Conflict resolution state
  conflicts: ConflictFile[];
  hasConflicts: boolean;
  isLoadingConflicts: boolean;
  isResolvingConflicts: boolean;
  conflictsError: string | null;

  // Actions - Connection Management
  connectRepository: (workflowId: string, config: GitConnectionConfig) => Promise<void>;
  disconnectRepository: (workflowId: string) => Promise<void>;
  initRepository: (workflowId: string) => Promise<void>;
  getRepositoryInfo: (workflowId: string) => Promise<void>;

  // Actions - Status Management
  refreshStatus: (workflowId: string, workflow?: any, environment?: EnvironmentType) => Promise<void>;
  clearStatus: () => void;

  // Actions - Environment
  setActiveEnvironment: (environment: EnvironmentType | null) => void;

  // Actions - Branch Management
  loadBranches: (workflowId: string) => Promise<void>;
  createBranch: (workflowId: string, branchName: string) => Promise<void>;
  switchBranch: (workflowId: string, branchName: string) => Promise<void>;
  setCurrentBranch: (branchName: string) => void;

  // Actions - Commit Operations
  commit: (workflowId: string, message: string, workflow: WorkflowData, environment?: EnvironmentType) => Promise<void>;
  loadCommitHistory: (workflowId: string, limit?: number, offset?: number) => Promise<void>;
  selectCommit: (commit: GitCommit | null) => void;
  revertToCommit: (workflowId: string, commitHash: string) => Promise<void>;
  createBranchFromCommit: (workflowId: string, commitHash: string, branchName: string) => Promise<void>;

  // Actions - Push/Pull Operations
  push: (workflowId: string, options?: PushOptions) => Promise<void>;
  pull: (workflowId: string, options?: PullOptions) => Promise<void>;
  sync: (workflowId: string) => Promise<void>;

  // Actions - Conflict Resolution
  loadConflicts: (workflowId: string) => Promise<void>;
  resolveConflicts: (workflowId: string, resolutions: Map<string, string>) => Promise<void>;
  clearConflicts: () => void;

  // Actions - Error Handling
  clearErrors: () => void;
  setOperationError: (error: string | null) => void;

  // Actions - Reset
  reset: () => void;
}

/**
 * Initial state
 */
const initialState = {
  // Connection state
  repositoryInfo: null,
  isConnected: false,
  isConnecting: false,
  connectionError: null,

  // Environment state
  activeEnvironment: null,

  // Git status state
  status: null,
  isLoadingStatus: false,
  statusError: null,
  lastStatusUpdate: null,

  // Branch state
  branches: [],
  currentBranch: null,
  isLoadingBranches: false,
  branchesError: null,

  // Commit history state
  commits: [],
  isLoadingCommits: false,
  commitsError: null,
  selectedCommit: null,

  // Operation states
  isCommitting: false,
  isPushing: false,
  isPulling: false,
  isSwitchingBranch: false,
  isCreatingBranch: false,
  operationError: null,

  // Last operation results
  lastPushResult: null,
  lastPullResult: null,

  // Conflict resolution state
  conflicts: [],
  hasConflicts: false,
  isLoadingConflicts: false,
  isResolvingConflicts: false,
  conflictsError: null,
};

/**
 * Git Store Implementation
 */
export const useGitStore = createWithEqualityFn<GitStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Connection Management Actions

      /**
       * Initialize a new Git repository for a workflow
       * Requirements:1.1
       */
      initRepository: async (workflowId: string) => {
        set({ isConnecting: true, connectionError: null });

        try {
          const repositoryInfo = await gitService.initRepository(workflowId);

          set({
            repositoryInfo,
            isConnected: true,
            isConnecting: false,
            currentBranch: repositoryInfo.branch,
          });

          // Load initial status
          await get().refreshStatus(workflowId);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to initialize repository';
          set({
            connectionError: errorMessage,
            isConnecting: false,
            isConnected: false,
          });
          throw error;
        }
      },

      /**
       * Connect a workflow to a remote Git repository
       * Requirements: 1.2, 1.3, 5.1, 5.4
       */
      connectRepository: async (workflowId: string, config: GitConnectionConfig) => {
        set({ isConnecting: true, connectionError: null });

        try {
          const repositoryInfo = await gitService.connectRepository(workflowId, config);

          set({
            repositoryInfo,
            isConnected: true,
            isConnecting: false,
            currentBranch: repositoryInfo.branch,
          });

          // Load initial data
          await Promise.all([
            get().refreshStatus(workflowId),
            get().loadBranches(workflowId),
            get().loadCommitHistory(workflowId),
          ]);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to connect repository';
          set({
            connectionError: errorMessage,
            isConnecting: false,
            isConnected: false,
          });
          throw error;
        }
      },

      /**
       * Disconnect a workflow from its Git repository
       * Requirements: 1.3
       */
      disconnectRepository: async (workflowId: string) => {
        try {
          await gitService.disconnectRepository(workflowId);

          // Reset to initial state
          set({
            ...initialState,
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to disconnect repository';
          set({ connectionError: errorMessage });
          throw error;
        }
      },

      /**
       * Get repository information for a workflow
       * Requirements: 1.4
       */
      getRepositoryInfo: async (workflowId: string) => {
        set({ isConnecting: true, connectionError: null });

        try {
          const repositoryInfo = await gitService.getRepositoryInfo(workflowId);

          set({
            repositoryInfo,
            isConnected: repositoryInfo.connected,
            isConnecting: false,
            currentBranch: repositoryInfo.branch,
          });

          // If connected, load additional data
          if (repositoryInfo.connected) {
            await Promise.all([
              get().refreshStatus(workflowId),
              get().loadBranches(workflowId),
            ]);
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to fetch repository info';
          set({
            connectionError: errorMessage,
            isConnecting: false,
            isConnected: false,
          });
          // Don't throw - this is used for checking connection status
        }
      },

      // Status Management Actions

      /**
       * Refresh Git status for a workflow
       * Requirements: 2.1, 4.1, 4.2, 4.3
       */
      refreshStatus: async (workflowId: string, workflow?: any, environment?: EnvironmentType) => {
        set({ isLoadingStatus: true, statusError: null });

        try {
          const envStr = environment === 'DEVELOPMENT' ? 'development' :
                       environment === 'STAGING' ? 'staging' :
                       environment === 'PRODUCTION' ? 'production' : undefined;
          const status = await gitService.getStatus(workflowId, workflow, envStr);

          set({
            status,
            isLoadingStatus: false,
            lastStatusUpdate: new Date(),
          });

          // Update repository info with latest sync data
          if (get().repositoryInfo) {
            set({
              repositoryInfo: {
                ...get().repositoryInfo!,
                unpushedCommits: status.unpushedCommits,
              },
            });
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to fetch Git status';
          set({
            statusError: errorMessage,
            isLoadingStatus: false,
          });
          throw error;
        }
      },

      /**
       * Clear Git status
       */
      clearStatus: () => {
        set({
          status: null,
          statusError: null,
          lastStatusUpdate: null,
        });
      },

      // Branch Management Actions

      /**
       * Load all branches (local and remote)
       * Requirements: 6.3
       */
      loadBranches: async (workflowId: string) => {
        set({ isLoadingBranches: true, branchesError: null });

        try {
          const branches = await gitService.listBranches(workflowId);

          // Find current branch
          const currentBranch = branches.find(b => b.current);

          set({
            branches,
            currentBranch: currentBranch?.name || get().currentBranch,
            isLoadingBranches: false,
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to load branches';
          set({
            branchesError: errorMessage,
            isLoadingBranches: false,
          });
          throw error;
        }
      },

      /**
       * Create a new branch
       * Requirements: 6.1, 6.5
       */
      createBranch: async (workflowId: string, branchName: string) => {
        set({ isCreatingBranch: true, operationError: null });

        try {
          const newBranch = await gitService.createBranch(workflowId, branchName);

          // Add to branches list and set as current
          set({
            branches: [...get().branches, newBranch],
            currentBranch: newBranch.name,
            isCreatingBranch: false,
          });

          // Refresh status after branch creation
          await get().refreshStatus(workflowId);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to create branch';
          set({
            operationError: errorMessage,
            isCreatingBranch: false,
          });
          throw error;
        }
      },

      /**
       * Switch to a different branch
       * Requirements: 6.2, 6.4
       */
      switchBranch: async (workflowId: string, branchName: string) => {
        set({ isSwitchingBranch: true, operationError: null });

        try {
          await gitService.switchBranch(workflowId, branchName);

          set({
            currentBranch: branchName,
            isSwitchingBranch: false,
          });

          // Refresh data after branch switch
          await Promise.all([
            get().refreshStatus(workflowId),
            get().loadCommitHistory(workflowId),
          ]);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to switch branch';
          set({
            operationError: errorMessage,
            isSwitchingBranch: false,
          });
          throw error;
        }
      },

      /**
       * Set current branch (for UI updates)
       */
      setCurrentBranch: (branchName: string) => {
        set({ currentBranch: branchName });
      },

      // Commit Operations Actions

      /**
       * Create a commit with workflow changes
       * Requirements: 2.2, 2.3, 2.4
       */
      commit: async (workflowId: string, message: string, workflow: WorkflowData, environment?: EnvironmentType) => {
        set({ isCommitting: true, operationError: null, activeEnvironment: environment || null });

        try {
          const envStr = environment === 'DEVELOPMENT' ? 'development' :
                       environment === 'STAGING' ? 'staging' :
                       environment === 'PRODUCTION' ? 'production' : undefined;
          const commit = await gitService.commit(workflowId, message, workflow, envStr);

          // Add commit to history
          set({
            commits: [commit, ...get().commits],
            isCommitting: false,
          });

          // Refresh status to update changes
          await get().refreshStatus(workflowId);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to create commit';
          set({
            operationError: errorMessage,
            isCommitting: false,
          });
          throw error;
        }
      },

      /**
       * Set active environment for Git operations
       */
      setActiveEnvironment: (environment: EnvironmentType | null) => {
        set({ activeEnvironment: environment });
      },

      /**
       * Load commit history
       * Requirements: 8.1, 8.4
       */
      loadCommitHistory: async (workflowId: string, limit?: number, offset?: number) => {
        set({ isLoadingCommits: true, commitsError: null });

        try {
          const commits = await gitService.getCommitHistory(workflowId, { limit, offset });

          set({
            commits,
            isLoadingCommits: false,
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to load commit history';
          set({
            commitsError: errorMessage,
            isLoadingCommits: false,
          });
          throw error;
        }
      },

      /**
       * Select a commit for viewing details
       * Requirements: 8.2
       */
      selectCommit: (commit: GitCommit | null) => {
        set({ selectedCommit: commit });
      },

      /**
       * Revert workflow to a specific commit
       * Requirements: 8.3
       */
      revertToCommit: async (workflowId: string, commitHash: string) => {
        set({ operationError: null });

        try {
          await gitService.revertToCommit(workflowId, commitHash);

          // Refresh status and history after revert
          await Promise.all([
            get().refreshStatus(workflowId),
            get().loadCommitHistory(workflowId),
          ]);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to revert to commit';
          set({ operationError: errorMessage });
          throw error;
        }
      },

      /**
       * Create a new branch from a specific commit
       * Requirements: 8.5
       */
      createBranchFromCommit: async (
        workflowId: string,
        commitHash: string,
        branchName: string
      ) => {
        set({ isCreatingBranch: true, operationError: null });

        try {
          const newBranch = await gitService.createBranchFromCommit(
            workflowId,
            commitHash,
            branchName
          );

          // Add to branches list
          set({
            branches: [...get().branches, newBranch],
            isCreatingBranch: false,
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to create branch from commit';
          set({
            operationError: errorMessage,
            isCreatingBranch: false,
          });
          throw error;
        }
      },

      // Push/Pull Operations Actions

      /**
       * Push local commits to remote repository
       * Requirements: 3.1, 3.2, 3.3, 3.4
       */
      push: async (workflowId: string, options?: PushOptions) => {
        set({ isPushing: true, operationError: null, lastPushResult: null });

        try {
          const result = await gitService.push(workflowId, options);

          set({
            lastPushResult: result,
            isPushing: false,
          });

          // Refresh status after push
          await get().refreshStatus(workflowId);

          if (!result.success) {
            throw new Error(result.error || 'Push failed');
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to push commits';
          set({
            operationError: errorMessage,
            isPushing: false,
            lastPushResult: {
              success: false,
              pushed: 0,
              error: errorMessage,
            },
          });
          throw error;
        }
      },

      /**
       * Pull changes from remote repository
       * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5
       */
      pull: async (workflowId: string, options?: PullOptions) => {
        set({ isPulling: true, operationError: null, lastPullResult: null });

        try {
          // Add environment to pull options
          const activeEnv = get().activeEnvironment;
          const envStr = activeEnv === 'DEVELOPMENT' ? 'development' :
                       activeEnv === 'STAGING' ? 'staging' :
                       activeEnv === 'PRODUCTION' ? 'production' : undefined;
          
          const pullOptions: PullOptions | undefined = envStr ? { ...options, environment: envStr } : options;
          
          const result = await gitService.pull(workflowId, pullOptions);

          set({
            lastPullResult: result,
            isPulling: false,
          });

          // If conflicts detected, load conflict details
          if (result.conflicts) {
            await get().loadConflicts(workflowId);
          }

          // Refresh data after pull
          await Promise.all([
            get().refreshStatus(workflowId, undefined, get().activeEnvironment || undefined),
            get().loadCommitHistory(workflowId),
          ]);

          if (!result.success) {
            throw new Error(result.error || 'Pull failed');
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to pull changes';
          set({
            operationError: errorMessage,
            isPulling: false,
            lastPullResult: {
              success: false,
              conflicts: false,
              commits: [],
              error: errorMessage,
            },
          });
          throw error;
        }
      },

      /**
       * Sync with remote (pull then push)
       * Requirements: 3.1, 7.1
       */
      sync: async (workflowId: string) => {
        try {
          // First pull changes
          await get().pull(workflowId);

          // Then push local commits
          await get().push(workflowId);
        } catch (error) {
          // Error already set by pull or push
          throw error;
        }
      },

      // Conflict Resolution Actions

      /**
       * Load conflicts for a workflow
       * Requirements: 3.4, 7.3
       */
      loadConflicts: async (workflowId: string) => {
        set({ isLoadingConflicts: true, conflictsError: null });

        try {
          const conflicts = await gitService.getConflicts(workflowId);

          set({
            conflicts,
            hasConflicts: conflicts.length > 0,
            isLoadingConflicts: false,
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to load conflicts';
          set({
            conflictsError: errorMessage,
            isLoadingConflicts: false,
            hasConflicts: false,
          });
          throw error;
        }
      },

      /**
       * Resolve conflicts with provided resolutions
       * Requirements: 3.4, 7.3
       */
      resolveConflicts: async (workflowId: string, resolutions: Map<string, string>) => {
        set({ isResolvingConflicts: true, conflictsError: null });

        try {
          await gitService.resolveConflicts(workflowId, resolutions);

          // Clear conflicts after successful resolution
          set({
            conflicts: [],
            hasConflicts: false,
            isResolvingConflicts: false,
          });

          // Refresh status after conflict resolution
          await get().refreshStatus(workflowId);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to resolve conflicts';
          set({
            conflictsError: errorMessage,
            isResolvingConflicts: false,
          });
          throw error;
        }
      },

      /**
       * Clear conflicts state
       */
      clearConflicts: () => {
        set({
          conflicts: [],
          hasConflicts: false,
          conflictsError: null,
        });
      },

      // Error Handling Actions

      /**
       * Clear all error states
       */
      clearErrors: () => {
        set({
          connectionError: null,
          statusError: null,
          branchesError: null,
          commitsError: null,
          operationError: null,
        });
      },

      /**
       * Set operation error
       */
      setOperationError: (error: string | null) => {
        set({ operationError: error });
      },

      // Reset Action

      /**
       * Reset store to initial state
       */
      reset: () => {
        set(initialState);
      },
    }),
    {
      name: 'git-store', // localStorage key
      partialize: (state) => ({
        // Persist connection info for reconnection
        repositoryInfo: state.repositoryInfo,
        isConnected: state.isConnected,
        currentBranch: state.currentBranch,
        activeEnvironment: state.activeEnvironment,
      }),
    }
  ),
  shallow
);
