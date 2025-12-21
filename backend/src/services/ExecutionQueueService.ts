/**
 * ExecutionQueueService - BullMQ-based job queue for workflow executions
 *
 * Manages workflow execution jobs using BullMQ with Redis backend.
 * Enables horizontal scaling, fault tolerance, and independent worker scaling.
 *
 * Features:
 * - Non-blocking job creation with immediate execution ID return
 * - Configurable retry with exponential backoff
 * - Job cancellation and cleanup
 * - Queue statistics and health monitoring
 * - Failed job retry with resume from last completed node
 *
 * @module services/ExecutionQueueService
 */

import Bull, { Queue, Job, JobOptions } from "bull";
import { v4 as uuidv4 } from "uuid";
import { db } from "../db/client";
import { executions } from "../db/schema/executions";
import { eq } from "drizzle-orm";
import { logger } from "../utils/logger";
import {
  ExecutionStateStore,
  getExecutionStateStore,
  WorkflowNode,
  WorkflowConnection,
  QueueExecutionContext,
} from "./ExecutionStateStore";
import { ExecutionStatus } from "../types/database";

/**
 * Queue statistics interface
 */
export interface QueueStats {
  /** Number of jobs waiting to be processed */
  waiting: number;
  /** Number of jobs currently being processed */
  active: number;
  /** Number of completed jobs */
  completed: number;
  /** Number of failed jobs */
  failed: number;
  /** Number of delayed jobs */
  delayed: number;
}

/**
 * Parameters for creating an execution job
 */
export interface CreateExecutionParams {
  /** Workflow ID to execute */
  workflowId: string;
  /** User ID who triggered the execution */
  userId: string;
  /** ID of the trigger node */
  triggerNodeId: string;
  /** Data passed from the trigger */
  triggerData: any;
  /** Workflow nodes */
  nodes: WorkflowNode[];
  /** Workflow connections */
  connections: WorkflowConnection[];
  /** Execution options */
  options?: {
    /** Whether to save execution to database */
    saveToDatabase?: boolean;
    /** Workspace ID for multi-tenancy */
    workspaceId?: string | null;
    /** Whether this is a single node execution */
    singleNodeMode?: boolean;
  };
}

/**
 * Job data stored in BullMQ
 */
export interface ExecutionJobData {
  /** Unique execution identifier */
  executionId: string;
  /** Workflow ID */
  workflowId: string;
  /** User ID */
  userId: string;
  /** Trigger node ID */
  triggerNodeId: string;
  /** Trigger data */
  triggerData: any;
  /** Workflow nodes */
  nodes: WorkflowNode[];
  /** Workflow connections */
  connections: WorkflowConnection[];
  /** Execution options */
  options: {
    saveToDatabase: boolean;
    workspaceId: string | null;
    singleNodeMode: boolean;
  };
  /** For retry support - last successfully completed node */
  lastCompletedNodeId?: string;
}

/**
 * Default job options for execution queue
 */
const DEFAULT_JOB_OPTIONS: JobOptions = {
  removeOnComplete: 100, // Keep last 100 completed jobs
  removeOnFail: 50, // Keep last 50 failed jobs
  attempts: 3, // Retry up to 3 times
  backoff: {
    type: "exponential",
    delay: 2000, // Start with 2s, then 4s, then 8s
  },
  timeout: 30 * 60 * 1000, // 30 minute timeout
};

/**
 * Queue name for execution jobs
 */
const EXECUTION_QUEUE_NAME = "workflow-executions";


/**
 * ExecutionQueueService class for managing workflow execution jobs
 *
 * @class ExecutionQueueService
 * @example
 * ```typescript
 * const queueService = ExecutionQueueService.getInstance();
 * await queueService.initialize();
 *
 * // Create execution job
 * const executionId = await queueService.createExecutionJob({
 *   workflowId: 'wf-123',
 *   userId: 'user-456',
 *   triggerNodeId: 'trigger-1',
 *   triggerData: { event: 'manual' },
 *   nodes: [...],
 *   connections: [...],
 * });
 *
 * // Get queue stats
 * const stats = await queueService.getQueueStats();
 * ```
 */
export class ExecutionQueueService {
  private static instance: ExecutionQueueService;
  private executionQueue: Queue<ExecutionJobData> | null = null;
  private stateStore: ExecutionStateStore;
  private initialized: boolean = false;

  private constructor() {
    this.stateStore = getExecutionStateStore();
  }

  /**
   * Get the singleton instance of ExecutionQueueService
   *
   * @returns {ExecutionQueueService} The singleton instance
   */
  static getInstance(): ExecutionQueueService {
    if (!ExecutionQueueService.instance) {
      ExecutionQueueService.instance = new ExecutionQueueService();
    }
    return ExecutionQueueService.instance;
  }

