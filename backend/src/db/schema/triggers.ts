import {
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
  uniqueIndex,
  index,
  json,
} from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { workflows } from './workflows';
import { workspaces } from './workspace';

/**
 * TriggerJobs table - stores scheduled and polling triggers
 * Tracks trigger configuration, execution schedule, and status
 */
export const triggerJobs = pgTable(
  'trigger_jobs',
  {
    id: text('id').primaryKey().default(sql`cuid()`),
    workflowId: text('workflow_id').notNull(),

    // Workspace association (denormalized for efficient queries)
    workspaceId: text('workspace_id'),

    // Trigger reference
    triggerId: text('trigger_id').notNull(), // References trigger.id in workflow.triggers JSON

    // Trigger type
    type: text('type').default('schedule').notNull(), // 'schedule' or 'polling'

    // Job key for queue management
    jobKey: text('job_key').unique().notNull(), // Bull queue job key (for schedule) or trigger ID (for polling)

    // Schedule configuration
    cronExpression: text('cron_expression'), // Only for schedule type
    pollInterval: integer('poll_interval'), // Only for polling type (in seconds)
    timezone: text('timezone').default('UTC').notNull(),

    // Description
    description: text('description'),

    // Status
    active: boolean('active').default(true).notNull(),

    // Execution tracking
    lastRun: timestamp('last_run'),
    nextRun: timestamp('next_run'), // For schedule: next cron run, For polling: last poll + interval

    // Error tracking
    failCount: integer('fail_count').default(0).notNull(),
    lastError: json('last_error'),

    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => ({
    workflowIdIdx: index('trigger_jobs_workflow_id_idx').on(table.workflowId),
    workspaceIdIdx: index('trigger_jobs_workspace_id_idx').on(table.workspaceId),
    activeIdx: index('trigger_jobs_active_idx').on(table.active),
    typeIdx: index('trigger_jobs_type_idx').on(table.type),
    workflowTriggerUnique: uniqueIndex('trigger_jobs_workflow_trigger_unique').on(
      table.workflowId,
      table.triggerId
    ),
  })
);

/**
 * Relations for triggerJobs table
 */
export const triggerJobsRelations = relations(triggerJobs, ({ one }) => ({
  workflow: one(workflows, {
    fields: [triggerJobs.workflowId],
    references: [workflows.id],
  }),
  workspace: one(workspaces, {
    fields: [triggerJobs.workspaceId],
    references: [workspaces.id],
  }),
}));
