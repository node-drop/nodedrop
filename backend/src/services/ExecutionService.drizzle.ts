import { eq, and, desc, gte, lte, count } from 'drizzle-orm';
import { db } from '../db/client';
import {
  executions,
  executionHistory,
  nodeExecutions,
  flowExecutionStates,
} from '../db/schema/executions';
import { workflows } from '../db/schema/workflows';
import { AppError } from '../middleware/errorHandler';
import {
  Execution,
  ExecutionFilters,
  ExecutionResult,
  ExecutionStatus,
  NodeExecution,
} from '../types/database';
import {
  ExecutionOptions,
  ExecutionProgress,
  ExecutionStats,
} from '../types/execution.types';
import { logger } from '../utils/logger';

/**
 * Options for workspace-scoped queries
 */
interface WorkspaceQueryOptions {
  workspaceId?: string;
}

/**
 * ExecutionService with Drizzle ORM
 * Provides database operations for execution management
 */
export class ExecutionServiceDrizzle {
  /**
   * Get execution by ID
   */
  async getExecution(
    executionId: string,
    userId: string,
    options?: WorkspaceQueryOptions
  ): Promise<Execution | null> {
    try {
      const whereConditions = [eq(executions.id, executionId)];

      if (options?.workspaceId) {
        whereConditions.push(eq(executions.workspaceId, options.workspaceId));
      }

      const execution = await db.query.executions.findFirst({
        where: whereConditions.length > 1 ? and(...whereConditions) : whereConditions[0],
        with: {
          workflow: {
            columns: {
              id: true,
              name: true,
              description: true,
            },
          },
          nodeExecutions: {
            orderBy: (ne) => [desc(ne.startedAt)],
          },
        },
      });

      if (!execution) {
        logger.warn(`Execution ${executionId} not found`);
        return null;
      }

      return this.mapExecutionToData(execution);
    } catch (error) {
      logger.error(`Failed to get execution ${executionId}:`, error);
      return null;
    }
  }

