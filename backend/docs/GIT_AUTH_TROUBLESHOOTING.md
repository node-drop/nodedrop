# Git Authentication Troubleshooting Guide

## Problem: "Authentication failed. Please check your credentials" on Push

This error occurs when the Git push operation fails to authenticate with the remote repository.

## Common Causes and Solutions

### 1. Token Format Issues

**GitHub Personal Access Tokens:**
- **Classic tokens** start with `ghp_` (40+ characters)
- **Fine-grained tokens** start with `github_pat_` (longer, more secure)
- Ensure you copied the entire token
- **Important**: Fine-grained tokens require specific repository permissions

**GitHub Fine-Grained Token Setup:**
1. Go to Settings → Developer settings → Personal access tokens → Fine-grained tokens
2. Click "Generate new token"
3. Set repository access to "Only select repositories" and choose your repo
4. Under "Repository permissions", set:
   - **Contents**: Read and write (required for push)
   - **Metadata**: Read-only (automatically selected)
5. Generate and copy the token immediately (you won't see it again!)

**GitLab Personal Access Tokens:**
- Start with `glpat-`
- Usually 20 characters long

**Bitbucket App Passwords:**
- No specific prefix
- Usually shorter than GitHub/GitLab tokens

### 2. Token Permissions

**GitHub Classic PAT - Required Scopes:**
- `repo` (Full control of private repositories)
  - Includes: `repo:status`, `repo_deployment`, `public_repo`, `repo:invite`

**GitHub Fine-Grained PAT - Required Permissions:**
- **Repository access**: Select the specific repository
- **Repository permissions**:
  - **Contents**: Read and write ✅ (REQUIRED for push/pull)
  - **Metadata**: Read-only (automatically included)
  - **Commit statuses**: Read and write (optional, for CI/CD)

**GitLab - Required Scopes:**
- `write_repository` or `api`

**Bitbucket - Required Permissions:**
- Repositories: Read and Write

### 3. Repository URL Format

Ensure your repository URL is in HTTPS format:
- ✅ `https://github.com/username/repo.git`
- ✅ `https://gitlab.com/username/repo.git`
- ✅ `https://bitbucket.org/username/repo.git`
- ❌ `git@github.com:username/repo.git` (SSH not supported)

### 4. Debugging Steps

#### Step 1: Verify Token in Database

```sql
-- Check if credentials exist
SELECT 
  id,
  user_id,
  workflow_id,
  provider,
  token_type,
  created_at,
  updated_at
FROM workflow_git_credentials
WHERE workflow_id = 'your-workflow-id';
```

#### Step 2: Test Token Manually

**GitHub:**
```bash
curl -H "Authorization: token YOUR_TOKEN" https://api.github.com/user
```

**GitLab:**
```bash
curl -H "PRIVATE-TOKEN: YOUR_TOKEN" https://gitlab.com/api/v4/user
```

**Bitbucket:**
```bash
curl -u username:YOUR_APP_PASSWORD https://api.bitbucket.org/2.0/user
```

#### Step 3: Check Backend Logs

Look for these log entries:
```
Pushing commits for workflow {workflowId}
Push operation failed: authentication
```

Enable debug logging:
```env
LOG_LEVEL="debug"
```

#### Step 4: Verify Encryption Key

The `GIT_ENCRYPTION_KEY` must be:
- Exactly 32 characters long (for raw keys)
- OR 64 characters hex-encoded

Check in `backend/.env`:
```env
GIT_ENCRYPTION_KEY="test-git-encryption-key-32chars!!"
```

### 5. Provider-Specific Authentication

The system uses different authentication formats for each provider:

**GitHub (Updated for Fine-grained tokens):**
```javascript
{
  username: '',      // Empty string (works for both classic and fine-grained tokens)
  password: token    // Your Personal Access Token (ghp_* or github_pat_*)
}
```

**GitLab:**
```javascript
{
  username: 'oauth2',
  password: token
}
```

**Bitbucket:**
```javascript
{
  username: 'x-token-auth',
  password: token
}
```

**Note**: The GitHub authentication was updated to use an empty username, which is compatible with both classic PATs (`ghp_*`) and fine-grained PATs (`github_pat_*`).

### 6. Common Mistakes

1. **Using SSH URL instead of HTTPS**
   - Fix: Use `https://github.com/...` not `git@github.com:...`

2. **Token expired or revoked**
   - Fix: Generate a new token and reconnect

3. **Insufficient permissions**
   - Fix: Regenerate token with correct scopes

4. **Wrong provider selected**
   - Fix: Ensure provider matches your repository host

5. **Token has special characters that weren't copied**
   - Fix: Copy token again, ensure no trailing spaces

### 7. Testing Authentication

Create a test script to verify authentication:

```typescript
// backend/src/scripts/test-git-auth.ts
import { GitCredentialManager } from '../services/GitCredentialManager';
import git from 'isomorphic-git';
import http from 'isomorphic-git/http/node';
import fs from 'fs-extra';

async function testAuth() {
  const credManager = new GitCredentialManager();
  
  // Get credentials
  const creds = await credManager.getCredentials('userId', 'workflowId');
  
  if (!creds) {
    console.error('No credentials found');
    return;
  }
  
  console.log('Provider:', creds.provider);
  console.log('Token length:', creds.token.length);
  console.log('Token starts with:', creds.token.substring(0, 10) + '...');
  
  // Test with a simple ls-remote
  try {
    const info = await git.listServerRefs({
      http,
      url: 'https://github.com/username/repo.git',
      onAuth: () => ({
        username: creds.token,
        password: creds.token
      })
    });
    
    console.log('✅ Authentication successful!');
    console.log('Refs:', info.length);
  } catch (error) {
    console.error('❌ Authentication failed:', error.message);
  }
}

testAuth();
```

### 8. Quick Fix Checklist

- [ ] Token is valid and not expired
- [ ] Token has correct permissions/scopes
- [ ] Repository URL is HTTPS format
- [ ] Correct provider selected (GitHub/GitLab/Bitbucket)
- [ ] Token was copied completely without spaces
- [ ] `GIT_ENCRYPTION_KEY` is set correctly in `.env`
- [ ] Backend server was restarted after `.env` changes
- [ ] Database has the credentials record

### 9. Re-connecting

If all else fails, disconnect and reconnect:

1. Click "Disconnect Repository" in the Git panel
2. Generate a new Personal Access Token with correct scopes
3. Click "Connect to Git Repository"
4. Enter repository URL and new token
5. Try pushing again

### 10. Getting Help

If the issue persists, provide:
1. Git provider (GitHub/GitLab/Bitbucket)
2. Token format (first 10 characters, e.g., `ghp_xxxxx...`)
3. Repository URL format
4. Backend logs (with sensitive data redacted)
5. Database query results (without showing actual token)

## Additional Resources

- [GitHub Personal Access Tokens](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token)
- [GitLab Personal Access Tokens](https://docs.gitlab.com/ee/user/profile/personal_access_tokens.html)
- [Bitbucket App Passwords](https://support.atlassian.com/bitbucket-cloud/docs/app-passwords/)
