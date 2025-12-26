# Git Infrastructure Setup

This document describes the Git infrastructure setup for the workflow Git push feature.

## Overview

The Git infrastructure provides the foundation for version control capabilities in the workflow system. It includes:

1. **Database Schema**: Tables for storing Git configurations and encrypted credentials
2. **File Storage**: Directory structure for local Git repositories
3. **Configuration**: Environment variables and settings for Git operations
4. **Dependencies**: Required libraries (isomorphic-git, fs-extra)

## Components

### 1. Database Schema

Two new tables have been added to support Git operations:

#### `workflow_git_configs`
Stores Git repository configurations for workflows.

**Columns:**
- `id`: Primary key (CUID)
- `workflow_id`: Foreign key to workflows table (unique)
- `user_id`: Foreign key to users table
- `repository_url`: Git repository URL
- `branch`: Current branch (default: 'main')
- `remote_name`: Remote name (default: 'origin')
- `local_path`: Path to local repository
- `last_sync_at`: Timestamp of last sync
- `last_commit_hash`: Hash of last commit
- `unpushed_commits`: Count of unpushed commits
- `connected`: Connection status
- `last_error`: Last error message
- `created_at`: Creation timestamp
- `updated_at`: Update timestamp

**Indexes:**
- `workflow_id` (for fast lookups)
- `user_id` (for user-based queries)

#### `workflow_git_credentials`
Stores encrypted Git credentials (tokens, OAuth tokens).

**Columns:**
- `id`: Primary key (CUID)
- `user_id`: Foreign key to users table
- `workflow_id`: Foreign key to workflows table
- `encrypted_token`: AES-256 encrypted token
- `token_type`: Type of token ('personal_access_token' or 'oauth')
- `provider`: Git provider ('github', 'gitlab', 'bitbucket')
- `refresh_token`: OAuth refresh token (optional)
- `expires_at`: Token expiration timestamp (optional)
- `created_at`: Creation timestamp
- `updated_at`: Update timestamp

**Indexes:**
- Unique index on (`user_id`, `workflow_id`)

### 2. File Storage Structure

```
git-repos/
├── {workflow-id-1}/          # Local Git repository for workflow 1
│   ├── .git/                 # Git metadata
│   ├── workflow.json         # Workflow configuration
│   ├── nodes.json            # Node definitions
│   ├── connections.json      # Connection definitions
│   └── ...
├── {workflow-id-2}/          # Local Git repository for workflow 2
└── temp/                     # Temporary directory for Git operations
    ├── {workflow-id-1}/      # Temp space for workflow 1
    └── {workflow-id-2}/      # Temp space for workflow 2
```

**Location:** Configurable via `GIT_STORAGE_DIR` environment variable (default: `./git-repos`)

### 3. Configuration

#### Environment Variables

Add these to your `.env` file:

```bash
# Git Integration
GIT_STORAGE_DIR="./git-repos"
GIT_ENCRYPTION_KEY="your-32-character-git-encryption-key"
GIT_OPERATION_TIMEOUT=30000
GIT_MAX_REPO_SIZE=104857600
GIT_MAX_HISTORY_COMMITS=100

# Git OAuth Providers (optional)
GITHUB_GIT_CLIENT_ID=""
GITHUB_GIT_CLIENT_SECRET=""
GITHUB_OAUTH_CALLBACK_URL="/api/git/oauth/github/callback"

GITLAB_CLIENT_ID=""
GITLAB_CLIENT_SECRET=""
GITLAB_OAUTH_CALLBACK_URL="/api/git/oauth/gitlab/callback"

BITBUCKET_CLIENT_ID=""
BITBUCKET_CLIENT_SECRET=""
BITBUCKET_OAUTH_CALLBACK_URL="/api/git/oauth/bitbucket/callback"
```

#### Configuration Module

The `backend/src/config/git.ts` module provides:

- **Storage paths**: Base directory and temp directory
- **Encryption settings**: AES-256 encryption for credentials
- **Operation settings**: Timeouts, size limits, history limits
- **OAuth settings**: Configuration for GitHub, GitLab, Bitbucket
- **Helper functions**:
  - `initializeGitStorage()`: Creates storage directories
  - `getWorkflowRepoPath(workflowId)`: Gets repository path
  - `getWorkflowTempPath(workflowId)`: Gets temp path
  - `validateGitConfig()`: Validates configuration

### 4. Dependencies

The following packages have been installed:

- **isomorphic-git** (v1.36.1): Git operations in Node.js
- **fs-extra** (v11.3.3): Enhanced file system operations
- **@types/fs-extra** (v11.0.4): TypeScript types for fs-extra

## Initialization

The Git storage directories are automatically initialized when the backend server starts. The initialization happens in `backend/src/index.ts`:

```typescript
// Initialize Git storage directories
try {
  const { initializeGitStorage } = await import('./config/git');
  await initializeGitStorage();
  logger.info(`✅ Initialized Git storage directories`);
} catch (error) {
  logger.error(`❌ Failed to initialize Git storage`, { error });
}
```

## Security Considerations

1. **Credential Encryption**: All Git credentials are encrypted using AES-256 before storage
2. **Encryption Key**: Must be at least 32 characters long (set via `GIT_ENCRYPTION_KEY`)
3. **Storage Isolation**: Each workflow has its own isolated repository directory
4. **Gitignore**: The `git-repos/` directory is excluded from version control

## Testing

A test suite is available at `backend/src/config/git.test.ts` that verifies:

- Storage directory creation
- Path generation functions
- Configuration validation
- Configuration structure

Run tests with:
```bash
cd backend
bun test src/config/git.test.ts
```

## Database Migration

A migration file has been generated at `backend/src/db/migrations/0001_greedy_valeria_richards.sql` that creates the Git tables.

To apply the migration:
```bash
cd backend
bun run db:migrate
```

## Next Steps

With the infrastructure in place, the next tasks are:

1. Implement `GitCredentialManager` service for secure credential management
2. Implement `WorkflowSerializer` service for workflow serialization
3. Implement `GitService` for Git operations (init, commit, push, pull, etc.)
4. Create API routes for Git operations
5. Build frontend UI components

## Files Created/Modified

### Created:
- `backend/src/db/schema/git.ts` - Database schema for Git tables
- `backend/src/config/git.ts` - Git configuration module
- `backend/src/config/git.test.ts` - Tests for Git configuration
- `backend/src/db/migrations/0001_greedy_valeria_richards.sql` - Database migration
- `backend/docs/GIT_INFRASTRUCTURE_SETUP.md` - This documentation

### Modified:
- `backend/package.json` - Added isomorphic-git and fs-extra dependencies
- `backend/src/db/schema/index.ts` - Exported Git schema
- `backend/.env.example` - Added Git environment variables
- `.gitignore` - Added git-repos/ directory
- `backend/src/index.ts` - Added Git storage initialization

## Troubleshooting

### Storage Directory Not Created

If the storage directories are not created:
1. Check that `GIT_STORAGE_DIR` is set correctly
2. Verify the application has write permissions
3. Check server logs for initialization errors

### Encryption Key Warning

If you see a warning about the encryption key:
1. Set `GIT_ENCRYPTION_KEY` to a secure 32+ character string
2. Use a different key than `ENCRYPTION_KEY` for better security
3. Never commit the encryption key to version control

### Migration Fails

If the database migration fails:
1. Ensure the database is running and accessible
2. Check `DATABASE_URL` is set correctly
3. Verify you have the necessary database permissions
4. Check for conflicting table names
