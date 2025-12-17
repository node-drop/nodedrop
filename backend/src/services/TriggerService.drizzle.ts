import { eq, and, or } from 'drizzle-orm';
import { db } from '../db/client';
import { triggerJobs } from '../db/schema/triggers';
import { workflows } from '../db/schema/workflows';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

/**
 * Options for workspace-scoped queries
 */
interface WorkspaceQueryOptions {
  workspaceId?: string;
}

export interface TriggerJobData {
  workflowId: string;
  triggerId: string;
  type: 'schedule' | 'polling';
  jobKey: string;
  cronExpression?: string;
  pollInterval?: number;
  timezone?: string;
  description?: string;
  active?: boolean;
  nextRun?: Date;
}

export interface TriggerJob {
  id: string;
  workflowId: string;
  workspaceId?: string | null;
  triggerId: string;
  type: string;
  jobKey: string;
  cronExpression?: string | null;
  pollInterval?: number | null;
  timezone: string;
  description?: string | null;
  active: boolean;
  lastRun?: Date | null;
  nextRun?: Date | null;
  failCount: number;
  lastError?: any;
  createdAt: Date | null;
  updatedAt: Date | null;
}

/**
 * TriggerService Drizzle Implementation
 * 
 * Handles database operations for trigger jobs (scheduled and polling triggers).
 * This service manages the persistence layer for trigger configuration and execution tracking.
 */
export class TriggerServiceDrizzle {
  constructor() {}

  /**
   * Create or update a trigger job
   */
  async upsertTriggerJob(
    workflowId: string,
    triggerId: string,
    data: TriggerJobData,
    options?: WorkspaceQueryOptions
  ): Promise<TriggerJob> {
    try {
      const [triggerJob] = await db
        .insert(triggerJobs)
        .values({
          workflowId,
          workspaceId: options?.workspaceId,
          triggerId,
          type: data.type,
          jobKey: data.jobKey,
          cronExpression: data.cronExpression,
          pollInterval: data.pollInterval,
          timezone: data.timezone || 'UTC',
          description: data.description,
          active: data.active !== false,
          nextRun: data.nextRun,
        })
        .onConflictDoUpdate({
          target: [triggerJobs.workflowId, triggerJobs.triggerId],
          set: {
            type: data.type,
            jobKey: data.jobKey,
            cronExpression: data.cronExpression,
            pollInterval: data.pollInterval,
            timezone: data.timezone || 'UTC',
            description: data.description,
            active: data.active !== false,
            nextRun: data.nextRun,
            updatedAt: new Date(),
          },
        })
        .returning();

      logger.info(`Trigger job upserted: ${triggerId} for workflow ${workflowId}`);
      return triggerJob;
    } catch (error) {
      logger.error('Error upserting trigger job:', error);
      throw new AppError('Failed to upsert trigger job', 500, 'TRIGGER_JOB_UPSERT_ERROR');
    }
  }

  /**
   * Get trigger job by ID
   */
  async getTriggerJobById(
    id: string,
    options?: WorkspaceQueryOptions
  ): Promise<TriggerJob | null> {
    try {
      const whereConditions = [eq(triggerJobs.id, id)];
      if (options?.workspaceId) {
        whereConditions.push(eq(triggerJobs.workspaceId, options.workspaceId));
      }

      const triggerJob = await db.query.triggerJobs.findFirst({
        where: and(...whereConditions),
      });

      return triggerJob || null;
    } catch (error) {
      logger.error('Error getting trigger job by ID:', error);
      throw error;
    }
  }

  /**
   * Get trigger job by workflow and trigger ID
   */
  async getTriggerJobByWorkflowAndTriggerId(
    workflowId: string,
    triggerId: string,
    options?: WorkspaceQueryOptions
  ): Promise<TriggerJob | null> {
    try {
      const whereConditions = [
        eq(triggerJobs.workflowId, workflowId),
        eq(triggerJobs.triggerId, triggerId),
      ];
      if (options?.workspaceId) {
        whereConditions.push(eq(triggerJobs.workspaceId, options.workspaceId));
      }

      const triggerJob = await db.query.triggerJobs.findFirst({
        where: and(...whereConditions),
      });

      return triggerJob || null;
    } catch (error) {
      logger.error('Error getting trigger job:', error);
      throw error;
    }
  }

  /**
   * Get all active trigger jobs
   */
  async getActiveTriggerJobs(
    options?: WorkspaceQueryOptions
  ): Promise<TriggerJob[]> {
    try {
      const whereConditions = [eq(triggerJobs.active, true)];
      if (options?.workspaceId) {
        whereConditions.push(eq(triggerJobs.workspaceId, options.workspaceId));
      }

      const jobs = await db.query.triggerJobs.findMany({
        where: and(...whereConditions),
        with: {
          workflow: {
            columns: {
              id: true,
              active: true,
            },
          },
        },
      });

      return jobs;
    } catch (error) {
      logger.error('Error getting active trigger jobs:', error);
      throw error;
    }
  }

