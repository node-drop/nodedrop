import { relations, sql } from 'drizzle-orm';
import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { users } from './auth';
import { credentials } from './credentials';

/**
 * User AI Settings table - stores user preferences for AI features
 */
export const userAiSettings = pgTable('user_ai_settings', {
  id: text('id').primaryKey().default(sql`cuid()`),
  userId: text('user_id').notNull().unique().references(() => users.id, { onDelete: 'cascade' }),
  
  // AI Provider & Model Preferences
  provider: text('provider').default('openai').notNull(),
  model: text('model').default('gpt-4o').notNull(),
  
  // Link to stored credential (optional)
  // If null, uses system default (env var)
  credentialId: text('credential_id').references(() => credentials.id, { onDelete: 'set null' }),
  
  updatedAt: timestamp('updated_at').defaultNow(),
  createdAt: timestamp('created_at').defaultNow(),
});

/**
 * Relations for userAiSettings
 */
export const userAiSettingsRelations = relations(userAiSettings, ({ one }) => ({
  user: one(users, {
    fields: [userAiSettings.userId],
    references: [users.id],
  }),
  credential: one(credentials, {
    fields: [userAiSettings.credentialId],
    references: [credentials.id],
  }),
}));
