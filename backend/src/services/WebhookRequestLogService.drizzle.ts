import { eq, and, gte, lte, desc, sql } from 'drizzle-orm';
import { db } from '../db/client';
import { webhookRequestLogs } from '../db/schema/webhooks';
import { logger } from '../utils/logger';

export interface WebhookRequestLogData {
  type?: 'webhook' | 'form' | 'chat'; // Type of request (defaults to 'webhook')
  webhookId: string; // Generic ID (webhook ID, form ID, or chat ID)
  workflowId: string;
  userId: string;
  method: string;
  path: string;
  headers: Record<string, string>;
  body?: any;
  query?: Record<string, any>;
  ip: string;
  userAgent?: string;
  status: 'success' | 'rejected' | 'failed';
  reason?: string;
  executionId?: string;
  responseCode: number;
  responseTime: number;
  testMode?: boolean;
  workspaceId?: string;
}

export class WebhookRequestLogServiceDrizzle {
  private maxBodySize = 10000; // 10KB max body size
  private maxLogsPerWebhook = 100;
  private retentionDays = 7;

  constructor() {}

  /**
   * Log a request (webhook, form, or chat)
   */
  async logRequest(data: WebhookRequestLogData): Promise<void> {
    try {
      // Sanitize headers (remove sensitive data)
      const sanitizedHeaders = this.sanitizeHeaders(data.headers);

      // Truncate body if too large
      const truncatedBody = this.truncateBody(data.body);

      // Create log entry
      await db.insert(webhookRequestLogs).values({
        type: data.type || 'webhook', // Default to 'webhook' for backward compatibility
        webhookId: data.webhookId,
        workflowId: data.workflowId,
        userId: data.userId,
        method: data.method,
        path: data.path,
        headers: sanitizedHeaders,
        body: truncatedBody,
        query: data.query,
        ip: data.ip,
        userAgent: data.userAgent,
        status: data.status,
        reason: data.reason,
        executionId: data.executionId,
        responseCode: data.responseCode,
        responseTime: data.responseTime,
        testMode: data.testMode || false,
        workspaceId: data.workspaceId,
      });

      // Cleanup old logs (async, don't wait)
      this.cleanupOldLogs(data.webhookId).catch((err) => {
        logger.error('Error cleaning up old webhook logs:', err);
      });
    } catch (error) {
      // Don't fail the webhook if logging fails
      logger.error('Error logging webhook request:', error);
    }
  }

