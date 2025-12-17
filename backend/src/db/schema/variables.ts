import {
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { users } from './auth';
import { workspaces } from './workspace';
import { workflows } from './workflows';

/**
 * Variables table - stores workflow variables
 * Variables can be scoped globally, locally, or to specific workflows
 */
export const variables = pgTable(
  'variables',
  {
    id: text('id').primaryKey().default(sql`cuid()`),
    key: text('key').notNull(),
    value: text('value').notNull(),
    description: text('description'),
    
    // Scope of the variable
    scope: text('scope').default('GLOBAL').notNull(), // GLOBAL, LOCAL
    
    // Workflow association (for workflow-scoped variables)
    workflowId: text('workflow_id'),
    
    // Ownership
    userId: text('user_id').notNull(),
    
    // Workspace association
    workspaceId: text('workspace_id'),
    
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => ({
    userIdIdx: index('variables_user_id_idx').on(table.userId),
    workspaceIdIdx: index('variables_workspace_id_idx').on(table.workspaceId),
    workflowIdIdx: index('variables_workflow_id_idx').on(table.workflowId),
    userScopeIdx: index('variables_user_scope_idx').on(table.userId, table.scope),
    userKeyWorkflowUnique: uniqueIndex(
      'variables_user_key_workflow_unique'
    ).on(table.userId, table.key, table.workflowId),
  })
);

/**
 * Relations for variables table
 */
export const variablesRelations = relations(variables, ({ one }) => ({
  user: one(users, {
    fields: [variables.userId],
    references: [users.id],
  }),
  workspace: one(workspaces, {
    fields: [variables.workspaceId],
    references: [workspaces.id],
  }),
  workflow: one(workflows, {
    fields: [variables.workflowId],
    references: [workflows.id],
  }),
}));
