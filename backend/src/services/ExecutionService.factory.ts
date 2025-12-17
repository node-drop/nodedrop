/**
 * ExecutionService Factory
 * 
 * This file provides a factory function to switch between Prisma and Drizzle
 * implementations of the ExecutionService based on the USE_DRIZZLE_EXECUTION_SERVICE
 * environment variable.
 * 
 * This allows for gradual migration from Prisma to Drizzle without breaking
 * existing code.
 */

import { ExecutionServiceDrizzle } from './ExecutionService.drizzle';
import { logger } from '../utils/logger';

// Type definitions for the service interface
export interface IExecutionService {
  getExecution(executionId: string, userId: string, options?: any): Promise<any>;
  listExecutions(userId: string, filters?: any, options?: any): Promise<any>;
  createExecution(workflowId: string, userId: string, status: string, triggerData?: any, workflowSnapshot?: any, workspaceId?: string | null): Promise<any>;
  updateExecutionStatus(executionId: string, status: string, finishedAt?: Date, error?: any): Promise<any>;
  deleteExecution(executionId: string): Promise<void>;
  createNodeExecution(executionId: string, nodeId: string, status: string, inputData?: any, outputData?: any, error?: any): Promise<any>;
  updateNodeExecution(nodeExecutionId: string, status: string, outputData?: any, error?: any, finishedAt?: Date): Promise<any>;
  getNodeExecution(executionId: string, nodeId: string, userId: string): Promise<any>;
  getExecutionStats(userId?: string, options?: any): Promise<any>;
  createExecutionHistory(executionId: string, workflowId: string, triggerType: string, status: string, executedNodes: string[], metrics?: any, error?: any, duration?: number): Promise<void>;
}

/**
 * Get the appropriate ExecutionService implementation based on environment variable
 */
function getExecutionService(): IExecutionService {
  const useDrizzle = process.env.USE_DRIZZLE_EXECUTION_SERVICE === 'true';

  if (useDrizzle) {
    logger.info('Using Drizzle ExecutionService');
    return new ExecutionServiceDrizzle();
  }

  // Fallback to Prisma implementation (not yet implemented)
  // For now, we'll use Drizzle as the default
  logger.info('Using Drizzle ExecutionService (default)');
  return new ExecutionServiceDrizzle();
}

/**
 * Export the service instance
 */
export const executionServiceDrizzle = getExecutionService();

// Re-export types from Drizzle implementation
export { ExecutionServiceDrizzle };