  /**
   * List executions with filtering and pagination
   */
  async listExecutions(
    userId: string,
    filters: ExecutionFilters = {},
    options?: WorkspaceQueryOptions
  ): Promise<{
    executions: Execution[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    try {
      const {
        status,
        workflowId,
        startDate,
        endDate,
        limit = 20,
        offset = 0,
      } = filters;

      const whereConditions = [];

      if (options?.workspaceId) {
        whereConditions.push(eq(executions.workspaceId, options.workspaceId));
      }

      if (status) {
        whereConditions.push(eq(executions.status, status));
      }

      if (workflowId) {
        whereConditions.push(eq(executions.workflowId, workflowId));
      }

      if (startDate || endDate) {
        if (startDate) {
          whereConditions.push(gte(executions.startedAt, startDate));
        }
        if (endDate) {
          whereConditions.push(lte(executions.startedAt, endDate));
        }
      }

      const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;

      const [executionList, totalResult] = await Promise.all([
        db.query.executions.findMany({
          where: whereClause,
          limit,
          offset,
          orderBy: (e) => [desc(e.startedAt)],
          with: {
            workflow: {
              columns: {
                id: true,
                name: true,
                description: true,
              },
            },
          },
        }),
        db.select({ count: count() }).from(executions).where(whereClause),
      ]);

      const total = totalResult[0]?.count || 0;
      const page = Math.floor(offset / limit) + 1;
      const totalPages = Math.ceil(total / limit);

      return {
        executions: executionList.map((e) => this.mapExecutionToData(e)),
        total,
        page,
        limit,
        totalPages,
      };
    } catch (error) {
      logger.error(`Failed to list executions for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Create execution record
   */
  async createExecution(
    workflowId: string,
    userId: string,
    status: ExecutionStatus,
    triggerData?: any,
    workflowSnapshot?: any,
    workspaceId?: string | null
  ): Promise<Execution> {
    try {
      const result = await db
        .insert(executions)
        .values({
          workflowId,
          workspaceId: workspaceId || null,
          status,
          triggerData: triggerData || null,
          workflowSnapshot: workflowSnapshot || null,
          startedAt: new Date(),
        })
        .returning();

      if (!result[0]) {
        throw new Error('Failed to create execution');
      }

      return this.mapExecutionToData(result[0]);
    } catch (error) {
      logger.error('Error creating execution:', error);
      throw new AppError(
        'Failed to create execution',
        500,
        'EXECUTION_CREATE_ERROR'
      );
    }
  }

  /**
   * Update execution status
   */
  async updateExecutionStatus(
    executionId: string,
    status: ExecutionStatus,
    finishedAt?: Date,
    error?: any
  ): Promise<Execution> {
    try {
      const updateData: any = { status, updatedAt: new Date() };

      if (finishedAt) {
        updateData.finishedAt = finishedAt;
      }

      if (error) {
        updateData.error = error;
      }

      const result = await db
        .update(executions)
        .set(updateData)
        .where(eq(executions.id, executionId))
        .returning();

      if (!result[0]) {
        throw new Error('Execution not found');
      }

      return this.mapExecutionToData(result[0]);
    } catch (error) {
      logger.error(`Failed to update execution ${executionId}:`, error);
      throw new AppError(
        'Failed to update execution',
        500,
        'EXECUTION_UPDATE_ERROR'
      );
    }
  }

  /**
   * Delete execution
   */
  async deleteExecution(executionId: string): Promise<void> {
    try {
      await db.delete(executions).where(eq(executions.id, executionId));
    } catch (error) {
      logger.error(`Failed to delete execution ${executionId}:`, error);
      throw new AppError(
        'Failed to delete execution',
        500,
        'EXECUTION_DELETE_ERROR'
      );
    }
  }

  /**
   * Create node execution record
   */
  async createNodeExecution(
    executionId: string,
    nodeId: string,
    status: string,
    inputData?: any,
    outputData?: any,
    error?: any
  ): Promise<NodeExecution> {
    try {
      const result = await db
        .insert(nodeExecutions)
        .values({
          executionId,
          nodeId,
          status,
          inputData: inputData || null,
          outputData: outputData || null,
          error: error || null,
          startedAt: new Date(),
        })
        .returning();

      if (!result[0]) {
        throw new Error('Failed to create node execution');
      }

      return this.mapNodeExecutionToData(result[0]);
    } catch (error) {
      logger.error('Error creating node execution:', error);
      throw new AppError(
        'Failed to create node execution',
        500,
        'NODE_EXECUTION_CREATE_ERROR'
      );
    }
  }

  /**
   * Update node execution
   */
  async updateNodeExecution(
    nodeExecutionId: string,
    status: string,
    outputData?: any,
    error?: any,
    finishedAt?: Date
  ): Promise<NodeExecution> {
    try {
      const updateData: any = { status, updatedAt: new Date() };

      if (outputData) {
        updateData.outputData = outputData;
      }

      if (error) {
        updateData.error = error;
      }

      if (finishedAt) {
        updateData.finishedAt = finishedAt;
      }

      const result = await db
        .update(nodeExecutions)
        .set(updateData)
        .where(eq(nodeExecutions.id, nodeExecutionId))
        .returning();

      if (!result[0]) {
        throw new Error('Node execution not found');
      }

      return this.mapNodeExecutionToData(result[0]);
    } catch (error) {
      logger.error(`Failed to update node execution ${nodeExecutionId}:`, error);
      throw new AppError(
        'Failed to update node execution',
        500,
        'NODE_EXECUTION_UPDATE_ERROR'
      );
    }
  }

  /**
   * Get node execution details
   */
  async getNodeExecution(
    executionId: string,
    nodeId: string,
    userId: string
  ): Promise<NodeExecution | null> {
    try {
      const nodeExecution = await db.query.nodeExecutions.findFirst({
        where: and(
          eq(nodeExecutions.executionId, executionId),
          eq(nodeExecutions.nodeId, nodeId)
        ),
      });

      if (!nodeExecution) {
        return null;
      }

      return this.mapNodeExecutionToData(nodeExecution);
    } catch (error) {
      logger.error(
        `Failed to get node execution ${nodeId} for execution ${executionId}:`,
        error
      );
      return null;
    }
  }

  /**
   * Get execution statistics
   */
  async getExecutionStats(
    userId?: string,
    options?: WorkspaceQueryOptions
  ): Promise<ExecutionStats> {
    try {
      const whereConditions = [];

      if (options?.workspaceId) {
        whereConditions.push(eq(executions.workspaceId, options.workspaceId));
      }

      const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;

      const stats = await Promise.all([
        db.select({ count: count() }).from(executions).where(whereClause),
        db
          .select({ count: count() })
          .from(executions)
          .where(
            whereClause
              ? and(whereClause, eq(executions.status, ExecutionStatus.RUNNING))
              : eq(executions.status, ExecutionStatus.RUNNING)
          ),
        db
          .select({ count: count() })
          .from(executions)
          .where(
            whereClause
              ? and(whereClause, eq(executions.status, ExecutionStatus.SUCCESS))
              : eq(executions.status, ExecutionStatus.SUCCESS)
          ),
        db
          .select({ count: count() })
          .from(executions)
          .where(
            whereClause
              ? and(whereClause, eq(executions.status, ExecutionStatus.ERROR))
              : eq(executions.status, ExecutionStatus.ERROR)
          ),
        db
          .select({ count: count() })
          .from(executions)
          .where(
            whereClause
              ? and(whereClause, eq(executions.status, ExecutionStatus.CANCELLED))
              : eq(executions.status, ExecutionStatus.CANCELLED)
          ),
      ]);

      return {
        totalExecutions: stats[0][0]?.count || 0,
        runningExecutions: stats[1][0]?.count || 0,
        completedExecutions: stats[2][0]?.count || 0,
        failedExecutions: stats[3][0]?.count || 0,
        cancelledExecutions: stats[4][0]?.count || 0,
        averageExecutionTime: 0,
        queueSize: 0,
      };
    } catch (error) {
      logger.error('Failed to get execution stats:', error);
      throw error;
    }
  }

  /**
   * Create execution history record
   */
  async createExecutionHistory(
    executionId: string,
    workflowId: string,
    triggerType: string,
    status: string,
    executedNodes: string[],
    metrics?: any,
    error?: any,
    duration?: number
  ): Promise<void> {
    try {
      await db.insert(executionHistory).values({
        executionId,
        workflowId,
        triggerType,
        startTime: new Date(),
        status,
        executedNodes,
        metrics: metrics || null,
        error: error || null,
        duration: duration || 0,
      });
    } catch (error) {
      logger.error('Error creating execution history:', error);
      throw new AppError(
        'Failed to create execution history',
        500,
        'EXECUTION_HISTORY_CREATE_ERROR'
      );
    }
  }

  /**
   * Map database execution record to data type
   */
  private mapExecutionToData(record: any): Execution {
    return {
      id: record.id,
      workflowId: record.workflowId,
      workspaceId: record.workspaceId,
      status: record.status as ExecutionStatus,
      startedAt: record.startedAt,
      finishedAt: record.finishedAt,
      triggerData: record.triggerData,
      error: record.error,
      workflowSnapshot: record.workflowSnapshot,
      nodeExecutions: record.nodeExecutions?.map((ne: any) =>
        this.mapNodeExecutionToData(ne)
      ) || [],
      workflow: record.workflow,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    } as any;
  }

  /**
   * Map database node execution record to data type
   */
  private mapNodeExecutionToData(record: any): NodeExecution {
    return {
      id: record.id,
      nodeId: record.nodeId,
      executionId: record.executionId,
      status: record.status,
      inputData: record.inputData,
      outputData: record.outputData,
      error: record.error,
      startedAt: record.startedAt,
      finishedAt: record.finishedAt,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    } as any;
  }
}
