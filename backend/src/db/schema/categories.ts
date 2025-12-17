import {
  pgTable,
  text,
  boolean,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

/**
 * Categories table - stores node categories
 * Used for organizing and filtering node types
 */
export const categories = pgTable(
  'categories',
  {
    id: text('id').primaryKey().default(sql`cuid()`),

    // Category identification
    name: text('name').unique().notNull(), // Unique identifier for the category
    displayName: text('display_name').notNull(), // Human-readable display name

    // Description and metadata
    description: text('description'),
    color: text('color'), // Hex color code for UI display
    icon: text('icon'), // Icon identifier or SVG

    // Status
    active: boolean('active').default(true).notNull(),

    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => ({
    nameUnique: uniqueIndex('categories_name_unique').on(table.name),
  })
);
