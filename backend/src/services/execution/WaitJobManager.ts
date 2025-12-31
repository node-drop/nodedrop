/**
 * WaitJobManager - Manages scheduled wait operations using BullMQ
 * 
 * Handles persistent waits that survive server restarts.
 * Uses the scheduled_waits table as source of truth and BullMQ for job scheduling.
 * 
 * For webhook waits, stores full execution state so execution can resume
 * from exactly where it paused, even after server restarts.
 */

import { Queue, Worker, Job } from 'bullmq';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, and, lte } from 'drizzle-orm';
import * as schema from '../../db/schema';
import { StoredExecutionState } from '../../db/schema/scheduled-waits';
import { logger } from '../../utils/logger';

export interface WaitJobData {
  waitId: string;
  executionId: string;
  workflowId: string;
  nodeId: string;
  inputData: any;
  jobType?: 'timeout' | 'resume'; // 'timeout' for expiry, 'resume' for webhook resume
}

export interface ScheduleWaitOptions {
  executionId: string;
  workflowId: string;
  nodeId: string;
  userId?: string;
  resumeAt: Date;
  waitType: 'duration' | 'datetime' | 'webhook';
  inputData?: any;
  reason?: string;
}

export interface ScheduleWebhookWaitOptions {
  executionId: string;
  workflowId: string;
  nodeId: string;
  userId?: string;
  resumeAt: Date;
  inputData?: any;
  reason?: string;
  webhookOptions?: {
    httpMethod?: string;
    authConfig?: {
      type: string;
      settings?: {
        username?: string;
        password?: string;
        headerName?: string;
        expectedValue?: string;
        queryParam?: string;
      };
    };
    responseMessage?: string;
    allowedOrigins?: string;
    ipWhitelist?: string;
    allowDataInResume?: boolean;
  };
}

export interface SaveExecutionStateOptions {
  waitId: string;
  executionState: StoredExecutionState;
}

// Callback type for resuming executions
export type ResumeExecutionCallback = (
  waitId: string,
  executionId: string,
  workflowId: string,
  nodeId: string,
  inputData: any,
  executionState: StoredExecutionState | null,
  webhookData?: any
) => Promise<void>;

export class WaitJobManager {
  private waitQueue: Queue<WaitJobData>;
  private worker: Worker<WaitJobData>;
  private db: NodePgDatabase<typeof schema>;
  private resumeCallback?: ResumeExecutionCallback;
  private cleanupInterval?: NodeJS.Timeout;

  // Cleanup configuration
  private readonly CLEANUP_INTERVAL_MS = 60 * 60 * 1000; // 1 hour
  private readonly EXPIRED_WAIT_RETENTION_DAYS = 7; // Keep expired/cancelled waits for 7 days

  constructor(
    db: NodePgDatabase<typeof schema>,
    redisConfig?: { host?: string; port?: number; password?: string }
  ) {
    this.db = db;

    const connection = {
      host: redisConfig?.host || process.env.REDIS_HOST || 'localhost',
      port: redisConfig?.port || parseInt(process.env.REDIS_PORT || '6379'),
      password: redisConfig?.password || process.env.REDIS_PASSWORD,
    };

    // Initialize BullMQ queue for wait jobs
    this.waitQueue = new Queue<WaitJobData>('wait-jobs', {
      connection,
      defaultJobOptions: {
        removeOnComplete: {
          count: 100,
        },
        removeOnFail: {
          count: 50,
        },
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      },
    });

    // Initialize worker
    this.worker = new Worker<WaitJobData>(
      'wait-jobs',
      async (job: Job<WaitJobData>) => {
        await this.processWaitJob(job);
      },
      { connection }
    );

    this.setupWorkerHandlers();
  }

  /**
   * Set the callback function to resume executions
   */
  setResumeCallback(callback: ResumeExecutionCallback): void {
    this.resumeCallback = callback;
  }

