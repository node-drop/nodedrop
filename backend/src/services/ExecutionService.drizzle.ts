import { eq, and, desc, gte, lte, count, or } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
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
import { RealtimeExecutionEngine } from './RealtimeExecutionEngine';
import { NodeService } from './NodeService';

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
  private realtimeEngine: RealtimeExecutionEngine;
  private nodeService: NodeService;

  constructor() {
    this.nodeService = new NodeService();
    this.realtimeEngine = new RealtimeExecutionEngine(db as any, this.nodeService);
  }
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

  /**
   * Execute a single node
   * Executes a node in isolation without waiting for upstream nodes
   */
  async executeSingleNode(
    workflowId: string,
    nodeId: string,
    userId: string,
    inputData?: any,
    parameters?: any,
    mode: string = 'single',
    workflowData?: any
  ): Promise<{ data: any; error?: any }> {
    const startTime = Date.now();
    
    try {
      logger.info(`Executing single node ${nodeId} in workflow ${workflowId}`, {
        userId,
        mode,
        hasInputData: !!inputData,
        hasParameters: !!parameters,
      });

      // Get workflow to find the node
      let workflowNodes: any[];
      
      if (workflowData && workflowData.nodes) {
        workflowNodes = workflowData.nodes;
      } else {
        const workflow = await db.query.workflows.findFirst({
          where: eq(workflows.id, workflowId),
        });

        if (!workflow) {
          throw new Error(`Workflow ${workflowId} not found`);
        }

        workflowNodes = (workflow.nodes as any) || [];
      }

      // Find the specific node
      const node = workflowNodes.find((n: any) => n.id === nodeId);
      if (!node) {
        throw new Error(`Node ${nodeId} not found in workflow`);
      }

      // Get node type info
      const nodeTypeInfo = await this.nodeService.getNodeSchema(node.type);
      if (!nodeTypeInfo) {
        throw new Error(`Unknown node type: ${node.type}`);
      }

      // Prepare node parameters
      const nodeParameters = {
        ...nodeTypeInfo.defaults,
        ...node.parameters,
        ...(parameters || {}),
      };

      // Build credentials mapping using shared utility
      const { buildCredentialsMapping, extractCredentialProperties } = await import('../utils/credentialHelpers');
      
      const nodeTypeProperties = extractCredentialProperties(nodeTypeInfo);
      const { mapping: credentialsMapping } = await buildCredentialsMapping({
        nodeParameters,
        nodeTypeProperties,
        userId,
        legacyCredentials: node.credentials,
        logPrefix: "[ExecutionService-SingleNode]",
      });

      // Prepare input data
      const nodeInputData = inputData || { main: [[]] };

      // Execute the node directly
      const result = await this.nodeService.executeNode(
        node.type,
        nodeParameters,
        nodeInputData,
        credentialsMapping,
        undefined, // executionId - not needed for single node
        userId,
        { timeout: 30000, nodeId },
        workflowId,
        node.settings,
        new Map(), // nodeOutputs - empty for single node
        new Map()  // nodeIdToName - empty for single node
      );

      if (!result.success) {
        logger.error(`Node execution failed for ${nodeId}:`, {
          nodeId,
          nodeType: node.type,
          error: result.error?.message,
          errorStack: result.error?.stack,
        });
        throw new Error(result.error?.message || 'Node execution failed');
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      logger.info(`Single node execution completed successfully for ${nodeId}`, {
        nodeId,
        nodeType: node.type,
        hasData: !!result.data,
        dataKeys: result.data ? Object.keys(result.data) : [],
        duration,
      });

      // Generate execution ID for consistency with workflow execution
      const executionId = uuidv4();

      // Format the response to match the old service structure
      // This ensures consistency between single node and workflow execution
      const nodeExecutionResult = {
        nodeId: nodeId,
        status: result.success ? "completed" : "failed",
        data: result.data ? JSON.parse(JSON.stringify(result.data)) : undefined,
        duration,
      };

      return {
        data: {
          executionId,
          status: result.success ? "completed" : "failed",
          executedNodes: [nodeId],
          failedNodes: result.success ? [] : [nodeId],
          duration,
          hasFailures: !result.success,
          // Include output data in the same format as workflow execution
          nodeExecutions: [nodeExecutionResult],
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      
      logger.error(`Failed to execute single node ${nodeId}:`, {
        nodeId,
        error: errorMessage,
        stack: errorStack,
      });
      
      // Return error in a way that the route can handle it
      // The route will add it to warnings if present
      return {
        data: null,
        error: {
          message: errorMessage,
          code: 'NODE_EXECUTION_ERROR',
        },
      };
    }
  }

  /**
   * Execute a workflow
   */
  async executeWorkflow(
    workflowId: string,
    userId: string,
    triggerData?: any,
    options?: ExecutionOptions,
    triggerNodeId?: string,
    workflowData?: any
  ): Promise<{ data: any; error?: any }> {
    try {
      logger.info(`Executing workflow ${workflowId}`, {
        userId,
        hasTriggerData: !!triggerData,
        triggerNodeId,
      });

      // Get workflow to extract nodes and connections
      const workflow = await db.query.workflows.findFirst({
        where: eq(workflows.id, workflowId),
      });

      if (!workflow) {
        throw new Error(`Workflow ${workflowId} not found`);
      }

      const nodes = (workflow.nodes as any) || [];
      const connections = (workflow.connections as any) || [];

      // Use provided trigger node ID or find first trigger node
      let startNodeId = triggerNodeId;
      if (!startNodeId) {
        const triggerNode = nodes.find((n: any) => n.type === 'trigger' || n.type === 'webhook');
        startNodeId = triggerNode?.id || nodes[0]?.id;
      }

      if (!startNodeId) {
        throw new Error('No trigger node found in workflow');
      }

      // Start execution via realtime engine
      const executionId = await this.realtimeEngine.startExecution(
        workflowId,
        userId,
        startNodeId,
        triggerData || {},
        nodes,
        connections,
        { saveToDatabase: true }
      );

      return {
        data: { executionId, status: 'started' },
      };
    } catch (error) {
      logger.error(`Failed to execute workflow ${workflowId}:`, error);
      return {
        data: null,
        error: {
          message: error instanceof Error ? error.message : 'Unknown error',
          code: 'WORKFLOW_EXECUTION_ERROR',
        },
      };
    }
  }

  /**
   * Get execution progress
   */
  async getExecutionProgress(
    executionId: string,
    userId: string
  ): Promise<any> {
    try {
      const execution = await db.query.executions.findFirst({
        where: eq(executions.id, executionId),
        with: {
          nodeExecutions: {
            orderBy: (ne: any) => [desc(ne.startedAt)],
          },
        },
      });

      if (!execution) {
        return null;
      }

      const nodeExecutionsList = (execution as any).nodeExecutions || [];
      const totalNodes = nodeExecutionsList.length;
      const completedNodes = nodeExecutionsList.filter(
        (ne: any) => ne.status === 'completed' || ne.status === 'success'
      ).length;
      const failedNodes = nodeExecutionsList.filter(
        (ne: any) => ne.status === 'error' || ne.status === 'failed'
      ).length;

      return {
        executionId,
        status: execution.status,
        progress: totalNodes > 0 ? (completedNodes / totalNodes) * 100 : 0,
        totalNodes,
        completedNodes,
        failedNodes,
        currentNode: nodeExecutionsList[0]?.nodeId,
        startedAt: execution.startedAt || new Date(),
        finishedAt: execution.finishedAt || undefined,
      };
    } catch (error) {
      logger.error(`Failed to get execution progress for ${executionId}:`, error);
      return null;
    }
  }

  /**
   * Cancel execution
   */
  async cancelExecution(
    executionId: string,
    userId: string
  ): Promise<{ success: boolean; data?: any; error?: any }> {
    try {
      const execution = await this.getExecution(executionId, userId);
      if (!execution) {
        return {
          success: false,
          error: { message: 'Execution not found' },
        };
      }

      // Update execution status to cancelled
      await this.updateExecutionStatus(
        executionId,
        ExecutionStatus.CANCELLED,
        new Date()
      );

      logger.info(`Execution ${executionId} cancelled by user ${userId}`);

      return {
        success: true,
        data: { executionId, status: ExecutionStatus.CANCELLED },
      };
    } catch (error) {
      logger.error(`Failed to cancel execution ${executionId}:`, error);
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }

  /**
   * Retry execution
   */
  async retryExecution(
    executionId: string,
    userId: string
  ): Promise<{ success: boolean; data?: any; error?: any }> {
    try {
      const execution = await this.getExecution(executionId, userId);
      if (!execution) {
        return {
          success: false,
          error: { message: 'Execution not found' },
        };
      }

      // Create a new execution with the same trigger data
      const newExecution = await this.createExecution(
        execution.workflowId,
        userId,
        ExecutionStatus.RUNNING,
        execution.triggerData
      );

      logger.info(
        `Execution ${executionId} retried as ${newExecution.id} by user ${userId}`
      );

      return {
        success: true,
        data: newExecution,
      };
    } catch (error) {
      logger.error(`Failed to retry execution ${executionId}:`, error);
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }
}
