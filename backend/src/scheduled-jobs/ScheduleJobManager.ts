// @ts-nocheck
/**
 * ScheduleJobManager - Manages scheduled workflow executions using BullMQ
 * 
 * Database-backed approach: Uses scheduled_jobs table as single source of truth.
 * Jobs are loaded from database on startup, and all operations persist to database.
 */

import { Queue, Worker, Job, QueueEvents } from 'bullmq';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
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
    private worker: Worker<ScheduleJobData>;
    private queueEvents: QueueEvents;
    private db: NodePgDatabase<typeof schema>;
    private executionService: ExecutionService;

    constructor(
        db: NodePgDatabase<typeof schema>,
        executionService: ExecutionService,
        redisConfig?: any
    ) {
        this.db = db;
        this.executionService = executionService;

        const connection = {
            host: redisConfig?.redis?.host || process.env.REDIS_HOST || 'localhost',
            port: redisConfig?.redis?.port || parseInt(process.env.REDIS_PORT || '6379'),
            password: redisConfig?.redis?.password || process.env.REDIS_PASSWORD,
        };

        // Initialize BullMQ queue for scheduled jobs
        this.scheduleQueue = new Queue<ScheduleJobData>('schedule-jobs', {
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
        this.worker = new Worker<ScheduleJobData>(
            'schedule-jobs',
            async (job: Job<ScheduleJobData>) => {
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
                    const currentJob = await this.db
                        .select()
                        .from(triggerJobs)
                        .where(eq(triggerJobs.id, job.data.triggerId))
                        .limit(1);
                    
                    if (currentJob.length > 0) {
                        await this.db
                            .update(triggerJobs)
                            .set({
                                failCount: (currentJob[0].failCount || 0) + 1,
                            })
                            .where(eq(triggerJobs.id, job.data.triggerId));
                    }

                    throw error;
                }
            },
            { connection }
        );

        // Initialize queue events
        this.queueEvents = new QueueEvents('schedule-jobs', { connection });

        this.setupQueueHandlers();
    }

    private setupQueueHandlers(): void {
        this.worker.on('failed', (job: Job<ScheduleJobData> | undefined, err: Error) => {
            if (job) {
                logger.error(`Schedule job failed: ${job.data.workflowId}`, err);
            }
        });

        this.worker.on('completed', (job: Job<ScheduleJobData>) => {
            logger.info(`Schedule job completed: ${job.data.workflowId}`);
        });
    }

    async initialize(): Promise<void> {
        try {
            logger.info('Initializing ScheduleJobManager');
            
            // Clear all existing jobs from Redis
            await this.scheduleQueue.obliterate({ force: true });

            // Load active jobs from database
            const activeJobs = await this.db
                .select()
                .from(triggerJobs)
                .where(eq(triggerJobs.active, true));

            // Create BullMQ jobs for each active job
            for (const job of activeJobs) {
                try {
                    await this.scheduleQueue.add(
                        'scheduled-execution',
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
                                pattern: job.cronExpression,
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
            // Don't throw - allow app to start even if scheduled jobs fail
        }
    }

    async shutdown(): Promise<void> {
        try {
            await this.worker.close();
            await this.scheduleQueue.close();
            await this.queueEvents.close();
            logger.info('ScheduleJobManager shut down');
        } catch (error) {
            logger.error('Failed to shut down ScheduleJobManager', error);
            throw error;
        }
    }

    /**
     * Sync schedule jobs for a specific workflow
     * Loads jobs from database and updates BullMQ queue
     */
    async syncWorkflowJobs(workflowId: string): Promise<void> {
        try {
            logger.info(`Syncing schedule jobs for workflow: ${workflowId}`);
            
            // Get all active jobs for this workflow from database
            const workflowJobs = await this.db
                .select()
                .from(triggerJobs)
                .where(eq(triggerJobs.workflowId, workflowId));

            // Get existing repeatable jobs from BullMQ
            const repeatableJobs = await this.scheduleQueue.getRepeatableJobs();
            const existingJobIds = new Set(repeatableJobs.map(job => job.id));

            // Process each job from database
            for (const job of workflowJobs) {
                if (job.active) {
                    // Add or update active job
                    try {
                        // Remove existing job if it exists
                        if (existingJobIds.has(job.id)) {
                            await this.scheduleQueue.removeRepeatableByKey(
                                repeatableJobs.find(rj => rj.id === job.id)?.key || ''
                            );
                        }

                        // Add the job with current settings
                        await this.scheduleQueue.add(
                            'scheduled-execution',
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
                                    pattern: job.cronExpression,
                                    tz: job.timezone || 'UTC',
                                },
                                jobId: job.id,
                            }
                        );
                        logger.info(`Synced active schedule job: ${job.id}`);
                    } catch (error) {
                        logger.error(`Failed to sync schedule job: ${job.id}`, error);
                    }
                } else {
                    // Remove inactive job if it exists
                    if (existingJobIds.has(job.id)) {
                        try {
                            const jobToRemove = repeatableJobs.find(rj => rj.id === job.id);
                            if (jobToRemove) {
                                await this.scheduleQueue.removeRepeatableByKey(jobToRemove.key);
                                logger.info(`Removed inactive schedule job: ${job.id}`);
                            }
                        } catch (error) {
                            logger.error(`Failed to remove schedule job: ${job.id}`, error);
                        }
                    }
                }
            }

            // Remove jobs that no longer exist in database
            const dbJobIds = new Set(workflowJobs.map(j => j.id));
            for (const repeatableJob of repeatableJobs) {
                if (repeatableJob.id && !dbJobIds.has(repeatableJob.id)) {
                    try {
                        await this.scheduleQueue.removeRepeatableByKey(repeatableJob.key);
                        logger.info(`Removed orphaned schedule job: ${repeatableJob.id}`);
                    } catch (error) {
                        logger.error(`Failed to remove orphaned job: ${repeatableJob.id}`, error);
                    }
                }
            }

            logger.info(`Synced schedule jobs for workflow: ${workflowId}`);
        } catch (error) {
            logger.error(`Failed to sync schedule jobs for workflow: ${workflowId}`, error);
            throw error;
        }
    }
}
