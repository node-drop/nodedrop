import { eq, and, or, like, gte, lte, inArray, count } from 'drizzle-orm';
import { db } from '../db/client';
import { workflows, workflowEnvironments, workflowEnvironmentDeployments } from '../db/schema/workflows';
import { executions } from '../db/schema/executions';
import { AppError } from '../middleware/errorHandler';
import {
  CreateWorkflowRequest,
  UpdateWorkflowRequest,
  WorkflowQueryRequest,
} from '../types/api';
import {
  getTriggerService,
  isTriggerServiceInitialized,
} from './triggerServiceSingleton';
import { validateWorkflow } from '../utils/workflowValidator';
import { prepareTriggersForSave } from '../utils/triggerUtils';
import { logger } from '../utils/logger';

interface WorkflowFilters {
  search?: string;
  tags?: string[];
  createdAfter?: Date;
  createdBefore?: Date;
}

/**
 * Options for workspace-scoped queries
 */
interface WorkspaceQueryOptions {
  workspaceId?: string;
}

/**
 * Workflow data types matching Prisma return types
 */
export interface WorkflowData {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  tags: string[];
  userId: string;
  teamId: string | null;
  workspaceId: string | null;
  nodes: any;
  connections: any;
  triggers: any;
  settings: any;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkflowListItem {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  tags: string[];
  active: boolean;
  teamId: string | null;
  workspaceId: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
  _count: {
    executions: number;
  };
}

export interface WorkflowSearchResult extends WorkflowListItem {
  settings: any;
  nodes: any;
  connections: any;
  userId: string;
  executions?: Array<{
    id: string;
    status: string;
    startedAt: Date | null;
    finishedAt: Date | null;
  }>;
  lastExecution: {
    id: string;
    status: string;
    startedAt: Date | null;
    finishedAt: Date | null;
  } | null;
}

export interface WorkflowStats {
  totalWorkflows: number;
  activeWorkflows: number;
  inactiveWorkflows: number;
  totalExecutions: number;
  recentExecutions: number;
}

/**
 * WorkflowService with Drizzle ORM
 * Provides database operations for workflow management
 */
export class WorkflowServiceDrizzle {
  async createWorkflow(
    userId: string,
    data: CreateWorkflowRequest,
    options?: WorkspaceQueryOptions
  ): Promise<WorkflowData> {
    try {
      // Prepare triggers (extract, convert, normalize)
      const normalizedTriggers = prepareTriggersForSave(data, global.nodeService) || [];

      const result = await db
        .insert(workflows)
        .values({
          name: data.name,
          description: data.description || null,
          category: data.category || null,
          tags: data.tags || [],
          userId,
          teamId: data.teamId || null,
          workspaceId: options?.workspaceId || null,
          nodes: data.nodes || [],
          connections: data.connections || [],
          triggers: normalizedTriggers,
          settings: data.settings || {},
          active: data.active || false,
        })
        .returning();

      if (!result[0]) {
        throw new Error('Failed to create workflow');
      }

      return this.mapWorkflowToData(result[0]);
    } catch (error) {
      logger.error('Error creating workflow:', error);
      throw new AppError(
        'Failed to create workflow',
        500,
        'WORKFLOW_CREATE_ERROR'
      );
    }
  }

  async getWorkflow(
    id: string,
    userId?: string,
    options?: WorkspaceQueryOptions
  ): Promise<WorkflowData> {
    try {
      const whereConditions = [eq(workflows.id, id)];

      if (userId) {
        whereConditions.push(eq(workflows.userId, userId));
      }

      if (options?.workspaceId) {
        whereConditions.push(eq(workflows.workspaceId, options.workspaceId));
      }

      const result = await db.query.workflows.findFirst({
        where: whereConditions.length > 1 ? and(...whereConditions) : whereConditions[0],
      });

      if (!result) {
        throw new AppError('Workflow not found', 404, 'WORKFLOW_NOT_FOUND');
      }

      return this.mapWorkflowToData(result);
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error fetching workflow:', error);
      throw new AppError(
        'Failed to fetch workflow',
        500,
        'WORKFLOW_FETCH_ERROR'
      );
    }
  }

