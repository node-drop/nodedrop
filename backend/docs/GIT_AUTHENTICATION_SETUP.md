# Git Authentication Setup Guide

## Overview

This guide explains how to set up Git authentication for the workflow Git push feature. The system supports Personal Access Tokens (PAT) for GitHub, GitLab, and Bitbucket.

## Authentication Methods

### 1. Personal Access Token (PAT) - Currently Supported

Personal Access Tokens are the recommended method for Git authentication. Each provider has a different format:

#### GitHub
- **Username**: The token itself (or any value)
- **Password**: The token
- **Token Format**: `ghp_xxxxxxxxxxxxxxxxxxxx`
- **How to Generate**:
  1. Go to GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
  2. Click "Generate new token (classic)"
  3. Give it a descriptive name
  4. Select scopes: `repo` (full control of private repositories)
  5. Click "Generate token"
  6. Copy the token immediately (you won't see it again)

#### GitLab
- **Username**: `oauth2`
- **Password**: The token
- **Token Format**: `glpat-xxxxxxxxxxxxxxxxxxxx`
- **How to Generate**:
  1. Go to GitLab User Settings → Access Tokens
  2. Enter a name and expiration date
  3. Select scopes: `api`, `read_repository`, `write_repository`
  4. Click "Create personal access token"
  5. Copy the token immediately

#### Bitbucket
- **Username**: `x-token-auth`
- **Password**: The app password
- **How to Generate**:
  1. Go to Bitbucket Personal settings → App passwords
  2. Click "Create app password"
  3. Give it a label
  4. Select permissions: `Repositories: Read`, `Repositories: Write`
  5. Click "Create"
  6. Copy the password immediately

### 2. OAuth (Coming Soon)

OAuth authentication will be implemented in a future update. This will require:
- `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` environment variables
- OAuth callback URL configuration
- Frontend OAuth flow implementation

## Frontend Setup

### Connecting to a Repository

1. Open the workflow editor
2. Click on the Git tab in the right sidebar
3. If not connected, you'll see the connection form
4. Fill in the required fields:
   - **Repository URL**: The HTTPS URL of your Git repository
     - Example: `https://github.com/username/repo.git`
   - **Branch**: The branch to use (default: `main`)
   - **Git Provider**: Select your provider (GitHub, GitLab, or Bitbucket)
   - **Authentication Method**: Select "Personal Access Token"
   - **Personal Access Token**: Paste your token

5. Click "Connect Repository"

### Using Git Features

Once connected, you can:
- **View Changes**: See modified files in the Source Control tab
- **Commit Changes**: Write a commit message and commit your changes
- **Push**: Upload your commits to the remote repository
- **Pull**: Download changes from the remote repository
- **Manage Branches**: Create, switch, and delete branches
- **View History**: See commit history and revert to previous commits

## Backend Configuration

### Environment Variables

The backend does NOT require `GITHUB_CLIENT_ID` or `GITHUB_CLIENT_SECRET` for Personal Access Token authentication. These are only needed for OAuth flow (coming soon).

### Required Configuration

1. **Database**: Ensure the following tables exist:
   - `workflow_git_configs`: Stores Git configuration per workflow
   - `workflow_git_credentials`: Stores encrypted credentials

2. **File Storage**: The backend stores Git repositories in:
   - Path: `backend/git-repos/{workflowId}/`
   - Ensure this directory is writable

3. **Encryption**: Credentials are encrypted using AES-256
   - Encryption key is derived from environment variables
   - Never log or expose credentials in plain text

## Troubleshooting

### "Authentication failed. Please check your credentials."

This error occurs when:
1. **Invalid Token**: The token is incorrect or expired
   - Solution: Generate a new token and reconnect

2. **Insufficient Permissions**: The token doesn't have required scopes
   - Solution: Ensure token has `repo` (GitHub), `api` + `write_repository` (GitLab), or `Repositories: Write` (Bitbucket) permissions

3. **Wrong Provider**: The provider selected doesn't match the repository
   - Solution: Ensure you select the correct provider (GitHub, GitLab, or Bitbucket)

4. **Token Format**: Using the wrong authentication format
   - Solution: The system now automatically uses the correct format based on provider

### "Push rejected: Remote has changes that are not in local branch."

This occurs when the remote repository has commits that aren't in your local branch.

**Solution**: Pull changes first, then push:
1. Click the "Pull" button to fetch and merge remote changes
2. Resolve any conflicts if they occur
3. Click "Push" to upload your commits

### "Network error: Unable to connect to remote repository."

This occurs when:
1. **No Internet Connection**: Check your network connection
2. **Invalid Repository URL**: Verify the URL is correct
3. **Repository Doesn't Exist**: Ensure the repository exists and you have access
4. **Firewall/Proxy**: Check if your network blocks Git operations

### "Git repository not configured for this workflow"

This occurs when you haven't connected the workflow to a Git repository yet.

**Solution**: Click "Connect to Git Repository" and fill in the connection form.

## Security Best Practices

1. **Token Security**:
   - Never commit tokens to your repository
   - Use tokens with minimal required permissions
   - Rotate tokens regularly
   - Revoke tokens when no longer needed

2. **Repository Access**:
   - Use private repositories for sensitive workflows
   - Limit repository access to necessary team members
   - Review repository permissions regularly

3. **Credential Storage**:
   - Credentials are encrypted in the database
   - Encryption keys should be kept secure
   - Never log credentials in plain text

## Authentication Flow

### Personal Access Token Flow

```
1. User enters repository URL and token in frontend
2. Frontend sends credentials to backend API
3. Backend encrypts and stores credentials
4. Backend configures local Git repository
5. Backend adds remote with repository URL
6. For Git operations (push/pull):
   a. Backend retrieves and decrypts credentials
   b. Backend uses provider-specific auth format
   c. Backend performs Git operation with credentials
   d. Backend updates sync status
```

### OAuth Flow (Coming Soon)

```
1. User clicks "Connect with OAuth"
2. Frontend redirects to provider's OAuth page
3. User authorizes the application
4. Provider redirects back with authorization code
5. Backend exchanges code for access token
6. Backend stores encrypted token
7. Backend refreshes token when expired
```

## API Endpoints

### Connect Repository
```
POST /api/git/connect
Body: {
  workflowId: string
  repositoryUrl: string
  branch?: string
  credentials: {
    type: 'personal_access_token'
    token: string
    provider: 'github' | 'gitlab' | 'bitbucket'
  }
}
```

### Push Commits
```
POST /api/git/push
Body: {
  workflowId: string
  force?: boolean
  remote?: string
  branch?: string
}
```

### Pull Changes
```
POST /api/git/pull
Body: {
  workflowId: string
  remote?: string
  branch?: string
  strategy?: 'merge' | 'rebase'
}
```

## Code Changes

### Fixed Authentication Format

The authentication callback now uses the correct format for each provider:

```typescript
private getAuthCallback(credentials: GitCredentials) {
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
    return () => ({
      username: credentials.token,
      password: credentials.token,
    });
  }
}
```

This ensures that:
- GitHub uses the token as both username and password
- GitLab uses 'oauth2' as username and token as password
- Bitbucket uses 'x-token-auth' as username and token as password

## Testing

### Test Connection
1. Create a test repository on your Git provider
2. Generate a Personal Access Token with appropriate permissions
3. Connect your workflow to the test repository
4. Make a change to your workflow
5. Commit and push the change
6. Verify the commit appears in the remote repository

### Test Push/Pull
1. Make a change in the remote repository (via web interface)
2. Click "Pull" in the workflow editor
3. Verify the change is reflected in your workflow
4. Make a change in the workflow editor
5. Commit and push the change
6. Verify the commit appears in the remote repository

## Support

If you continue to experience authentication issues:
1. Verify your token has the correct permissions
2. Check the backend logs for detailed error messages
3. Ensure you're using the correct provider
4. Try generating a new token
5. Verify the repository URL is correct and accessible
