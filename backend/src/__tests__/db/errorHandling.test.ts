/**
 * Tests for Database Error Handling with Drizzle
 * 
 * **Feature: prisma-to-drizzle-migration, Requirement 6.4**
 * **Validates: Requirements 6.4**
 * 
 * These tests verify that error handling works correctly with Drizzle:
 * - Connection errors are properly classified and handled
 * - Query errors are properly classified and handled
 * - Constraint violations are properly classified and handled
 * - Transaction errors are properly classified and handled
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  DatabaseError,
  DatabaseConnectionError,
  QueryError,
  ConstraintViolationError,
  TransactionError,
  TimeoutError,
  NotFoundError,
  InvalidOperationError,
  classifyDatabaseError,
  handleDatabaseError,
  isRetryableError,
  extractErrorDetails,
} from '../../db/errors';
import { logger } from '../../utils/logger';

// Mock logger to avoid cluttering test output
jest.mock('../../utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('Database Error Handling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('DatabaseConnectionError', () => {
    it('should create a connection error with correct status code', () => {
      const error = new DatabaseConnectionError('Connection failed');
      expect(error.statusCode).toBe(503);
      expect(error.code).toBe('DATABASE_CONNECTION_ERROR');
      expect(error.message).toBe('Connection failed');
    });

    it('should detect timeout errors', () => {
      const timeoutError = new Error('Connection timeout');
      const error = new DatabaseConnectionError('Connection failed', timeoutError);
      expect(error.isTimeout()).toBe(true);
    });

    it('should detect authentication failures', () => {
      const authError = new Error('FATAL: password authentication failed');
      const error = new DatabaseConnectionError('Connection failed', authError);
      expect(error.isAuthenticationFailure()).toBe(true);
    });

    it('should detect network errors', () => {
      const networkError = new Error('ECONNREFUSED: Connection refused');
      const error = new DatabaseConnectionError('Connection failed', networkError);
      expect(error.isNetworkError()).toBe(true);
    });
  });

  describe('QueryError', () => {
    it('should create a query error with correct status code', () => {
      const error = new QueryError('Query failed');
      expect(error.statusCode).toBe(500);
      expect(error.code).toBe('QUERY_ERROR');
    });

    it('should detect syntax errors', () => {
      const syntaxError = new Error('syntax error at or near "SELECT"');
      const error = new QueryError('Query failed', syntaxError);
      expect(error.isSyntaxError()).toBe(true);
    });

    it('should detect invalid column references', () => {
      const columnError = new Error('column "invalid_col" does not exist');
      const error = new QueryError('Query failed', columnError);
      expect(error.isInvalidColumn()).toBe(true);
    });

    it('should detect type mismatches', () => {
      const typeError = new Error('cannot cast type integer to text');
      const error = new QueryError('Query failed', typeError);
      expect(error.isTypeMismatch()).toBe(true);
    });
  });

  describe('ConstraintViolationError', () => {
    it('should create a constraint violation error with correct status code', () => {
      const error = new ConstraintViolationError('Constraint violated', 'unique');
      expect(error.statusCode).toBe(409);
      expect(error.code).toBe('CONSTRAINT_VIOLATION');
      expect(error.constraintType).toBe('unique');
    });

    it('should detect unique constraint violations', () => {
      const uniqueError = new Error('duplicate key value violates unique constraint');
      const error = new ConstraintViolationError('Constraint violated', 'unique', uniqueError);
      expect(error.isUniqueViolation()).toBe(true);
    });

    it('should detect foreign key violations', () => {
      const fkError = new Error('insert or update on table violates foreign key constraint');
      const error = new ConstraintViolationError('Constraint violated', 'foreign_key', fkError);
      expect(error.isForeignKeyViolation()).toBe(true);
    });

    it('should detect check constraint violations', () => {
      const checkError = new Error('new row for relation violates check constraint');
      const error = new ConstraintViolationError('Constraint violated', 'check', checkError);
      expect(error.isCheckViolation()).toBe(true);
    });

    it('should detect not-null constraint violations', () => {
      const notNullError = new Error('null value in column violates not-null constraint');
      const error = new ConstraintViolationError('Constraint violated', 'not_null', notNullError);
      expect(error.isNotNullViolation()).toBe(true);
    });

    it('should extract constraint name from error message', () => {
      const error = new Error('duplicate key value violates unique constraint "users_email_key"');
      const constraintError = new ConstraintViolationError('Constraint violated', 'unique', error);
      expect(constraintError.getConstraintName()).toBe('users_email_key');
    });

    it('should return null when constraint name is not found', () => {
      const error = new Error('duplicate key value violates unique constraint');
      const constraintError = new ConstraintViolationError('Constraint violated', 'unique', error);
      expect(constraintError.getConstraintName()).toBeNull();
    });
  });

  describe('TransactionError', () => {
    it('should create a transaction error with correct status code', () => {
      const error = new TransactionError('Transaction failed');
      expect(error.statusCode).toBe(500);
      expect(error.code).toBe('TRANSACTION_ERROR');
    });

    it('should detect deadlock errors', () => {
      const deadlockError = new Error('Deadlock detected');
      const error = new TransactionError('Transaction failed', deadlockError);
      expect(error.isDeadlock).toBe(true);
    });

    it('should detect serialization failures', () => {
      const serializationError = new Error('serialization failure');
      const error = new TransactionError('Transaction failed', serializationError);
      expect(error.isSerializationFailure).toBe(true);
    });

    it('should indicate that deadlock errors can be retried', () => {
      const deadlockError = new Error('Deadlock detected');
      const error = new TransactionError('Transaction failed', deadlockError);
      expect(error.canRetry()).toBe(true);
    });

    it('should indicate that serialization failures can be retried', () => {
      const serializationError = new Error('serialization failure');
      const error = new TransactionError('Transaction failed', serializationError);
      expect(error.canRetry()).toBe(true);
    });

    it('should indicate that other transaction errors cannot be retried', () => {
      const error = new TransactionError('Transaction failed', new Error('Some other error'));
      expect(error.canRetry()).toBe(false);
    });
  });

  describe('TimeoutError', () => {
    it('should create a timeout error with correct status code', () => {
      const error = new TimeoutError('Operation timed out');
      expect(error.statusCode).toBe(504);
      expect(error.code).toBe('TIMEOUT_ERROR');
    });
  });

  describe('NotFoundError', () => {
    it('should create a not found error with correct status code', () => {
      const error = new NotFoundError('Resource not found');
      expect(error.statusCode).toBe(404);
      expect(error.code).toBe('NOT_FOUND');
    });
  });

  describe('InvalidOperationError', () => {
    it('should create an invalid operation error with correct status code', () => {
      const error = new InvalidOperationError('Invalid operation');
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('INVALID_OPERATION');
    });
  });

  describe('classifyDatabaseError', () => {
    it('should classify connection errors', () => {
      const error = new Error('ECONNREFUSED: Connection refused');
      const classified = classifyDatabaseError(error);
      expect(classified).toBeInstanceOf(DatabaseConnectionError);
    });

    it('should classify unique constraint violations', () => {
      const error = new Error('duplicate key value violates unique constraint');
      const classified = classifyDatabaseError(error);
      expect(classified).toBeInstanceOf(ConstraintViolationError);
      expect((classified as ConstraintViolationError).constraintType).toBe('unique');
    });

    it('should classify foreign key violations', () => {
      const error = new Error('insert or update on table violates foreign key constraint');
      const classified = classifyDatabaseError(error);
      expect(classified).toBeInstanceOf(ConstraintViolationError);
      expect((classified as ConstraintViolationError).constraintType).toBe('foreign_key');
    });

    it('should classify check constraint violations', () => {
      const error = new Error('new row for relation violates check constraint');
      const classified = classifyDatabaseError(error);
      expect(classified).toBeInstanceOf(ConstraintViolationError);
      expect((classified as ConstraintViolationError).constraintType).toBe('check');
    });

    it('should classify not-null constraint violations', () => {
      const error = new Error('null value in column violates not-null constraint');
      const classified = classifyDatabaseError(error);
      expect(classified).toBeInstanceOf(ConstraintViolationError);
      expect((classified as ConstraintViolationError).constraintType).toBe('not_null');
    });

    it('should classify deadlock errors', () => {
      const error = new Error('Deadlock detected');
      const classified = classifyDatabaseError(error);
      expect(classified).toBeInstanceOf(TransactionError);
      expect((classified as TransactionError).isDeadlock).toBe(true);
    });

    it('should classify serialization failures', () => {
      const error = new Error('serialization failure');
      const classified = classifyDatabaseError(error);
      expect(classified).toBeInstanceOf(TransactionError);
      expect((classified as TransactionError).isSerializationFailure).toBe(true);
    });

    it('should classify timeout errors', () => {
      const error = new Error('statement timeout');
      const classified = classifyDatabaseError(error);
      expect(classified).toBeInstanceOf(TimeoutError);
    });

    it('should classify syntax errors', () => {
      const error = new Error('syntax error at or near "SELECT"');
      const classified = classifyDatabaseError(error);
      expect(classified).toBeInstanceOf(QueryError);
    });

    it('should classify invalid column errors', () => {
      const error = new Error('column "invalid_col" does not exist');
      const classified = classifyDatabaseError(error);
      expect(classified).toBeInstanceOf(QueryError);
    });

    it('should classify type mismatch errors', () => {
      const error = new Error('cannot cast type integer to text');
      const classified = classifyDatabaseError(error);
      expect(classified).toBeInstanceOf(QueryError);
    });

    it('should handle non-Error objects', () => {
      const classified = classifyDatabaseError('string error');
      expect(classified).toBeInstanceOf(DatabaseError);
      expect(classified.code).toBe('UNKNOWN_ERROR');
    });

    it('should use context message when provided', () => {
      const error = new Error('Connection timeout');
      const classified = classifyDatabaseError(error, {
        message: 'Failed to connect to user database',
      });
      expect(classified.message).toBe('Failed to connect to user database');
    });
  });

  describe('handleDatabaseError', () => {
    it('should classify and log connection errors', () => {
      const error = new Error('ECONNREFUSED: Connection refused');
      const handled = handleDatabaseError(error);
      expect(handled).toBeInstanceOf(DatabaseConnectionError);
      expect(logger.error).toHaveBeenCalled();
    });

    it('should classify and log constraint violations', () => {
      const error = new Error('duplicate key value violates unique constraint');
      const handled = handleDatabaseError(error);
      expect(handled).toBeInstanceOf(ConstraintViolationError);
      expect(logger.warn).toHaveBeenCalled();
    });

    it('should classify and log transaction errors', () => {
      const error = new Error('Deadlock detected');
      const handled = handleDatabaseError(error);
      expect(handled).toBeInstanceOf(TransactionError);
      expect(logger.error).toHaveBeenCalled();
    });

    it('should classify and log query errors', () => {
      const error = new Error('syntax error at or near "SELECT"');
      const handled = handleDatabaseError(error);
      expect(handled).toBeInstanceOf(QueryError);
      expect(logger.error).toHaveBeenCalled();
    });

    it('should classify and log generic database errors', () => {
      const error = new Error('Some unknown database error');
      const handled = handleDatabaseError(error);
      expect(handled).toBeInstanceOf(DatabaseError);
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('isRetryableError', () => {
    it('should identify deadlock errors as retryable', () => {
      const error = new TransactionError('Deadlock', new Error('Deadlock detected'));
      expect(isRetryableError(error)).toBe(true);
    });

    it('should identify serialization failures as retryable', () => {
      const error = new TransactionError('Serialization', new Error('serialization failure'));
      expect(isRetryableError(error)).toBe(true);
    });

    it('should identify timeout errors as retryable', () => {
      const error = new TimeoutError('Timeout');
      expect(isRetryableError(error)).toBe(true);
    });

    it('should identify connection timeout errors as retryable', () => {
      const error = new DatabaseConnectionError('Timeout', new Error('Connection timeout'));
      expect(isRetryableError(error)).toBe(true);
    });

    it('should identify network errors as retryable', () => {
      const error = new DatabaseConnectionError('Network', new Error('ECONNREFUSED'));
      expect(isRetryableError(error)).toBe(true);
    });

    it('should identify constraint violations as non-retryable', () => {
      const error = new ConstraintViolationError('Constraint', 'unique');
      expect(isRetryableError(error)).toBe(false);
    });

    it('should identify query errors as non-retryable', () => {
      const error = new QueryError('Query failed', new Error('syntax error'));
      expect(isRetryableError(error)).toBe(false);
    });

    it('should identify generic errors with timeout in message as retryable', () => {
      const error = new Error('Operation timeout');
      expect(isRetryableError(error)).toBe(true);
    });

    it('should identify generic errors with connection in message as retryable', () => {
      const error = new Error('Connection failed');
      expect(isRetryableError(error)).toBe(true);
    });

    it('should identify generic errors with deadlock in message as retryable', () => {
      const error = new Error('Deadlock detected');
      expect(isRetryableError(error)).toBe(true);
    });

    it('should identify generic errors with serialization in message as retryable', () => {
      const error = new Error('serialization failure');
      expect(isRetryableError(error)).toBe(true);
    });

    it('should identify other errors as non-retryable', () => {
      const error = new Error('Some other error');
      expect(isRetryableError(error)).toBe(false);
    });
  });

  describe('extractErrorDetails', () => {
    it('should extract details from connection errors', () => {
      const error = new DatabaseConnectionError('Connection failed', new Error('timeout'));
      const details = extractErrorDetails(error);
      expect(details.type).toBe('DatabaseConnectionError');
      expect(details.isRetryable).toBe(true);
      expect(details.details.isTimeout).toBe(true);
    });

    it('should extract details from constraint violations', () => {
      const error = new ConstraintViolationError('Constraint', 'unique', new Error('duplicate key'));
      const details = extractErrorDetails(error);
      expect(details.type).toBe('ConstraintViolationError');
      expect(details.isRetryable).toBe(false);
      expect(details.details.constraintType).toBe('unique');
    });

    it('should extract details from transaction errors', () => {
      const error = new TransactionError('Transaction failed', new Error('Deadlock detected'));
      const details = extractErrorDetails(error);
      expect(details.type).toBe('TransactionError');
      expect(details.isRetryable).toBe(true);
      expect(details.details.isDeadlock).toBe(true);
    });

    it('should extract details from query errors', () => {
      const error = new QueryError('Query failed', new Error('syntax error'));
      const details = extractErrorDetails(error);
      expect(details.type).toBe('QueryError');
      expect(details.isRetryable).toBe(false);
    });

    it('should extract details from timeout errors', () => {
      const error = new TimeoutError('Timeout');
      const details = extractErrorDetails(error);
      expect(details.type).toBe('TimeoutError');
      expect(details.isRetryable).toBe(true);
    });

    it('should include message and code in extracted details', () => {
      const error = new DatabaseError('Test error', 500, 'TEST_ERROR');
      const details = extractErrorDetails(error);
      expect(details.message).toBe('Test error');
      expect(details.code).toBe('TEST_ERROR');
    });
  });
});