  /**
   * Get all trigger jobs for a workflow
   */
  async getTriggerJobsByWorkflow(
    workflowId: string,
    options?: WorkspaceQueryOptions
  ): Promise<TriggerJob[]> {
    try {
      const whereConditions = [eq(triggerJobs.workflowId, workflowId)];
      if (options?.workspaceId) {
        whereConditions.push(eq(triggerJobs.workspaceId, options.workspaceId));
      }

      const jobs = await db.query.triggerJobs.findMany({
        where: and(...whereConditions),
        orderBy: (t) => t.createdAt,
      });

      return jobs;
    } catch (error) {
      logger.error('Error getting trigger jobs for workflow:', error);
      throw error;
    }
  }

  /**
   * Get all schedule trigger jobs
   */
  async getScheduleTriggerJobs(
    options?: WorkspaceQueryOptions
  ): Promise<TriggerJob[]> {
    try {
      const whereConditions = [eq(triggerJobs.type, 'schedule')];
      if (options?.workspaceId) {
        whereConditions.push(eq(triggerJobs.workspaceId, options.workspaceId));
      }

      const jobs = await db.query.triggerJobs.findMany({
        where: and(...whereConditions),
        orderBy: (t) => t.createdAt,
      });

      return jobs;
    } catch (error) {
      logger.error('Error getting schedule trigger jobs:', error);
      throw error;
    }
  }

  /**
   * Get all polling trigger jobs
   */
  async getPollingTriggerJobs(
    options?: WorkspaceQueryOptions
  ): Promise<TriggerJob[]> {
    try {
      const whereConditions = [eq(triggerJobs.type, 'polling')];
      if (options?.workspaceId) {
        whereConditions.push(eq(triggerJobs.workspaceId, options.workspaceId));
      }

      const jobs = await db.query.triggerJobs.findMany({
        where: and(...whereConditions),
        orderBy: (t) => t.createdAt,
      });

      return jobs;
    } catch (error) {
      logger.error('Error getting polling trigger jobs:', error);
      throw error;
    }
  }

  /**
   * Update trigger job status
   */
  async updateTriggerJobStatus(
    id: string,
    active: boolean,
    options?: WorkspaceQueryOptions
  ): Promise<TriggerJob> {
    try {
      const whereConditions = [eq(triggerJobs.id, id)];
      if (options?.workspaceId) {
        whereConditions.push(eq(triggerJobs.workspaceId, options.workspaceId));
      }

      const [updated] = await db
        .update(triggerJobs)
        .set({
          active,
          updatedAt: new Date(),
        })
        .where(and(...whereConditions))
        .returning();

      if (!updated) {
        throw new AppError('Trigger job not found', 404, 'TRIGGER_JOB_NOT_FOUND');
      }

      logger.info(`Trigger job ${id} status updated to ${active ? 'active' : 'inactive'}`);
      return updated;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error updating trigger job status:', error);
      throw new AppError('Failed to update trigger job status', 500, 'TRIGGER_JOB_UPDATE_ERROR');
    }
  }

  /**
   * Update trigger job execution tracking
   */
  async updateTriggerJobExecution(
    id: string,
    data: {
      lastRun?: Date;
      nextRun?: Date;
      failCount?: number;
      lastError?: any;
    },
    options?: WorkspaceQueryOptions
  ): Promise<TriggerJob> {
    try {
      const whereConditions = [eq(triggerJobs.id, id)];
      if (options?.workspaceId) {
        whereConditions.push(eq(triggerJobs.workspaceId, options.workspaceId));
      }

      const updateData: any = {
        updatedAt: new Date(),
      };

      if (data.lastRun) updateData.lastRun = data.lastRun;
      if (data.nextRun) updateData.nextRun = data.nextRun;
      if (data.failCount !== undefined) updateData.failCount = data.failCount;
      if (data.lastError !== undefined) updateData.lastError = data.lastError;

      const [updated] = await db
        .update(triggerJobs)
        .set(updateData)
        .where(and(...whereConditions))
        .returning();

      if (!updated) {
        throw new AppError('Trigger job not found', 404, 'TRIGGER_JOB_NOT_FOUND');
      }

      return updated;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error updating trigger job execution:', error);
      throw new AppError('Failed to update trigger job execution', 500, 'TRIGGER_JOB_UPDATE_ERROR');
    }
  }

  /**
   * Delete trigger job
   */
  async deleteTriggerJob(
    id: string,
    options?: WorkspaceQueryOptions
  ): Promise<void> {
    try {
      const whereConditions = [eq(triggerJobs.id, id)];
      if (options?.workspaceId) {
        whereConditions.push(eq(triggerJobs.workspaceId, options.workspaceId));
      }

      const result = await db
        .delete(triggerJobs)
        .where(and(...whereConditions))
        .returning();

      if (result.length === 0) {
        throw new AppError('Trigger job not found', 404, 'TRIGGER_JOB_NOT_FOUND');
      }

      logger.info(`Trigger job ${id} deleted`);
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error deleting trigger job:', error);
      throw new AppError('Failed to delete trigger job', 500, 'TRIGGER_JOB_DELETE_ERROR');
    }
  }

