/**
 * ExecutionService Factory
 * 
 * This file provides the ExecutionService implementation using Drizzle ORM.
 */

import { ExecutionServiceDrizzle } from './ExecutionService.drizzle';
import { logger } from '../../utils/logger';

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
  executeWorkflow(workflowId: string, userId: string, triggerData?: any, options?: any, triggerNodeId?: string, workflowData?: any, executionId?: string): Promise<any>;
  executeSingleNode(userId: string, workflowId: string, nodeId: string, inputData?: any, parameters?: any, workflowData?: any): Promise<any>;
}

/**
 * Get the ExecutionService implementation (Drizzle ORM)
 */
function getExecutionService(): IExecutionService {
  logger.debug('Initializing Drizzle ExecutionService');
  return new ExecutionServiceDrizzle();
}

/**
 * Export the service instance - lazy initialize to avoid circular dependencies
 */
let serviceInstance: IExecutionService | null = null;

export function getExecutionServiceInstance(): IExecutionService {
  if (!serviceInstance) {
    serviceInstance = getExecutionService();
  }
  return serviceInstance;
}

export const executionServiceDrizzle = getExecutionServiceInstance();

// Re-export types from Drizzle implementation
export { ExecutionServiceDrizzle };
