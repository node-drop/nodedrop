import {
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
  index,
  json,
} from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { workspaces } from './workspace';

/**
 * WebhookRequestLogs table - stores webhook, form, and chat request logs
 * Tracks all incoming requests for audit trail and debugging
 */
export const webhookRequestLogs = pgTable(
  'webhook_request_logs',
  {
    id: text('id').primaryKey().default(sql`cuid()`),

    // Request type
    type: text('type').default('webhook').notNull(), // 'webhook', 'form', 'chat'

    // Webhook/form/chat identifier
    webhookId: text('webhook_id').notNull(), // The webhook/form/chat identifier (path or UUID)

    // Workflow and workspace association
    workflowId: text('workflow_id').notNull(), // For filtering by workflow
    workspaceId: text('workspace_id'), // Denormalized for efficient workspace-level queries

    // User association
    userId: text('user_id').notNull(), // For access control

    // Request details
    method: text('method').notNull(), // GET, POST, PUT, DELETE, PATCH
    path: text('path').notNull(), // Full path including query
    headers: json('headers').notNull(), // Sanitized headers (no auth tokens)
    body: json('body'), // Request body (truncated if large)
    query: json('query'), // Query parameters
    ip: text('ip').notNull(),
    userAgent: text('user_agent'),

    // Response details
    status: text('status').notNull(), // 'success', 'rejected', 'failed'
    reason: text('reason'), // Why rejected (e.g., "Authentication failed")
    responseCode: integer('response_code').notNull(), // HTTP response code (200, 401, 500, etc.)
    responseTime: integer('response_time').notNull(), // Response time in milliseconds

    // Execution tracking
    executionId: text('execution_id'), // Link to execution if created

    // Test mode flag
    testMode: boolean('test_mode').default(false).notNull(),

    timestamp: timestamp('timestamp').defaultNow(),
  },
  (table) => ({
    typeWebhookTimestampIdx: index('webhook_request_logs_type_webhook_timestamp_idx').on(
      table.type,
      table.webhookId,
      table.timestamp
    ),
    typeWorkflowTimestampIdx: index('webhook_request_logs_type_workflow_timestamp_idx').on(
      table.type,
      table.workflowId,
      table.timestamp
    ),
    typeUserTimestampIdx: index('webhook_request_logs_type_user_timestamp_idx').on(
      table.type,
      table.userId,
      table.timestamp
    ),
    webhookIdTimestampIdx: index('webhook_request_logs_webhook_id_timestamp_idx').on(
      table.webhookId,
      table.timestamp
    ),
    workflowIdTimestampIdx: index('webhook_request_logs_workflow_id_timestamp_idx').on(
      table.workflowId,
      table.timestamp
    ),
    workspaceIdTimestampIdx: index('webhook_request_logs_workspace_id_timestamp_idx').on(
      table.workspaceId,
      table.timestamp
    ),
    userIdTimestampIdx: index('webhook_request_logs_user_id_timestamp_idx').on(
      table.userId,
      table.timestamp
    ),
    timestampIdx: index('webhook_request_logs_timestamp_idx').on(table.timestamp),
  })
);

/**
 * Relations for webhookRequestLogs table
 */
export const webhookRequestLogsRelations = relations(
  webhookRequestLogs,
  ({ one }) => ({
    workspace: one(workspaces, {
      fields: [webhookRequestLogs.workspaceId],
      references: [workspaces.id],
    }),
  })
);
