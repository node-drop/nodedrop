import { Request, Response, Router } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { workflowService } from '../services/WorkflowService';
import { getCredentialService } from '../services/CredentialService.factory';
import { db } from '../db/client';
import { variables } from '../db/schema/variables';
import { workflowEnvironments } from '../db/schema/workflows';
import { eq } from 'drizzle-orm';

const router = Router();

interface BackupData {
  version: string;
  exportedAt: string;
  userId: string;
  workflows: any[];
  variables: any[];
  credentials: any[];
  environments: any[];
}

interface ExportOptions {
  includeWorkflows: boolean;
  includeVariables: boolean;
  includeCredentials: boolean;
  includeEnvironments: boolean;
}

/**
 * POST /api/backup/export - Export backup data
 */
router.post(
  '/export',
  requireAuth,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;
    const options: ExportOptions = req.body.options || {
      includeWorkflows: true,
      includeVariables: true,
      includeCredentials: true,
      includeEnvironments: true,
    };

    const backupData: BackupData = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      userId,
      workflows: [],
      variables: [],
      credentials: [],
      environments: [],
    };

    // Export workflows
    if (options.includeWorkflows) {
      const workflowsResult = await workflowService.listWorkflows(userId, {
        page: 1,
        limit: 1000,
        sortOrder: 'desc',
      });
      backupData.workflows = workflowsResult.workflows || [];
    }

    // Export variables
    if (options.includeVariables) {
      const userVariables = await db
        .select()
        .from(variables)
        .where(eq(variables.userId, userId));
      backupData.variables = userVariables;
    }

    // Export credentials
    if (options.includeCredentials) {
      const credentialService = getCredentialService();
      credentialService.registerCoreCredentials();
      const userCredentials = await credentialService.getCredentials(userId);
      backupData.credentials = userCredentials || [];
    }

    // Export environments
    if (options.includeEnvironments) {
      const userEnvironments = await db
        .select()
        .from(workflowEnvironments);
      backupData.environments = userEnvironments;
    }

    const response = {
      success: true,
      data: backupData,
    };

    res.json(response);
  })
);

/**
 * POST /api/backup/import - Import backup data
 */
router.post(
  '/import',
  requireAuth,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;
    const backupData: BackupData = req.body.data;
    const options: ExportOptions = req.body.options || {
      includeWorkflows: true,
      includeVariables: true,
      includeCredentials: true,
      includeEnvironments: true,
    };

    const results = {
      workflows: { imported: 0, errors: [] as string[] },
      variables: { imported: 0, errors: [] as string[] },
      credentials: { imported: 0, errors: [] as string[] },
      environments: { imported: 0, errors: [] as string[] },
    };

    // Import workflows
    if (options.includeWorkflows && backupData.workflows) {
      for (const workflow of backupData.workflows) {
        try {
          const { id, createdAt, updatedAt, ...workflowData } = workflow;
          await workflowService.createWorkflow(userId, {
            ...workflowData,
            name: `${workflow.name} (Imported)`,
          });
          results.workflows.imported++;
        } catch (error: any) {
          results.workflows.errors.push(`Failed to import workflow "${workflow.name}": ${error.message}`);
        }
      }
    }

    // Import variables
    if (options.includeVariables && backupData.variables) {
      for (const variable of backupData.variables) {
        try {
          const existingVariable = await db
            .select()
            .from(variables)
            .where(eq(variables.key, variable.key))
            .limit(1);

          if (existingVariable.length === 0) {
            const { id, createdAt, updatedAt, userId: _, ...variableData } = variable;
            await db.insert(variables).values({
              ...variableData,
              userId,
              createdAt: new Date(),
              updatedAt: new Date(),
            });
            results.variables.imported++;
          } else {
            results.variables.errors.push(`Variable "${variable.key}" already exists and was skipped`);
          }
        } catch (error: any) {
          results.variables.errors.push(`Failed to import variable "${variable.key}": ${error.message}`);
        }
      }
    }

    // Import credentials
    if (options.includeCredentials && backupData.credentials) {
      const credentialService = getCredentialService();
      credentialService.registerCoreCredentials();
      for (const credential of backupData.credentials) {
        try {
          const { id, createdAt, updatedAt, userId: _, ...credentialData } = credential;
          await credentialService.createCredential(
            userId,
            `${credential.name} (Imported)`,
            credential.type,
            credential.data
          );
          results.credentials.imported++;
        } catch (error: any) {
          results.credentials.errors.push(`Failed to import credential "${credential.name}": ${error.message}`);
        }
      }
    }

    // Import environments
    if (options.includeEnvironments && backupData.environments) {
      for (const environment of backupData.environments) {
        try {
          const { id, createdAt, updatedAt, ...envData } = environment;
          await db.insert(workflowEnvironments).values({
            ...envData,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
          results.environments.imported++;
        } catch (error: any) {
          results.environments.errors.push(`Failed to import environment: ${error.message}`);
        }
      }
    }

    const response = {
      success: true,
      data: results,
    };

    res.json(response);
  })
);

/**
 * GET /api/backup/summary - Get summary of backup data size
 */
router.get(
  '/summary',
  requireAuth,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;

    const summary = {
      workflows: 0,
      variables: 0,
      credentials: 0,
      environments: 0,
    };

    try {
      const workflowsResult = await workflowService.listWorkflows(userId, {
        page: 1,
        limit: 1,
        sortOrder: 'desc',
      });
      summary.workflows = workflowsResult.pagination?.total || 0;
    } catch (error) {
      console.error('Error fetching workflows count:', error);
    }

    try {
      const userVariables = await db
        .select()
        .from(variables)
        .where(eq(variables.userId, userId));
      summary.variables = userVariables.length;
    } catch (error) {
      console.error('Error fetching variables count:', error);
    }

    try {
      const credentialService = getCredentialService();
      credentialService.registerCoreCredentials();
      const userCredentials = await credentialService.getCredentials(userId);
      summary.credentials = userCredentials?.length || 0;
    } catch (error) {
      console.error('Error fetching credentials count:', error);
    }

    try {
      const userEnvironments = await db
        .select()
        .from(workflowEnvironments);
      summary.environments = userEnvironments.length;
    } catch (error) {
      console.error('Error fetching environments count:', error);
    }

    const response = {
      success: true,
      data: summary,
    };

    res.json(response);
  })
);

export { router as backupRoutes };
