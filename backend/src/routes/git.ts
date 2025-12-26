/**
 * Git API Routes
 * 
 * Provides REST API endpoints for Git version control operations on workflows.
 * All routes require authentication and workspace context.
 * 
 * Requirements: All (1.1-8.5)
 */

import { Response, Router } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { validateBody, validateParams, validateQuery } from '../middleware/validation';
import { requireWorkspace, WorkspaceRequest } from '../middleware/workspace';
import { GitService } from '../services/git/GitService';
import { ApiResponse } from '../types/api';
import { AppError } from '../utils/errors';
import { z } from 'zod';

const router = Router();
const gitService = new GitService();

// Import CredentialService for listing Git credentials
import { getCredentialService } from '../services/CredentialService.factory';

/**
 * Validation Schemas
 */

// Schema for repository initialization
const InitRepositorySchema = z.object({
  workflowId: z.string().min(1, 'Workflow ID is required'),
});

// Schema for repository connection
const ConnectRepositorySchema = z.object({
  workflowId: z.string().min(1, 'Workflow ID is required'),
  repositoryUrl: z.string().url('Invalid repository URL'),
  branch: z.string().optional(),
  credentialId: z.string().min(1, 'Credential ID is required'),
});

// Schema for disconnect
const DisconnectRepositorySchema = z.object({
  workflowId: z.string().min(1, 'Workflow ID is required'),
});

// Schema for workflow ID parameter
const WorkflowIdParamSchema = z.object({
  workflowId: z.string().min(1, 'Workflow ID is required'),
});

// Schema for commit operation
const CommitSchema = z.object({
  workflowId: z.string().min(1, 'Workflow ID is required'),
  message: z.string().min(1, 'Commit message is required'),
  workflow: z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().nullable().optional(),
    category: z.string().nullable().optional(),
    tags: z.array(z.string()).default([]),
    nodes: z.array(z.any()),
    connections: z.array(z.any()),
    triggers: z.array(z.any()),
    settings: z.any(),
  }),
  environment: z.enum(['development', 'staging', 'production']).optional(),
});

// Schema for push operation
const PushSchema = z.object({
  workflowId: z.string().min(1, 'Workflow ID is required'),
  force: z.boolean().optional(),
  remote: z.string().optional(),
  branch: z.string().optional(),
});

// Schema for pull operation
const PullSchema = z.object({
  workflowId: z.string().min(1, 'Workflow ID is required'),
  remote: z.string().optional(),
  branch: z.string().optional(),
  strategy: z.enum(['merge', 'rebase']).optional(),
  environment: z.enum(['development', 'staging', 'production']).optional(),
});

// Schema for create branch
const CreateBranchSchema = z.object({
  workflowId: z.string().min(1, 'Workflow ID is required'),
  branchName: z.string().min(1, 'Branch name is required'),
});

// Schema for switch branch
const SwitchBranchSchema = z.object({
  workflowId: z.string().min(1, 'Workflow ID is required'),
  branchName: z.string().min(1, 'Branch name is required'),
});

// Schema for history query
const HistoryQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).optional(),
  offset: z.coerce.number().int().nonnegative().optional(),
});

// Schema for revert operation
const RevertSchema = z.object({
  workflowId: z.string().min(1, 'Workflow ID is required'),
  commitHash: z.string().min(1, 'Commit hash is required'),
});

// Schema for create branch from commit
const CreateBranchFromCommitSchema = z.object({
  workflowId: z.string().min(1, 'Workflow ID is required'),
  commitHash: z.string().min(1, 'Commit hash is required'),
  branchName: z.string().min(1, 'Branch name is required'),
});

/**
 * GET /api/git/credentials
 * List available Git credentials for the authenticated user
 * Returns credentials of types: githubOAuth2, gitlabOAuth2, bitbucketOAuth2
 * 
 * Requirements: 5.1
 */