  /**
   * Get logs for a specific ID (webhook, form, or chat)
   */
  async getLogsForWebhook(
    webhookId: string,
    userId: string,
    options?: {
      limit?: number;
      offset?: number;
      status?: string;
      startDate?: Date;
      endDate?: Date;
      type?: 'webhook' | 'form' | 'chat'; // Filter by type
    }
  ) {
    const limit = options?.limit || 50;
    const offset = options?.offset || 0;

    const whereConditions = [
      eq(webhookRequestLogs.webhookId, webhookId),
      eq(webhookRequestLogs.userId, userId), // Ensure user can only see their own logs
    ];

    if (options?.type) {
      whereConditions.push(eq(webhookRequestLogs.type, options.type));
    }

    if (options?.status) {
      whereConditions.push(eq(webhookRequestLogs.status, options.status));
    }

    if (options?.startDate || options?.endDate) {
      if (options.startDate) {
        whereConditions.push(gte(webhookRequestLogs.timestamp, options.startDate));
      }
      if (options.endDate) {
        whereConditions.push(lte(webhookRequestLogs.timestamp, options.endDate));
      }
    }

    const [logs, countResult] = await Promise.all([
      db
        .select()
        .from(webhookRequestLogs)
        .where(and(...whereConditions))
        .orderBy(desc(webhookRequestLogs.timestamp))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)` })
        .from(webhookRequestLogs)
        .where(and(...whereConditions)),
    ]);

    const total = countResult[0]?.count || 0;

    return { logs, total };
  }

  /**
   * Get all logs for a user
   */
  async getAllLogsForUser(
    userId: string,
    options?: {
      limit?: number;
      offset?: number;
      status?: string;
      startDate?: Date;
      endDate?: Date;
      type?: 'webhook' | 'form' | 'chat'; // Filter by type
    }
  ) {
    const limit = options?.limit || 50;
    const offset = options?.offset || 0;

    const whereConditions = [eq(webhookRequestLogs.userId, userId)];

    if (options?.type) {
      whereConditions.push(eq(webhookRequestLogs.type, options.type));
    }

    if (options?.status) {
      whereConditions.push(eq(webhookRequestLogs.status, options.status));
    }

    if (options?.startDate || options?.endDate) {
      if (options.startDate) {
        whereConditions.push(gte(webhookRequestLogs.timestamp, options.startDate));
      }
      if (options.endDate) {
        whereConditions.push(lte(webhookRequestLogs.timestamp, options.endDate));
      }
    }

    const [logs, countResult] = await Promise.all([
      db
        .select()
        .from(webhookRequestLogs)
        .where(and(...whereConditions))
        .orderBy(desc(webhookRequestLogs.timestamp))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)` })
        .from(webhookRequestLogs)
        .where(and(...whereConditions)),
    ]);

    const total = countResult[0]?.count || 0;

    return { logs, total };
  }

  /**
   * Get logs for a workflow
   */
  async getLogsForWorkflow(
    workflowId: string,
    userId: string,
    options?: {
      limit?: number;
      offset?: number;
    }
  ) {
    const limit = options?.limit || 50;
    const offset = options?.offset || 0;

    const whereConditions = [
      eq(webhookRequestLogs.workflowId, workflowId),
      eq(webhookRequestLogs.userId, userId),
    ];

    const [logs, countResult] = await Promise.all([
      db
        .select()
        .from(webhookRequestLogs)
        .where(and(...whereConditions))
        .orderBy(desc(webhookRequestLogs.timestamp))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)` })
        .from(webhookRequestLogs)
        .where(and(...whereConditions)),
    ]);

    const total = countResult[0]?.count || 0;

    return { logs, total };
  }

  /**
   * Get a single log entry
   */
  async getLog(logId: string, userId: string) {
    const log = await db
      .select()
      .from(webhookRequestLogs)
      .where(
        and(
          eq(webhookRequestLogs.id, logId),
          eq(webhookRequestLogs.userId, userId) // Ensure user can only see their own logs
        )
      )
      .limit(1);

    return log[0] || null;
  }

  /**
   * Get statistics for a webhook
   */
  async getWebhookStats(webhookId: string, userId: string) {
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const baseConditions = [
      eq(webhookRequestLogs.webhookId, webhookId),
      eq(webhookRequestLogs.userId, userId),
    ];

    const [totalResult, last24hResult, successResult, rejectedResult, failedResult] =
      await Promise.all([
        db
          .select({ count: sql<number>`count(*)` })
          .from(webhookRequestLogs)
          .where(and(...baseConditions)),
        db
          .select({ count: sql<number>`count(*)` })
          .from(webhookRequestLogs)
          .where(
            and(...baseConditions, gte(webhookRequestLogs.timestamp, last24h))
          ),
        db
          .select({ count: sql<number>`count(*)` })
          .from(webhookRequestLogs)
          .where(
            and(...baseConditions, eq(webhookRequestLogs.status, 'success'))
          ),
        db
          .select({ count: sql<number>`count(*)` })
          .from(webhookRequestLogs)
          .where(
            and(...baseConditions, eq(webhookRequestLogs.status, 'rejected'))
          ),
        db
          .select({ count: sql<number>`count(*)` })
          .from(webhookRequestLogs)
          .where(
            and(...baseConditions, eq(webhookRequestLogs.status, 'failed'))
          ),
      ]);

    const total = totalResult[0]?.count || 0;
    const last24hCount = last24hResult[0]?.count || 0;
    const successCount = successResult[0]?.count || 0;
    const rejectedCount = rejectedResult[0]?.count || 0;
    const failedCount = failedResult[0]?.count || 0;

    return {
      total,
      last24h: last24hCount,
      success: successCount,
      rejected: rejectedCount,
      failed: failedCount,
      successRate: total > 0 ? (successCount / total) * 100 : 0,
    };
  }

  /**
   * Delete logs for a webhook
   */
  async deleteLogsForWebhook(webhookId: string, userId: string) {
    await db
      .delete(webhookRequestLogs)
      .where(
        and(
          eq(webhookRequestLogs.webhookId, webhookId),
          eq(webhookRequestLogs.userId, userId)
        )
      );
  }

  /**
   * Cleanup old logs (keep only last N per webhook)
   */
  private async cleanupOldLogs(webhookId: string) {
    // Get count of logs for this webhook
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(webhookRequestLogs)
      .where(eq(webhookRequestLogs.webhookId, webhookId));

    const count = countResult[0]?.count || 0;

    if (count > this.maxLogsPerWebhook) {
      // Get IDs of logs to delete (keep newest N)
      const logsToDelete = await db
        .select({ id: webhookRequestLogs.id })
        .from(webhookRequestLogs)
        .where(eq(webhookRequestLogs.webhookId, webhookId))
        .orderBy(desc(webhookRequestLogs.timestamp))
        .limit(count - this.maxLogsPerWebhook)
        .offset(this.maxLogsPerWebhook);

      if (logsToDelete.length > 0) {
        const idsToDelete = logsToDelete.map((l) => l.id);
        await db
          .delete(webhookRequestLogs)
          .where(sql`${webhookRequestLogs.id} = ANY(${idsToDelete})`);

        logger.info(
          `Cleaned up ${logsToDelete.length} old webhook logs for ${webhookId}`
        );
      }
    }

    // Also delete logs older than retention period
    const cutoffDate = new Date(
      Date.now() - this.retentionDays * 24 * 60 * 60 * 1000
    );
    await db
      .delete(webhookRequestLogs)
      .where(
        and(
          eq(webhookRequestLogs.webhookId, webhookId),
          lte(webhookRequestLogs.timestamp, cutoffDate)
        )
      );
  }

  /**
   * Sanitize headers (remove sensitive data)
   */
  private sanitizeHeaders(headers: Record<string, string>): Record<string, string> {
    const sanitized = { ...headers };

    // Remove or mask sensitive headers
    const sensitiveHeaders = [
      'authorization',
      'cookie',
      'x-api-key',
      'x-auth-token',
    ];

    for (const key of Object.keys(sanitized)) {
      if (sensitiveHeaders.includes(key.toLowerCase())) {
        sanitized[key] = '[REDACTED]';
      }
    }

    return sanitized;
  }

  /**
   * Truncate body if too large
   */
  private truncateBody(body: any): any {
    if (!body) return null;

    const bodyStr = JSON.stringify(body);
    if (bodyStr.length > this.maxBodySize) {
      return {
        _truncated: true,
        _originalSize: bodyStr.length,
        _preview: bodyStr.substring(0, this.maxBodySize),
      };
    }

    return body;
  }
}
