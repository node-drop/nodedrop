import {
  pgTable,
  text,
  integer,
  timestamp,
  index,
  json,
} from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { workflows } from './workflows';
import { workspaces } from './workspace';

/**
 * Executions table - stores workflow execution records
 * Tracks execution status, timing, and results
 */
export const executions = pgTable(
  'executions',
  {
    id: text('id').primaryKey().default(sql`cuid()`),
    workflowId: text('workflow_id').notNull(),

    // Workspace association (denormalized for efficient queries)
    workspaceId: text('workspace_id'),

    // Environment type
    environment: text('environment').default('DEVELOPMENT').notNull(), // DEVELOPMENT, STAGING, PRODUCTION

    // Execution status
    status: text('status').default('RUNNING').notNull(), // RUNNING, SUCCESS, ERROR, CANCELLED, PAUSED, TIMEOUT

    // Timing
    startedAt: timestamp('started_at').defaultNow(),
    finishedAt: timestamp('finished_at'),
    pausedAt: timestamp('paused_at'),
    resumedAt: timestamp('resumed_at'),
    cancelledAt: timestamp('cancelled_at'),

    // Execution data
    triggerData: json('trigger_data'),
    error: json('error'),

    // Execution type
    executionType: text('execution_type').default('workflow').notNull(),

    // Flow tracking
    flowExecutionPath: text('flow_execution_path').array().default(sql`ARRAY[]::text[]`),
    flowMetrics: json('flow_metrics'),
    flowProgressData: json('flow_progress_data'),

    // Progress tracking
    progress: integer('progress').default(0),

    // Workflow snapshot at execution time
    workflowSnapshot: json('workflow_snapshot'),
    snapshotVersion: text('snapshot_version'),
    snapshotHash: text('snapshot_hash'),

    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => ({
    workflowIdIdx: index('executions_workflow_id_idx').on(table.workflowId),
    workspaceIdIdx: index('executions_workspace_id_idx').on(table.workspaceId),
    environmentIdx: index('executions_environment_idx').on(table.environment),
    statusIdx: index('executions_status_idx').on(table.status),
    workspaceStatusIdx: index('executions_workspace_status_idx').on(
      table.workspaceId,
      table.status
    ),
    workspaceCreatedIdx: index('executions_workspace_created_idx').on(
      table.workspaceId,
      table.createdAt
    ),
  })
);

/**
 * ExecutionHistory table - stores execution audit trail
 * Tracks execution metadata and metrics for reporting
 */
export const executionHistory = pgTable(
  'execution_history',
  {
    id: text('id').primaryKey().default(sql`cuid()`),
    executionId: text('execution_id').notNull(),
    workflowId: text('workflow_id').notNull(),

    // Trigger information
    triggerType: text('trigger_type').notNull(),

    // Timing
    startTime: timestamp('start_time').notNull(),
    endTime: timestamp('end_time'),

    // Status
    status: text('status').notNull(),

    // Execution details
    executedNodes: text('executed_nodes').array().default(sql`ARRAY[]::text[]`),
    executionPath: text('execution_path').array().default(sql`ARRAY[]::text[]`),

    // Metrics
    metrics: json('metrics'),
    error: json('error'),
    duration: integer('duration'),

    // Node statistics
    nodeCount: integer('node_count').default(0),
    completedNodes: integer('completed_nodes').default(0),
    failedNodes: integer('failed_nodes').default(0),

    createdAt: timestamp('created_at').defaultNow(),
  },
  (table) => ({
    executionIdIdx: index('execution_history_execution_id_idx').on(
      table.executionId
    ),
    workflowIdIdx: index('execution_history_workflow_id_idx').on(table.workflowId),
    startTimeIdx: index('execution_history_start_time_idx').on(table.startTime),
  })
);

/**
 * NodeExecutions table - stores individual node execution tracking
 * Tracks execution status and data for each node in a workflow
 */
export const nodeExecutions = pgTable(
  'node_executions',
  {
    id: text('id').primaryKey().default(sql`cuid()`),
    nodeId: text('node_id').notNull(),
    executionId: text('execution_id').notNull(),

    // Execution status
    status: text('status').default('WAITING').notNull(), // WAITING, RUNNING, SUCCESS, ERROR, QUEUED, CANCELLED, PAUSED, SKIPPED, IDLE, COMPLETED, FAILED

    // Node data
    inputData: json('input_data'),
    outputData: json('output_data'),
    error: json('error'),

    // Timing
    startedAt: timestamp('started_at'),
    finishedAt: timestamp('finished_at'),

    // Execution order and dependencies
    dependencies: text('dependencies').array().default(sql`ARRAY[]::text[]`),
    executionOrder: integer('execution_order'),
    parentNodeId: text('parent_node_id'),

    // Progress tracking
    progress: integer('progress').default(0),

    // Trigger reference
    triggerId: text('trigger_id'),

    // Visual state
    visualState: json('visual_state'),

    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => ({
    executionIdIdx: index('node_executions_execution_id_idx').on(
      table.executionId
    ),
    nodeIdIdx: index('node_executions_node_id_idx').on(table.nodeId),
    statusIdx: index('node_executions_status_idx').on(table.status),
  })
);

/**
 * FlowExecutionStates table - stores real-time execution state
 * Tracks the current state of each node during workflow execution
 */
export const flowExecutionStates = pgTable(
  'flow_execution_states',
  {
    id: text('id').primaryKey().default(sql`cuid()`),
    executionId: text('execution_id').notNull(),
    nodeId: text('node_id').notNull(),

    // Node status
    status: text('status').default('idle').notNull(),

    // Progress
    progress: integer('progress').default(0),

    // Timing
    startTime: timestamp('start_time'),
    endTime: timestamp('end_time'),
    duration: integer('duration'),

    // Node data
    inputData: json('input_data'),
    outputData: json('output_data'),
    error: json('error'),

    // Execution order and dependencies
    dependencies: text('dependencies').array().default(sql`ARRAY[]::text[]`),
    executionOrder: integer('execution_order'),

    // Animation state for UI
    animationState: text('animation_state').default('idle').notNull(),

    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => ({
    executionIdIdx: index('flow_execution_states_execution_id_idx').on(
      table.executionId
    ),
    nodeIdIdx: index('flow_execution_states_node_id_idx').on(table.nodeId),
    statusIdx: index('flow_execution_states_status_idx').on(table.status),
  })
);

/**
 * Relations for executions table
 */
export const executionsRelations = relations(executions, ({ one, many }) => ({
  workflow: one(workflows, {
    fields: [executions.workflowId],
    references: [workflows.id],
  }),
  workspace: one(workspaces, {
    fields: [executions.workspaceId],
    references: [workspaces.id],
  }),
  executionHistory: many(executionHistory),
  nodeExecutions: many(nodeExecutions),
  flowExecutionStates: many(flowExecutionStates),
}));

/**
 * Relations for executionHistory table
 */
export const executionHistoryRelations = relations(
  executionHistory,
  ({ one }) => ({
    execution: one(executions, {
      fields: [executionHistory.executionId],
      references: [executions.id],
    }),
    workflow: one(workflows, {
      fields: [executionHistory.workflowId],
      references: [workflows.id],
    }),
  })
);

/**
 * Relations for nodeExecutions table
 */
export const nodeExecutionsRelations = relations(nodeExecutions, ({ one }) => ({
  execution: one(executions, {
    fields: [nodeExecutions.executionId],
    references: [executions.id],
  }),
}));

/**
 * Relations for flowExecutionStates table
 */
export const flowExecutionStatesRelations = relations(
  flowExecutionStates,
  ({ one }) => ({
    execution: one(executions, {
      fields: [flowExecutionStates.executionId],
      references: [executions.id],
    }),
  })
);
