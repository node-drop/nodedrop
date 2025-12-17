/**
 * TriggerService Factory
 *
 * This file provides a factory function to switch between Prisma and Drizzle
 * implementations of the TriggerService based on the USE_DRIZZLE_TRIGGER_SERVICE
 * environment variable.
 *
 * This allows for gradual migration from Prisma to Drizzle without breaking
 * existing code.
 */

import { TriggerServiceDrizzle } from './TriggerService.drizzle';
import { logger } from '../utils/logger';

// Type definitions for the service interface
export interface ITriggerService {
  upsertTriggerJob(
    workflowId: string,
    triggerId: string,
    data: any,
    options?: any
  ): Promise<any>;
  getTriggerJobById(id: string, options?: any): Promise<any>;
  getTriggerJobByWorkflowAndTriggerId(
    workflowId: string,
    triggerId: string,
    options?: any
  ): Promise<any>;
  getActiveTriggerJobs(options?: any): Promise<any[]>;
  getTriggerJobsByWorkflow(workflowId: string, options?: any): Promise<any[]>;
  getScheduleTriggerJobs(options?: any): Promise<any[]>;
  getPollingTriggerJobs(options?: any): Promise<any[]>;
  updateTriggerJobStatus(id: string, active: boolean, options?: any): Promise<any>;
  updateTriggerJobExecution(id: string, data: any, options?: any): Promise<any>;
  deleteTriggerJob(id: string, options?: any): Promise<void>;
  deleteTriggerJobsByWorkflow(workflowId: string, options?: any): Promise<number>;
  deleteTriggerJobByWorkflowAndTriggerId(
    workflowId: string,
    triggerId: string,
    options?: any
  ): Promise<void>;
  getTriggerJobStats(options?: any): Promise<any>;
  getFailedTriggerJobs(options?: any): Promise<any[]>;
  resetFailureCount(id: string, options?: any): Promise<any>;
}

/**
 * Get the appropriate TriggerService implementation based on environment variable
 */
function getTriggerService(): ITriggerService {
  const useDrizzle = process.env.USE_DRIZZLE_TRIGGER_SERVICE === 'true';

  if (useDrizzle) {
    logger.info('Using Drizzle TriggerService');
    return new TriggerServiceDrizzle();
  }

  // Fallback to Drizzle as default
  logger.info('Using Drizzle TriggerService (default)');
  return new TriggerServiceDrizzle();
}

/**
 * Export the service instance
 */
export const triggerServiceDrizzle = getTriggerService();

// Re-export types from Drizzle implementation
export { TriggerServiceDrizzle };
