/**
 * WorkflowEnvironmentService Factory
 * 
 * This file provides the WorkflowEnvironmentService implementation using Drizzle ORM.
 */

import { WorkflowEnvironmentServiceDrizzle } from './WorkflowEnvironmentService.drizzle';

/**
 * Factory function to get WorkflowEnvironmentService instance
 * Uses Drizzle ORM implementation
 */
export function getWorkflowEnvironmentService(): WorkflowEnvironmentServiceDrizzle {
  return new WorkflowEnvironmentServiceDrizzle();
}

export { WorkflowEnvironmentServiceDrizzle };

// Backward compatibility: export as WorkflowEnvironmentService
export { WorkflowEnvironmentServiceDrizzle as WorkflowEnvironmentService };