  private setupWorkerHandlers(): void {
    this.worker.on('failed', (job: Job<WaitJobData> | undefined, err: Error) => {
      if (job) {
        logger.error(`Wait job failed: ${job.data.waitId}`, { error: err.message });
      }
    });

    this.worker.on('completed', (job: Job<WaitJobData>) => {
      logger.info(`Wait job completed: ${job.data.waitId}`);
    });
  }

  /**
   * Process a wait job - resume the execution or handle timeout
   */
  private async processWaitJob(job: Job<WaitJobData>): Promise<void> {
    const { waitId, executionId, workflowId, nodeId, inputData, jobType } = job.data;

    try {
      logger.info(`Processing wait job: ${waitId}`, { executionId, nodeId, jobType });

      // Check if wait is still pending
      const waitRecord = await this.db
        .select()
        .from(schema.scheduledWaits)
        .where(eq(schema.scheduledWaits.id, waitId))
        .limit(1);

      if (waitRecord.length === 0) {
        logger.warn(`Wait record not found: ${waitId}`);
        return;
      }

      const wait = waitRecord[0];

      if (wait.status !== 'pending') {
        logger.info(`Wait already processed: ${waitId}, status: ${wait.status}`);
        return;
      }

      // For webhook waits, this job firing means timeout (expiry)
      if (wait.waitType === 'webhook') {
        logger.info(`Webhook wait timed out: ${waitId}`);
        await this.db
          .update(schema.scheduledWaits)
          .set({
            status: 'expired',
            cancelledAt: new Date(),
          })
          .where(eq(schema.scheduledWaits.id, waitId));
        
        // Update execution status to failed due to timeout
        await this.db
          .update(schema.executions)
          .set({
            status: 'ERROR',
            error: { message: 'Webhook wait timed out', waitId },
            finishedAt: new Date(),
          })
          .where(eq(schema.executions.id, executionId));
        
        return;
      }

      // For time-based waits, resume the execution
      await this.db
        .update(schema.scheduledWaits)
        .set({
          status: 'resumed',
          resumedAt: new Date(),
        })
        .where(eq(schema.scheduledWaits.id, waitId));

      // Call the resume callback if set
      if (this.resumeCallback) {
        const executionState = wait.executionState as StoredExecutionState | null;
        await this.resumeCallback(
          waitId,
          executionId,
          workflowId,
          nodeId,
          inputData,
          executionState,
          undefined // No webhook data for time-based waits
        );
      } else {
        logger.warn(`No resume callback set for wait job: ${waitId}`);
      }

      logger.info(`Wait job resumed execution: ${waitId}`);
    } catch (error) {
      logger.error(`Failed to process wait job: ${waitId}`, { error });
      throw error;
    }
  }

  /**
   * Initialize the manager - load pending waits from database and start cleanup job
   */
  async initialize(): Promise<void> {
    try {
      logger.info('Initializing WaitJobManager');

      // Find all pending waits that should have already resumed
      const overdueWaits = await this.db
        .select()
        .from(schema.scheduledWaits)
        .where(
          and(
            eq(schema.scheduledWaits.status, 'pending'),
            lte(schema.scheduledWaits.resumeAt, new Date())
          )
        );

      // Process overdue waits immediately
      for (const wait of overdueWaits) {
        try {
          await this.waitQueue.add(
            'resume-wait',
            {
              waitId: wait.id,
              executionId: wait.executionId,
              workflowId: wait.workflowId,
              nodeId: wait.nodeId,
              inputData: wait.inputData,
            },
            {
              jobId: `wait-${wait.id}`,
              delay: 0, // Process immediately
            }
          );
          logger.info(`Queued overdue wait for processing: ${wait.id}`);
        } catch (error) {
          logger.error(`Failed to queue overdue wait: ${wait.id}`, { error });
        }
      }

      // Find pending waits scheduled for the future
      const futureWaits = await this.db
        .select()
        .from(schema.scheduledWaits)
        .where(
          and(
            eq(schema.scheduledWaits.status, 'pending'),
            // resumeAt > now (handled by not being in overdueWaits)
          )
        );

      // Schedule future waits
      for (const wait of futureWaits) {
        if (wait.resumeAt > new Date()) {
          const delay = wait.resumeAt.getTime() - Date.now();
          try {
            await this.waitQueue.add(
              'resume-wait',
              {
                waitId: wait.id,
                executionId: wait.executionId,
                workflowId: wait.workflowId,
                nodeId: wait.nodeId,
                inputData: wait.inputData,
              },
              {
                jobId: `wait-${wait.id}`,
                delay,
              }
            );
            logger.info(`Scheduled future wait: ${wait.id}, delay: ${delay}ms`);
          } catch (error) {
            logger.error(`Failed to schedule future wait: ${wait.id}`, { error });
          }
        }
      }

      // Start cleanup job for old expired/cancelled waits
      this.startCleanupJob();

      logger.info(`WaitJobManager initialized with ${overdueWaits.length} overdue and ${futureWaits.length} future waits`);
    } catch (error) {
      logger.error('Failed to initialize WaitJobManager', { error });
    }
  }

