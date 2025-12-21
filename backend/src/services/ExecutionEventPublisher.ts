/**
 * ExecutionEventPublisher - Redis Pub/Sub publisher for execution events
 *
 * Publishes execution progress events via Redis Pub/Sub channel.
 * Enables distributed workers to broadcast events that are received
 * by the API server and forwarded to WebSocket clients.
 *
 * Features:
 * - Node started/completed/failed events
 * - Execution completed/failed events
 * - Consistent event format with timestamps
 * - Redis Pub/Sub for cross-process communication
 *
 * @module services/ExecutionEventPublisher
 */

import { getRedisClient, RedisClient } from "../config/redis";
import { logger } from "../utils/logger";
import { ExecutionEventType } from "../types/execution.types";

/**
 * Redis Pub/Sub channel name for execution events
 */
export const EXECUTION_EVENTS_CHANNEL = "execution-events";

/**
 * Base execution event structure published to Redis
 */
export interface ExecutionEventMessage {
  /** Type of execution event */
  type: ExecutionEventType;
  /** Unique execution identifier */
  executionId: string;
  /** Node identifier (for node-specific events) */
  nodeId?: string;
  /** Node name (for display purposes) */
  nodeName?: string;
  /** Node type (e.g., 'http-request', 'transform') */
  nodeType?: string;
  /** Event data payload */
  data?: any;
  /** Error information (for failure events) */
  error?: any;
  /** Event timestamp */
  timestamp: string;
}

/**
 * ExecutionEventPublisher class for publishing execution events via Redis Pub/Sub
 *
 * @class ExecutionEventPublisher
 * @example
 * ```typescript
 * const publisher = ExecutionEventPublisher.getInstance();
 * await publisher.initialize();
 *
 * // Publish node started event
 * await publisher.publishNodeStarted('exec-123', 'node-1', 'HTTP Request', 'http-request');
 *
 * // Publish node completed event
 * await publisher.publishNodeCompleted('exec-123', 'node-1', { result: 'data' }, 150, []);
 * ```
 */
export class ExecutionEventPublisher {
  private static instance: ExecutionEventPublisher;
  private redisClient: RedisClient | null = null;
  private initialized: boolean = false;

  private constructor() {
    // Private constructor for singleton pattern
  }

  /**
   * Get the singleton instance of ExecutionEventPublisher
   *
   * @returns {ExecutionEventPublisher} The singleton instance
   */
  static getInstance(): ExecutionEventPublisher {
    if (!ExecutionEventPublisher.instance) {
      ExecutionEventPublisher.instance = new ExecutionEventPublisher();
    }
    return ExecutionEventPublisher.instance;
  }

  /**
   * Initialize Redis connection for publishing
   *
   * @returns {Promise<void>}
   * @throws {Error} If Redis connection fails
   */
  async initialize(): Promise<void> {
    if (this.initialized && this.redisClient?.isOpen) {
      return;
    }

    try {
      this.redisClient = await getRedisClient();
      this.initialized = true;
      logger.info("[ExecutionEventPublisher] Redis connection initialized");
    } catch (error) {
      logger.error("[ExecutionEventPublisher] Failed to initialize Redis", {
        error,
      });
      throw error;
    }
  }

  /**
   * Ensure Redis connection is available
   *
   * @private
   * @returns {Promise<RedisClient>}
   * @throws {Error} If Redis is not available
   */
  private async ensureRedis(): Promise<RedisClient> {
    if (!this.initialized || !this.redisClient?.isOpen) {
      await this.initialize();
    }

    if (!this.redisClient) {
      throw new Error("Redis client not available");
    }

    return this.redisClient;
  }

  /**
   * Publish an event to the execution events channel
   *
   * @private
   * @param {ExecutionEventMessage} event - The event to publish
   * @returns {Promise<void>}
   */
  private async publishEvent(event: ExecutionEventMessage): Promise<void> {
    const redis = await this.ensureRedis();

    const message = JSON.stringify(event);
    await redis.publish(EXECUTION_EVENTS_CHANNEL, message);

    logger.debug(`[ExecutionEventPublisher] Published event`, {
      type: event.type,
      executionId: event.executionId,
      nodeId: event.nodeId,
    });
  }