  /**
   * Validate workflow structure if nodes or connections are being updated
   */
  private async validateWorkflowUpdate(data: UpdateWorkflowRequest): Promise<void> {
    if (!data.nodes && !data.connections) {
      return;
    }

    // Only validate if we have nodes data
    if (data.nodes) {
      const triggersToValidate = prepareTriggersForSave(data, global.nodeService);

      const workflowData = {
        nodes: data.nodes,
        connections: data.connections,
        triggers: triggersToValidate,
        settings: data.settings,
      };

      const validation = validateWorkflow(workflowData);
      if (!validation.isValid) {
        throw new AppError(
          `Workflow validation failed: ${validation.errors.join(', ')}`,
          400,
          'WORKFLOW_VALIDATION_ERROR'
        );
      }
    }
  }

  /**
   * Build the update data object for Drizzle
   */
  private buildUpdateData(
    data: UpdateWorkflowRequest,
    normalizedTriggers?: any[]
  ): any {
    const updateData: any = {};

    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.tags !== undefined) updateData.tags = data.tags;
    if (data.teamId !== undefined) updateData.teamId = data.teamId;
    if (data.nodes !== undefined) updateData.nodes = data.nodes;
    if (data.connections !== undefined) updateData.connections = data.connections;
    if (normalizedTriggers !== undefined) updateData.triggers = normalizedTriggers;
    if (data.settings !== undefined) updateData.settings = data.settings;
    if (data.active !== undefined) updateData.active = data.active;

    updateData.updatedAt = new Date();

    return updateData;
  }

  /**
   * Sync triggers with TriggerService asynchronously
   */
  private syncTriggersAsync(
    workflowId: string,
    normalizedTriggers?: any[],
    activeChanged?: boolean
  ): void {
    const shouldSync = normalizedTriggers || activeChanged;

    if (!isTriggerServiceInitialized() || !shouldSync) {
      logger.info(`⏭️  Skipping trigger sync for workflow ${workflowId}`, {
        triggerServiceInitialized: isTriggerServiceInitialized(),
        hasNormalizedTriggers: !!normalizedTriggers,
        hasActiveChange: activeChanged,
      });
      return;
    }

    // Fire and forget - don't await
    getTriggerService()
      .syncWorkflowTriggers(workflowId)
      .then(() => {
        logger.info(`✅ Triggers synced successfully for workflow ${workflowId}`);
      })
      .catch((error) => {
        logger.error(`❌ Error syncing triggers for workflow ${workflowId}:`, error);
      });

    logger.info(`🔄 Trigger sync initiated for workflow ${workflowId} (async)`);
  }

  /**
   * Sync schedule jobs with ScheduleJobManager asynchronously
   */
  private syncScheduleJobsAsync(
    workflowId: string,
    normalizedTriggers?: any[],
    activeChanged?: boolean
  ): void {
    const shouldSync = normalizedTriggers || activeChanged;

    if (!global.scheduleJobManager || !shouldSync) {
      return;
    }

    // Fire and forget - don't await
    global.scheduleJobManager
      .syncWorkflowJobs(workflowId)
      .then(() => {
        logger.info(`✅ Schedule jobs synced successfully for workflow ${workflowId}`);
      })
      .catch((error) => {
        logger.error(`❌ Error syncing schedule jobs for workflow ${workflowId}:`, error);
      });

    logger.info(`🔄 Schedule job sync initiated for workflow ${workflowId} (async)`);
  }

  async updateWorkflow(
    id: string,
    userId: string,
    data: UpdateWorkflowRequest
  ): Promise<WorkflowData> {
    try {
      // Verify workflow exists and belongs to user
      await this.getWorkflow(id, userId);

      // Validate workflow structure if needed
      await this.validateWorkflowUpdate(data);

      // Prepare triggers for update
      const normalizedTriggers = prepareTriggersForSave(data, global.nodeService);

      // Build update data
      const updateData = this.buildUpdateData(data, normalizedTriggers);

      // Update workflow in database
      const result = await db
        .update(workflows)
        .set(updateData)
        .where(eq(workflows.id, id))
        .returning();

      if (!result[0]) {
        throw new Error('Failed to update workflow');
      }

      // Sync triggers and schedule jobs asynchronously
      const activeChanged = data.active !== undefined;
      this.syncTriggersAsync(id, normalizedTriggers, activeChanged);
      this.syncScheduleJobsAsync(id, normalizedTriggers, activeChanged);

      return this.mapWorkflowToData(result[0]);
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error updating workflow:', error);
      throw new AppError(
        'Failed to update workflow',
        500,
        'WORKFLOW_UPDATE_ERROR'
      );
    }
  }

