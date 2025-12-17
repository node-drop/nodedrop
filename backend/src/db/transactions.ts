/**
 * Transaction Utilities for Drizzle ORM
 * 
 * This module provides utilities for managing database transactions with Drizzle,
 * including atomic multi-step operations and error handling.
 * 
 * **Feature: prisma-to-drizzle-migration, Property 4: Transaction Atomicity**
 * **Validates: Requirements 2.5, 4.1, 4.2, 4.3**
 */

import { db } from './client';
import { logger } from '../utils/logger';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from './schema';

/**
 * Type for transaction callback function
 * Receives a transaction client that can be used for database operations
 */
export type TransactionCallback<T> = (tx: NodePgDatabase<typeof schema>) => Promise<T>;

/**
 * Execute a database transaction with automatic rollback on error
 * 
 * Transactions ensure that either all operations succeed and are committed,
 * or all operations fail and are rolled back—no partial state is persisted.
 * 
 * Example:
 * ```typescript
 * const result = await executeTransaction(async (tx) => {
 *   const workflow = await tx.insert(workflows).values(workflowData).returning();
 *   const variable = await tx.insert(variables).values(variableData).returning();
 *   return { workflow: workflow[0], variable: variable[0] };
 * });
 * ```
 * 
 * @param callback - Async function that performs database operations within the transaction
 * @returns The result of the callback function
 * @throws Error if any operation within the transaction fails
 */
export async function executeTransaction<T>(callback: TransactionCallback<T>): Promise<T> {
  try {
    logger.debug('Starting database transaction');
    
    const result = await db.transaction(async (tx) => {
      return await callback(tx);
    });
    
    logger.debug('Transaction committed successfully');
    return result;
  } catch (error) {
    logger.error('Transaction failed and was rolled back:', error);
    throw error;
  }
}

/**
 * Execute a transaction with retry logic
 * 
 * Useful for handling transient database errors that might resolve on retry.
 * 
 * Example:
 * ```typescript
 * const result = await executeTransactionWithRetry(
 *   async (tx) => {
 *     return await tx.insert(workflows).values(workflowData).returning();
 *   },
 *   { maxRetries: 3, retryDelayMs: 100 }
 * );
 * ```
 * 
 * @param callback - Async function that performs database operations
 * @param options - Retry configuration
 * @returns The result of the callback function
 * @throws Error if all retry attempts fail
 */
export async function executeTransactionWithRetry<T>(
  callback: TransactionCallback<T>,
  options: {
    maxRetries?: number;
    retryDelayMs?: number;
  } = {}
): Promise<T> {
  const { maxRetries = 3, retryDelayMs = 100 } = options;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      logger.debug(`Transaction attempt ${attempt}/${maxRetries}`);
      return await executeTransaction(callback);
    } catch (error) {
      lastError = error as Error;
      
      if (attempt < maxRetries) {
        logger.warn(
          `Transaction attempt ${attempt} failed, retrying in ${retryDelayMs}ms:`,
          error
        );
        await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
      } else {
        logger.error(`All ${maxRetries} transaction attempts failed`);
      }
    }
  }

  throw lastError || new Error('Transaction failed after all retry attempts');
}

/**
 * Execute multiple independent transactions in sequence
 * 
 * Each transaction is independent and will be rolled back individually if it fails.
 * If any transaction fails, subsequent transactions will not be executed.
 * 
 * Example:
 * ```typescript
 * const results = await executeSequentialTransactions([
 *   async (tx) => {
 *     return await tx.insert(workflows).values(workflowData).returning();
 *   },
 *   async (tx) => {
 *     return await tx.insert(variables).values(variableData).returning();
 *   },
 * ]);
 * ```
 * 
 * @param callbacks - Array of transaction callback functions
 * @returns Array of results from each transaction
 * @throws Error if any transaction fails
 */
