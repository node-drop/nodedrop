# Git Push Authentication Fix

## Problem
Push operations were failing with "Authentication failed. Please check your credentials." error despite having a valid GitHub Classic Personal Access Token (ghp_*).

## Root Cause
The `getAuthCallback` method in `GitService.ts` was using an empty string as the username for GitHub authentication:

```typescript
// INCORRECT - Was using empty username
return () => ({
  username: '',
  password: credentials.token,
});
```

However, GitHub Classic PAT tokens (ghp_*) require `x-access-token` as the username, not an empty string.

## Solution
Updated the `getAuthCallback` method to properly detect token type and use the correct authentication format:

```typescript
// CORRECT - Now detects token type and uses proper username
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
```

## Authentication Formats by Provider

### GitHub
- **Classic PAT (ghp_*)**: `username='x-access-token'`, `password=token`
- **Fine-grained PAT (github_pat_*)**: `username=token`, `password=token`

### GitLab
- `username='oauth2'`, `password=token`

### Bitbucket
- `username='x-token-auth'`, `password=token`

## Testing
Verified the fix works with:
1. Token validation via GitHub API - ✅ Token is valid with repo scope
2. Direct push test with corrected authentication - ✅ Push successful

## Files Modified
- `backend/src/services/GitService.ts` - Updated `getAuthCallback` method

## Next Steps
Restart the backend server to apply the changes:
```bash
# If running with bun
cd backend
bun --watch src/index.ts

# Or if using docker
docker-compose restart backend
```

Then test the push operation from the UI.
