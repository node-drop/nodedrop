import {
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  index,
  json,
} from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { users } from './auth';
import { workspaces } from './workspace';

/**
 * Teams table - stores teams within workspaces
 * Teams are groups of users within a workspace for organizing workflows and resources
 */
export const teams = pgTable(
  'teams',
  {
    id: text('id').primaryKey().default(sql`cuid()`),
    name: text('name').notNull(),
    slug: text('slug').unique().notNull(),
    description: text('description'),

    // Ownership
    ownerId: text('owner_id').notNull(),

    // Workspace association
    workspaceId: text('workspace_id'),

    // Appearance
    color: text('color').default('#3b82f6'),

    // Settings
    settings: json('settings').default({}),

    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => ({
    ownerIdIdx: index('teams_owner_id_idx').on(table.ownerId),
    workspaceIdIdx: index('teams_workspace_id_idx').on(table.workspaceId),
    workspaceSlugUnique: uniqueIndex('teams_workspace_slug_unique').on(
      table.workspaceId,
      table.slug
    ),
  })
);

/**
 * TeamMembers table - stores team membership with roles
 * Links users to teams with specific roles
 */
export const teamMembers = pgTable(
  'team_members',
  {
    id: text('id').primaryKey().default(sql`cuid()`),
    teamId: text('team_id').notNull(),
    userId: text('user_id').notNull(),
    role: text('role').default('MEMBER').notNull(), // OWNER, MEMBER, VIEWER
    joinedAt: timestamp('joined_at').defaultNow(),
  },
  (table) => ({
    teamUserUnique: uniqueIndex('team_members_team_user_unique').on(
      table.teamId,
      table.userId
    ),
    teamIdIdx: index('team_members_team_id_idx').on(table.teamId),
    userIdIdx: index('team_members_user_id_idx').on(table.userId),
  })
);

/**
 * Relations for teams table
 */
export const teamsRelations = relations(teams, ({ one, many }) => ({
  owner: one(users, {
    fields: [teams.ownerId],
    references: [users.id],
    relationName: 'TeamOwner',
  }),
  workspace: one(workspaces, {
    fields: [teams.workspaceId],
    references: [workspaces.id],
  }),
  members: many(teamMembers),
}));

/**
 * Relations for teamMembers table
 */
export const teamMembersRelations = relations(teamMembers, ({ one }) => ({
  team: one(teams, {
    fields: [teamMembers.teamId],
    references: [teams.id],
  }),
  user: one(users, {
    fields: [teamMembers.userId],
    references: [users.id],
  }),
}));
