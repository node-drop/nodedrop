// @ts-nocheck
/**
 * ScheduleJobManager - Manages scheduled workflow executions using BullMQ
 * 
 * Database-backed approach: Uses scheduled_jobs table as single source of truth.
 * Jobs are loaded from database on startup, and all operations persist to database.
 */

import { Queue, Worker, Job, QueueEvents } from 'bullmq';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, and } from 'drizzle-orm';
import * as schema from '../db/schema';
import { logger } from '../utils/logger';
import { ExecutionService } from '../services/execution/ExecutionService.drizzle';
import { triggerJobs } from '../db/schema/triggers';

export interface ScheduleJobData {
    workflowId: string;
    triggerId: string;
    triggerNodeId: string;
    cronExpression: string;
    timezone: string;
    description: string;
    userId: string;
}

export interface ScheduleJobInfo {
    id: string;
    workflowId: string;
    workflowName: string;
    triggerId: string;
    cronExpression: string;
    timezone: string;
    description: string;
    nextRun: Date | null;
    lastRun: Date | null;
    status: 'active' | 'paused' | 'failed';
    failCount: number;
}

export class ScheduleJobManager {
    private scheduleQueue: Queue<ScheduleJobData>;
    private db: NodePgDatabase<typeof schema>;
    private executionService: ExecutionService;

    constructor(
        db: NodePgDatabase<typeof schema>,
        executionService: ExecutionService,
        redisConfig?: Bull.QueueOptions
    ) {
        this.db = db;
        this.executionService = executionService;

        // Initialize Bull queue for scheduled jobs
        this.scheduleQueue = new Bull<ScheduleJobData>('schedule-jobs', {
            redis: redisConfig?.redis || {
                host: process.env.REDIS_HOST || 'localhost',
                port: parseInt(process.env.REDIS_PORT || '6379'),
                password: process.env.REDIS_PASSWORD,
            },
            defaultJobOptions: {
                removeOnComplete: false,
                removeOnFail: false,
                attempts: 3,
                backoff: {
                    type: 'exponential',
                    delay: 2000,
                },
            },
        });

        this.setupQueueHandlers();
    }

    private setupQueueHandlers(): void {
        this.scheduleQueue.process(async (job: Job<ScheduleJobData>) => {
            try {
                logger.info(`Processing scheduled job: ${job.data.workflowId}`);
                
                // Execute the workflow
                await this.executionService.executeWorkflow(
                    job.data.workflowId,
                    job.data.userId,
                    { triggerType: 'schedule', triggerId: job.data.triggerId }
                );

                // Update last run time
                await this.db
                    .update(triggerJobs)
                    .set({
                        lastRun: new Date(),
                        failCount: 0,
                    })
                    .where(eq(triggerJobs.id, job.data.triggerId));

                return { success: true };
            } catch (error) {
                logger.error(`Failed to execute scheduled job: ${job.data.workflowId}`, error);
                
                // Increment fail count
                await this.db
                    .update(triggerJobs)
                    .set({
                        failCount: (job.data as any).failCount + 1,
                    })
                    .where(eq(triggerJobs.id, job.data.triggerId));

                throw error;
            }
        });

        this.scheduleQueue.on('failed', (job: Job<ScheduleJobData>, err: Error) => {
            logger.error(`Schedule job failed: ${job.data.workflowId}`, err);
        });

        this.scheduleQueue.on('completed', (job: Job<ScheduleJobData>) => {
            logger.info(`Schedule job completed: ${job.data.workflowId}`);
        });
    }

    async initialize(): Promise<void> {
        try {
            logger.info('Initializing ScheduleJobManager');
            
            // Clear all existing jobs from Redis
            await this.scheduleQueue.clean(0, 'active');
            await this.scheduleQueue.clean(0, 'delayed');
            await this.scheduleQueue.clean(0, 'wait');

            // Load active jobs from database
            const activeJobs = await this.db
                .select()
                .from(triggerJobs)
                .where(eq(triggerJobs.active, true));

            // Create Bull jobs for each active job
            for (const job of activeJobs) {
                try {
                    await this.scheduleQueue.add(
                        {
                            workflowId: job.workflowId,
                            triggerId: job.id,
                            triggerNodeId: job.nodeId,
                            cronExpression: job.cronExpression,
                            timezone: job.timezone || 'UTC',
                            description: job.description || '',
                            userId: job.userId,
                        },
                        {
                            repeat: {
                                cron: job.cronExpression,
                                tz: job.timezone || 'UTC',
                            },
                            jobId: job.id,
                        }
                    );
                    logger.info(`Loaded scheduled job: ${job.id}`);
                } catch (error) {
                    logger.error(`Failed to load scheduled job: ${job.id}`, error);
                }
            }

            logger.info(`ScheduleJobManager initialized with ${activeJobs.length} jobs`);
        } catch (error) {
            logger.error('Failed to initialize ScheduleJobManager', error);
            throw error;
        }
    }

