/**
 * Database Error Handling Utilities for Drizzle ORM
 * 
 * This module provides specialized error classes and utilities for handling
 * various database error scenarios with Drizzle, including connection errors,
 * query errors, constraint violations, and transaction failures.
 * 
 * **Feature: prisma-to-drizzle-migration, Requirement 6.4**
 * **Validates: Requirements 6.4**
 */

import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';

/**
 * Base class for all database-related errors
 */
export class DatabaseError extends AppError {
  public readonly originalError: Error | unknown;
  public readonly errorCode?: string;
  public readonly errorDetail?: string;

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = 'DATABASE_ERROR',
    originalError?: Error | unknown
  ) {
    super(message, statusCode, code);
    this.originalError = originalError;
    
    // Extract PostgreSQL error details if available
    if (originalError instanceof Error) {
      const pgError = originalError as any;
      this.errorCode = pgError.code;
      this.errorDetail = pgError.detail;
    }
  }
}

/**
 * Error thrown when database connection fails
 * 
 * This includes connection timeouts, authentication failures, and network errors.
 */
export class DatabaseConnectionError extends DatabaseError {
  constructor(message: string = 'Failed to connect to database', originalError?: Error | unknown) {
    super(message, 503, 'DATABASE_CONNECTION_ERROR', originalError);
  }

  /**
   * Check if error is a connection timeout
   */
  isTimeout(): boolean {
    if (this.originalError instanceof Error) {
      return this.originalError.message.includes('timeout') ||
             this.originalError.message.includes('ETIMEDOUT') ||
             this.originalError.message.includes('EHOSTUNREACH');
    }
    return false;
  }

  /**
   * Check if error is an authentication failure
   */
  isAuthenticationFailure(): boolean {
    if (this.originalError instanceof Error) {
      return this.originalError.message.includes('authentication') ||
             this.originalError.message.includes('password') ||
             this.originalError.message.includes('FATAL');
    }
    return false;
  }

  /**
   * Check if error is a network error
   */
  isNetworkError(): boolean {
    if (this.originalError instanceof Error) {
      return this.originalError.message.includes('ECONNREFUSED') ||
             this.originalError.message.includes('ENOTFOUND') ||
             this.originalError.message.includes('EHOSTUNREACH');
    }
    return false;
  }
}

/**
 * Error thrown when a database query fails
 * 
 * This includes syntax errors, invalid column references, and other query-related issues.
 */
export class QueryError extends DatabaseError {
  constructor(message: string = 'Database query failed', originalError?: Error | unknown) {
    super(message, 500, 'QUERY_ERROR', originalError);
  }

  /**
   * Check if error is a syntax error
   */
  isSyntaxError(): boolean {
    if (this.originalError instanceof Error) {
      return this.originalError.message.includes('syntax') ||
             this.originalError.message.includes('parse error');
    }
    return false;
  }

  /**
   * Check if error is an invalid column reference
   */
  isInvalidColumn(): boolean {
    if (this.originalError instanceof Error) {
      return this.originalError.message.includes('column') &&
             this.originalError.message.includes('does not exist');
    }
    return false;
  }

  /**
   * Check if error is a type mismatch
   */
  isTypeMismatch(): boolean {
    if (this.originalError instanceof Error) {
      return this.originalError.message.includes('type') ||
             this.originalError.message.includes('cannot cast');
    }
    return false;
  }
}

/**
 * Error thrown when a database constraint is violated
 * 
 * This includes unique constraint violations, foreign key violations,
 * check constraint violations, and not-null constraint violations.
 */
export class ConstraintViolationError extends DatabaseError {
  public readonly constraintType: 'unique' | 'foreign_key' | 'check' | 'not_null' | 'unknown';

  constructor(
    message: string = 'Database constraint violated',
    constraintType: 'unique' | 'foreign_key' | 'check' | 'not_null' | 'unknown' = 'unknown',
    originalError?: Error | unknown
  ) {
    super(message, 409, 'CONSTRAINT_VIOLATION', originalError);
    this.constraintType = constraintType;
  }

  /**
   * Check if error is a unique constraint violation
   */
  isUniqueViolation(): boolean {
    return this.constraintType === 'unique' ||
           (this.originalError instanceof Error &&
            (this.originalError.message.includes('unique') ||
             this.originalError.message.includes('duplicate key')));
  }

  /**
   * Check if error is a foreign key violation
   */
  isForeignKeyViolation(): boolean {
    return this.constraintType === 'foreign_key' ||
           (this.originalError instanceof Error &&
            this.originalError.message.includes('foreign key'));
  }

  /**
   * Check if error is a check constraint violation
   */
  isCheckViolation(): boolean {
    return this.constraintType === 'check' ||
           (this.originalError instanceof Error &&
            this.originalError.message.includes('check constraint'));
  }

