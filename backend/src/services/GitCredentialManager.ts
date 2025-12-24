import * as crypto from 'crypto';
import { eq, and } from 'drizzle-orm';
import { db } from '../db/client';
import { workflowGitCredentials } from '../db/schema/git';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';
import { gitConfig } from '../config/git';

/**
 * Git credential types
 */
export type GitCredentialType = 'personal_access_token' | 'oauth';

/**
 * Git providers
 */
export type GitProvider = 'github' | 'gitlab' | 'bitbucket';

/**
 * Git credentials interface
 */
export interface GitCredentials {
  type: GitCredentialType;
  token: string;
  provider: GitProvider;
  refreshToken?: string;
  expiresAt?: Date;
}

/**
 * OAuth flow data for initiating OAuth authentication
 */
export interface OAuthFlowData {
  authUrl: string;
  state: string;
}

/**
 * OAuth state data stored for CSRF validation
 */
interface OAuthStateData {
  provider: GitProvider;
  userId?: string;
  workflowId?: string;
  createdAt: Date;
}

/**
 * In-memory store for OAuth states (CSRF protection)
 * In production, this should be stored in Redis or a database
 */
const oauthStates = new Map<string, OAuthStateData>();

/**
 * Clean up expired OAuth states (older than 10 minutes)
 */
function cleanupExpiredStates(): void {
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
  for (const [state, data] of oauthStates.entries()) {
    if (data.createdAt < tenMinutesAgo) {
      oauthStates.delete(state);
    }
  }
}

// Run cleanup every 5 minutes
setInterval(cleanupExpiredStates, 5 * 60 * 1000);

/**
 * GitCredentialManager
 * 
 * Manages secure storage and retrieval of Git credentials using AES-256 encryption.
 * Handles both personal access tokens and OAuth tokens for GitHub, GitLab, and Bitbucket.
 * 
 * Requirements: 5.1, 5.5
 */
export class GitCredentialManager {
  private encryptionKey: Buffer;
  private algorithm = 'aes-256-cbc';

  constructor() {
    const keyString = gitConfig.encryption.key;
    
    if (!keyString) {
      throw new Error(
        'GIT_ENCRYPTION_KEY or ENCRYPTION_KEY must be set in environment variables'
      );
    }

    // Support both hex-encoded keys (64 chars) and raw keys (32+ chars)
    if (keyString.length === 64) {
      // Hex-encoded key
      this.encryptionKey = Buffer.from(keyString, 'hex');
    } else if (keyString.length >= 32) {
      // Raw key - take first 32 bytes
      this.encryptionKey = Buffer.from(keyString.slice(0, 32), 'utf8');
    } else {
      throw new Error(
        'GIT_ENCRYPTION_KEY must be at least 32 characters long or a 64-character hex string'
      );
    }

    if (this.encryptionKey.length !== 32) {
      throw new Error(
        'Encryption key must be exactly 32 bytes for AES-256'
      );
    }
  }