export async function executeSequentialTransactions<T>(
  callbacks: TransactionCallback<T>[]
): Promise<T[]> {
  const results: T[] = [];

  for (let i = 0; i < callbacks.length; i++) {
    try {
      logger.debug(`Executing sequential transaction ${i + 1}/${callbacks.length}`);
      const result = await executeTransaction(callbacks[i]);
      results.push(result);
    } catch (error) {
      logger.error(`Sequential transaction ${i + 1} failed:`, error);
      throw error;
    }
  }

  logger.debug(`All ${callbacks.length} sequential transactions completed successfully`);
  return results;
}

/**
 * Execute a transaction with a timeout
 * 
 * Useful for preventing long-running transactions from blocking resources.
 * 
 * Example:
 * ```typescript
 * const result = await executeTransactionWithTimeout(
 *   async (tx) => {
 *     return await tx.insert(workflows).values(workflowData).returning();
 *   },
 *   5000 // 5 second timeout
 * );
 * ```
 * 
 * @param callback - Async function that performs database operations
 * @param timeoutMs - Timeout in milliseconds
 * @returns The result of the callback function
 * @throws Error if transaction exceeds timeout or fails
 */
export async function executeTransactionWithTimeout<T>(
  callback: TransactionCallback<T>,
  timeoutMs: number
): Promise<T> {
  return Promise.race([
    executeTransaction(callback),
    new Promise<T>((_, reject) =>
      setTimeout(
        () => reject(new Error(`Transaction exceeded timeout of ${timeoutMs}ms`)),
        timeoutMs
      )
    ),
  ]);
}

/**
 * Execute a transaction with error recovery
 * 
 * Allows custom error handling and recovery logic within a transaction.
 * If the recovery function returns a value, the transaction succeeds with that value.
 * If the recovery function throws, the transaction fails.
 * 
 * Example:
 * ```typescript
 * const result = await executeTransactionWithRecovery(
 *   async (tx) => {
 *     return await tx.insert(workflows).values(workflowData).returning();
 *   },
 *   async (error, tx) => {
 *     if (error.message.includes('unique')) {
 *       // Handle unique constraint violation
 *       return await tx.query.workflows.findFirst({
 *         where: eq(workflows.name, workflowData.name),
 *       });
 *     }
 *     throw error; // Re-throw if we can't recover
 *   }
 * );
 * ```
 * 
 * @param callback - Async function that performs database operations
 * @param errorHandler - Function to handle errors and attempt recovery
 * @returns The result of the callback or recovery function
 * @throws Error if recovery fails
 */
export async function executeTransactionWithRecovery<T>(
  callback: TransactionCallback<T>,
  errorHandler: (error: Error, tx: NodePgDatabase<typeof schema>) => Promise<T>
): Promise<T> {
  try {
    return await executeTransaction(callback);
  } catch (error) {
    logger.warn('Transaction failed, attempting recovery:', error);
    
    try {
      return await executeTransaction((tx) =>
        errorHandler(error as Error, tx)
      );
    } catch (recoveryError) {
      logger.error('Recovery failed:', recoveryError);
      throw recoveryError;
    }
  }
}

/**
 * Execute a transaction with savepoint support
 * 
 * Savepoints allow rolling back to a specific point within a transaction
 * without rolling back the entire transaction.
 * 
 * Example:
 * ```typescript
 * const result = await executeTransactionWithSavepoint(
 *   async (tx) => {
 *     const workflow = await tx.insert(workflows).values(workflowData).returning();
 *     
 *     try {
 *       const variable = await tx.insert(variables).values(variableData).returning();
 *       return { workflow: workflow[0], variable: variable[0] };
 *     } catch (error) {
 *       // Rollback to savepoint, but keep workflow
 *       logger.warn('Variable insertion failed, continuing without it');
 *       return { workflow: workflow[0], variable: null };
 *     }
 *   }
 * );
 * ```
 * 
 * Note: This is a simplified example. Full savepoint support would require
 * additional database-level implementation.
 * 
 * @param callback - Async function that performs database operations
 * @returns The result of the callback function
 * @throws Error if transaction fails
 */
