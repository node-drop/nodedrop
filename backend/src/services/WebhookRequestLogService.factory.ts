/**
 * WebhookRequestLogService Factory
 *
 * This file provides a factory function to switch between Prisma and Drizzle
 * implementations of the WebhookRequestLogService based on the USE_DRIZZLE_WEBHOOK_SERVICE
 * environment variable.
 *
 * This allows for gradual migration from Prisma to Drizzle without breaking
 * existing code.
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
 * Get the appropriate WebhookRequestLogService implementation based on environment variable
 */
function getWebhookRequestLogService(): IWebhookRequestLogService {
  const useDrizzle = process.env.USE_DRIZZLE_WEBHOOK_SERVICE === 'true';

  if (useDrizzle) {
    logger.info('Using Drizzle WebhookRequestLogService');
    return new WebhookRequestLogServiceDrizzle();
  }

  // Fallback to Drizzle as default
  logger.info('Using Drizzle WebhookRequestLogService (default)');
  return new WebhookRequestLogServiceDrizzle();
}

/**
 * Export the service instance
 */
export const webhookRequestLogService = getWebhookRequestLogService();

// Re-export types from Drizzle implementation
export { WebhookRequestLogServiceDrizzle };