  /**
   * Encrypt a token using AES-256-CBC
   * @param token - The token to encrypt
   * @returns Encrypted token in format: iv:encryptedData
   */
  private encryptToken(token: string): string {
    try {
      // Generate random initialization vector
      const iv = crypto.randomBytes(16);
      
      // Create cipher
      const cipher = crypto.createCipheriv(this.algorithm, this.encryptionKey, iv);
      
      // Encrypt the token
      let encrypted = cipher.update(token, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      // Combine IV and encrypted data
      const combined = iv.toString('hex') + ':' + encrypted;
      
      return combined;
    } catch (error) {
      logger.error('Failed to encrypt Git token:', error);
      throw new AppError('Failed to encrypt Git credentials', 500);
    }
  }

  /**
   * Decrypt a token using AES-256-CBC
   * @param encryptedToken - The encrypted token in format: iv:encryptedData
   * @returns Decrypted token
   */
  private decryptToken(encryptedToken: string): string {
    try {
      // Split IV and encrypted data
      const parts = encryptedToken.split(':');
      if (parts.length !== 2) {
        throw new Error('Invalid encrypted token format');
      }

      const iv = Buffer.from(parts[0], 'hex');
      const encrypted = parts[1];
      
      // Create decipher
      const decipher = crypto.createDecipheriv(this.algorithm, this.encryptionKey, iv);
      
      // Decrypt the token
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      logger.error('Failed to decrypt Git token:', error);
      throw new AppError('Failed to decrypt Git credentials', 500);
    }
  }

  /**
   * Store Git credentials securely
   * @param userId - User ID
   * @param workflowId - Workflow ID
   * @param credentials - Git credentials to store
   * @returns Promise<void>
   * 
   * Requirement 5.1: Encrypt and store authentication tokens securely
   */
  async storeCredentials(
    userId: string,
    workflowId: string,
    credentials: GitCredentials
  ): Promise<void> {
    try {
      // Encrypt the token
      const encryptedToken = this.encryptToken(credentials.token);
      
      // Encrypt refresh token if present
      const encryptedRefreshToken = credentials.refreshToken
        ? this.encryptToken(credentials.refreshToken)
        : null;

      // Check if credentials already exist
      const existing = await db.query.workflowGitCredentials.findFirst({
        where: and(
          eq(workflowGitCredentials.userId, userId),
          eq(workflowGitCredentials.workflowId, workflowId)
        ),
      });

      if (existing) {
        // Update existing credentials
        await db
          .update(workflowGitCredentials)
          .set({
            encryptedToken,
            tokenType: credentials.type,
            provider: credentials.provider,
            refreshToken: encryptedRefreshToken,
            expiresAt: credentials.expiresAt,
            updatedAt: new Date(),
          })
          .where(eq(workflowGitCredentials.id, existing.id));

        logger.info(
          `Git credentials updated for workflow ${workflowId} (provider: ${credentials.provider})`
        );
      } else {
        // Insert new credentials
        await db.insert(workflowGitCredentials).values({
          userId,
          workflowId,
          encryptedToken,
          tokenType: credentials.type,
          provider: credentials.provider,
          refreshToken: encryptedRefreshToken,
          expiresAt: credentials.expiresAt,
        });

        logger.info(
          `Git credentials stored for workflow ${workflowId} (provider: ${credentials.provider})`
        );
      }
    } catch (error) {
      // Ensure we don't log the actual credentials
      logger.error('Failed to store Git credentials:', {
        userId,
        workflowId,
        provider: credentials.provider,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new AppError('Failed to store Git credentials', 500);
    }
  }

  /**
   * Retrieve Git credentials
   * @param userId - User ID
   * @param workflowId - Workflow ID
   * @returns Promise<GitCredentials | null>
   * 
   * Requirement 5.1: Retrieve and decrypt stored credentials
   */
  async getCredentials(
    userId: string,
    workflowId: string
  ): Promise<GitCredentials | null> {
    try {
      const record = await db.query.workflowGitCredentials.findFirst({
        where: and(
          eq(workflowGitCredentials.userId, userId),
          eq(workflowGitCredentials.workflowId, workflowId)
        ),
      });

      if (!record) {
        return null;
      }

      // Check if token is expired
      if (record.expiresAt && record.expiresAt < new Date()) {
        logger.warn(
          `Git credentials expired for workflow ${workflowId}, user should re-authenticate`
        );
        // Return null to trigger re-authentication
        return null;
      }

      // Decrypt the token
      const token = this.decryptToken(record.encryptedToken);
      
      // Decrypt refresh token if present
      const refreshToken = record.refreshToken
        ? this.decryptToken(record.refreshToken)
        : undefined;

      return {
        type: record.tokenType as GitCredentialType,
        token,
        provider: record.provider as GitProvider,
        refreshToken,
        expiresAt: record.expiresAt || undefined,
      };
    } catch (error) {
      logger.error('Failed to retrieve Git credentials:', {
        userId,
        workflowId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new AppError('Failed to retrieve Git credentials', 500);
    }
  }

  /**
   * Delete Git credentials
   * @param userId - User ID
   * @param workflowId - Workflow ID
   * @returns Promise<void>
   * 
   * Requirement 5.1: Remove stored credentials
   */
  async deleteCredentials(userId: string, workflowId: string): Promise<void> {
    try {
      const result = await db
        .delete(workflowGitCredentials)
        .where(
          and(
            eq(workflowGitCredentials.userId, userId),
            eq(workflowGitCredentials.workflowId, workflowId)
          )
        );

      if (result.rowCount === 0) {
        logger.warn(
          `No Git credentials found to delete for workflow ${workflowId}`
        );
      } else {
        logger.info(`Git credentials deleted for workflow ${workflowId}`);
      }
    } catch (error) {
      logger.error('Failed to delete Git credentials:', {
        userId,
        workflowId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new AppError('Failed to delete Git credentials', 500);
    }
  }

  /**
   * Initiate OAuth flow for a Git provider
   * @param provider - Git provider (github, gitlab, bitbucket)
   * @param userId - Optional user ID to associate with the OAuth flow
   * @param workflowId - Optional workflow ID to associate with the OAuth flow
   * @returns Promise<OAuthFlowData>
   * 
   * Requirement 5.4: Support OAuth authentication flow
   */
  async initiateOAuthFlow(
    provider: GitProvider,
    userId?: string,
    workflowId?: string
  ): Promise<OAuthFlowData> {
    try {
      // Generate random state for CSRF protection
      const state = crypto.randomBytes(32).toString('hex');

      // Store state for validation during callback
      oauthStates.set(state, {
        provider,
        userId,
        workflowId,
        createdAt: new Date(),
      });

      // Get OAuth configuration for the provider
      const oauthConfig = gitConfig.oauth[provider];

      if (!oauthConfig.clientId) {
        throw new AppError(
          `OAuth not configured for ${provider}. Please set ${provider.toUpperCase()}_CLIENT_ID in environment variables.`,
          500
        );
      }

      // Build authorization URL based on provider
      let authUrl: string;
      
      switch (provider) {
        case 'github':
          authUrl = `https://github.com/login/oauth/authorize?client_id=${oauthConfig.clientId}&state=${state}&scope=repo`;
          break;
        case 'gitlab':
          authUrl = `https://gitlab.com/oauth/authorize?client_id=${oauthConfig.clientId}&redirect_uri=${encodeURIComponent(oauthConfig.callbackUrl)}&response_type=code&state=${state}&scope=api`;
          break;
        case 'bitbucket':
          authUrl = `https://bitbucket.org/site/oauth2/authorize?client_id=${oauthConfig.clientId}&response_type=code&state=${state}`;
          break;
        default:
          throw new AppError(`Unsupported Git provider: ${provider}`, 400);
      }

      logger.info(`OAuth flow initiated for provider: ${provider}`);

      return {
        authUrl,
        state,
      };
    } catch (error) {
      logger.error('Failed to initiate OAuth flow:', {
        provider,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      
      if (error instanceof AppError) {
        throw error;
      }
      
      throw new AppError('Failed to initiate OAuth flow', 500);
    }
  }

  /**
   * Validate OAuth state for CSRF protection
   * @param state - State parameter from OAuth callback
   * @returns OAuthStateData if valid, null otherwise
   */
  validateOAuthState(state: string): OAuthStateData | null {
    const stateData = oauthStates.get(state);
    
    if (!stateData) {
      logger.warn('Invalid or expired OAuth state:', state);
      return null;
    }

    // Check if state is expired (older than 10 minutes)
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    if (stateData.createdAt < tenMinutesAgo) {
      logger.warn('Expired OAuth state:', state);
      oauthStates.delete(state);
      return null;
    }

    // Remove state after validation (one-time use)
    oauthStates.delete(state);

    return stateData;
  }

  /**
   * Complete OAuth flow and exchange code for token
   * @param provider - Git provider (github, gitlab, bitbucket)
   * @param code - Authorization code from OAuth provider
   * @param state - State parameter for CSRF validation
   * @returns Promise<GitCredentials>
   * 
   * Requirement 5.4: Support OAuth authentication flow
   */
  async completeOAuthFlow(
    provider: GitProvider,
    code: string,
    state: string
  ): Promise<GitCredentials> {
    try {
      // Get OAuth configuration for the provider
      const oauthConfig = gitConfig.oauth[provider];

      if (!oauthConfig.clientId || !oauthConfig.clientSecret) {
        throw new AppError(
          `OAuth not fully configured for ${provider}. Please set ${provider.toUpperCase()}_CLIENT_ID and ${provider.toUpperCase()}_CLIENT_SECRET in environment variables.`,
          500
        );
      }

      // Exchange authorization code for access token
      const tokenData = await this.exchangeCodeForToken(provider, code, oauthConfig);

      logger.info(`OAuth flow completed successfully for provider: ${provider}`);

      return {
        type: 'oauth',
        token: tokenData.access_token,
        provider,
        refreshToken: tokenData.refresh_token,
        expiresAt: tokenData.expires_in
          ? new Date(Date.now() + tokenData.expires_in * 1000)
          : undefined,
      };
    } catch (error) {
      logger.error('Failed to complete OAuth flow:', {
        provider,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError('Failed to complete OAuth flow', 500);
    }
  }

  /**
   * Exchange authorization code for access token
   * @param provider - Git provider
   * @param code - Authorization code
   * @param oauthConfig - OAuth configuration
   * @returns Promise<TokenResponse>
   * @private
   */
  private async exchangeCodeForToken(
    provider: GitProvider,
    code: string,
    oauthConfig: { clientId: string; clientSecret: string; callbackUrl: string }
  ): Promise<{
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
    token_type: string;
  }> {
    const axios = require('axios');

    let tokenUrl: string;
    let requestData: any;
    let headers: any = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    };

    switch (provider) {
      case 'github':
        tokenUrl = 'https://github.com/login/oauth/access_token';
        requestData = {
          client_id: oauthConfig.clientId,
          client_secret: oauthConfig.clientSecret,
          code,
        };
        break;

      case 'gitlab':
        tokenUrl = 'https://gitlab.com/oauth/token';
        requestData = {
          client_id: oauthConfig.clientId,
          client_secret: oauthConfig.clientSecret,
          code,
          grant_type: 'authorization_code',
          redirect_uri: oauthConfig.callbackUrl,
        };
        break;

      case 'bitbucket':
        tokenUrl = 'https://bitbucket.org/site/oauth2/access_token';
        // Bitbucket uses Basic Auth for client credentials
        const auth = Buffer.from(
          `${oauthConfig.clientId}:${oauthConfig.clientSecret}`
        ).toString('base64');
        headers['Authorization'] = `Basic ${auth}`;
        requestData = {
          grant_type: 'authorization_code',
          code,
        };
        break;

      default:
        throw new AppError(`Unsupported Git provider: ${provider}`, 400);
    }

    try {
      const response = await axios.post(tokenUrl, requestData, { headers });

      if (!response.data.access_token) {
        throw new Error('No access token in response');
      }

      return response.data;
    } catch (error: any) {
      logger.error('Failed to exchange code for token:', {
        provider,
        error: error.response?.data || error.message,
      });

      throw new AppError(
        `Failed to exchange authorization code for token: ${error.response?.data?.error_description || error.message}`,
        400
      );
    }
  }

  /**
   * Check if credentials exist for a workflow
   * @param userId - User ID
   * @param workflowId - Workflow ID
   * @returns Promise<boolean>
   */
  async hasCredentials(userId: string, workflowId: string): Promise<boolean> {
    try {
      const record = await db.query.workflowGitCredentials.findFirst({
        where: and(
          eq(workflowGitCredentials.userId, userId),
          eq(workflowGitCredentials.workflowId, workflowId)
        ),
        columns: {
          id: true,
        },
      });

      return !!record;
    } catch (error) {
      logger.error('Failed to check Git credentials existence:', {
        userId,
        workflowId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  }

  /**
   * Refresh OAuth token if expired
   * @param userId - User ID
   * @param workflowId - Workflow ID
   * @returns Promise<GitCredentials | null>
   * 
   * Requirement 5.3: Handle token refresh for expired OAuth tokens
   */
  async refreshTokenIfNeeded(
    userId: string,
    workflowId: string
  ): Promise<GitCredentials | null> {
    try {
      // Get credentials record directly from database (bypass expiry check)
      const record = await db.query.workflowGitCredentials.findFirst({
        where: and(
          eq(workflowGitCredentials.userId, userId),
          eq(workflowGitCredentials.workflowId, workflowId)
        ),
      });

      if (!record) {
        return null;
      }

      // If token is not expired, decrypt and return
      if (!record.expiresAt || record.expiresAt > new Date()) {
        const token = this.decryptToken(record.encryptedToken);
        const refreshToken = record.refreshToken
          ? this.decryptToken(record.refreshToken)
          : undefined;

        return {
          type: record.tokenType as GitCredentialType,
          token,
          provider: record.provider as GitProvider,
          refreshToken,
          expiresAt: record.expiresAt || undefined,
        };
      }

      // Token is expired - check if we can refresh it
      if (record.refreshToken && record.tokenType === 'oauth') {
        try {
          logger.info(
            `Refreshing expired OAuth token for workflow ${workflowId}`
          );

          const refreshToken = this.decryptToken(record.refreshToken);
          const newCredentials = await this.refreshOAuthToken(
            record.provider as GitProvider,
            refreshToken
          );

          // Store the new credentials
          await this.storeCredentials(userId, workflowId, newCredentials);

          logger.info(
            `OAuth token refreshed successfully for workflow ${workflowId}`
          );

          return newCredentials;
        } catch (error) {
          logger.error('Failed to refresh OAuth token:', {
            workflowId,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
          // Return null to trigger re-authentication
          return null;
        }
      }

      // Token expired and no refresh token available
      logger.warn(
        `OAuth token expired for workflow ${workflowId} and no refresh token available`
      );
      return null;
    } catch (error) {
      logger.error('Failed to check/refresh token:', {
        userId,
        workflowId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return null;
    }
  }

  /**
   * Refresh OAuth token using refresh token
   * @param provider - Git provider
   * @param refreshToken - Refresh token
   * @returns Promise<GitCredentials>
   * @private
   * 
   * Requirement 5.3: Handle token refresh for expired OAuth tokens
   */
  private async refreshOAuthToken(
    provider: GitProvider,
    refreshToken: string
  ): Promise<GitCredentials> {
    const axios = require('axios');
    const oauthConfig = gitConfig.oauth[provider];

    if (!oauthConfig.clientId || !oauthConfig.clientSecret) {
      throw new AppError(
        `OAuth not fully configured for ${provider}`,
        500
      );
    }

    let tokenUrl: string;
    let requestData: any;
    let headers: any = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    };

    switch (provider) {
      case 'github':
        // GitHub doesn't support refresh tokens by default
        // Access tokens don't expire unless revoked
        throw new AppError(
          'GitHub OAuth tokens do not expire and cannot be refreshed',
          400
        );

      case 'gitlab':
        tokenUrl = 'https://gitlab.com/oauth/token';
        requestData = {
          client_id: oauthConfig.clientId,
          client_secret: oauthConfig.clientSecret,
          refresh_token: refreshToken,
          grant_type: 'refresh_token',
        };
        break;

      case 'bitbucket':
        tokenUrl = 'https://bitbucket.org/site/oauth2/access_token';
        // Bitbucket uses Basic Auth for client credentials
        const auth = Buffer.from(
          `${oauthConfig.clientId}:${oauthConfig.clientSecret}`
        ).toString('base64');
        headers['Authorization'] = `Basic ${auth}`;
        requestData = {
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
        };
        break;

      default:
        throw new AppError(`Unsupported Git provider: ${provider}`, 400);
    }

    try {
      const response = await axios.post(tokenUrl, requestData, { headers });

      if (!response.data.access_token) {
        throw new Error('No access token in response');
      }

      return {
        type: 'oauth',
        token: response.data.access_token,
        provider,
        refreshToken: response.data.refresh_token || refreshToken,
        expiresAt: response.data.expires_in
          ? new Date(Date.now() + response.data.expires_in * 1000)
          : undefined,
      };
    } catch (error: any) {
      logger.error('Failed to refresh OAuth token:', {
        provider,
        error: error.response?.data || error.message,
      });

      throw new AppError(
        `Failed to refresh OAuth token: ${error.response?.data?.error_description || error.message}`,
        400
      );
    }
  }
}