router.get(
  '/credentials',
  requireAuth,
  requireWorkspace,
  asyncHandler(async (req: WorkspaceRequest, res: Response) => {
    const userId = req.user!.id;
    const credentialService = getCredentialService();

    // Get all credentials for the user
    const allCredentials = await credentialService.getCredentials(userId);

    // Filter for Git-related credentials (OAuth2 and PAT types)
    const gitCredentialTypes = [
      'githubOAuth2', 
      'gitlabOAuth2', 
      'bitbucketOAuth2',
      'githubPAT',
      'gitlabPAT',
      'bitbucketPAT'
    ];
    const gitCredentials = allCredentials.filter((cred: any) => 
      gitCredentialTypes.includes(cred.type)
    );

    const response: ApiResponse = {
      success: true,
      data: gitCredentials,
    };

    res.json(response);
  })
);

/**
 * POST /api/git/init
 * Initialize a new Git repository for a workflow
 * 
 * Requirements: 1.1
 */
router.post(
  '/init',
  requireAuth,
  requireWorkspace,
  validateBody(InitRepositorySchema),
  asyncHandler(async (req: WorkspaceRequest, res: Response) => {
    const { workflowId } = req.body;
    const userId = req.user!.id;

    const repositoryInfo = await gitService.initRepository(workflowId, userId);

    const response: ApiResponse = {
      success: true,
      data: repositoryInfo,
    };

    res.status(201).json(response);
  })
);

/**
 * POST /api/git/connect
 * Connect a workflow to a remote Git repository
 * 
 * Requirements: 1.2, 1.3, 5.1, 5.4
 */
router.post(
  '/connect',
  requireAuth,
  requireWorkspace,
  validateBody(ConnectRepositorySchema),
  asyncHandler(async (req: WorkspaceRequest, res: Response) => {
    const { workflowId, repositoryUrl, branch, credentialId } = req.body;
    const userId = req.user!.id;

    // Validate that the credential exists and is a Git credential type
    const credentialService = getCredentialService();
    const credential = await credentialService.getCredential(credentialId, userId);

    if (!credential) {
      throw new AppError('Credential not found', 404);
    }

    // Validate that it's a Git credential type
    const gitCredentialTypes = [
      'githubOAuth2', 
      'gitlabOAuth2', 
      'bitbucketOAuth2',
      'githubPAT',
      'gitlabPAT',
      'bitbucketPAT'
    ];
    if (!gitCredentialTypes.includes(credential.type)) {
      throw new AppError('Invalid credential type. Must be a Git OAuth2 or PAT credential.', 400);
    }

    // Pass credentialId to GitService - it will fetch credentials internally
    const config = {
      repositoryUrl,
      branch,
      credentialId,
    };

    const repositoryInfo = await gitService.connectRepository(
      workflowId,
      userId,
      config
    );

    const response: ApiResponse = {
      success: true,
      data: repositoryInfo,
    };

    res.json(response);
  })
);

/**
 * POST /api/git/disconnect
 * Disconnect a workflow from its Git repository
 * 
 * Requirements: 1.3
 */
router.post(
  '/disconnect',
  requireAuth,
  requireWorkspace,
  validateBody(DisconnectRepositorySchema),
  asyncHandler(async (req: WorkspaceRequest, res: Response) => {
    const { workflowId } = req.body;
    const userId = req.user!.id;

    await gitService.disconnectRepository(workflowId, userId);

    const response: ApiResponse = {
      success: true,
      data: { disconnected: true },
    };

    res.json(response);
  })
);

/**
 * GET /api/git/info/:workflowId
 * Get Git repository information for a workflow
 * 
 * Requirements: 1.4
 */
router.get(
  '/info/:workflowId',
  requireAuth,
  requireWorkspace,
  validateParams(WorkflowIdParamSchema),
  asyncHandler(async (req: WorkspaceRequest, res: Response) => {
    const { workflowId } = req.params;
    const userId = req.user!.id;

    const repositoryInfo = await gitService.getRepositoryInfo(workflowId, userId);

    const response: ApiResponse = {
      success: true,
      data: repositoryInfo,
    };

    res.json(response);
  })
);

/**
 * POST /api/git/status
 * Get Git status for a workflow
 * Accepts current workflow data to detect changes
 * 
 * Requirements: 2.1, 4.1, 4.2, 4.3
 */