  /**
   * Publish node started event
   *
   * @param {string} executionId - Unique execution identifier
   * @param {string} nodeId - The node identifier
   * @param {string} nodeName - The node display name
   * @param {string} nodeType - The node type
   * @returns {Promise<void>}
   */
  async publishNodeStarted(
    executionId: string,
    nodeId: string,
    nodeName: string,
    nodeType: string
  ): Promise<void> {
    const event: ExecutionEventMessage = {
      type: "node-started",
      executionId,
      nodeId,
      nodeName,
      nodeType,
      timestamp: new Date().toISOString(),
    };

    await this.publishEvent(event);

    logger.info(`[ExecutionEventPublisher] Node started`, {
      executionId,
      nodeId,
      nodeName,
      nodeType,
    });
  }

  /**
   * Publish node completed event
   *
   * @param {string} executionId - Unique execution identifier
   * @param {string} nodeId - The node identifier
   * @param {any} outputData - The node output data
   * @param {number} duration - Execution duration in milliseconds
   * @param {any[]} activeConnections - Active output connections
   * @returns {Promise<void>}
   */
  async publishNodeCompleted(
    executionId: string,
    nodeId: string,
    outputData: any,
    duration: number,
    activeConnections: any[]
  ): Promise<void> {
    const event: ExecutionEventMessage = {
      type: "node-completed",
      executionId,
      nodeId,
      data: {
        outputData,
        duration,
        activeConnections,
      },
      timestamp: new Date().toISOString(),
    };

    await this.publishEvent(event);

    logger.info(`[ExecutionEventPublisher] Node completed`, {
      executionId,
      nodeId,
      duration,
    });
  }

  /**
   * Publish node failed event
   *
   * @param {string} executionId - Unique execution identifier
   * @param {string} nodeId - The node identifier
   * @param {any} error - The error information
   * @returns {Promise<void>}
   */
  async publishNodeFailed(
    executionId: string,
    nodeId: string,
    error: any
  ): Promise<void> {
    const event: ExecutionEventMessage = {
      type: "node-failed",
      executionId,
      nodeId,
      error: {
        message: error?.message || String(error),
        stack: error?.stack,
        code: error?.code,
      },
      timestamp: new Date().toISOString(),
    };

    await this.publishEvent(event);

    logger.info(`[ExecutionEventPublisher] Node failed`, {
      executionId,
      nodeId,
      error: error?.message,
    });
  }

  /**
   * Publish execution completed event
   *
   * @param {string} executionId - Unique execution identifier
   * @param {number} duration - Total execution duration in milliseconds
   * @returns {Promise<void>}
   */
  async publishExecutionCompleted(
    executionId: string,
    duration: number
  ): Promise<void> {
    const event: ExecutionEventMessage = {
      type: "completed",
      executionId,
      data: {
        duration,
      },
      timestamp: new Date().toISOString(),
    };

    await this.publishEvent(event);

    logger.info(`[ExecutionEventPublisher] Execution completed`, {
      executionId,
      duration,
    });
  }

  /**
   * Publish execution failed event
   *
   * @param {string} executionId - Unique execution identifier
   * @param {any} error - The error information
   * @returns {Promise<void>}
   */
  async publishExecutionFailed(
    executionId: string,
    error: any
  ): Promise<void> {
    const event: ExecutionEventMessage = {
      type: "failed",
      executionId,
      error: {
        message: error?.message || String(error),
        stack: error?.stack,
        code: error?.code,
        nodeId: error?.nodeId,
      },
      timestamp: new Date().toISOString(),
    };

    await this.publishEvent(event);

    logger.info(`[ExecutionEventPublisher] Execution failed`, {
      executionId,
      error: error?.message,
    });
  }

  /**
   * Check if the publisher is initialized and connected
   *
   * @returns {boolean} True if connected
   */
  isConnected(): boolean {
    return this.initialized && this.redisClient?.isOpen === true;
  }
}

// Export singleton instance getter
export const getExecutionEventPublisher = (): ExecutionEventPublisher => {
  return ExecutionEventPublisher.getInstance();
};
