/**
 * VariableService Factory
 *
 * This file provides the VariableService implementation using Drizzle ORM.
 */

import { VariableServiceDrizzle } from './VariableService.drizzle';
import { logger } from '../utils/logger';

// Type definitions for the service interface
export interface IVariableService {
  createVariable(
    userId: string,
    key: string,
    value: string,
    description?: string,
    scope?: "GLOBAL" | "LOCAL",
    workflowId?: string,
    options?: any
  ): Promise<any>;
  getVariable(id: string, userId: string, options?: any): Promise<any>;
  getVariableByKey(key: string, userId: string): Promise<any>;
  getVariables(
    userId: string,
    search?: string,
    scope?: "GLOBAL" | "LOCAL",
    workflowId?: string,
    options?: any
  ): Promise<any[]>;
  updateVariable(
    id: string,
    userId: string,
    updates: any,
    options?: any
  ): Promise<any>;
  deleteVariable(id: string, userId: string, options?: any): Promise<void>;
  getVariableValue(key: string, userId: string): Promise<string | null>;
  getVariablesForExecution(
    userId: string,
    workflowId?: string,
    options?: any
  ): Promise<Record<string, string>>;
  bulkUpsertVariables(
    userId: string,
    variables: Array<{ key: string; value: string; description?: string }>,
    options?: any
  ): Promise<any[]>;
  replaceVariablesInText(
    text: string,
    userId: string,
    options?: any
  ): Promise<string>;
  getVariableStats(
    userId: string,
    options?: any
  ): Promise<{
    totalVariables: number;
    recentlyUpdated: number;
    keysWithDots: number;
  }>;
}

/**
 * Get the VariableService implementation (Drizzle ORM)
 */
function getVariableService(): IVariableService {
  logger.debug('Initializing Drizzle VariableService');
  return new VariableServiceDrizzle();
}

/**
 * Export the service instance
 */
export const variableServiceDrizzle = getVariableService();

// Re-export types from Drizzle implementation
export { VariableServiceDrizzle };
