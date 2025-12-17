import { WorkflowEnvironmentServiceDrizzle } from './WorkflowEnvironmentService.drizzle';

/**
 * Factory function to get WorkflowEnvironmentService instance
 * Uses Drizzle ORM implementation
 */
export function getWorkflowEnvironmentService(): WorkflowEnvironmentServiceDrizzle {
  return new WorkflowEnvironmentServiceDrizzle();
}

export { WorkflowEnvironmentServiceDrizzle };
