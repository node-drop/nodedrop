import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import path from 'path';
import fs from 'fs';
import { logger } from '../utils/logger';
import { db } from './client';

/**
 * Migration status interface
 */
export interface MigrationStatus {
  name: string;
  hash: string;
  applied: boolean;
  appliedAt?: Date;
}

/**
 * Migration result interface
 */
export interface MigrationResult {
  success: boolean;
  message: string;
  migrationsApplied?: string[];
  error?: string;
}

/**
 * Apply all pending migrations
 * This function reads the migrations directory and applies any pending migrations
 */
export async function applyMigrations(): Promise<MigrationResult> {
  try {
    logger.info('Starting database migrations...');

    const migrationsPath = path.join(__dirname, 'migrations');

    // Verify migrations directory exists
    if (!fs.existsSync(migrationsPath)) {
      logger.warn('Migrations directory does not exist:', migrationsPath);
      return {
        success: false,
        message: 'Migrations directory not found',
        error: `Directory not found: ${migrationsPath}`,
      };
    }

    // Run migrations using Drizzle's migrate function
    const result = await migrate(db, {
      migrationsFolder: migrationsPath,
    });

    logger.info('Database migrations completed successfully');

    return {
      success: true,
      message: 'All pending migrations applied successfully',
      migrationsApplied: result,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Migration failed:', errorMessage);

    return {
      success: false,
      message: 'Failed to apply migrations',
      error: errorMessage,
    };
  }
}

/**
 * Get list of all migration files
 */
export async function getMigrationFiles(): Promise<string[]> {
  try {
    const migrationsPath = path.join(__dirname, 'migrations');

    if (!fs.existsSync(migrationsPath)) {
      logger.warn('Migrations directory does not exist');
      return [];
    }

    const files = fs.readdirSync(migrationsPath);
    const migrationFiles = files
      .filter((file) => file.endsWith('.sql'))
      .sort();

    logger.info(`Found ${migrationFiles.length} migration files`);
    return migrationFiles;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Error reading migration files:', errorMessage);
    return [];
  }
}

/**
 * Get migration status from the database
 * This queries the __drizzle_migrations table to see which migrations have been applied
 */
export async function getMigrationStatus(): Promise<MigrationStatus[]> {
  try {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });

    try {
      // Query the Drizzle migrations table
      const result = await pool.query(
        `SELECT name, hash, created_at FROM __drizzle_migrations ORDER BY created_at ASC`
      );

      const statuses: MigrationStatus[] = result.rows.map((row) => ({
        name: row.name,
        hash: row.hash,
        applied: true,
        appliedAt: row.created_at,
      }));

      logger.info(`Retrieved status for ${statuses.length} applied migrations`);
      return statuses;
    } finally {
      await pool.end();
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.warn('Could not retrieve migration status from database:', errorMessage);
    // Return empty array if migrations table doesn't exist yet
    return [];
  }
}

/**
 * Verify migration integrity by comparing applied migrations with migration files
 */
export async function verifyMigrations(): Promise<{
  valid: boolean;
  appliedCount: number;
  fileCount: number;
  message: string;
}> {
  try {
    const appliedMigrations = await getMigrationStatus();
    const migrationFiles = await getMigrationFiles();

    const appliedCount = appliedMigrations.length;
    const fileCount = migrationFiles.length;

    // Check if all migration files have been applied
    const allApplied = appliedCount === fileCount;

    const message = allApplied
      ? `All ${fileCount} migrations have been applied`
      : `${appliedCount} of ${fileCount} migrations have been applied. ${fileCount - appliedCount} pending.`;

    logger.info(`Migration verification: ${message}`);

    return {
      valid: true,
      appliedCount,
      fileCount,
      message,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Migration verification failed:', errorMessage);

    return {
      valid: false,
      appliedCount: 0,
      fileCount: 0,
      message: `Verification failed: ${errorMessage}`,
    };
  }
}

/**
 * Rollback capability for development
 * WARNING: This is for development only and should not be used in production
 * This function drops all tables and resets the database schema
 */
export async function rollbackMigrations(): Promise<MigrationResult> {
  // Prevent rollback in production
  if (process.env.NODE_ENV === 'production') {
    const message = 'Rollback is not allowed in production environment';
    logger.error(message);
    return {
      success: false,
      message,
      error: 'Production environment detected',
    };
  }

  try {
    logger.warn('Starting database rollback (development only)...');

    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });

    try {
      // Get all tables
      const tablesResult = await pool.query(`
        SELECT tablename FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename != '__drizzle_migrations'
      `);

      const tables = tablesResult.rows.map((row) => row.tablename);

      if (tables.length === 0) {
        logger.info('No tables to drop');
        return {
          success: true,
          message: 'No tables to drop',
        };
      }

      // Drop all tables
      for (const table of tables) {
        await pool.query(`DROP TABLE IF EXISTS "${table}" CASCADE`);
        logger.info(`Dropped table: ${table}`);
      }

      // Clear migrations table
      await pool.query(`DELETE FROM __drizzle_migrations`);
      logger.info('Cleared migration history');

      logger.warn('Database rollback completed');

      return {
        success: true,
        message: `Successfully rolled back ${tables.length} tables`,
      };
    } finally {
      await pool.end();
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Rollback failed:', errorMessage);

    return {
      success: false,
      message: 'Failed to rollback database',
      error: errorMessage,
    };
  }
}

/**
 * Initialize database - apply migrations if needed
 * This is typically called on application startup
 */
export async function initializeDatabase(): Promise<MigrationResult> {
  try {
    logger.info('Initializing database...');

    // Check current migration status
    const status = await verifyMigrations();
    logger.info(`Current migration status: ${status.message}`);

    // Apply any pending migrations
    if (status.appliedCount < status.fileCount) {
      logger.info('Pending migrations detected, applying...');
      return await applyMigrations();
    }

    logger.info('Database is up to date');
    return {
      success: true,
      message: 'Database is already up to date',
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Database initialization failed:', errorMessage);

    return {
      success: false,
      message: 'Failed to initialize database',
      error: errorMessage,
    };
  }
}
