/**
 * WorkflowService Factory
 * 
 * This file provides the WorkflowService implementation using Drizzle ORM.
 */

import { WorkflowServiceDrizzle } from './WorkflowService.drizzle';
import { logger } from '../utils/logger';
import { AppError } from "../middleware/errorHandler";
import {
  CreateWorkflowRequest,
  UpdateWorkflowRequest,
  WorkflowQueryRequest,
} from "../types/api";
import {
  getTriggerService,
  isTriggerServiceInitialized,
} from "./triggerServiceSingleton";
import { validateWorkflow } from "../utils/workflowValidator";
import { prepareTriggersForSave } from "../utils/triggerUtils";

interface WorkflowFilters {
  search?: string;
  tags?: string[];
  createdAfter?: Date;
  createdBefore?: Date;
}

/**
 * Options for workspace-scoped queries
 */
interface WorkspaceQueryOptions {
  workspaceId?: string;
}

// Type definitions for the service interface
export interface IWorkflowService {
  createWorkflow(userId: string, data: CreateWorkflowRequest, options?: WorkspaceQueryOptions): Promise<any>;
  getWorkflow(id: string, userId?: string, options?: WorkspaceQueryOptions): Promise<any>;
  updateWorkflow(id: string, userId: string, data: UpdateWorkflowRequest): Promise<any>;
  deleteWorkflow(id: string, userId: string): Promise<any>;
  listWorkflows(userId: string, query: WorkflowQueryRequest, options?: WorkspaceQueryOptions): Promise<any>;
  searchWorkflows(userId: string, filters: any, options?: WorkspaceQueryOptions): Promise<any>;
  duplicateWorkflow(id: string, userId: string, newName?: string, options?: WorkspaceQueryOptions): Promise<any>;
  getWorkflowStats(userId: string, options?: WorkspaceQueryOptions): Promise<any>;
  bulkUpdateWorkflows(userId: string, workflowIds: string[], updates: Partial<UpdateWorkflowRequest>): Promise<any>;
  bulkDeleteWorkflows(userId: string, workflowIds: string[]): Promise<any>;
  getUpcomingExecutions(workflow: any, limit?: number): Promise<any>;
}

/**
 * Get the WorkflowService implementation (Drizzle ORM)
 */
function getWorkflowService(): IWorkflowService {
  logger.debug('Initializing Drizzle WorkflowService');
  return new WorkflowServiceDrizzle();
}

/**
 * Export the service instance
 */
export const workflowService = getWorkflowService();

// Re-export types from Drizzle implementation
export type {
  WorkflowData,
  WorkflowListItem,
  WorkflowSearchResult,
  WorkflowStats,
} from './WorkflowService.drizzle';

export { WorkflowServiceDrizzle };

// Backward compatibility: export WorkflowService as an alias for WorkflowServiceDrizzle
export { WorkflowServiceDrizzle as WorkflowService };
