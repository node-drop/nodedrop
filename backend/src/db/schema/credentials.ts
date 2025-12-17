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
import { teams } from './teams';

/**
 * Credentials table - stores encrypted credentials for integrations
 * Each credential is owned by a user and optionally scoped to a workspace
 */
export const credentials = pgTable(
  'credentials',
  {
    id: text('id').primaryKey().default(sql`cuid()`),
    name: text('name').notNull(),
    type: text('type').notNull(), // Type of credential (e.g., 'stripe', 'github', 'slack')
    
    // Ownership
    userId: text('user_id').notNull(),
    
    // Workspace association
    workspaceId: text('workspace_id'),
    
    // Encrypted credential data
    data: text('data').notNull(),
    
    // Expiration
    expiresAt: timestamp('expires_at'),
    
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => ({
    userIdIdx: index('credentials_user_id_idx').on(table.userId),
    workspaceIdIdx: index('credentials_workspace_id_idx').on(table.workspaceId),
    userNameUnique: uniqueIndex('credentials_user_name_unique').on(
      table.userId,
      table.name
    ),
  })
);

/**
 * CredentialShares table - stores credential sharing permissions
 * Allows sharing credentials with other users or teams
 */
export const credentialShares = pgTable(
  'credential_shares',
  {
    id: text('id').primaryKey().default(sql`cuid()`),
    credentialId: text('credential_id').notNull(),
    
    // Owner of the credential
    ownerUserId: text('owner_user_id').notNull(),
    
    // Shared with (either user or team)
    sharedWithUserId: text('shared_with_user_id'),
    sharedWithTeamId: text('shared_with_team_id'),
    
    // Permission level
    permission: text('permission').default('USE').notNull(), // USE, VIEW, EDIT
    
    // Sharing metadata
    sharedAt: timestamp('shared_at').defaultNow(),
    sharedByUserId: text('shared_by_user_id'),
  },
  (table) => ({
    credentialIdIdx: index('credential_shares_credential_id_idx').on(
      table.credentialId
    ),
    sharedWithUserIdIdx: index('credential_shares_shared_with_user_id_idx').on(
      table.sharedWithUserId
    ),
    sharedWithTeamIdIdx: index('credential_shares_shared_with_team_id_idx').on(
      table.sharedWithTeamId
    ),
    ownerUserIdIdx: index('credential_shares_owner_user_id_idx').on(
      table.ownerUserId
    ),
    credentialUserUnique: uniqueIndex(
      'credential_shares_credential_user_unique'
    ).on(table.credentialId, table.sharedWithUserId),
    credentialTeamUnique: uniqueIndex(
      'credential_shares_credential_team_unique'
    ).on(table.credentialId, table.sharedWithTeamId),
  })
);

/**
 * Relations for credentials table
 */
export const credentialsRelations = relations(credentials, ({ one, many }) => ({
  user: one(users, {
    fields: [credentials.userId],
    references: [users.id],
  }),
  workspace: one(workspaces, {
    fields: [credentials.workspaceId],
    references: [workspaces.id],
  }),
  shares: many(credentialShares),
}));

/**
 * Relations for credentialShares table
 */
export const credentialSharesRelations = relations(
  credentialShares,
  ({ one }) => ({
    credential: one(credentials, {
      fields: [credentialShares.credentialId],
      references: [credentials.id],
    }),
    owner: one(users, {
      fields: [credentialShares.ownerUserId],
      references: [users.id],
      relationName: 'CredentialOwner',
    }),
    sharedWithUser: one(users, {
      fields: [credentialShares.sharedWithUserId],
      references: [users.id],
      relationName: 'CredentialSharedWith',
    }),
    sharedWithTeam: one(teams, {
      fields: [credentialShares.sharedWithTeamId],
      references: [teams.id],
      relationName: 'CredentialSharedWithTeam',
    }),
    sharedBy: one(users, {
      fields: [credentialShares.sharedByUserId],
      references: [users.id],
      relationName: 'CredentialSharedBy',
    }),
  })
);
