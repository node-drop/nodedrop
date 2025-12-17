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

/**
 * Users table - stores user account information
 * Managed by better-auth with custom fields for admin plugin
 */
export const users = pgTable(
  'users',
  {
    id: text('id').primaryKey().default(sql`cuid()`),
    email: text('email').unique().notNull(),
    emailVerified: boolean('email_verified').default(false),
    name: text('name'),
    image: text('image'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),

    // Custom fields - role managed by better-auth admin plugin
    role: text('role').default('user'),
    banned: boolean('banned').default(false),
    banReason: text('ban_reason'),
    banExpires: timestamp('ban_expires'),
    active: boolean('active').default(true),
    preferences: json('preferences').default({}),

    // Default workspace for the user (set on first login)
    defaultWorkspaceId: text('default_workspace_id'),
  },
  (table) => ({
    emailIdx: uniqueIndex('users_email_idx').on(table.email),
  })
);

/**
 * Sessions table - stores user session information
 * Managed by better-auth
 */
export const sessions = pgTable(
  'sessions',
  {
    id: text('id').primaryKey().default(sql`cuid()`),
    userId: text('user_id').notNull(),
    expiresAt: timestamp('expires_at').notNull(),
    token: text('token').unique().notNull(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => ({
    userIdIdx: index('sessions_user_id_idx').on(table.userId),
  })
);

/**
 * Accounts table - stores OAuth provider accounts
 * Managed by better-auth for OAuth and email/password auth
 */
export const accounts = pgTable(
  'accounts',
  {
    id: text('id').primaryKey().default(sql`cuid()`),
    userId: text('user_id').notNull(),
    accountId: text('account_id').notNull(),
    providerId: text('provider_id').notNull(),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    idToken: text('id_token'),
    expiresAt: timestamp('expires_at'),
    password: text('password'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => ({
    userIdIdx: index('accounts_user_id_idx').on(table.userId),
    providerIdx: uniqueIndex('accounts_provider_idx').on(
      table.providerId,
      table.accountId
    ),
  })
);

/**
 * Verifications table - stores email verification and password reset tokens
 * Managed by better-auth
 */
export const verifications = pgTable(
  'verifications',
  {
    id: text('id').primaryKey().default(sql`cuid()`),
    identifier: text('identifier').notNull(),
    value: text('value').notNull(),
    expiresAt: timestamp('expires_at').notNull(),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => ({
    identifierValueIdx: uniqueIndex('verifications_identifier_value_idx').on(
      table.identifier,
      table.value
    ),
  })
);

/**
 * Relations for users table
 */
export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
  accounts: many(accounts),
  // Note: credentials, variables, and credentialShares relations are defined in their respective schema files
  // to avoid circular dependencies
}));

/**
 * Relations for sessions table
 */
export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

/**
 * Relations for accounts table
 */
export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, {
    fields: [accounts.userId],
    references: [users.id],
  }),
}));
