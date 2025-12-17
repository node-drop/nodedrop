import {
  pgTable,
  text,
  boolean,
  timestamp,
  uniqueIndex,
  index,
  json,
} from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { users } from './auth';
import { workspaces } from './workspace';
import { teams } from './teams';

/**
 * Workflows table - stores workflow definitions
 * Each workflow contains nodes, connections, triggers, and settings
 */
export const workflows = pgTable(
  'workflows',
  {
    id: text('id').primaryKey().default(sql`cuid()`),
    name: text('name').notNull(),
    description: text('description'),
    category: text('category'),
    tags: text('tags').array().default(sql`ARRAY[]::text[]`),

    // Creator and ownership
    userId: text('user_id').notNull(),

    // Workspace and team association
    workspaceId: text('workspace_id'),
    teamId: text('team_id'),

    // Workflow structure - stored as JSON
    nodes: json('nodes').default(sql`'[]'::json`),
    connections: json('connections').default(sql`'[]'::json`),
    triggers: json('triggers').default(sql`'[]'::json`),
    settings: json('settings').default(sql`'{}'::json`),

    // Status
    active: boolean('active').default(false),

    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => ({
    userIdIdx: index('workflows_user_id_idx').on(table.userId),
    workspaceIdIdx: index('workflows_workspace_id_idx').on(table.workspaceId),
    teamIdIdx: index('workflows_team_id_idx').on(table.teamId),
    workspaceTeamIdx: index('workflows_workspace_team_idx').on(
      table.workspaceId,
      table.teamId
    ),
  })
);

/**
 * WorkflowEnvironments table - stores environment-specific workflow versions
 * Allows different configurations for development, staging, and production
 */
export const workflowEnvironments = pgTable(
  'workflow_environments',
  {
    id: text('id').primaryKey().default(sql`cuid()`),
    workflowId: text('workflow_id').notNull(),

    // Environment type
    environment: text('environment').default('DEVELOPMENT').notNull(), // DEVELOPMENT, STAGING, PRODUCTION

    // Version tracking
    version: text('version').default('1.0.0').notNull(),

    // Environment-specific workflow structure
    nodes: json('nodes').default(sql`'[]'::json`),
    connections: json('connections').default(sql`'[]'::json`),
    triggers: json('triggers').default(sql`'[]'::json`),
    settings: json('settings').default(sql`'{}'::json`),
    variables: json('variables').default(sql`'{}'::json`),

    // Status
    active: boolean('active').default(false),
    deployedAt: timestamp('deployed_at'),
    deployedBy: text('deployed_by'),
    deploymentNote: text('deployment_note'),
    status: text('status').default('DRAFT').notNull(), // DRAFT, ACTIVE, INACTIVE, ARCHIVED

    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => ({
    workflowIdIdx: index('workflow_environments_workflow_id_idx').on(
      table.workflowId
    ),
    environmentIdx: index('workflow_environments_environment_idx').on(
      table.environment
    ),
    statusIdx: index('workflow_environments_status_idx').on(table.status),
    workflowEnvironmentUnique: uniqueIndex(
      'workflow_environments_workflow_environment_unique'
    ).on(table.workflowId, table.environment),
  })
);

/**
 * WorkflowEnvironmentDeployments table - stores deployment history
 * Tracks all deployments with snapshots for rollback capability
 */
export const workflowEnvironmentDeployments = pgTable(
  'workflow_environment_deployments',
  {
    id: text('id').primaryKey().default(sql`cuid()`),
    environmentId: text('environment_id').notNull(),

    // Version and deployment info
    version: text('version').notNull(),
    deployedBy: text('deployed_by').notNull(),
    deployedAt: timestamp('deployed_at').defaultNow(),

    // Source environment for deployments from another environment
    sourceEnvironment: text('source_environment'),

    // Deployment note
    deploymentNote: text('deployment_note'),

    // Complete snapshot of workflow state at deployment time
    snapshot: json('snapshot').notNull(),

    // Deployment status
    status: text('status').default('SUCCESS').notNull(), // SUCCESS, FAILED, ROLLBACK

    // Rollback tracking
    rollbackFrom: text('rollback_from'),

    createdAt: timestamp('created_at').defaultNow(),
  },
  (table) => ({
    environmentIdIdx: index('workflow_environment_deployments_environment_id_idx').on(
      table.environmentId
    ),
    deployedAtIdx: index('workflow_environment_deployments_deployed_at_idx').on(
      table.deployedAt
    ),
  })
);

/**
 * Relations for workflows table
 */
export const workflowsRelations = relations(workflows, ({ one, many }) => ({
  user: one(users, {
    fields: [workflows.userId],
    references: [users.id],
  }),
  workspace: one(workspaces, {
    fields: [workflows.workspaceId],
    references: [workspaces.id],
  }),
  team: one(teams, {
    fields: [workflows.teamId],
    references: [teams.id],
  }),
  environments: many(workflowEnvironments),
}));

/**
 * Relations for workflowEnvironments table
 */
export const workflowEnvironmentsRelations = relations(
  workflowEnvironments,
  ({ one, many }) => ({
    workflow: one(workflows, {
      fields: [workflowEnvironments.workflowId],
      references: [workflows.id],
    }),
    deployments: many(workflowEnvironmentDeployments),
  })
);

/**
 * Relations for workflowEnvironmentDeployments table
 */
export const workflowEnvironmentDeploymentsRelations = relations(
  workflowEnvironmentDeployments,
  ({ one }) => ({
    environment: one(workflowEnvironments, {
      fields: [workflowEnvironmentDeployments.environmentId],
      references: [workflowEnvironments.id],
    }),
  })
);