  /**
   * Start periodic cleanup job for old expired/cancelled waits
   */
  private startCleanupJob(): void {
    // Run cleanup immediately on startup
    this.cleanupOldWaits().catch(err => {
      logger.error('Initial cleanup failed', { error: err });
    });

    // Schedule periodic cleanup
    this.cleanupInterval = setInterval(() => {
      this.cleanupOldWaits().catch(err => {
        logger.error('Periodic cleanup failed', { error: err });
      });
    }, this.CLEANUP_INTERVAL_MS);

    logger.info(`Started cleanup job (interval: ${this.CLEANUP_INTERVAL_MS}ms, retention: ${this.EXPIRED_WAIT_RETENTION_DAYS} days)`);
  }

  /**
   * Clean up old expired/cancelled wait records
   */
  private async cleanupOldWaits(): Promise<void> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.EXPIRED_WAIT_RETENTION_DAYS);

      // Delete old expired waits
      const expiredResult = await this.db
        .delete(schema.scheduledWaits)
        .where(
          and(
            eq(schema.scheduledWaits.status, 'expired'),
            lte(schema.scheduledWaits.createdAt, cutoffDate)
          )
        )
        .returning({ id: schema.scheduledWaits.id });

      // Delete old cancelled waits
      const cancelledResult = await this.db
        .delete(schema.scheduledWaits)
        .where(
          and(
            eq(schema.scheduledWaits.status, 'cancelled'),
            lte(schema.scheduledWaits.createdAt, cutoffDate)
          )
        )
        .returning({ id: schema.scheduledWaits.id });

      // Delete old resumed waits (completed successfully)
      const resumedResult = await this.db
        .delete(schema.scheduledWaits)
        .where(
          and(
            eq(schema.scheduledWaits.status, 'resumed'),
            lte(schema.scheduledWaits.createdAt, cutoffDate)
          )
        )
        .returning({ id: schema.scheduledWaits.id });

      const totalDeleted = expiredResult.length + cancelledResult.length + resumedResult.length;
      
      if (totalDeleted > 0) {
        logger.info(`Cleaned up ${totalDeleted} old wait records`, {
          expired: expiredResult.length,
          cancelled: cancelledResult.length,
          resumed: resumedResult.length,
          cutoffDate: cutoffDate.toISOString(),
        });
      }
    } catch (error) {
      logger.error('Failed to cleanup old waits', { error });
    }
  }

  /**
   * Schedule a new wait (for time-based waits)
   * Includes deduplication - cancels any existing pending wait for the same execution+node
   */
  async scheduleWait(options: ScheduleWaitOptions): Promise<string> {
    const { executionId, workflowId, nodeId, userId, resumeAt, waitType, inputData, reason } = options;

    try {
      // Deduplication: Cancel any existing pending wait for the same execution+node
      const existingWaits = await this.db
        .select()
        .from(schema.scheduledWaits)
        .where(
          and(
            eq(schema.scheduledWaits.executionId, executionId),
            eq(schema.scheduledWaits.nodeId, nodeId),
            eq(schema.scheduledWaits.status, 'pending')
          )
        );

      if (existingWaits.length > 0) {
        logger.info(`Found ${existingWaits.length} existing pending waits for execution ${executionId}, node ${nodeId} - cancelling`);
        for (const existingWait of existingWaits) {
          await this.cancelWait(existingWait.id);
        }
      }

      // Create wait record in database
      const [waitRecord] = await this.db
        .insert(schema.scheduledWaits)
        .values({
          executionId,
          workflowId,
          nodeId,
          userId,
          resumeAt,
          waitType,
          inputData,
          reason,
          status: 'pending',
        })
        .returning();

      const waitId = waitRecord.id;
      const delay = Math.max(0, resumeAt.getTime() - Date.now());

      // Schedule BullMQ job
      await this.waitQueue.add(
        'resume-wait',
        {
          waitId,
          executionId,
          workflowId,
          nodeId,
          inputData,
          jobType: 'timeout',
        },
        {
          jobId: `wait-${waitId}`,
          delay,
        }
      );

      logger.info(`Scheduled wait: ${waitId}`, {
        executionId,
        nodeId,
        resumeAt: resumeAt.toISOString(),
        delay,
      });

      return waitId;
    } catch (error) {
      logger.error('Failed to schedule wait', { error, options });
      throw error;
    }
  }

  /**
   * Schedule a webhook wait - creates DB record and timeout job
   * The execution state will be saved separately by the execution engine
   * Includes deduplication - cancels any existing pending wait for the same workflow+node
   * This ensures only one active wait per node across all executions
   */
  async scheduleWaitForWebhook(options: ScheduleWebhookWaitOptions): Promise<string> {
    const { executionId, workflowId, nodeId, userId, resumeAt, inputData, reason, webhookOptions } = options;

    try {
      // Deduplication: Cancel any existing pending wait for the same workflow+node
      // This ensures only one active wait per node, even across different executions
      const existingWaits = await this.db
        .select()
        .from(schema.scheduledWaits)
        .where(
          and(
            eq(schema.scheduledWaits.workflowId, workflowId),
            eq(schema.scheduledWaits.nodeId, nodeId),
            eq(schema.scheduledWaits.status, 'pending')
          )
        );

      if (existingWaits.length > 0) {
        logger.info(`Found ${existingWaits.length} existing pending waits for workflow ${workflowId}, node ${nodeId} - cancelling`);
        for (const existingWait of existingWaits) {
          await this.cancelWait(existingWait.id);
        }
      }

      // Create wait record in database with webhook options
      const [waitRecord] = await this.db
        .insert(schema.scheduledWaits)
        .values({
          executionId,
          workflowId,
          nodeId,
          userId,
          resumeAt,
          waitType: 'webhook',
          inputData,
          reason,
          status: 'pending',
          webhookOptions: webhookOptions || {},
        })
        .returning();

      const waitId = waitRecord.id;
      const delay = Math.max(0, resumeAt.getTime() - Date.now());

      // Schedule BullMQ timeout job (fires if webhook not called in time)
      await this.waitQueue.add(
        'webhook-timeout',
        {
          waitId,
          executionId,
          workflowId,
          nodeId,
          inputData,
          jobType: 'timeout',
        },
        {
          jobId: `wait-${waitId}`,
          delay,
        }
      );

      logger.info(`Scheduled webhook wait: ${waitId}`, {
        executionId,
        nodeId,
        expiresAt: resumeAt.toISOString(),
        timeoutDelay: delay,
      });

      return waitId;
    } catch (error) {
      logger.error('Failed to schedule webhook wait', { error, options });
      throw error;
    }
  }

  /**
   * Save execution state for a wait (called by execution engine after pause)
   */
  async saveExecutionState(options: SaveExecutionStateOptions): Promise<void> {
    const { waitId, executionState } = options;

    try {
      await this.db
        .update(schema.scheduledWaits)
        .set({
          executionState,
        })
        .where(eq(schema.scheduledWaits.id, waitId));

      logger.info(`Saved execution state for wait: ${waitId}`, {
        executionId: executionState.executionPath?.length || 0,
        nodeOutputsCount: Object.keys(executionState.nodeOutputs || {}).length,
      });
    } catch (error) {
      logger.error(`Failed to save execution state for wait: ${waitId}`, { error });
      throw error;
    }
  }

  /**
   * Cancel a pending wait
   */
  async cancelWait(waitId: string): Promise<boolean> {
    try {
      // Update database
      const result = await this.db
        .update(schema.scheduledWaits)
        .set({
          status: 'cancelled',
          cancelledAt: new Date(),
        })
        .where(
          and(
            eq(schema.scheduledWaits.id, waitId),
            eq(schema.scheduledWaits.status, 'pending')
          )
        )
        .returning();

      if (result.length === 0) {
        logger.warn(`Wait not found or already processed: ${waitId}`);
        return false;
      }

      // Remove from BullMQ queue
      try {
        const job = await this.waitQueue.getJob(`wait-${waitId}`);
        if (job) {
          await job.remove();
        }
      } catch (error) {
        logger.warn(`Failed to remove job from queue: ${waitId}`, { error });
      }

      logger.info(`Cancelled wait: ${waitId}`);
      return true;
    } catch (error) {
      logger.error(`Failed to cancel wait: ${waitId}`, { error });
      throw error;
    }
  }

  /**
   * Cancel all waits for an execution
   */
  async cancelExecutionWaits(executionId: string): Promise<number> {
    try {
      const pendingWaits = await this.db
        .select()
        .from(schema.scheduledWaits)
        .where(
          and(
            eq(schema.scheduledWaits.executionId, executionId),
            eq(schema.scheduledWaits.status, 'pending')
          )
        );

      let cancelledCount = 0;
      for (const wait of pendingWaits) {
        const cancelled = await this.cancelWait(wait.id);
        if (cancelled) cancelledCount++;
      }

      logger.info(`Cancelled ${cancelledCount} waits for execution: ${executionId}`);
      return cancelledCount;
    } catch (error) {
      logger.error(`Failed to cancel execution waits: ${executionId}`, { error });
      throw error;
    }
  }

  /**
   * Get pending waits for an execution
   */
  async getPendingWaits(executionId: string): Promise<any[]> {
    return this.db
      .select()
      .from(schema.scheduledWaits)
      .where(
        and(
          eq(schema.scheduledWaits.executionId, executionId),
          eq(schema.scheduledWaits.status, 'pending')
        )
      );
  }

  /**
   * Get pending waits for a workflow (all executions)
   */
  async getPendingWaitsForWorkflow(workflowId: string): Promise<any[]> {
    const results = await this.db
      .select()
      .from(schema.scheduledWaits)
      .where(
        and(
          eq(schema.scheduledWaits.workflowId, workflowId),
          eq(schema.scheduledWaits.status, 'pending')
        )
      );
    
    logger.info(`[WaitJobManager] getPendingWaitsForWorkflow: found ${results.length} pending waits for workflow ${workflowId}`, {
      waits: results.map(w => ({
        id: w.id,
        executionId: w.executionId,
        nodeId: w.nodeId,
        status: w.status,
        createdAt: w.createdAt,
      })),
    });
    
    return results;
  }

  /**
   * Get a specific wait by ID
   */
  async getWait(waitId: string): Promise<any | null> {
    const result = await this.db
      .select()
      .from(schema.scheduledWaits)
      .where(eq(schema.scheduledWaits.id, waitId))
      .limit(1);
    
    return result.length > 0 ? result[0] : null;
  }

  /**
   * Resume a wait via webhook call (external trigger)
   * This is called when someone hits the resume webhook URL
   */
  async resumeWaitViaWebhook(waitId: string, webhookData?: any): Promise<{
    success: boolean;
    message: string;
    executionId?: string;
    workflowId?: string;
    nodeId?: string;
    data?: any;
  }> {
    try {
      logger.info(`Resuming wait via webhook: ${waitId}`);

      // Get the wait record
      const waitRecord = await this.getWait(waitId);

      if (!waitRecord) {
        logger.warn(`Wait not found: ${waitId}`);
        return {
          success: false,
          message: 'Wait not found',
        };
      }

      // Check if already processed
      if (waitRecord.status !== 'pending') {
        logger.info(`Wait already processed: ${waitId}, status: ${waitRecord.status}`);
        return {
          success: false,
          message: `Wait already ${waitRecord.status}`,
          executionId: waitRecord.executionId,
        };
      }

      // Check if expired (for webhook waits)
      if (waitRecord.waitType === 'webhook' && waitRecord.resumeAt < new Date()) {
        // Mark as expired
        await this.db
          .update(schema.scheduledWaits)
          .set({
            status: 'expired',
            cancelledAt: new Date(),
          })
          .where(eq(schema.scheduledWaits.id, waitId));

        logger.info(`Wait expired: ${waitId}`);
        return {
          success: false,
          message: 'Wait has expired',
          executionId: waitRecord.executionId,
        };
      }

      // Merge webhook data with original input data
      const mergedData = {
        ...waitRecord.inputData,
        _webhookData: webhookData,
        _resumedAt: new Date().toISOString(),
        _resumedVia: 'webhook',
      };

      // Update wait status to resumed AND store webhook data
      await this.db
        .update(schema.scheduledWaits)
        .set({
          status: 'resumed',
          resumedAt: new Date(),
          webhookData,
          inputData: mergedData,
        })
        .where(eq(schema.scheduledWaits.id, waitId));

      // Remove from BullMQ queue (cancel the timeout job)
      try {
        const job = await this.waitQueue.getJob(`wait-${waitId}`);
        if (job) {
          await job.remove();
        }
      } catch (error) {
        logger.warn(`Failed to remove timeout job from queue: ${waitId}`, { error });
      }

      // Call the resume callback if set - this will resume the execution
      if (this.resumeCallback) {
        try {
          const executionState = waitRecord.executionState as StoredExecutionState | null;
          await this.resumeCallback(
            waitId,
            waitRecord.executionId,
            waitRecord.workflowId,
            waitRecord.nodeId,
            mergedData,
            executionState,
            webhookData
          );
        } catch (error) {
          logger.error(`Resume callback failed for wait: ${waitId}`, { error });
          // Don't fail the webhook call, the wait is already marked as resumed
          // The execution will be in a failed state but webhook caller gets success
        }
      } else {
        logger.warn(`No resume callback set - execution will not resume: ${waitId}`);
      }

      logger.info(`Wait resumed via webhook: ${waitId}`, {
        executionId: waitRecord.executionId,
        workflowId: waitRecord.workflowId,
        nodeId: waitRecord.nodeId,
        hasExecutionState: !!waitRecord.executionState,
      });

      return {
        success: true,
        message: 'Wait resumed successfully',
        executionId: waitRecord.executionId,
        workflowId: waitRecord.workflowId,
        nodeId: waitRecord.nodeId,
        data: mergedData,
      };
    } catch (error) {
      logger.error(`Failed to resume wait via webhook: ${waitId}`, { error });
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Shutdown the manager
   */
  async shutdown(): Promise<void> {
    try {
      // Stop cleanup interval
      if (this.cleanupInterval) {
        clearInterval(this.cleanupInterval);
        this.cleanupInterval = undefined;
        logger.info('Stopped cleanup job');
      }

      await this.worker.close();
      await this.waitQueue.close();
      logger.info('WaitJobManager shut down');
    } catch (error) {
      logger.error('Failed to shut down WaitJobManager', { error });
      throw error;
    }
  }
}

// Singleton instance
let waitJobManagerInstance: WaitJobManager | null = null;

export function getWaitJobManager(): WaitJobManager | null {
  return waitJobManagerInstance;
}

export function setWaitJobManager(manager: WaitJobManager): void {
  waitJobManagerInstance = manager;
}