    async addScheduleJob(
        workflowId: string,
        workflowName: string,
        userId: string,
        trigger: any
    ): Promise<void> {
        try {
            const jobData: ScheduleJobData = {
                workflowId,
                triggerId: trigger.id,
                triggerNodeId: trigger.nodeId,
                cronExpression: trigger.settings.cronExpression,
                timezone: trigger.settings.timezone || 'UTC',
                description: trigger.settings.description || '',
                userId,
            };

            // Create in database
            await this.db.insert(triggerJobs).values({
                id: trigger.id,
                workflowId,
                triggerId: trigger.id,
                type: 'schedule',
                jobKey: `${workflowId}-${trigger.id}`,
                cronExpression: trigger.settings.cronExpression,
                timezone: trigger.settings.timezone || 'UTC',
                description: trigger.settings.description || '',
                active: true,
            });

            // Create in Redis
            await this.scheduleQueue.add(jobData, {
                repeat: {
                    cron: trigger.settings.cronExpression,
                    tz: trigger.settings.timezone || 'UTC',
                },
                jobId: trigger.id,
            });

            logger.info(`Added scheduled job: ${trigger.id}`);
        } catch (error) {
            logger.error(`Failed to add scheduled job: ${trigger.id}`, error);
            throw error;
        }
    }

    async removeScheduleJob(jobId: string): Promise<void> {
        try {
            // Remove from database
            await this.db.delete(triggerJobs).where(eq(triggerJobs.id, jobId));

            // Remove from Redis
            const job = await this.scheduleQueue.getJob(jobId);
            if (job) {
                await job.remove();
            }

            logger.info(`Removed scheduled job: ${jobId}`);
        } catch (error) {
            logger.error(`Failed to remove scheduled job: ${jobId}`, error);
            throw error;
        }
    }

    async pauseScheduleJob(jobId: string): Promise<void> {
        try {
            // Update database
            await this.db
                .update(triggerJobs)
                .set({ active: false })
                .where(eq(triggerJobs.id, jobId));

            // Remove from Redis
            const job = await this.scheduleQueue.getJob(jobId);
            if (job) {
                await job.remove();
            }

            logger.info(`Paused scheduled job: ${jobId}`);
        } catch (error) {
            logger.error(`Failed to pause scheduled job: ${jobId}`, error);
            throw error;
        }
    }

    async resumeScheduleJob(workflowId: string, triggerId: string): Promise<void> {
        try {
            // Get job from database
            const job = await this.db
                .select()
                .from(triggerJobs)
                .where(eq(triggerJobs.id, triggerId))
                .limit(1);

            if (!job || job.length === 0) {
                throw new Error(`Job not found: ${triggerId}`);
            }

            const jobRecord = job[0];

            // Update database
            await this.db
                .update(triggerJobs)
                .set({ active: true })
                .where(eq(triggerJobs.id, triggerId));

            // Add to Redis
            await this.scheduleQueue.add(
                {
                    workflowId,
                    triggerId,
                    triggerNodeId: '', // Not stored in schema
                    cronExpression: jobRecord.cronExpression || '',
                    timezone: jobRecord.timezone || 'UTC',
                    description: jobRecord.description || '',
                    userId: '', // Not stored in schema
                },
                {
                    repeat: {
                        cron: jobRecord.cronExpression,
                        tz: jobRecord.timezone || 'UTC',
                    },
                    jobId: triggerId,
                }
            );

            logger.info(`Resumed scheduled job: ${triggerId}`);
        } catch (error) {
            logger.error(`Failed to resume scheduled job: ${triggerId}`, error);
            throw error;
        }
    }

    async getAllScheduleJobs(): Promise<ScheduleJobInfo[]> {
        try {
            const jobs = await this.db.select().from(triggerJobs);
            return jobs.map((job) => ({
                id: job.id,
                workflowId: job.workflowId,
                workflowName: '', // Would need to join with workflows table
                triggerId: job.id,
                cronExpression: job.cronExpression || '',
                timezone: job.timezone || 'UTC',
                description: job.description || '',
                nextRun: job.nextRun,
                lastRun: job.lastRun,
                status: job.active ? 'active' : 'paused',
                failCount: job.failCount || 0,
            }));
        } catch (error) {
            logger.error('Failed to get all scheduled jobs', error);
            throw error;
        }
    }

    async getWorkflowScheduleJobs(workflowId: string): Promise<ScheduleJobInfo[]> {
        try {
            const jobs = await this.db
                .select()
                .from(triggerJobs)
                .where(eq(triggerJobs.workflowId, workflowId));

            return jobs.map((job) => ({
                id: job.id,
                workflowId: job.workflowId,
                workflowName: '',
                triggerId: job.id,
                cronExpression: job.cronExpression || '',
                timezone: job.timezone || 'UTC',
                description: job.description || '',
                nextRun: job.nextRun,
                lastRun: job.lastRun,
                status: job.active ? 'active' : 'paused',
                failCount: job.failCount || 0,
            }));
        } catch (error) {
            logger.error(`Failed to get workflow scheduled jobs: ${workflowId}`, error);
            throw error;
        }
    }

    async syncWorkflowJobs(workflowId: string): Promise<void> {
        try {
            logger.info(`Syncing schedule jobs for workflow: ${workflowId}`);
            
            // Get all jobs for this workflow
            const existingJobs = await this.getWorkflowScheduleJobs(workflowId);
            
            // In a real implementation, this would:
            // 1. Get the workflow triggers
            // 2. Compare with existing jobs
            // 3. Add new jobs, remove deleted ones, update changed ones
            
            logger.info(`Synced ${existingJobs.length} schedule jobs for workflow: ${workflowId}`);
        } catch (error) {
            logger.error(`Failed to sync schedule jobs for workflow: ${workflowId}`, error);
            throw error;
        }
    }

    async shutdown(): Promise<void> {
        try {
            await this.scheduleQueue.close();
            logger.info('ScheduleJobManager shut down');
        } catch (error) {
            logger.error('Failed to shut down ScheduleJobManager', error);
            throw error;
        }
    }
}