  /**
   * Initialize the queue service with Redis connection
   *
   * @returns {Promise<void>}
   * @throws {Error} If Redis connection fails
   */
  async initialize(): Promise<void> {
    if (this.initialized && this.executionQueue) {
      return;
    }

    try {
      // Initialize state store first
      await this.stateStore.initialize();

      // Create BullMQ queue with Redis connection
      this.executionQueue = new Bull<ExecutionJobData>(EXECUTION_QUEUE_NAME, {
        redis: {
          host: process.env.REDIS_HOST || "localhost",
          port: parseInt(process.env.REDIS_PORT || "6379"),
          password: process.env.REDIS_PASSWORD,
        },
        defaultJobOptions: DEFAULT_JOB_OPTIONS,
      });

      // Set up queue event handlers
      this.setupQueueEventHandlers();

      this.initialized = true;
      logger.info("[ExecutionQueueService] Initialized successfully");
    } catch (error) {
      logger.error("[ExecutionQueueService] Failed to initialize", { error });
      throw error;
    }
  }

  /**
   * Set up event handlers for queue events
   *
   * @private
   */
  private setupQueueEventHandlers(): void {
    if (!this.executionQueue) return;

    this.executionQueue.on("error", (error) => {
      logger.error("[ExecutionQueueService] Queue error", { error });
    });

    this.executionQueue.on("waiting", (jobId) => {
      logger.debug("[ExecutionQueueService] Job waiting", { jobId });
    });

    this.executionQueue.on("active", (job) => {
      logger.info("[ExecutionQueueService] Job started", {
        jobId: job.id,
        executionId: job.data.executionId,
      });
    });

    this.executionQueue.on("completed", (job) => {
      logger.info("[ExecutionQueueService] Job completed", {
        jobId: job.id,
        executionId: job.data.executionId,
      });
    });

    this.executionQueue.on("failed", (job, error) => {
      logger.error("[ExecutionQueueService] Job failed", {
        jobId: job?.id,
        executionId: job?.data?.executionId,
        error: error?.message,
        attemptsMade: job?.attemptsMade,
      });
    });

    this.executionQueue.on("stalled", (job) => {
      logger.warn("[ExecutionQueueService] Job stalled", {
        jobId: job.id,
        executionId: job.data.executionId,
      });
    });
  }

  /**
   * Ensure queue is initialized
   *
   * @private
   * @returns {Promise<Queue<ExecutionJobData>>}
   * @throws {Error} If queue is not available
   */
  private async ensureQueue(): Promise<Queue<ExecutionJobData>> {
    if (!this.initialized || !this.executionQueue) {
      await this.initialize();
    }

    if (!this.executionQueue) {
      throw new Error("Execution queue not available");
    }

    return this.executionQueue;
  }


  /**
   * Create a new execution job
   *
   * Creates a database execution record and adds a job to the queue.
   * Returns immediately with the execution ID without waiting for execution.
   *
   * @param {CreateExecutionParams} params - Execution parameters
   * @returns {Promise<string>} The execution ID
   */
  async createExecutionJob(params: CreateExecutionParams): Promise<string> {
    const queue = await this.ensureQueue();

    const {
      workflowId,
      userId,
      triggerNodeId,
      triggerData,
      nodes,
      connections,
      options = {},
    } = params;

    const {
      saveToDatabase = true,
      workspaceId = null,
      singleNodeMode = false,
    } = options;

    // Generate execution ID
    const executionId = uuidv4();

    try {
      // Create database execution record if requested
      if (saveToDatabase) {
        await db.insert(executions).values({
          id: executionId,
          workflowId,
          workspaceId,
          status: ExecutionStatus.RUNNING,
          triggerData: triggerData || null,
          startedAt: new Date(),
        });

        logger.info("[ExecutionQueueService] Created execution record", {
          executionId,
          workflowId,
        });
      }

      // Build nodeIdToName mapping
      const nodeIdToName: Record<string, string> = {};
      for (const node of nodes) {
        nodeIdToName[node.id] = node.name || node.type;
      }

      // Create execution context in Redis
      const context: QueueExecutionContext = {
        executionId,
        workflowId,
        userId,
        triggerData,
        nodes,
        connections,
        nodeIdToName,
        status: "pending",
        startTime: Date.now(),
        saveToDatabase,
        singleNodeMode,
        workspaceId,
        triggerNodeId,
      };

      await this.stateStore.createState(executionId, context);

      // Create job data
      const jobData: ExecutionJobData = {
        executionId,
        workflowId,
        userId,
        triggerNodeId,
        triggerData,
        nodes,
        connections,
        options: {
          saveToDatabase,
          workspaceId,
          singleNodeMode,
        },
      };

      // Add job to queue
      await queue.add(jobData, {
        jobId: executionId,
      });

      logger.info("[ExecutionQueueService] Created execution job", {
        executionId,
        workflowId,
        triggerNodeId,
        singleNodeMode,
      });

      return executionId;
    } catch (error) {
      // Clean up on failure
      logger.error("[ExecutionQueueService] Failed to create execution job", {
        executionId,
        workflowId,
        error,
      });

      // Try to clean up database record if it was created
      if (saveToDatabase) {
        try {
          await db.delete(executions).where(eq(executions.id, executionId));
        } catch (cleanupError) {
          logger.error("[ExecutionQueueService] Failed to cleanup execution record", {
            executionId,
            cleanupError,
          });
        }
      }

      // Try to clean up Redis state
      try {
        await this.stateStore.deleteState(executionId);
      } catch (cleanupError) {
        logger.error("[ExecutionQueueService] Failed to cleanup Redis state", {
          executionId,
          cleanupError,
        });
      }

      throw error;
    }
  }