  /**
   * Check if error is a not-null constraint violation
   */
  isNotNullViolation(): boolean {
    return this.constraintType === 'not_null' ||
           (this.originalError instanceof Error &&
            this.originalError.message.includes('not-null constraint'));
  }

  /**
   * Extract the constraint name from the error
   */
  getConstraintName(): string | null {
    if (this.originalError instanceof Error) {
      const match = this.originalError.message.match(/constraint "([^"]+)"/);
      return match ? match[1] : null;
    }
    return null;
  }
}

/**
 * Error thrown when a transaction fails
 * 
 * This includes transaction rollbacks, deadlocks, and serialization failures.
 */
export class TransactionError extends DatabaseError {
  public readonly isDeadlock: boolean;
  public readonly isSerializationFailure: boolean;

  constructor(
    message: string = 'Database transaction failed',
    originalError?: Error | unknown
  ) {
    super(message, 500, 'TRANSACTION_ERROR', originalError);
    
    this.isDeadlock = this.checkDeadlock();
    this.isSerializationFailure = this.checkSerializationFailure();
  }

  /**
   * Check if error is a deadlock
   */
  private checkDeadlock(): boolean {
    if (this.originalError instanceof Error) {
      const message = this.originalError.message.toLowerCase();
      return message.includes('deadlock') ||
             (this.originalError as any).code === '40P01';
    }
    return false;
  }

  /**
   * Check if error is a serialization failure
   */
  private checkSerializationFailure(): boolean {
    if (this.originalError instanceof Error) {
      return this.originalError.message.includes('serialization') ||
             (this.originalError as any).code === '40001';
    }
    return false;
  }

  /**
   * Check if transaction can be retried
   */
  canRetry(): boolean {
    return this.isDeadlock || this.isSerializationFailure;
  }
}

/**
 * Error thrown when a database operation times out
 */
export class TimeoutError extends DatabaseError {
  constructor(
    message: string = 'Database operation timed out',
    originalError?: Error | unknown
  ) {
    super(message, 504, 'TIMEOUT_ERROR', originalError);
  }
}

/**
 * Error thrown when a resource is not found
 */
export class NotFoundError extends DatabaseError {
  constructor(
    message: string = 'Resource not found',
    originalError?: Error | unknown
  ) {
    super(message, 404, 'NOT_FOUND', originalError);
  }
}

/**
 * Error thrown when a database operation is invalid
 */
export class InvalidOperationError extends DatabaseError {
  constructor(
    message: string = 'Invalid database operation',
    originalError?: Error | unknown
  ) {
    super(message, 400, 'INVALID_OPERATION', originalError);
  }
}

/**
 * Classify a database error and return the appropriate error class
 * 
 * This function analyzes a raw database error and returns a typed error instance
 * that can be used for proper error handling and logging.
 * 
 * @param error - The raw error from the database
 * @param context - Optional context about the operation that failed
 * @returns A classified DatabaseError instance
 */
export function classifyDatabaseError(
  error: Error | unknown,
  context?: {
    operation?: 'insert' | 'update' | 'delete' | 'select' | 'transaction';
    table?: string;
    message?: string;
  }
): DatabaseError {
  if (!(error instanceof Error)) {
    return new DatabaseError(
      context?.message || 'Unknown database error',
      500,
      'UNKNOWN_ERROR',
      error
    );
  }

  const errorMessage = error.message.toLowerCase();
  const pgError = error as any;

  // Timeout errors (check before connection errors)
  if (
    errorMessage.includes('timeout') ||
    errorMessage.includes('statement timeout')
  ) {
    return new TimeoutError(
      context?.message || 'Database operation timed out',
      error
    );
  }

  // Connection errors
  if (
    errorMessage.includes('connection') ||
    errorMessage.includes('econnrefused') ||
    errorMessage.includes('enotfound') ||
    errorMessage.includes('ehostunreach')
  ) {
    return new DatabaseConnectionError(
      context?.message || 'Database connection failed',
      error
    );
  }

  // Constraint violations
  if (
    errorMessage.includes('unique') ||
    errorMessage.includes('duplicate key') ||
    pgError.code === '23505'
  ) {
    return new ConstraintViolationError(
      context?.message || 'Unique constraint violated',
      'unique',
      error
    );
  }

  if (
    errorMessage.includes('foreign key') ||
    pgError.code === '23503'
  ) {
    return new ConstraintViolationError(
      context?.message || 'Foreign key constraint violated',
      'foreign_key',
      error
    );
  }

  if (
    errorMessage.includes('check constraint') ||
    pgError.code === '23514'
  ) {
    return new ConstraintViolationError(
      context?.message || 'Check constraint violated',
      'check',
      error
    );
  }

  if (
    errorMessage.includes('not-null constraint') ||
    pgError.code === '23502'
  ) {
    return new ConstraintViolationError(
      context?.message || 'Not-null constraint violated',
      'not_null',
      error
    );
  }

  // Transaction errors
  if (
    errorMessage.includes('deadlock') ||
    pgError.code === '40P01'
  ) {
    return new TransactionError(
      context?.message || 'Deadlock detected',
      error
    );
  }

  if (
    errorMessage.includes('serialization') ||
    pgError.code === '40001'
  ) {
    return new TransactionError(
      context?.message || 'Serialization failure',
      error
    );
  }

  // Query errors
  if (
    errorMessage.includes('syntax') ||
    errorMessage.includes('parse error') ||
    errorMessage.includes('column') ||
    errorMessage.includes('type') ||
    pgError.code === '42601' || // syntax error
    pgError.code === '42703' || // undefined column
    pgError.code === '42883'    // undefined function
  ) {
    return new QueryError(
      context?.message || 'Database query failed',
      error
    );
  }

  // Default to generic database error
  return new DatabaseError(
    context?.message || error.message,
    500,
    'DATABASE_ERROR',
    error
  );
}

