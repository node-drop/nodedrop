import {
  pgTable,
  text,
  boolean,
  timestamp,
  integer,
  index,
} from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { workflows } from './workflows';
import { users } from './auth';
import { credentials } from './credentials';

/**
 * WorkflowGitConfigs table - stores Git repository configurations for workflows
 * Each workflow can be connected to a Git repository for version control
 */
export const workflowGitConfigs = pgTable(
  'workflow_git_configs',
  {
    id: text('id').primaryKey().default(sql`cuid()`),
    workflowId: text('workflow_id').notNull().unique(),
    userId: text('user_id').notNull(),

    // Repository configuration
    repositoryUrl: text('repository_url').notNull(),
    branch: text('branch').default('main').notNull(),
    remoteName: text('remote_name').default('origin').notNull(),

    // Credential reference (uses unified credentials table)
    // Optional initially, required when connecting to remote
    credentialId: text('credential_id'),

    // Local repository path (relative to storage)
    localPath: text('local_path').notNull(),

    // Sync status
    lastSyncAt: timestamp('last_sync_at'),
    lastCommitHash: text('last_commit_hash'),
    unpushedCommits: integer('unpushed_commits').default(0),

    // Connection status
    connected: boolean('connected').default(true),
    lastError: text('last_error'),

    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => ({
    workflowIdIdx: index('workflow_git_configs_workflow_id_idx').on(
      table.workflowId
    ),
    userIdIdx: index('workflow_git_configs_user_id_idx').on(table.userId),
    credentialIdIdx: index('workflow_git_configs_credential_id_idx').on(
      table.credentialId
    ),
  })
);

// REMOVED: workflowGitCredentials table
// Now using unified credentials table with credentialId reference in workflowGitConfigs

/**
 * Relations for workflowGitConfigs table
 */
export const workflowGitConfigsRelations = relations(
  workflowGitConfigs,
  ({ one }) => ({
    workflow: one(workflows, {
      fields: [workflowGitConfigs.workflowId],
      references: [workflows.id],
    }),
    user: one(users, {
      fields: [workflowGitConfigs.userId],
      references: [users.id],
    }),
    credential: one(credentials, {
      fields: [workflowGitConfigs.credentialId],
      references: [credentials.id],
    }),
  })
);