router.post(
  '/status',
  requireAuth,
  requireWorkspace,
  validateBody(z.object({
    workflowId: z.string().min(1, 'Workflow ID is required'),
    workflow: z.any().optional(), // Current workflow data for change detection
    environment: z.enum(['development', 'staging', 'production']).optional(), // Environment for environment-specific status
  })),
  asyncHandler(async (req: WorkspaceRequest, res: Response) => {
    const { workflowId, workflow, environment } = req.body;
    const userId = req.user!.id;

    const status = await gitService.getStatus(workflowId, userId, workflow, environment);

    const response: ApiResponse = {
      success: true,
      data: status,
    };

    res.json(response);
  })
);

/**
 * GET /api/git/status/:workflowId
 * Get Git status for a workflow (legacy endpoint, no change detection)
 * 
 * Requirements: 2.1, 4.1, 4.2, 4.3
 */
router.get(
  '/status/:workflowId',
  requireAuth,
  requireWorkspace,
  validateParams(WorkflowIdParamSchema),
  asyncHandler(async (req: WorkspaceRequest, res: Response) => {
    const { workflowId } = req.params;
    const userId = req.user!.id;

    const status = await gitService.getStatus(workflowId, userId);

    const response: ApiResponse = {
      success: true,
      data: status,
    };

    res.json(response);
  })
);

/**
 * GET /api/git/workflow/:workflowId
 * Get workflow data from Git repository
 * Reads the workflow from Git files and returns it
 * 
 * Requirements: 7.1 (Pull workflow changes)
 */
router.get(
  '/workflow/:workflowId',
  requireAuth,
  requireWorkspace,
  validateParams(WorkflowIdParamSchema),
  validateQuery(z.object({
    environment: z.enum(['development', 'staging', 'production']).optional(),
  })),
  asyncHandler(async (req: WorkspaceRequest, res: Response) => {
    const { workflowId } = req.params;
    const { environment } = req.query as any;
    const userId = req.user!.id;

    const workflow = await gitService.getWorkflowFromGit(workflowId, userId, environment);

    const response: ApiResponse = {
      success: true,
      data: workflow,
    };

    res.json(response);
  })
);

/**
 * POST /api/git/diff
 * Get diff for a specific file
 * Returns old and new content for comparison
 * 
 * Requirements: 2.1 (View changes)
 */
router.post(
  '/diff',
  requireAuth,
  requireWorkspace,
  validateBody(z.object({
    workflowId: z.string().min(1, 'Workflow ID is required'),
    filePath: z.string().min(1, 'File path is required'),
    workflow: z.any().optional(), // Current workflow data for comparison
  })),
  asyncHandler(async (req: WorkspaceRequest, res: Response) => {
    const { workflowId, filePath, workflow } = req.body;
    const userId = req.user!.id;

    const diff = await gitService.getDiff(workflowId, userId, filePath, workflow);

    const response: ApiResponse = {
      success: true,
      data: diff,
    };

    res.json(response);
  })
);

/**
 * POST /api/git/commit
 * Create a commit with workflow changes
 * 
 * Requirements: 2.2, 2.3, 2.4
 */
router.post(
  '/commit',
  requireAuth,
  requireWorkspace,
  validateBody(CommitSchema),
  asyncHandler(async (req: WorkspaceRequest, res: Response) => {
    const { workflowId, message, workflow, environment } = req.body;
    const userId = req.user!.id;

    const commit = await gitService.commit(workflowId, userId, message, workflow, environment);

    const response: ApiResponse = {
      success: true,
      data: commit,
    };

    res.status(201).json(response);
  })
);

/**
 * POST /api/git/push
 * Push local commits to remote repository
 * 
 * Requirements: 3.1, 3.2, 3.3, 3.4
 */
router.post(
  '/push',
  requireAuth,
  requireWorkspace,
  validateBody(PushSchema),
  asyncHandler(async (req: WorkspaceRequest, res: Response) => {
    const { workflowId, force, remote, branch } = req.body;
    const userId = req.user!.id;

    const options = { force, remote, branch };
    const result = await gitService.push(workflowId, userId, options);

    const response: ApiResponse = {
      success: result.success,
      data: result,
    };

    // Return 200 even for failed pushes (they're handled gracefully)
    res.json(response);
  })
);

/**
 * POST /api/git/pull
 * Pull changes from remote repository
 * 
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5
 */
