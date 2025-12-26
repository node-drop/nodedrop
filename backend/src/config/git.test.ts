import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import fs from 'fs-extra';
import path from 'path';
import {
  gitConfig,
  initializeGitStorage,
  getWorkflowRepoPath,
  getWorkflowTempPath,
  validateGitConfig,
} from './git';

describe('Git Configuration', () => {
  const testWorkflowId = 'test-workflow-123';

  beforeAll(async () => {
    // Clean up any existing test directories
    await fs.remove(gitConfig.storage.baseDir);
  });

  afterAll(async () => {
    // Clean up test directories
    await fs.remove(gitConfig.storage.baseDir);
  });

  describe('initializeGitStorage', () => {
    it('should create base and temp directories', async () => {
      await initializeGitStorage();

      const baseDirExists = await fs.pathExists(gitConfig.storage.baseDir);
      const tempDirExists = await fs.pathExists(gitConfig.storage.tempDir);

      expect(baseDirExists).toBe(true);
      expect(tempDirExists).toBe(true);
    });
  });

  describe('getWorkflowRepoPath', () => {
    it('should return correct path for workflow repository', () => {
      const repoPath = getWorkflowRepoPath(testWorkflowId);
      const expectedPath = path.join(gitConfig.storage.baseDir, testWorkflowId);

      expect(repoPath).toBe(expectedPath);
    });
  });

  describe('getWorkflowTempPath', () => {
    it('should return correct path for workflow temp directory', () => {
      const tempPath = getWorkflowTempPath(testWorkflowId);
      const expectedPath = path.join(gitConfig.storage.tempDir, testWorkflowId);

      expect(tempPath).toBe(expectedPath);
    });
  });

  describe('validateGitConfig', () => {
    it('should validate configuration', () => {
      const validation = validateGitConfig();

      // Check if validation returns expected structure
      expect(validation).toHaveProperty('valid');
      expect(validation).toHaveProperty('errors');
      expect(Array.isArray(validation.errors)).toBe(true);
    });
  });

  describe('gitConfig', () => {
    it('should have required configuration properties', () => {
      expect(gitConfig).toHaveProperty('storage');
      expect(gitConfig).toHaveProperty('encryption');
      expect(gitConfig).toHaveProperty('operations');
      expect(gitConfig).toHaveProperty('oauth');

      expect(gitConfig.storage).toHaveProperty('baseDir');
      expect(gitConfig.storage).toHaveProperty('tempDir');

      expect(gitConfig.encryption).toHaveProperty('key');
      expect(gitConfig.encryption).toHaveProperty('algorithm');

      expect(gitConfig.operations).toHaveProperty('timeout');
      expect(gitConfig.operations).toHaveProperty('maxRepoSize');
      expect(gitConfig.operations).toHaveProperty('maxHistoryCommits');
    });

    it('should have OAuth configuration for all providers', () => {
      expect(gitConfig.oauth).toHaveProperty('github');
      expect(gitConfig.oauth).toHaveProperty('gitlab');
      expect(gitConfig.oauth).toHaveProperty('bitbucket');

      // Check each provider has required fields
      ['github', 'gitlab', 'bitbucket'].forEach((provider) => {
        expect(gitConfig.oauth[provider]).toHaveProperty('clientId');
        expect(gitConfig.oauth[provider]).toHaveProperty('clientSecret');
        expect(gitConfig.oauth[provider]).toHaveProperty('callbackUrl');
      });
    });
  });
});