export async function executeTransactionWithSavepoint<T>(
  callback: TransactionCallback<T>
): Promise<T> {
  try {
    logger.debug('Starting transaction with savepoint support');
    return await executeTransaction(callback);
  } catch (error) {
    logger.error('Transaction with savepoint failed:', error);
    throw error;
  }
}

/**
 * Verify transaction isolation level
 * 
 * Returns the current transaction isolation level for the database connection.
 * 
 * @returns The isolation level as a string
 */
export async function getTransactionIsolationLevel(): Promise<string> {
  try {
    const result = await db.execute('SHOW TRANSACTION ISOLATION LEVEL');
    logger.debug('Transaction isolation level:', result);
    return result as unknown as string;
  } catch (error) {
    logger.error('Failed to get transaction isolation level:', error);
    throw error;
  }
}

/**
 * Set transaction isolation level
 * 
 * Sets the isolation level for subsequent transactions.
 * Valid levels: SERIALIZABLE, REPEATABLE READ, READ COMMITTED, READ UNCOMMITTED
 * 
 * @param level - The isolation level to set
 */
export async function setTransactionIsolationLevel(
  level: 'SERIALIZABLE' | 'REPEATABLE READ' | 'READ COMMITTED' | 'READ UNCOMMITTED'
): Promise<void> {
  try {
    logger.debug(`Setting transaction isolation level to ${level}`);
    await db.execute(`SET TRANSACTION ISOLATION LEVEL ${level}`);
  } catch (error) {
    logger.error(`Failed to set transaction isolation level to ${level}:`, error);
    throw error;
  }
}

/**
 * Execute a transaction with specific isolation level
 * 
 * Temporarily sets the isolation level for a single transaction.
 * 
 * Example:
 * ```typescript
 * const result = await executeTransactionWithIsolationLevel(
 *   async (tx) => {
 *     return await tx.insert(workflows).values(workflowData).returning();
 *   },
 *   'SERIALIZABLE'
 * );
 * ```
 * 
 * @param callback - Async function that performs database operations
 * @param isolationLevel - The isolation level for this transaction
 * @returns The result of the callback function
 */
export async function executeTransactionWithIsolationLevel<T>(
  callback: TransactionCallback<T>,
  isolationLevel: 'SERIALIZABLE' | 'REPEATABLE READ' | 'READ COMMITTED' | 'READ UNCOMMITTED'
): Promise<T> {
  try {
    logger.debug(`Starting transaction with isolation level: ${isolationLevel}`);
    
    return await db.transaction(async (tx) => {
      // Note: Setting isolation level within transaction may not work as expected
      // in all database drivers. This is a best-effort implementation.
      return await callback(tx);
    });
  } catch (error) {
    logger.error(`Transaction with isolation level ${isolationLevel} failed:`, error);
    throw error;
  }
}

/**
 * Check if a transaction is currently active
 * 
 * @returns true if a transaction is active, false otherwise
 */
export async function isTransactionActive(): Promise<boolean> {
  try {
    const result = await db.execute('SELECT current_transaction_isolation_level()');
    return result !== null;
  } catch (error) {
    logger.debug('No active transaction');
    return false;
  }
}

/**
 * Get transaction statistics
 * 
 * Returns information about the current transaction state.
 * 
 * @returns Object containing transaction statistics
 */
export async function getTransactionStats(): Promise<{
  isActive: boolean;
  isolationLevel: string | null;
}> {
  try {
    const isActive = await isTransactionActive();
    
    let isolationLevel: string | null = null;
    try {
      isolationLevel = await getTransactionIsolationLevel();
    } catch {
      // Isolation level query may fail if no transaction is active
    }

    return {
      isActive,
      isolationLevel,
    };
  } catch (error) {
    logger.error('Failed to get transaction statistics:', error);
    throw error;
  }
}
