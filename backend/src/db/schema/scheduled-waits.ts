import {
  pgTable,
  text,
  timestamp,
  json,
  index,
} from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { executions } from './executions';
import { workflows } from './workflows';

/**
 * ScheduledWaits table - stores pending wait operations
 * 
 * When a Wait node needs to pause for longer than the in-memory threshold,
 * the execution is paused and a scheduled wait record is created.
 * A background job resumes the execution when the wait time expires.
 * 
 * For webhook waits, the execution state is stored so it can be resumed
 * when the webhook is called, even after server restarts.
 */
export const scheduledWaits = pgTable(
  'scheduled_waits',
  {
    id: text('id').primaryKey().default(sql`cuid()`),
    
    // Execution context
    executionId: text('execution_id').notNull(),
    workflowId: text('workflow_id').notNull(),
    nodeId: text('node_id').notNull(),
    userId: text('user_id'), // User who started the execution
    
    // Wait configuration
    resumeAt: timestamp('resume_at').notNull(),
    waitType: text('wait_type').notNull(), // 'duration' | 'datetime' | 'webhook'
    
    // Status tracking
    status: text('status').default('pending').notNull(), // 'pending' | 'resumed' | 'cancelled' | 'expired'
    
    // Data to pass through when resuming
    inputData: json('input_data'),
    
    // Execution state for resume (stores nodeOutputs, nodeStates, executionPath, etc.)
    // This allows resuming execution from exactly where it paused
    executionState: json('execution_state'),
    
    // Webhook data received when resumed via webhook
    webhookData: json('webhook_data'),
    
    // Webhook options for authentication and configuration
    webhookOptions: json('webhook_options'),
    
    // Metadata
    reason: text('reason'), // Human-readable reason for the wait
    
    // Timestamps
    createdAt: timestamp('created_at').defaultNow(),
    resumedAt: timestamp('resumed_at'),
    cancelledAt: timestamp('cancelled_at'),
  },
  (table) => ({
    executionIdIdx: index('scheduled_waits_execution_id_idx').on(table.executionId),
    workflowIdIdx: index('scheduled_waits_workflow_id_idx').on(table.workflowId),
    statusIdx: index('scheduled_waits_status_idx').on(table.status),
    resumeAtIdx: index('scheduled_waits_resume_at_idx').on(table.resumeAt),
    // Composite index for finding pending waits to process
    pendingResumeIdx: index('scheduled_waits_pending_resume_idx').on(
      table.status,
      table.resumeAt
    ),
  })
);

/**
 * Relations for scheduledWaits table
 */
export const scheduledWaitsRelations = relations(scheduledWaits, ({ one }) => ({
  execution: one(executions, {
    fields: [scheduledWaits.executionId],
    references: [executions.id],
  }),
  workflow: one(workflows, {
    fields: [scheduledWaits.workflowId],
    references: [workflows.id],
  }),
}));

/**
 * Type for execution state stored in scheduledWaits.executionState
 * This captures everything needed to resume execution from a paused Wait node
 */
export interface StoredExecutionState {
  // Node outputs collected so far (for $node expression resolution)
  nodeOutputs: Record<string, any>;
  // Node states (status, inputData, outputData for each node)
  nodeStates: Record<string, {
    identifier: string;
    status: string;
    inputData?: any;
    outputData?: any;
    dependencies: string[];
    dependents: string[];
  }>;
  // Execution path taken so far
  executionPath: string[];
  // Node ID to name mapping for $node["Name"] support
  nodeIdToName: Record<string, string>;
  // Trigger data if any
  triggerData?: any;
  // Trigger node ID
  triggerNodeId?: string;
  // Execution options
  executionOptions: {
    timeout?: number;
    maxRetries?: number;
    retryDelay?: number;
    saveProgress?: boolean;
    saveData?: boolean;
    saveToDatabase?: boolean;
    manual?: boolean;
    isolatedExecution?: boolean;
  };
  // Start time of original execution
  startTime: number;
}
