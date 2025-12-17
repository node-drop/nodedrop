import {
  pgTable,
  text,
  integer,
  timestamp,
  uniqueIndex,
  index,
  json,
} from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { users } from './auth';

/**
 * Workspaces table - stores multi-tenant workspace containers
 * Each workspace is owned by a user and can have multiple members
 */
export const workspaces = pgTable(
  'workspaces',
  {
    id: text('id').primaryKey().default(sql`cuid()`),
    name: text('name').notNull(),
    slug: text('slug').unique().notNull(),
    description: text('description'),

    // Ownership
    ownerId: text('owner_id').notNull(),

    // Billing & Plan
    plan: text('plan').default('free').notNull(), // free, pro, enterprise
    billingEmail: text('billing_email'),
    stripeCustomerId: text('stripe_customer_id'),

    // Plan Limits
    maxMembers: integer('max_members').default(1),
    maxWorkflows: integer('max_workflows').default(5),
    maxExecutionsPerMonth: integer('max_executions_per_month').default(1000),
    maxCredentials: integer('max_credentials').default(10),

    // Usage Tracking
    currentMonthExecutions: integer('current_month_executions').default(0),
    usageResetAt: timestamp('usage_reset_at').defaultNow(),

    // Settings
    settings: json('settings').default({}),

    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => ({
    ownerIdIdx: index('workspaces_owner_id_idx').on(table.ownerId),
    slugIdx: index('workspaces_slug_idx').on(table.slug),
  })
);

/**
 * WorkspaceMembers table - stores workspace membership with roles
 * Links users to workspaces with specific roles
 */
export const workspaceMembers = pgTable(
  'workspace_members',
  {
    id: text('id').primaryKey().default(sql`cuid()`),
    workspaceId: text('workspace_id').notNull(),
    userId: text('user_id').notNull(),
    role: text('role').default('MEMBER').notNull(), // OWNER, ADMIN, MEMBER, VIEWER
    joinedAt: timestamp('joined_at').defaultNow(),
    invitedBy: text('invited_by'),
  },
  (table) => ({
    workspaceUserUnique: uniqueIndex('workspace_members_workspace_user_unique').on(
      table.workspaceId,
      table.userId
    ),
    workspaceIdIdx: index('workspace_members_workspace_id_idx').on(table.workspaceId),
    userIdIdx: index('workspace_members_user_id_idx').on(table.userId),
  })
);

/**
 * WorkspaceInvitations table - stores pending workspace invitations
 * Allows inviting users by email before they join
 */
export const workspaceInvitations = pgTable(
  'workspace_invitations',
  {
    id: text('id').primaryKey().default(sql`cuid()`),
    workspaceId: text('workspace_id').notNull(),
    email: text('email').notNull(),
    role: text('role').default('MEMBER').notNull(), // OWNER, ADMIN, MEMBER, VIEWER
    token: text('token').unique().notNull(),
    invitedBy: text('invited_by').notNull(),
    expiresAt: timestamp('expires_at').notNull(),
    acceptedAt: timestamp('accepted_at'),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (table) => ({
    workspaceEmailUnique: uniqueIndex('workspace_invitations_workspace_email_unique').on(
      table.workspaceId,
      table.email
    ),
    tokenIdx: uniqueIndex('workspace_invitations_token_idx').on(table.token),
    emailIdx: index('workspace_invitations_email_idx').on(table.email),
    workspaceIdIdx: index('workspace_invitations_workspace_id_idx').on(table.workspaceId),
  })
);

/**
 * Relations for workspaces table
 */
export const workspacesRelations = relations(workspaces, ({ one, many }) => ({
  owner: one(users, {
    fields: [workspaces.ownerId],
    references: [users.id],
    relationName: 'WorkspaceOwner',
  }),
  members: many(workspaceMembers),
  invitations: many(workspaceInvitations),
  // Note: credentials, variables, nodeTypes, and other workspace-scoped resources
  // have their relationships defined in their respective schema files to avoid circular dependencies
}));

/**
 * Relations for workspaceMembers table
 */
export const workspaceMembersRelations = relations(workspaceMembers, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [workspaceMembers.workspaceId],
    references: [workspaces.id],
  }),
  user: one(users, {
    fields: [workspaceMembers.userId],
    references: [users.id],
  }),
}));

/**
 * Relations for workspaceInvitations table
 */
export const workspaceInvitationsRelations = relations(
  workspaceInvitations,
  ({ one }) => ({
    workspace: one(workspaces, {
      fields: [workspaceInvitations.workspaceId],
      references: [workspaces.id],
    }),
  })
);