  /**
   * Delete all trigger jobs for a workflow
   */
  async deleteTriggerJobsByWorkflow(
    workflowId: string,
    options?: WorkspaceQueryOptions
  ): Promise<number> {
    try {
      const whereConditions = [eq(triggerJobs.workflowId, workflowId)];
      if (options?.workspaceId) {
        whereConditions.push(eq(triggerJobs.workspaceId, options.workspaceId));
      }

      const result = await db
        .delete(triggerJobs)
        .where(and(...whereConditions))
        .returning();

      logger.info(`Deleted ${result.length} trigger jobs for workflow ${workflowId}`);
      return result.length;
    } catch (error) {
      logger.error('Error deleting trigger jobs for workflow:', error);
      throw new AppError('Failed to delete trigger jobs', 500, 'TRIGGER_JOB_DELETE_ERROR');
    }
  }

  /**
   * Delete trigger job by workflow and trigger ID
   */
  async deleteTriggerJobByWorkflowAndTriggerId(
    workflowId: string,
    triggerId: string,
    options?: WorkspaceQueryOptions
  ): Promise<void> {
    try {
      const whereConditions = [
        eq(triggerJobs.workflowId, workflowId),
        eq(triggerJobs.triggerId, triggerId),
      ];
      if (options?.workspaceId) {
        whereConditions.push(eq(triggerJobs.workspaceId, options.workspaceId));
      }

      const result = await db
        .delete(triggerJobs)
        .where(and(...whereConditions))
        .returning();

      if (result.length === 0) {
        throw new AppError('Trigger job not found', 404, 'TRIGGER_JOB_NOT_FOUND');
      }

      logger.info(`Trigger job deleted for workflow ${workflowId}, trigger ${triggerId}`);
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error deleting trigger job:', error);
      throw new AppError('Failed to delete trigger job', 500, 'TRIGGER_JOB_DELETE_ERROR');
    }
  }

  /**
   * Get trigger job statistics
   */
  async getTriggerJobStats(
    options?: WorkspaceQueryOptions
  ): Promise<{
    totalJobs: number;
    activeJobs: number;
    scheduleJobs: number;
    pollingJobs: number;
    failedJobs: number;
  }> {
    try {
      const whereConditions: any[] = [];
      if (options?.workspaceId) {
        whereConditions.push(eq(triggerJobs.workspaceId, options.workspaceId));
      }

      const allJobs = await db.query.triggerJobs.findMany({
        where: whereConditions.length > 0 ? and(...whereConditions) : undefined,
      });

      const activeJobs = allJobs.filter((j) => j.active).length;
      const scheduleJobs = allJobs.filter((j) => j.type === 'schedule').length;
      const pollingJobs = allJobs.filter((j) => j.type === 'polling').length;
      const failedJobs = allJobs.filter((j) => j.failCount > 0).length;

      return {
        totalJobs: allJobs.length,
        activeJobs,
        scheduleJobs,
        pollingJobs,
        failedJobs,
      };
    } catch (error) {
      logger.error('Error getting trigger job statistics:', error);
      throw error;
    }
  }

  /**
   * Get trigger jobs with failures
   */
  async getFailedTriggerJobs(
    options?: WorkspaceQueryOptions
  ): Promise<TriggerJob[]> {
    try {
      const whereConditions: any[] = [];
      if (options?.workspaceId) {
        whereConditions.push(eq(triggerJobs.workspaceId, options.workspaceId));
      }

      const jobs = await db.query.triggerJobs.findMany({
        where: whereConditions.length > 0 ? and(...whereConditions) : undefined,
      });

      return jobs.filter((j) => j.failCount > 0);
    } catch (error) {
      logger.error('Error getting failed trigger jobs:', error);
      throw error;
    }
  }

  /**
   * Reset failure count for a trigger job
   */
  async resetFailureCount(
    id: string,
    options?: WorkspaceQueryOptions
  ): Promise<TriggerJob> {
    try {
      const whereConditions = [eq(triggerJobs.id, id)];
      if (options?.workspaceId) {
        whereConditions.push(eq(triggerJobs.workspaceId, options.workspaceId));
      }

      const [updated] = await db
        .update(triggerJobs)
        .set({
          failCount: 0,
          lastError: null,
          updatedAt: new Date(),
        })
        .where(and(...whereConditions))
        .returning();

      if (!updated) {
        throw new AppError('Trigger job not found', 404, 'TRIGGER_JOB_NOT_FOUND');
      }

      logger.info(`Failure count reset for trigger job ${id}`);
      return updated;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error resetting failure count:', error);
      throw new AppError('Failed to reset failure count', 500, 'TRIGGER_JOB_UPDATE_ERROR');
    }
  }
}