/**
 * Handle a database error with logging and classification
 * 
 * This function provides a centralized way to handle database errors,
 * ensuring consistent logging and error classification across the application.
 * 
 * @param error - The error to handle
 * @param context - Optional context about the operation
 * @returns The classified DatabaseError
 */
export function handleDatabaseError(
  error: Error | unknown,
  context?: {
    operation?: 'insert' | 'update' | 'delete' | 'select' | 'transaction';
    table?: string;
    message?: string;
  }
): DatabaseError {
  const classifiedError = classifyDatabaseError(error, context);

  // Log the error with appropriate level
  if (classifiedError instanceof DatabaseConnectionError) {
    logger.error('Database connection error:', {
      message: classifiedError.message,
      code: classifiedError.code,
      isTimeout: classifiedError.isTimeout(),
      isAuthFailure: classifiedError.isAuthenticationFailure(),
      isNetworkError: classifiedError.isNetworkError(),
    });
  } else if (classifiedError instanceof ConstraintViolationError) {
    logger.warn('Database constraint violation:', {
      message: classifiedError.message,
      constraintType: classifiedError.constraintType,
      constraintName: classifiedError.getConstraintName(),
    });
  } else if (classifiedError instanceof TransactionError) {
    logger.error('Database transaction error:', {
      message: classifiedError.message,
      isDeadlock: classifiedError.isDeadlock,
      isSerializationFailure: classifiedError.isSerializationFailure,
      canRetry: classifiedError.canRetry(),
    });
  } else if (classifiedError instanceof QueryError) {
    logger.error('Database query error:', {
      message: classifiedError.message,
      isSyntaxError: classifiedError.isSyntaxError(),
      isInvalidColumn: classifiedError.isInvalidColumn(),
      isTypeMismatch: classifiedError.isTypeMismatch(),
    });
  } else {
    logger.error('Database error:', {
      message: classifiedError.message,
      code: classifiedError.code,
    });
  }

  return classifiedError;
}

/**
 * Determine if a database error is retryable
 * 
 * Some database errors are transient and can be retried, while others
 * indicate permanent failures that should not be retried.
 * 
 * @param error - The error to check
 * @returns true if the error is retryable, false otherwise
 */
export function isRetryableError(error: Error | unknown): boolean {
  if (error instanceof TransactionError) {
    return error.canRetry();
  }

  if (error instanceof DatabaseConnectionError) {
    return error.isTimeout() || error.isNetworkError();
  }

  if (error instanceof TimeoutError) {
    return true;
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes('timeout') ||
      message.includes('connection') ||
      message.includes('deadlock') ||
      message.includes('serialization')
    );
  }

  return false;
}

/**
 * Extract error details for logging and monitoring
 * 
 * @param error - The error to extract details from
 * @returns Object containing error details
 */
export function extractErrorDetails(error: Error | unknown): {
  message: string;
  code?: string;
  type: string;
  isRetryable: boolean;
  details?: Record<string, any>;
} {
  // If it's already a DatabaseError, use it directly
  let classifiedError: DatabaseError;
  if (error instanceof DatabaseError) {
    classifiedError = error;
  } else {
    classifiedError = classifyDatabaseError(error);
  }

  return {
    message: classifiedError.message,
    code: classifiedError.code,
    type: classifiedError.constructor.name,
    isRetryable: isRetryableError(error),
    details: {
      errorCode: classifiedError.errorCode,
      errorDetail: classifiedError.errorDetail,
      ...(classifiedError instanceof ConstraintViolationError && {
        constraintType: classifiedError.constraintType,
        constraintName: classifiedError.getConstraintName(),
      }),
      ...(classifiedError instanceof TransactionError && {
        isDeadlock: classifiedError.isDeadlock,
        isSerializationFailure: classifiedError.isSerializationFailure,
      }),
      ...(classifiedError instanceof DatabaseConnectionError && {
        isTimeout: classifiedError.isTimeout(),
        isAuthFailure: classifiedError.isAuthenticationFailure(),
        isNetworkError: classifiedError.isNetworkError(),
      }),
    },
  };
}
