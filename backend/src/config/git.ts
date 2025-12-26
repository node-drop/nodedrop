import path from 'path';
import fs from 'fs-extra';

/**
 * Git Configuration
 * 
 * Manages configuration for Git operations including:
 * - Local repository storage paths
 * - Encryption settings for credentials
 * - Git operation timeouts and limits
 */

// Base directory for Git repositories (relative to project root)
const GIT_BASE_DIR = process.env.GIT_STORAGE_DIR || './git-repos';

// Encryption key for Git credentials (must be 32 characters for AES-256)
const GIT_ENCRYPTION_KEY = process.env.GIT_ENCRYPTION_KEY || process.env.ENCRYPTION_KEY;

if (!GIT_ENCRYPTION_KEY || GIT_ENCRYPTION_KEY.length < 32) {
  console.warn(
    'Warning: GIT_ENCRYPTION_KEY is not set or is too short. Using default ENCRYPTION_KEY. ' +
    'For production, set a secure 32+ character GIT_ENCRYPTION_KEY.'
  );
}

/**
 * Git configuration object
 */
export const gitConfig = {
  // Storage paths
  storage: {
    baseDir: path.resolve(process.cwd(), GIT_BASE_DIR),
    tempDir: path.resolve(process.cwd(), GIT_BASE_DIR, 'temp'),
  },

  // Security
  encryption: {
    key: GIT_ENCRYPTION_KEY,
    algorithm: 'aes-256-cbc' as const,
  },

  // Git operation settings
  operations: {
    // Timeout for Git operations in milliseconds
    timeout: parseInt(process.env.GIT_OPERATION_TIMEOUT || '30000', 10),
    
    // Maximum repository size in bytes (default: 100MB)
    maxRepoSize: parseInt(process.env.GIT_MAX_REPO_SIZE || '104857600', 10),
    
    // Maximum number of commits to fetch in history
    maxHistoryCommits: parseInt(process.env.GIT_MAX_HISTORY_COMMITS || '100', 10),
  },

  // OAuth settings
  oauth: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID || '',
      clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
      callbackUrl: process.env.GITHUB_OAUTH_CALLBACK_URL || '/api/git/oauth/github/callback',
    },
    gitlab: {
      clientId: process.env.GITLAB_CLIENT_ID || '',
      clientSecret: process.env.GITLAB_CLIENT_SECRET || '',
      callbackUrl: process.env.GITLAB_OAUTH_CALLBACK_URL || '/api/git/oauth/gitlab/callback',
    },
    bitbucket: {
      clientId: process.env.BITBUCKET_CLIENT_ID || '',
      clientSecret: process.env.BITBUCKET_CLIENT_SECRET || '',
      callbackUrl: process.env.BITBUCKET_OAUTH_CALLBACK_URL || '/api/git/oauth/bitbucket/callback',
    },
  },
};

/**
 * Initialize Git storage directories
 * Creates necessary directories if they don't exist
 */
export async function initializeGitStorage(): Promise<void> {
  try {
    // Create base directory
    await fs.ensureDir(gitConfig.storage.baseDir);
    
    // Create temp directory
    await fs.ensureDir(gitConfig.storage.tempDir);
    
    console.log('Git storage directories initialized:', {
      baseDir: gitConfig.storage.baseDir,
      tempDir: gitConfig.storage.tempDir,
    });
  } catch (error) {
    console.error('Failed to initialize Git storage directories:', error);
    throw error;
  }
}

/**
 * Get the local repository path for a workflow
 * @param workflowId - The workflow ID
 * @returns Absolute path to the workflow's Git repository
 */
export function getWorkflowRepoPath(workflowId: string): string {
  return path.join(gitConfig.storage.baseDir, workflowId);
}

/**
 * Get the temporary directory path for a workflow
 * @param workflowId - The workflow ID
 * @returns Absolute path to the workflow's temporary directory
 */
export function getWorkflowTempPath(workflowId: string): string {
  return path.join(gitConfig.storage.tempDir, workflowId);
}

/**
 * Validate Git configuration
 * Checks if all required configuration is present
 */
export function validateGitConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!gitConfig.encryption.key || gitConfig.encryption.key.length < 32) {
    errors.push('GIT_ENCRYPTION_KEY must be at least 32 characters long');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
