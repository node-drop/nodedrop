import {
  pgTable,
  text,
  boolean,
  timestamp,
  integer,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { workflows } from './workflows';
import { users } from './auth';

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
  })
);

/**
 * WorkflowGitCredentials table - stores encrypted Git credentials
 * Credentials are encrypted using AES-256 before storage
 */
export const workflowGitCredentials = pgTable(
  'workflow_git_credentials',
  {
    id: text('id').primaryKey().default(sql`cuid()`),
    userId: text('user_id').notNull(),
    workflowId: text('workflow_id').notNull(),

    // Encrypted credentials
    encryptedToken: text('encrypted_token').notNull(),
    tokenType: text('token_type').default('personal_access_token').notNull(), // personal_access_token, oauth
    provider: text('provider').notNull(), // github, gitlab, bitbucket

    // OAuth specific
    refreshToken: text('refresh_token'),
    expiresAt: timestamp('expires_at'),

    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => ({
    userWorkflowIdx: uniqueIndex(
      'workflow_git_credentials_user_workflow_idx'
    ).on(table.userId, table.workflowId),
  })
);

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
  })
);

/**
 * Relations for workflowGitCredentials table
 */
export const workflowGitCredentialsRelations = relations(
  workflowGitCredentials,
  ({ one }) => ({
    workflow: one(workflows, {
      fields: [workflowGitCredentials.workflowId],
      references: [workflows.id],
    }),
    user: one(users, {
      fields: [workflowGitCredentials.userId],
      references: [users.id],
    }),
  })
);