  /**
   * Cancel an execution
   *
   * Removes the job from the queue if pending, updates the database status,
   * and cleans up Redis state.
   *
   * @param {string} executionId - The execution ID to cancel
   * @returns {Promise<void>}
   */
  async cancelExecution(executionId: string): Promise<void> {
    const queue = await this.ensureQueue();

    try {
      // Try to get the job from the queue
      const job = await queue.getJob(executionId);

      if (job) {
        // Check if job is still in queue (waiting or delayed)
        const state = await job.getState();

        if (state === "waiting" || state === "delayed") {
          // Remove from queue
          await job.remove();
          logger.info("[ExecutionQueueService] Removed job from queue", {
            executionId,
            previousState: state,
          });
        } else if (state === "active") {
          // Job is currently running - we can't stop it directly
          // but we can mark it for cancellation
          logger.warn("[ExecutionQueueService] Job is active, marking for cancellation", {
            executionId,
          });
        }
      }

      // Update database status to cancelled
      await db
        .update(executions)
        .set({
          status: ExecutionStatus.CANCELLED,
          finishedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(executions.id, executionId));

      // Update Redis state status
      await this.stateStore.updateStatus(executionId, "cancelled");

      // Set completion TTL for cleanup
      await this.stateStore.setCompletionTTL(executionId);

      logger.info("[ExecutionQueueService] Cancelled execution", {
        executionId,
      });
    } catch (error) {
      logger.error("[ExecutionQueueService] Failed to cancel execution", {
        executionId,
        error,
      });
      throw error;
    }
  }


  /**
   * Get queue statistics
   *
   * Returns counts of jobs in various states.
   *
   * @returns {Promise<QueueStats>} Queue statistics
   */
  async getQueueStats(): Promise<QueueStats> {
    const queue = await this.ensureQueue();

    try {
      const [waiting, active, completed, failed, delayed] = await Promise.all([
        queue.getWaitingCount(),
        queue.getActiveCount(),
        queue.getCompletedCount(),
        queue.getFailedCount(),
        queue.getDelayedCount(),
      ]);

      const stats: QueueStats = {
        waiting,
        active,
        completed,
        failed,
        delayed,
      };

      logger.debug("[ExecutionQueueService] Queue stats", stats);

      return stats;
    } catch (error) {
      logger.error("[ExecutionQueueService] Failed to get queue stats", { error });
      throw error;
    }
  }


  /**
   * Retry a failed execution
   *
   * Gets the failed job data and requeues it with the lastCompletedNodeId
   * so the worker can resume from where it left off.
   *
   * @param {string} executionId - The execution ID to retry
   * @returns {Promise<string>} The new execution ID
   */
  async retryExecution(executionId: string): Promise<string> {
    const queue = await this.ensureQueue();

    try {
      // Get the original execution state from Redis
      const originalState = await this.stateStore.getState(executionId);

      if (!originalState) {
        // Try to get from database if not in Redis
        const dbExecution = await db.query.executions.findFirst({
          where: eq(executions.id, executionId),
        });

        if (!dbExecution) {
          throw new Error(`Execution ${executionId} not found`);
        }

        // For database-only executions, we need to create a new execution
        // without resume capability
        logger.warn("[ExecutionQueueService] Retrying without state - full re-execution", {
          executionId,
        });

        throw new Error(
          `Execution state not found in Redis. Cannot resume from last completed node.`
        );
      }

      // Generate new execution ID for the retry
      const newExecutionId = uuidv4();

      // Create new database execution record
      if (originalState.saveToDatabase) {
        await db.insert(executions).values({
          id: newExecutionId,
          workflowId: originalState.workflowId,
          workspaceId: originalState.workspaceId || null,
          status: ExecutionStatus.RUNNING,
          triggerData: originalState.triggerData || null,
          startedAt: new Date(),
        });
      }

      // Create new execution context with lastCompletedNodeId for resume
      const newContext: QueueExecutionContext = {
        ...originalState,
        executionId: newExecutionId,
        status: "pending",
        startTime: Date.now(),
        currentNodeId: undefined,
        // Keep lastCompletedNodeId from original state for resume
        lastCompletedNodeId: originalState.lastCompletedNodeId,
      };

      await this.stateStore.createState(newExecutionId, newContext);

      // Copy node outputs from original execution for resume
      if (originalState.lastCompletedNodeId) {
        const originalOutputs = await this.stateStore.getAllNodeOutputs(executionId);
        const outputEntries = Array.from(originalOutputs.entries());
        for (const [nodeId, output] of outputEntries) {
          await this.stateStore.setNodeOutput(newExecutionId, nodeId, output);
        }
      }

      // Create job data with lastCompletedNodeId for resume
      const jobData: ExecutionJobData = {
        executionId: newExecutionId,
        workflowId: originalState.workflowId,
        userId: originalState.userId,
        triggerNodeId: originalState.triggerNodeId || "",
        triggerData: originalState.triggerData,
        nodes: originalState.nodes,
        connections: originalState.connections,
        options: {
          saveToDatabase: originalState.saveToDatabase,
          workspaceId: originalState.workspaceId || null,
          singleNodeMode: originalState.singleNodeMode,
        },
        lastCompletedNodeId: originalState.lastCompletedNodeId,
      };

      // Add job to queue
      await queue.add(jobData, {
        jobId: newExecutionId,
      });

      logger.info("[ExecutionQueueService] Retried execution", {
        originalExecutionId: executionId,
        newExecutionId,
        lastCompletedNodeId: originalState.lastCompletedNodeId,
      });

      return newExecutionId;
    } catch (error) {
      logger.error("[ExecutionQueueService] Failed to retry execution", {
        executionId,
        error,
      });
      throw error;
    }
  }

  /**
   * Get a job by execution ID
   *
   * @param {string} executionId - The execution ID
   * @returns {Promise<Job<ExecutionJobData> | null>} The job or null if not found
   */
  async getJob(executionId: string): Promise<Job<ExecutionJobData> | null> {
    const queue = await this.ensureQueue();
    return queue.getJob(executionId);
  }

  /**
   * Get failed jobs
   *
   * @param {number} start - Start index
   * @param {number} end - End index
   * @returns {Promise<Job<ExecutionJobData>[]>} Array of failed jobs
   */
  async getFailedJobs(start: number = 0, end: number = 10): Promise<Job<ExecutionJobData>[]> {
    const queue = await this.ensureQueue();
    return queue.getFailed(start, end);
  }

  /**
   * Get waiting jobs
   *
   * @param {number} start - Start index
   * @param {number} end - End index
   * @returns {Promise<Job<ExecutionJobData>[]>} Array of waiting jobs
   */
  async getWaitingJobs(start: number = 0, end: number = 10): Promise<Job<ExecutionJobData>[]> {
    const queue = await this.ensureQueue();
    return queue.getWaiting(start, end);
  }

  /**
   * Get active jobs
   *
   * @param {number} start - Start index
   * @param {number} end - End index
   * @returns {Promise<Job<ExecutionJobData>[]>} Array of active jobs
   */
  async getActiveJobs(start: number = 0, end: number = 10): Promise<Job<ExecutionJobData>[]> {
    const queue = await this.ensureQueue();
    return queue.getActive(start, end);
  }

  /**
   * Check if the queue service is initialized and connected
   *
   * @returns {boolean} True if connected
   */
  isConnected(): boolean {
    return this.initialized && this.executionQueue !== null;
  }

  /**
   * Get the underlying queue instance (for worker registration)
   *
   * @returns {Queue<ExecutionJobData> | null} The queue instance
   */
  getQueue(): Queue<ExecutionJobData> | null {
    return this.executionQueue;
  }

  /**
   * Shutdown the queue service
   *
   * @returns {Promise<void>}
   */
  async shutdown(): Promise<void> {
    if (this.executionQueue) {
      await this.executionQueue.close();
      this.executionQueue = null;
      this.initialized = false;
      logger.info("[ExecutionQueueService] Shut down");
    }
  }
}

// Export singleton instance getter
export const getExecutionQueueService = (): ExecutionQueueService => {
  return ExecutionQueueService.getInstance();
};
