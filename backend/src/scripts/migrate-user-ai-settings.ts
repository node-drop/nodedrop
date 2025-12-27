
import { sql } from 'drizzle-orm';
import { db } from '../db/client';
import { logger } from '../utils/logger';

async function main() {
  logger.info('Starting manual migration for user_ai_settings...');
  
  try {
    // Create Table
    logger.info('Creating user_ai_settings table...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "user_ai_settings" (
        "id" text PRIMARY KEY DEFAULT cuid(),
        "user_id" text NOT NULL UNIQUE,
        "provider" text DEFAULT 'openai' NOT NULL,
        "model" text DEFAULT 'gpt-4o' NOT NULL,
        "credential_id" text,
        "updated_at" timestamp DEFAULT now(),
        "created_at" timestamp DEFAULT now(),
        FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade,
        FOREIGN KEY ("credential_id") REFERENCES "credentials"("id") ON DELETE set null
      )
    `);
    logger.info('Table user_ai_settings created.');

  } catch (error) {
    logger.error('Migration failed:', error as any);
    process.exit(1);
  }
  
  logger.info('Migration successful.');
  process.exit(0);
}

main();
