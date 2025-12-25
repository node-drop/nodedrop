/**
 * Git Credentials API Tests
 * 
 * Tests for the new Git credentials endpoint
 */

import request from 'supertest';
import { app } from '../../app';
import { getCredentialService } from '../../services/CredentialService.factory';

// Mock the credential service
jest.mock('../../services/CredentialService.factory');

describe('GET /api/git/credentials', () => {
  const mockCredentialService = {
    getCredentials: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (getCredentialService as jest.Mock).mockReturnValue(mockCredentialService);
  });

  it('should return only Git-related credentials', async () => {
    // Mock credentials with mixed types
    const mockCredentials = [
      {
        id: 'cred_1',
        name: 'My GitHub',
        type: 'githubOAuth2',
        userId: 'user_123',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'cred_2',
        name: 'My GitLab',
        type: 'gitlabOAuth2',
        userId: 'user_123',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'cred_3',
        name: 'Google OAuth',
        type: 'googleOAuth2',
        userId: 'user_123',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'cred_4',
        name: 'My Bitbucket',
        type: 'bitbucketOAuth2',
        userId: 'user_123',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    mockCredentialService.getCredentials.mockResolvedValue(mockCredentials);

    const response = await request(app)
      .get('/api/git/credentials')
      .set('Authorization', 'Bearer mock-token')
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveLength(3); // Only Git credentials
    
    const gitCredentialIds = response.body.data.map((c: any) => c.id);
    expect(gitCredentialIds).toContain('cred_1'); // GitHub
    expect(gitCredentialIds).toContain('cred_2'); // GitLab
    expect(gitCredentialIds).toContain('cred_4'); // Bitbucket
    expect(gitCredentialIds).not.toContain('cred_3'); // Google (filtered out)
  });

  it('should return empty array when no Git credentials exist', async () => {
    mockCredentialService.getCredentials.mockResolvedValue([
      {
        id: 'cred_1',
        name: 'Google OAuth',
        type: 'googleOAuth2',
        userId: 'user_123',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    const response = await request(app)
      .get('/api/git/credentials')
      .set('Authorization', 'Bearer mock-token')
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveLength(0);
  });

  it('should require authentication', async () => {
    const response = await request(app)
      .get('/api/git/credentials')
      .expect(401);

    expect(response.body.success).toBe(false);
  });

  it('should handle service errors gracefully', async () => {
    mockCredentialService.getCredentials.mockRejectedValue(
      new Error('Database error')
    );

    const response = await request(app)
      .get('/api/git/credentials')
      .set('Authorization', 'Bearer mock-token')
      .expect(500);

    expect(response.body.success).toBe(false);
  });
});

describe('POST /api/git/connect with credentialId', () => {
  const mockCredentialService = {
    getCredential: jest.fn(),
  };

  const mockGitService = {
    connectRepository: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (getCredentialService as jest.Mock).mockReturnValue(mockCredentialService);
  });

  it('should connect repository with valid Git credential', async () => {
    const mockCredential = {
      id: 'cred_123',
      name: 'My GitHub',
      type: 'githubOAuth2',
      userId: 'user_123',
      data: {
        accessToken: 'ghp_token123',
        refreshToken: 'refresh_token',
        clientId: 'client_id',
        clientSecret: 'client_secret',
      },
      expiresAt: new Date('2025-12-31'),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockCredentialService.getCredential.mockResolvedValue(mockCredential);

    const mockRepoInfo = {
      workflowId: 'workflow_123',
      repositoryUrl: 'https://github.com/user/repo.git',
      branch: 'main',
      connected: true,
    };

    mockGitService.connectRepository.mockResolvedValue(mockRepoInfo);

    const response = await request(app)
      .post('/api/git/connect')
      .set('Authorization', 'Bearer mock-token')
      .send({
        workflowId: 'workflow_123',
        repositoryUrl: 'https://github.com/user/repo.git',
        branch: 'main',
        credentialId: 'cred_123',
      })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(mockCredentialService.getCredential).toHaveBeenCalledWith(
      'cred_123',
      'user_123'
    );
  });

  it('should reject non-Git credential types', async () => {
    const mockCredential = {
      id: 'cred_123',
      name: 'Google OAuth',
      type: 'googleOAuth2', // Not a Git credential
      userId: 'user_123',
      data: {
        accessToken: 'token',
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockCredentialService.getCredential.mockResolvedValue(mockCredential);

    const response = await request(app)
      .post('/api/git/connect')
      .set('Authorization', 'Bearer mock-token')
      .send({
        workflowId: 'workflow_123',
        repositoryUrl: 'https://github.com/user/repo.git',
        credentialId: 'cred_123',
      })
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.error.message).toContain('Invalid credential type');
  });

  it('should return 404 when credential not found', async () => {
    mockCredentialService.getCredential.mockResolvedValue(null);

    const response = await request(app)
      .post('/api/git/connect')
      .set('Authorization', 'Bearer mock-token')
      .send({
        workflowId: 'workflow_123',
        repositoryUrl: 'https://github.com/user/repo.git',
        credentialId: 'cred_nonexistent',
      })
      .expect(404);

    expect(response.body.success).toBe(false);
    expect(response.body.error.message).toContain('Credential not found');
  });

  it('should validate required fields', async () => {
    const response = await request(app)
      .post('/api/git/connect')
      .set('Authorization', 'Bearer mock-token')
      .send({
        workflowId: 'workflow_123',
        // Missing repositoryUrl and credentialId
      })
      .expect(400);

    expect(response.body.success).toBe(false);
  });
});
