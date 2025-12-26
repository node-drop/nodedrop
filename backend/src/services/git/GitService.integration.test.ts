/**
 * Integration test for GitService.getStatus
 * This test verifies the getStatus method works correctly with a real Git repository
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as fs from 'fs-extra';
import * as git from 'isomorphic-git';
import { GitService } from './GitService';
import { db } from '../../db/client';
import { workflowGitConfigs } from '../../db/schema/git';
import { eq, and } from 'drizzle-orm';
import { getWorkflowRepoPath } from '../../config/git';

describe('GitService.getStatus - Integration Test', () => {
  let gitService: GitService;
  const testWorkflowId = 'integration-test-workflow-' + Date.now();
  const testUserId = 'integration-test-user-' + Date.now();

  beforeAll(async () => {
    gitService = new GitService();
  });

  afterAll(async () => {
    // Clean up
    try {
      await db
        .delete(workflowGitConfigs)
        .where(eq(workflowGitConfigs.workflowId, testWorkflowId));
    } catch (error) {
      // Ignore
    }

    const repoPath = getWorkflowRepoPath(testWorkflowId);
    try {
      await fs.remove(repoPath);
    } catch (error) {
      // Ignore
    }
  });

  it('should detect changes in a real Git repository', async () => {
    // Initialize repository
    await gitService.initRepository(testWorkflowId, testUserId);

    // Update config to mark as connected
    await db
      .update(workflowGitConfigs)
      .set({ connected: true, repositoryUrl: 'https://github.com/test/repo.git' })
      .where(and(
        eq(workflowGitConfigs.workflowId, testWorkflowId),
        eq(workflowGitConfigs.userId, testUserId)
      ));

    const repoPath = getWorkflowRepoPath(testWorkflowId);

    // Create a file in the repository
    await fs.writeFile(
      `${repoPath}/workflow.json`,
      JSON.stringify({ name: 'Test Workflow' }, null, 2)
    );

    // Get status - should detect the new file
    const status = await gitService.getStatus(testWorkflowId, testUserId);

    expect(status).toBeDefined();
    expect(status.workflowId).toBe(testWorkflowId);
    expect(status.branch).toBe('main');
    expect(status.modified).toBe(true);
    expect(status.changes.length).toBeGreaterThan(0);

    // Check that workflow.json is in the changes
    const workflowChange = status.changes.find(c => c.path === 'workflow.json');
    expect(workflowChange).toBeDefined();
    expect(workflowChange?.type).toBe('added');
  });
});