router.post(
  '/pull',
  requireAuth,
  requireWorkspace,
  validateBody(PullSchema),
  asyncHandler(async (req: WorkspaceRequest, res: Response) => {
    const { workflowId, remote, branch, strategy, environment } = req.body;
    const userId = req.user!.id;

    const options = { remote, branch, strategy };
    const result = await gitService.pull(workflowId, userId, options, environment);

    const response: ApiResponse = {
      success: result.success,
      data: result,
    };

    // Return 200 even for failed pulls (they're handled gracefully)
    res.json(response);
  })
);

/**
 * GET /api/git/branches/:workflowId
 * List all branches (local and remote)
 * 
 * Requirements: 6.3
 */
router.get(
  '/branches/:workflowId',
  requireAuth,
  requireWorkspace,
  validateParams(WorkflowIdParamSchema),
  asyncHandler(async (req: WorkspaceRequest, res: Response) => {
    const { workflowId } = req.params;
    const userId = req.user!.id;

    const branches = await gitService.listBranches(workflowId, userId);

    const response: ApiResponse = {
      success: true,
      data: branches,
    };

    res.json(response);
  })
);

/**
 * POST /api/git/branches
 * Create a new branch
 * 
 * Requirements: 6.1, 6.5
 */
router.post(
  '/branches',
  requireAuth,
  requireWorkspace,
  validateBody(CreateBranchSchema),
  asyncHandler(async (req: WorkspaceRequest, res: Response) => {
    const { workflowId, branchName } = req.body;
    const userId = req.user!.id;

    const branch = await gitService.createBranch(workflowId, userId, branchName);

    const response: ApiResponse = {
      success: true,
      data: branch,
    };

    res.status(201).json(response);
  })
);

/**
 * PUT /api/git/branches/switch
 * Switch to a different branch
 * 
 * Requirements: 6.2, 6.4
 */
router.put(
  '/branches/switch',
  requireAuth,
  requireWorkspace,
  validateBody(SwitchBranchSchema),
  asyncHandler(async (req: WorkspaceRequest, res: Response) => {
    const { workflowId, branchName } = req.body;
    const userId = req.user!.id;

    await gitService.switchBranch(workflowId, userId, branchName);

    const response: ApiResponse = {
      success: true,
      data: { branchName },
    };

    res.json(response);
  })
);

/**
 * GET /api/git/history/:workflowId
 * Get commit history for a workflow
 * 
 * Requirements: 8.1, 8.4
 */
router.get(
  '/history/:workflowId',
  requireAuth,
  requireWorkspace,
  validateParams(WorkflowIdParamSchema),
  validateQuery(HistoryQuerySchema),
  asyncHandler(async (req: WorkspaceRequest, res: Response) => {
    const { workflowId } = req.params;
    const userId = req.user!.id;
    const { limit, offset } = req.query as unknown as { limit?: number; offset?: number };

    const options = { limit, offset };
    const commits = await gitService.getCommitHistory(workflowId, userId, options);

    const response: ApiResponse = {
      success: true,
      data: commits,
    };

    res.json(response);
  })
);

/**
 * POST /api/git/revert
 * Revert workflow to a specific commit
 * 
 * Requirements: 8.3
 */
router.post(
  '/revert',
  requireAuth,
  requireWorkspace,
  validateBody(RevertSchema),
  asyncHandler(async (req: WorkspaceRequest, res: Response) => {
    const { workflowId, commitHash } = req.body;
    const userId = req.user!.id;

    await gitService.revertToCommit(workflowId, userId, commitHash);

    const response: ApiResponse = {
      success: true,
      data: { commitHash },
    };

    res.json(response);
  })
);

/**
 * POST /api/git/branches/from-commit
 * Create a new branch from a specific commit
 * 
 * Requirements: 8.5
 */
router.post(
  '/branches/from-commit',
  requireAuth,
  requireWorkspace,
  validateBody(CreateBranchFromCommitSchema),
  asyncHandler(async (req: WorkspaceRequest, res: Response) => {
    const { workflowId, commitHash, branchName } = req.body;
    const userId = req.user!.id;

    const branch = await gitService.createBranchFromCommit(
      workflowId,
      userId,
      commitHash,
      branchName
    );

    const response: ApiResponse = {
      success: true,
      data: branch,
    };

    res.status(201).json(response);
  })
);

export { router as gitRouter };
