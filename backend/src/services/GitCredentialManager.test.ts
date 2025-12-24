import { describe, it, expect, beforeEach, afterEach, beforeAll, mock, spyOn } from 'bun:test';
import { db } from '../db/client';
import { workflowGitCredentials } from '../db/schema/git';
import { eq, and } from 'drizzle-orm';

// Set test OAuth environment variables BEFORE importing GitCredentialManager
process.env.GITHUB_CLIENT_ID = 'test-github-client-id';
process.env.GITHUB_CLIENT_SECRET = 'test-github-client-secret';
process.env.GITLAB_CLIENT_ID = 'test-gitlab-client-id';
process.env.GITLAB_CLIENT_SECRET = 'test-gitlab-client-secret';
process.env.BITBUCKET_CLIENT_ID = 'test-bitbucket-client-id';
process.env.BITBUCKET_CLIENT_SECRET = 'test-bitbucket-client-secret';

// Now import after setting env vars
import { GitCredentialManager, GitProvider } from './GitCredentialManager';

describe('GitCredentialManager - OAuth Flow', () => {
  let credentialManager: GitCredentialManager;
  const testUserId = 'test-user-oauth';
  const testWorkflowId = 'test-workflow-oauth';

  beforeEach(() => {
    credentialManager = new GitCredentialManager();
  });

  afterEach(async () => {
    // Clean up test data
    try {
      await db
        .delete(workflowGitCredentials)
        .where(
          and(
            eq(workflowGitCredentials.userId, testUserId),
            eq(workflowGitCredentials.workflowId, testWorkflowId)
          )
        );
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('initiateOAuthFlow', () => {
    it('should generate OAuth URL for GitHub', async () => {
      const result = await credentialManager.initiateOAuthFlow('github');

      expect(result).toBeDefined();
      expect(result.authUrl).toContain('https://github.com/login/oauth/authorize');
      expect(result.authUrl).toContain('client_id=');
      expect(result.authUrl).toContain('state=');
      expect(result.authUrl).toContain('scope=repo');
      expect(result.state).toBeDefined();
      expect(result.state.length).toBe(64); // 32 bytes in hex
    });

    it('should generate OAuth URL for GitLab', async () => {
      const result = await credentialManager.initiateOAuthFlow('gitlab');

      expect(result).toBeDefined();
      expect(result.authUrl).toContain('https://gitlab.com/oauth/authorize');
      expect(result.authUrl).toContain('client_id=');
      expect(result.authUrl).toContain('state=');
      expect(result.authUrl).toContain('scope=api');
      expect(result.state).toBeDefined();
    });

    it('should generate OAuth URL for Bitbucket', async () => {
      const result = await credentialManager.initiateOAuthFlow('bitbucket');

      expect(result).toBeDefined();
      expect(result.authUrl).toContain('https://bitbucket.org/site/oauth2/authorize');
      expect(result.authUrl).toContain('client_id=');
      expect(result.authUrl).toContain('state=');
      expect(result.state).toBeDefined();
    });

    it('should generate unique states for multiple requests', async () => {
      const result1 = await credentialManager.initiateOAuthFlow('github');
      const result2 = await credentialManager.initiateOAuthFlow('github');

      expect(result1.state).not.toBe(result2.state);
    });

    it('should store state data for validation', async () => {
      const result = await credentialManager.initiateOAuthFlow(
        'github',
        testUserId,
        testWorkflowId
      );

      const stateData = credentialManager.validateOAuthState(result.state);
      expect(stateData).toBeDefined();
      expect(stateData?.provider).toBe('github');
      expect(stateData?.userId).toBe(testUserId);
      expect(stateData?.workflowId).toBe(testWorkflowId);
    });
  });

  describe('validateOAuthState', () => {
    it('should validate a valid state', async () => {
      const { state } = await credentialManager.initiateOAuthFlow('github');
      const stateData = credentialManager.validateOAuthState(state);

      expect(stateData).toBeDefined();
      expect(stateData?.provider).toBe('github');
    });

    it('should return null for invalid state', () => {
      const stateData = credentialManager.validateOAuthState('invalid-state');
      expect(stateData).toBeNull();
    });

    it('should invalidate state after first use', async () => {
      const { state } = await credentialManager.initiateOAuthFlow('github');
      
      // First validation should succeed
      const firstValidation = credentialManager.validateOAuthState(state);
      expect(firstValidation).toBeDefined();

      // Second validation should fail (state already used)
      const secondValidation = credentialManager.validateOAuthState(state);
      expect(secondValidation).toBeNull();
    });
  });

  describe('completeOAuthFlow', () => {
    it('should exchange code for token (GitHub)', async () => {
      // Mock axios dynamically for this test
      const axios = require('axios');
      const originalPost = axios.post;
      axios.post = mock(() =>
        Promise.resolve({
          data: {
            access_token: 'gho_test_token',
            token_type: 'bearer',
          },
        })
      );

      try {
        const credentials = await credentialManager.completeOAuthFlow(
          'github',
          'test-code',
          'test-state'
        );

        expect(credentials).toBeDefined();
        expect(credentials.type).toBe('oauth');
        expect(credentials.token).toBe('gho_test_token');
        expect(credentials.provider).toBe('github');
      } finally {
        axios.post = originalPost;
      }
    });

    it('should exchange code for token with refresh token (GitLab)', async () => {
      const axios = require('axios');
      const originalPost = axios.post;
      axios.post = mock(() =>
        Promise.resolve({
          data: {
            access_token: 'gitlab_access_token',
            refresh_token: 'gitlab_refresh_token',
            expires_in: 7200,
            token_type: 'bearer',
          },
        })
      );

      try {
        const credentials = await credentialManager.completeOAuthFlow(
          'gitlab',
          'test-code',
          'test-state'
        );

        expect(credentials).toBeDefined();
        expect(credentials.type).toBe('oauth');
        expect(credentials.token).toBe('gitlab_access_token');
        expect(credentials.refreshToken).toBe('gitlab_refresh_token');
        expect(credentials.expiresAt).toBeDefined();
        expect(credentials.provider).toBe('gitlab');
      } finally {
        axios.post = originalPost;
      }
    });

    it('should handle token exchange errors', async () => {
      const axios = require('axios');
      const originalPost = axios.post;
      axios.post = mock(() =>
        Promise.reject({
          response: {
            data: {
              error: 'invalid_grant',
              error_description: 'Invalid authorization code',
            },
          },
        })
      );

      try {
        await expect(
          credentialManager.completeOAuthFlow('github', 'invalid-code', 'test-state')
        ).rejects.toThrow();
      } finally {
        axios.post = originalPost;
      }
    });
  });

  describe('refreshTokenIfNeeded', () => {
    it('should return credentials if not expired', async () => {
      // Store non-expired credentials
      const futureDate = new Date(Date.now() + 3600 * 1000); // 1 hour from now
      await credentialManager.storeCredentials(testUserId, testWorkflowId, {
        type: 'oauth',
        token: 'test-token',
        provider: 'gitlab',
        refreshToken: 'test-refresh-token',
        expiresAt: futureDate,
      });

      const result = await credentialManager.refreshTokenIfNeeded(
        testUserId,
        testWorkflowId
      );

      expect(result).toBeDefined();
      expect(result?.token).toBe('test-token');
    });

    it('should refresh expired token with refresh token', async () => {
      // Store expired credentials with refresh token
      const pastDate = new Date(Date.now() - 3600 * 1000); // 1 hour ago
      await credentialManager.storeCredentials(testUserId, testWorkflowId, {
        type: 'oauth',
        token: 'expired-token',
        provider: 'gitlab',
        refreshToken: 'test-refresh-token',
        expiresAt: pastDate,
      });

      // Mock axios response for token refresh
      const axios = require('axios');
      const originalPost = axios.post;
      axios.post = mock(() =>
        Promise.resolve({
          data: {
            access_token: 'new-access-token',
            refresh_token: 'new-refresh-token',
            expires_in: 7200,
            token_type: 'bearer',
          },
        })
      );

      try {
        const result = await credentialManager.refreshTokenIfNeeded(
          testUserId,
          testWorkflowId
        );

        expect(result).toBeDefined();
        expect(result?.token).toBe('new-access-token');
        expect(result?.refreshToken).toBe('new-refresh-token');
      } finally {
        axios.post = originalPost;
      }
    });

    it('should return null for expired token without refresh token', async () => {
      // Store expired credentials without refresh token
      const pastDate = new Date(Date.now() - 3600 * 1000);
      await credentialManager.storeCredentials(testUserId, testWorkflowId, {
        type: 'oauth',
        token: 'expired-token',
        provider: 'github',
        expiresAt: pastDate,
      });

      const result = await credentialManager.refreshTokenIfNeeded(
        testUserId,
        testWorkflowId
      );

      expect(result).toBeNull();
    });

    it('should return null if credentials do not exist', async () => {
      const result = await credentialManager.refreshTokenIfNeeded(
        'non-existent-user',
        'non-existent-workflow'
      );

      expect(result).toBeNull();
    });
  });

  describe('OAuth integration', () => {
    it('should complete full OAuth flow and store credentials', async () => {
      // 1. Initiate OAuth flow
      const { state } = await credentialManager.initiateOAuthFlow(
        'gitlab',
        testUserId,
        testWorkflowId
      );

      // 2. Validate state
      const stateData = credentialManager.validateOAuthState(state);
      expect(stateData).toBeDefined();

      // 3. Mock token exchange
      const axios = require('axios');
      const originalPost = axios.post;
      axios.post = mock(() =>
        Promise.resolve({
          data: {
            access_token: 'oauth-token',
            refresh_token: 'oauth-refresh',
            expires_in: 7200,
            token_type: 'bearer',
          },
        })
      );

      try {
        // 4. Complete OAuth flow
        const credentials = await credentialManager.completeOAuthFlow(
          'gitlab',
          'auth-code',
          state
        );

        // 5. Store credentials
        await credentialManager.storeCredentials(
          testUserId,
          testWorkflowId,
          credentials
        );

        // 6. Retrieve and verify
        const retrieved = await credentialManager.getCredentials(
          testUserId,
          testWorkflowId
        );

        expect(retrieved).toBeDefined();
        expect(retrieved?.type).toBe('oauth');
        expect(retrieved?.token).toBe('oauth-token');
        expect(retrieved?.refreshToken).toBe('oauth-refresh');
        expect(retrieved?.provider).toBe('gitlab');
      } finally {
        axios.post = originalPost;
      }
    });
  });
});
