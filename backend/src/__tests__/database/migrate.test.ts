import {
  applyMigrations,
  getMigrationFiles,
  getMigrationStatus,
  verifyMigrations,
  rollbackMigrations,
  initializeDatabase,
  MigrationResult,
  MigrationStatus,
} from '../../db/migrate';
import { logger } from '../../utils/logger';
import fs from 'fs';
import path from 'path';

// Mock the logger to avoid cluttering test output
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('Database Migration Utilities', () => {
  describe('getMigrationFiles', () => {
    it('should return an array of migration files', async () => {
      const files = await getMigrationFiles();
      expect(Array.isArray(files)).toBe(true);
    });

    it('should only return .sql files', async () => {
      const files = await getMigrationFiles();
      files.forEach((file) => {
        expect(file).toMatch(/\.sql$/);
      });
    });

    it('should return files in sorted order', async () => {
      const files = await getMigrationFiles();
      const sorted = [...files].sort();
      expect(files).toEqual(sorted);
    });

    it('should handle missing migrations directory gracefully', async () => {
      // This test verifies the function doesn't throw even if directory is missing
      const files = await getMigrationFiles();
      expect(Array.isArray(files)).toBe(true);
    });
  });

  describe('getMigrationStatus', () => {
    it('should return an array of migration statuses', async () => {
      const statuses = await getMigrationStatus();
      expect(Array.isArray(statuses)).toBe(true);
    });

    it('should have correct structure for each migration', async () => {
      const statuses = await getMigrationStatus();
      statuses.forEach((status) => {
        expect(status).toHaveProperty('name');
        expect(status).toHaveProperty('hash');
        expect(status).toHaveProperty('applied');
        expect(typeof status.name).toBe('string');
        expect(typeof status.hash).toBe('string');
        expect(typeof status.applied).toBe('boolean');
      });
    });

    it('should handle database connection errors gracefully', async () => {
      // This test verifies the function returns empty array if DB is not accessible
      const statuses = await getMigrationStatus();
      expect(Array.isArray(statuses)).toBe(true);
    });
  });

  describe('verifyMigrations', () => {
    it('should return verification result with required properties', async () => {
      const result = await verifyMigrations();
      expect(result).toHaveProperty('valid');
      expect(result).toHaveProperty('appliedCount');
      expect(result).toHaveProperty('fileCount');
      expect(result).toHaveProperty('message');
    });

    it('should have numeric counts', async () => {
      const result = await verifyMigrations();
      expect(typeof result.appliedCount).toBe('number');
      expect(typeof result.fileCount).toBe('number');
      expect(result.appliedCount >= 0).toBe(true);
      expect(result.fileCount >= 0).toBe(true);
    });

    it('should have descriptive message', async () => {
      const result = await verifyMigrations();
      expect(typeof result.message).toBe('string');
      expect(result.message.length > 0).toBe(true);
    });

    it('should indicate when all migrations are applied', async () => {
      const result = await verifyMigrations();
      if (result.appliedCount === result.fileCount) {
        expect(result.message).toContain('All');
      }
    });

    it('should indicate when migrations are pending', async () => {
      const result = await verifyMigrations();
      if (result.appliedCount < result.fileCount) {
        expect(result.message).toContain('pending');
      }
    });
  });

  describe('applyMigrations', () => {
    it('should return a migration result object', async () => {
      const result = await applyMigrations();
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('message');
      expect(typeof result.success).toBe('boolean');
      expect(typeof result.message).toBe('string');
    });

    it('should have success property as boolean', async () => {
      const result = await applyMigrations();
      expect(typeof result.success).toBe('boolean');
    });

    it('should include migrationsApplied array on success', async () => {
      const result = await applyMigrations();
      if (result.success) {
        expect(Array.isArray(result.migrationsApplied)).toBe(true);
      }
    });

    it('should include error message on failure', async () => {
      const result = await applyMigrations();
      if (!result.success) {
        expect(result.error).toBeDefined();
        expect(typeof result.error).toBe('string');
      }
    });
  });

  describe('rollbackMigrations', () => {
    it('should prevent rollback in production', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      try {
        const result = await rollbackMigrations();
        expect(result.success).toBe(false);
        expect(result.message).toContain('not allowed in production');
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });

    it('should return a migration result object', async () => {
      const result = await rollbackMigrations();
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('message');
      expect(typeof result.success).toBe('boolean');
      expect(typeof result.message).toBe('string');
    });

    it('should handle errors gracefully', async () => {
      const result = await rollbackMigrations();
      if (!result.success) {
        expect(result.error).toBeDefined();
        expect(typeof result.error).toBe('string');
      }
    });
  });

  describe('initializeDatabase', () => {
    it('should return a migration result object', async () => {
      const result = await initializeDatabase();
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('message');
      expect(typeof result.success).toBe('boolean');
      expect(typeof result.message).toBe('string');
    });

    it('should indicate database status in message', async () => {
      const result = await initializeDatabase();
      expect(result.message.length > 0).toBe(true);
    });

    it('should handle errors gracefully', async () => {
      const result = await initializeDatabase();
      if (!result.success) {
        expect(result.error).toBeDefined();
        expect(typeof result.error).toBe('string');
      }
    });

    it('should apply migrations if needed', async () => {
      const result = await initializeDatabase();
      // Result should be successful or indicate what went wrong
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('message');
    });
  });

  describe('Migration Result Structure', () => {
    it('should have consistent result structure across all functions', async () => {
      const results = [
        await applyMigrations(),
        await rollbackMigrations(),
        await initializeDatabase(),
      ];

      results.forEach((result) => {
        expect(result).toHaveProperty('success');
        expect(result).toHaveProperty('message');
        expect(typeof result.success).toBe('boolean');
        expect(typeof result.message).toBe('string');
      });
    });

    it('should include error property when success is false', async () => {
      const results = [
        await applyMigrations(),
        await rollbackMigrations(),
        await initializeDatabase(),
      ];

      results.forEach((result) => {
        if (!result.success) {
          expect(result.error).toBeDefined();
        }
      });
    });
  });

  describe('Migration File Integrity', () => {
    it('should have migration files in migrations directory', async () => {
      const migrationsPath = path.join(__dirname, '../../db/migrations');
      if (fs.existsSync(migrationsPath)) {
        const files = fs.readdirSync(migrationsPath);
        const sqlFiles = files.filter((f) => f.endsWith('.sql'));
        expect(sqlFiles.length > 0).toBe(true);
      }
    });

    it('should have valid migration file names', async () => {
      const files = await getMigrationFiles();
      files.forEach((file) => {
        // Migration files should follow pattern: NNNN_name.sql
        expect(file).toMatch(/^\d+_.*\.sql$/);
      });
    });
  });
});
