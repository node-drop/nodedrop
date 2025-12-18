/**
 * WebhookRequestLogService Factory
 *
 * This file provides the WebhookRequestLogService implementation using Drizzle ORM.
 */

import { WebhookRequestLogServiceDrizzle } from './WebhookRequestLogService.drizzle';
import { logger } from '../utils/logger';

// Type definitions for the service interface
export interface IWebhookRequestLogService {
  logRequest(data: any): Promise<void>;
  getLogsForWebhook(
    webhookId: string,
    userId: string,
    options?: any
  ): Promise<any>;
  getAllLogsForUser(userId: string, options?: any): Promise<any>;
  getLogsForWorkflow(
    workflowId: string,
    userId: string,
    options?: any
  ): Promise<any>;
  getLog(logId: string, userId: string): Promise<any>;
  getWebhookStats(webhookId: string, userId: string): Promise<any>;
  deleteLogsForWebhook(webhookId: string, userId: string): Promise<void>;
}

/**
 * Get the WebhookRequestLogService implementation (Drizzle ORM)
 */
function getWebhookRequestLogService(): IWebhookRequestLogService {
  logger.debug('Initializing Drizzle WebhookRequestLogService');
  return new WebhookRequestLogServiceDrizzle();
}

/**
 * Export the service instance
 */
export const webhookRequestLogService = getWebhookRequestLogService();

// Re-export types from Drizzle implementation
export { WebhookRequestLogServiceDrizzle };

// Backward compatibility: export as WebhookRequestLogService
export { WebhookRequestLogServiceDrizzle as WebhookRequestLogService };