  async deleteWorkflow(id: string, userId: string): Promise<{ success: boolean }> {
    try {
      // Check if workflow exists and belongs to user
      await this.getWorkflow(id, userId);

      await db.delete(workflows).where(eq(workflows.id, id));

      return { success: true };
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error deleting workflow:', error);
      throw new AppError(
        'Failed to delete workflow',
        500,
        'WORKFLOW_DELETE_ERROR'
      );
    }
  }

  async listWorkflows(
    userId: string,
    query: WorkflowQueryRequest,
    options?: WorkspaceQueryOptions
  ): Promise<{
    workflows: WorkflowListItem[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    try {
      const {
        page = 1,
        limit = 10,
        search,
        sortBy = 'updatedAt',
        sortOrder = 'desc',
      } = query;
      const skip = (page - 1) * limit;

      const whereConditions = [eq(workflows.userId, userId)];

      // Filter by workspace if provided
      if (options?.workspaceId) {
        whereConditions.push(eq(workflows.workspaceId, options.workspaceId));
      }

      if (search) {
        const searchPattern = `%${search}%`;
        whereConditions.push(
          or(
            like(workflows.name, searchPattern),
            workflows.description ? like(workflows.description, searchPattern) : undefined
          ) as any
        );
      }

      const whereClause =
        whereConditions.length > 1 ? and(...whereConditions) : whereConditions[0];

      // Get total count
      const countResult = await db
        .select({ count: count() })
        .from(workflows)
        .where(whereClause);

      const total = countResult[0]?.count || 0;

      // Get paginated results with execution count
      let orderByClause: any;
      if (sortOrder === 'desc') {
        if (sortBy === 'createdAt') orderByClause = (w: any, { desc }: any) => desc(w.createdAt);
        else if (sortBy === 'name') orderByClause = (w: any, { desc }: any) => desc(w.name);
        else orderByClause = (w: any, { desc }: any) => desc(w.updatedAt);
      } else {
        if (sortBy === 'createdAt') orderByClause = (w: any, { asc }: any) => asc(w.createdAt);
        else if (sortBy === 'name') orderByClause = (w: any, { asc }: any) => asc(w.name);
        else orderByClause = (w: any, { asc }: any) => asc(w.updatedAt);
      }

      const results = await db.query.workflows.findMany({
        where: whereClause,
        limit,
        offset: skip,
        orderBy: orderByClause,
        with: {
          environments: {
            columns: { id: true },
          },
        },
      });

      // Count executions for each workflow
      const workflowIds = results.map((w) => w.id);
      let executionCountMap = new Map<string, number>();
      
      if (workflowIds.length > 0) {
        const executionCounts = await db
          .select({
            workflowId: executions.workflowId,
            count: count(),
          })
          .from(executions)
          .where(inArray(executions.workflowId, workflowIds))
          .groupBy(executions.workflowId);

        executionCountMap = new Map(
          executionCounts.map((ec) => [ec.workflowId, ec.count])
        );
      }

      const workflowList: WorkflowListItem[] = results.map((w) => ({
        id: w.id,
        name: w.name,
        description: w.description,
        category: w.category,
        tags: w.tags || [],
        active: w.active || false,
        teamId: w.teamId,
        workspaceId: w.workspaceId,
        createdAt: w.createdAt,
        updatedAt: w.updatedAt,
        _count: {
          executions: executionCountMap.get(w.id) || 0,
        },
      }));

      return {
        workflows: workflowList,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error('Error listing workflows:', error);
      throw new AppError(
        'Failed to list workflows',
        500,
        'WORKFLOW_LIST_ERROR'
      );
    }
  }

  async searchWorkflows(
    userId: string,
    filters: WorkflowFilters & {
      page?: number;
      limit?: number;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    },
    options?: WorkspaceQueryOptions
  ): Promise<{
    workflows: WorkflowSearchResult[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    try {
      const {
        page = 1,
        limit = 10,
        search,
        tags,
        createdAfter,
        createdBefore,
        sortBy = 'updatedAt',
        sortOrder = 'desc',
      } = filters;
      const skip = (page - 1) * limit;

      const whereConditions = [eq(workflows.userId, userId)];

      // Filter by workspace if provided
      if (options?.workspaceId) {
        whereConditions.push(eq(workflows.workspaceId, options.workspaceId));
      }

      // Text search across name and description
      if (search) {
        const searchPattern = `%${search}%`;
        whereConditions.push(
          or(
            like(workflows.name, searchPattern),
            workflows.description ? like(workflows.description, searchPattern) : undefined
          ) as any
        );
      }

      // Date range filters
      if (createdAfter) {
        whereConditions.push(gte(workflows.createdAt, createdAfter));
      }
      if (createdBefore) {
        whereConditions.push(lte(workflows.createdAt, createdBefore));
      }

      // Tag filtering - check if tags array contains any of the filter tags
      // Note: This is a simplified check. For more complex array operations,
      // you might need to use raw SQL or implement application-level filtering
      // For now, we'll skip tag filtering at the database level and do it in application code
      // if (tags && tags.length > 0) {
      //   whereConditions.push(
      //     or(
      //       ...tags.map((tag) =>
      //         like(workflows.tags, `%${tag}%`)
      //       )
      //     )
      //   );
      // }

      const whereClause =
        whereConditions.length > 1 ? and(...whereConditions) : whereConditions[0];

      // Get total count
      const countResult = await db
        .select({ count: count() })
        .from(workflows)
        .where(whereClause);

      const total = countResult[0]?.count || 0;

      // Get paginated results
      let searchOrderByClause: any;
      if (sortOrder === 'desc') {
        if (sortBy === 'createdAt') searchOrderByClause = (w: any, { desc }: any) => desc(w.createdAt);
        else if (sortBy === 'name') searchOrderByClause = (w: any, { desc }: any) => desc(w.name);
        else searchOrderByClause = (w: any, { desc }: any) => desc(w.updatedAt);
      } else {
        if (sortBy === 'createdAt') searchOrderByClause = (w: any, { asc }: any) => asc(w.createdAt);
        else if (sortBy === 'name') searchOrderByClause = (w: any, { asc }: any) => asc(w.name);
        else searchOrderByClause = (w: any, { asc }: any) => asc(w.updatedAt);
      }

      const results = await db.query.workflows.findMany({
        where: whereClause,
        limit,
        offset: skip,
        orderBy: searchOrderByClause,
      });

      // Get execution counts and last execution for each workflow
      const workflowIds = results.map((w) => w.id);
      let executionCountMap = new Map<string, number>();
      let lastExecutions: any[] = [];
      
      if (workflowIds.length > 0) {
        const executionCounts = await db
          .select({
            workflowId: executions.workflowId,
            count: count(),
          })
          .from(executions)
          .where(inArray(executions.workflowId, workflowIds))
          .groupBy(executions.workflowId);

        executionCountMap = new Map(
          executionCounts.map((ec) => [ec.workflowId, ec.count])
        );

        // Get last execution for each workflow
        lastExecutions = await db.query.executions.findMany({
          where: inArray(executions.workflowId, workflowIds),
          orderBy: (executions, { desc }) => desc(executions.createdAt),
          limit: workflowIds.length,
        });
      }

      const lastExecutionMap = new Map<string, any>();
      for (const exec of lastExecutions) {
        if (!lastExecutionMap.has(exec.workflowId)) {
          lastExecutionMap.set(exec.workflowId, {
            id: exec.id,
            status: exec.status,
            startedAt: exec.startedAt,
            finishedAt: exec.finishedAt,
          });
        }
      }

      const searchResults: WorkflowSearchResult[] = results.map((w) => ({
        id: w.id,
        name: w.name,
        description: w.description,
        category: w.category,
        tags: w.tags || [],
        active: w.active || false,
        teamId: w.teamId,
        workspaceId: w.workspaceId,
        createdAt: w.createdAt,
        updatedAt: w.updatedAt,
        settings: w.settings,
        nodes: w.nodes,
        connections: w.connections,
        userId: w.userId,
        _count: {
          executions: executionCountMap.get(w.id) || 0,
        },
        lastExecution: lastExecutionMap.get(w.id) || null,
      }));

      return {
        workflows: searchResults,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error('Error searching workflows:', error);
      throw new AppError(
        'Failed to search workflows',
        500,
        'WORKFLOW_SEARCH_ERROR'
      );
    }
  }

  async duplicateWorkflow(
    id: string,
    userId: string,
    newName?: string,
    options?: WorkspaceQueryOptions
  ): Promise<WorkflowData> {
    try {
      const originalWorkflow = await this.getWorkflow(id, userId, options);

      const result = await db
        .insert(workflows)
        .values({
          name: newName || `${originalWorkflow.name} (Copy)`,
          description: originalWorkflow.description,
          userId,
          workspaceId: options?.workspaceId || originalWorkflow.workspaceId,
          nodes: originalWorkflow.nodes,
          connections: originalWorkflow.connections,
          triggers: originalWorkflow.triggers,
          settings: originalWorkflow.settings,
          active: false, // Always create duplicates as inactive
          category: originalWorkflow.category,
          tags: originalWorkflow.tags,
          teamId: originalWorkflow.teamId,
        })
        .returning();

      if (!result[0]) {
        throw new Error('Failed to duplicate workflow');
      }

      return this.mapWorkflowToData(result[0]);
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error duplicating workflow:', error);
      throw new AppError(
        'Failed to duplicate workflow',
        500,
        'WORKFLOW_DUPLICATE_ERROR'
      );
    }
  }

  async getWorkflowStats(
    userId: string,
    options?: WorkspaceQueryOptions
  ): Promise<WorkflowStats> {
    try {
      const workflowConditions = [eq(workflows.userId, userId)];
      if (options?.workspaceId) {
        workflowConditions.push(eq(workflows.workspaceId, options.workspaceId));
      }

      const workflowWhere =
        workflowConditions.length > 1
          ? and(...workflowConditions)
          : workflowConditions[0];

      // Get workflow IDs for this user/workspace
      const userWorkflows = await db
        .select({ id: workflows.id })
        .from(workflows)
        .where(workflowWhere);

      const workflowIds = userWorkflows.map((w) => w.id);

      // Count total workflows
      const totalWorkflowsResult = await db
        .select({ count: count() })
        .from(workflows)
        .where(workflowWhere);

      const totalWorkflows = totalWorkflowsResult[0]?.count || 0;

      // Count active workflows
      const activeWorkflowsResult = await db
        .select({ count: count() })
        .from(workflows)
        .where(and(workflowWhere, eq(workflows.active, true)));

      const activeWorkflows = activeWorkflowsResult[0]?.count || 0;

      // Count total executions
      let totalExecutions = 0;
      let recentExecutions = 0;

      if (workflowIds.length > 0) {
        const totalExecutionsResult = await db
          .select({ count: count() })
          .from(executions)
          .where(inArray(executions.workflowId, workflowIds));

        totalExecutions = totalExecutionsResult[0]?.count || 0;

        // Count recent executions (last 7 days)
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const recentExecutionsResult = await db
          .select({ count: count() })
          .from(executions)
          .where(
            and(
              inArray(executions.workflowId, workflowIds),
              gte(executions.createdAt, sevenDaysAgo)
            )
          );

        recentExecutions = recentExecutionsResult[0]?.count || 0;
      }

      return {
        totalWorkflows,
        activeWorkflows,
        inactiveWorkflows: totalWorkflows - activeWorkflows,
        totalExecutions,
        recentExecutions,
      };
    } catch (error) {
      logger.error('Error getting workflow stats:', error);
      throw new AppError(
        'Failed to get workflow statistics',
        500,
        'WORKFLOW_STATS_ERROR'
      );
    }
  }

  async bulkUpdateWorkflows(
    userId: string,
    workflowIds: string[],
    updates: Partial<UpdateWorkflowRequest>
  ): Promise<{ updated: number; workflowIds: string[] }> {
    try {
      // Verify all workflows belong to the user
      const userWorkflows = await db
        .select({ id: workflows.id })
        .from(workflows)
        .where(and(inArray(workflows.id, workflowIds), eq(workflows.userId, userId)));

      if (userWorkflows.length !== workflowIds.length) {
        throw new AppError(
          'Some workflows not found or access denied',
          404,
          'WORKFLOWS_NOT_FOUND'
        );
      }

      const updateData: any = {};
      if (updates.active !== undefined) updateData.active = updates.active;
      if (updates.description !== undefined) updateData.description = updates.description;
      updateData.updatedAt = new Date();

      const result = await db
        .update(workflows)
        .set(updateData)
        .where(and(inArray(workflows.id, workflowIds), eq(workflows.userId, userId)));

      return {
        updated: result.rowCount ?? 0,
        workflowIds,
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error bulk updating workflows:', error);
      throw new AppError(
        'Failed to bulk update workflows',
        500,
        'WORKFLOW_BULK_UPDATE_ERROR'
      );
    }
  }

  async bulkDeleteWorkflows(
    userId: string,
    workflowIds: string[]
  ): Promise<{ deleted: number; workflowIds: string[] }> {
    try {
      // Verify all workflows belong to the user
      const userWorkflows = await db
        .select({ id: workflows.id })
        .from(workflows)
        .where(and(inArray(workflows.id, workflowIds), eq(workflows.userId, userId)));

      if (userWorkflows.length !== workflowIds.length) {
        throw new AppError(
          'Some workflows not found or access denied',
          404,
          'WORKFLOWS_NOT_FOUND'
        );
      }

      // Delete workflows (cascading will handle executions)
      const result = await db
        .delete(workflows)
        .where(and(inArray(workflows.id, workflowIds), eq(workflows.userId, userId)));

      return {
        deleted: result.rowCount ?? 0,
        workflowIds,
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error bulk deleting workflows:', error);
      throw new AppError(
        'Failed to bulk delete workflows',
        500,
        'WORKFLOW_BULK_DELETE_ERROR'
      );
    }
  }

  /**
   * Get upcoming scheduled executions for a workflow
   */
  async getUpcomingExecutions(workflow: any, limit: number = 10): Promise<any> {
    try {
      const { getNextExecutionTimes, describeCronExpression } = await import(
        '@nodedrop/utils'
      );

      const triggers = (workflow.triggers as any[]) || [];
      const scheduleTriggers = triggers.filter((t) => {
        // If active is undefined, treat as true (for backwards compatibility)
        const isActive = t.active !== undefined ? t.active : true;
        return t.type === 'schedule' && isActive;
      });

      if (scheduleTriggers.length === 0) {
        return {
          workflowId: workflow.id,
          workflowName: workflow.name,
          active: workflow.active,
          upcomingExecutions: [],
          message: 'No active schedule triggers found',
        };
      }

      const upcomingExecutions: any[] = [];

      for (const trigger of scheduleTriggers) {
        const cronExpression = trigger.settings?.cronExpression;
        const timezone = trigger.settings?.timezone || 'UTC';
        const scheduleMode = trigger.settings?.scheduleMode || 'cron';

        if (!cronExpression) continue;

        try {
          const nextTimes = getNextExecutionTimes(cronExpression, limit, timezone);
          const description = describeCronExpression(cronExpression);

          upcomingExecutions.push({
            triggerId: trigger.id,
            triggerNodeId: trigger.nodeId,
            triggerType: 'schedule',
            scheduleMode,
            cronExpression,
            timezone,
            description,
            nextExecutions: nextTimes,
          });
        } catch (error) {
          logger.error(
            `Error calculating next execution times for trigger ${trigger.id}:`,
            error
          );
        }
      }

      return {
        workflowId: workflow.id,
        workflowName: workflow.name,
        active: workflow.active,
        upcomingExecutions,
        totalTriggers: scheduleTriggers.length,
      };
    } catch (error) {
      logger.error('Error getting upcoming executions:', error);
      throw new AppError(
        'Failed to get upcoming executions',
        500,
        'UPCOMING_EXECUTIONS_ERROR'
      );
    }
  }

  /**
   * Get all active workflows (for public endpoints like forms)
   * Returns minimal data needed for form/webhook processing
   */
  async getAllActiveWorkflows(): Promise<Array<{
    id: string;
    name: string;
    userId: string;
    nodes: any;
    active: boolean;
  }>> {
    try {
      const result = await db.query.workflows.findMany({
        where: eq(workflows.active, true),
        columns: {
          id: true,
          name: true,
          userId: true,
          nodes: true,
          active: true,
        },
      });

      return result.map(w => ({
        ...w,
        active: w.active ?? false
      }));
    } catch (error) {
      logger.error('Error getting all active workflows:', error);
      throw error;
    }
  }

  /**
   * Get workflow by ID without user filtering (for public endpoints)
   */
  async getWorkflowById(id: string): Promise<any | null> {
    try {
      const result = await db.query.workflows.findFirst({
        where: eq(workflows.id, id),
      });

      return result || null;
    } catch (error) {
      logger.error('Error getting workflow by ID:', error);
      throw error;
    }
  }

  /**
   * Helper method to map database workflow to WorkflowData type
   */
  private mapWorkflowToData(workflow: any): WorkflowData {
    return {
      id: workflow.id,
      name: workflow.name,
      description: workflow.description || null,
      category: workflow.category || null,
      tags: workflow.tags || [],
      userId: workflow.userId,
      teamId: workflow.teamId || null,
      workspaceId: workflow.workspaceId || null,
      nodes: workflow.nodes || [],
      connections: workflow.connections || [],
      triggers: workflow.triggers || [],
      settings: workflow.settings || {},
      active: workflow.active || false,
      createdAt: workflow.createdAt,
      updatedAt: workflow.updatedAt,
    };
  }
}

/**
 * Export singleton instance
 */
export const workflowServiceDrizzle = new WorkflowServiceDrizzle();
