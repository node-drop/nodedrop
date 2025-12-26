/**
 * ExecutionEventSubscriber - Redis Pub/Sub subscriber for execution events
 *
 * Subscribes to execution events published by workers via Redis Pub/Sub.
 * Parses and validates incoming events, then forwards them to registered handlers.
 * Designed to integrate with SocketService for WebSocket broadcasting.
 *
 * Features:
 * - Subscribe to execution events channel
 * - Parse and validate incoming events
 * - Event handler registration
 * - Automatic reconnection handling
 *
 * @module services/ExecutionEventSubscriber
 */

import { createClient } from "redis";
import { logger } from "../../utils/logger";
import {
  EXECUTION_EVENTS_CHANNEL,
  ExecutionEventMessage,
} from "./ExecutionEventPublisher";

/**
 * Type for Redis subscriber client
 */
type RedisSubscriberClient = ReturnType<typeof createClient>;

/**
 * Event handler function type
 */
export type ExecutionEventHandler = (event: ExecutionEventMessage) => void;

/**
 * ExecutionEventSubscriber class for receiving execution events via Redis Pub/Sub
 *
 * @class ExecutionEventSubscriber
 * @example
 * ```typescript
 * const subscriber = ExecutionEventSubscriber.getInstance();
 *
 * // Register event handler
 * subscriber.onEvent((event) => {
 *   console.log('Received event:', event.type, event.executionId);
 *   socketService.broadcastExecutionEvent(event.executionId, event);
 * });
 *
 * // Start subscribing
 * await subscriber.start();
 * ```
 */
export class ExecutionEventSubscriber {
  private static instance: ExecutionEventSubscriber;
  private redisClient: RedisSubscriberClient | null = null;
  private eventHandlers: ExecutionEventHandler[] = [];
  private isRunning: boolean = false;

  private constructor() {
    // Private constructor for singleton pattern
  }

  /**
   * Get the singleton instance of ExecutionEventSubscriber
   *
   * @returns {ExecutionEventSubscriber} The singleton instance
   */
  static getInstance(): ExecutionEventSubscriber {
    if (!ExecutionEventSubscriber.instance) {
      ExecutionEventSubscriber.instance = new ExecutionEventSubscriber();
    }
    return ExecutionEventSubscriber.instance;
  }

  /**
   * Start subscribing to execution events
   *
   * @returns {Promise<void>}
   * @throws {Error} If Redis connection fails
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn("[ExecutionEventSubscriber] Already running");
      return;
    }

    try {
      const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

      // Create a dedicated client for subscribing (required by Redis)
      this.redisClient = createClient({
        url: redisUrl,
        socket: {
          reconnectStrategy: (retries) => {
            if (retries > 10) {
              logger.error(
                "[ExecutionEventSubscriber] Max reconnection attempts reached"
              );
              return new Error("Max reconnection attempts reached");
            }
            return Math.min(retries * 50, 3000);
          },
        },
      });

      this.redisClient.on("error", (err) => {
        logger.error("[ExecutionEventSubscriber] Redis Client Error:", err);
      });

      this.redisClient.on("reconnecting", () => {
        logger.info("[ExecutionEventSubscriber] Redis reconnecting...");
      });

      await this.redisClient.connect();

      // Subscribe to the execution events channel
      await this.redisClient.subscribe(
        EXECUTION_EVENTS_CHANNEL,
        (message, channel) => {
          this.handleMessage(message, channel);
        }
      );

      this.isRunning = true;
      logger.info(
        `[ExecutionEventSubscriber] Subscribed to channel: ${EXECUTION_EVENTS_CHANNEL}`
      );
    } catch (error) {
      logger.error("[ExecutionEventSubscriber] Failed to start", { error });
      throw error;
    }
  }

  /**
   * Stop subscribing to events
   *
   * @returns {Promise<void>}
   */
  async stop(): Promise<void> {
    if (!this.isRunning || !this.redisClient) {
      return;
    }

    try {
      await this.redisClient.unsubscribe(EXECUTION_EVENTS_CHANNEL);
      await this.redisClient.quit();
      this.redisClient = null;
      this.isRunning = false;
      logger.info("[ExecutionEventSubscriber] Stopped");
    } catch (error) {
      logger.error("[ExecutionEventSubscriber] Error stopping", { error });
      throw error;
    }
  }

  /**
   * Register an event handler
   *
   * @param {ExecutionEventHandler} handler - The handler function to register
   */
  onEvent(handler: ExecutionEventHandler): void {
    this.eventHandlers.push(handler);
    logger.debug(
      `[ExecutionEventSubscriber] Registered event handler, total: ${this.eventHandlers.length}`
    );
  }

  /**
   * Remove an event handler
   *
   * @param {ExecutionEventHandler} handler - The handler function to remove
   */
  offEvent(handler: ExecutionEventHandler): void {
    const index = this.eventHandlers.indexOf(handler);
    if (index > -1) {
      this.eventHandlers.splice(index, 1);
      logger.debug(
        `[ExecutionEventSubscriber] Removed event handler, total: ${this.eventHandlers.length}`
      );
    }
  }

  /**
   * Handle incoming message from Redis Pub/Sub
   *
   * @private
   * @param {string} message - The raw message string
   * @param {string} channel - The channel name
   */
  private handleMessage(message: string, channel: string): void {
    if (channel !== EXECUTION_EVENTS_CHANNEL) {
      return;
    }

    try {
      const event = this.parseAndValidateEvent(message);

      if (event) {
        // Notify all registered handlers
        for (const handler of this.eventHandlers) {
          try {
            handler(event);
          } catch (handlerError) {
            logger.error(
              "[ExecutionEventSubscriber] Event handler error",
              { handlerError, event }
            );
          }
        }
      }
    } catch (error) {
      logger.error("[ExecutionEventSubscriber] Failed to process message", {
        error,
        message,
      });
    }
  }

  /**
   * Parse and validate an incoming event message
   *
   * @private
   * @param {string} message - The raw message string
   * @returns {ExecutionEventMessage | null} The parsed event or null if invalid
   */
  private parseAndValidateEvent(message: string): ExecutionEventMessage | null {
    try {
      const parsed = JSON.parse(message);

      // Validate required fields
      if (!parsed.type || typeof parsed.type !== "string") {
        logger.warn("[ExecutionEventSubscriber] Event missing type field");
        return null;
      }

      if (!parsed.executionId || typeof parsed.executionId !== "string") {
        logger.warn(
          "[ExecutionEventSubscriber] Event missing executionId field"
        );
        return null;
      }

      if (!parsed.timestamp || typeof parsed.timestamp !== "string") {
        logger.warn("[ExecutionEventSubscriber] Event missing timestamp field");
        return null;
      }

      // Validate event type
      const validTypes = [
        "started",
        "node-started",
        "node-completed",
        "node-failed",
        "completed",
        "failed",
        "cancelled",
        "node-status-update",
        "execution-progress",
      ];

      if (!validTypes.includes(parsed.type)) {
        logger.warn(
          `[ExecutionEventSubscriber] Invalid event type: ${parsed.type}`
        );
        return null;
      }

      // For node-specific events, validate nodeId
      const nodeEvents = ["node-started", "node-completed", "node-failed"];
      if (nodeEvents.includes(parsed.type) && !parsed.nodeId) {
        logger.warn(
          `[ExecutionEventSubscriber] Node event missing nodeId: ${parsed.type}`
        );
        return null;
      }

      return parsed as ExecutionEventMessage;
    } catch (error) {
      logger.error("[ExecutionEventSubscriber] Failed to parse event", {
        error,
        message,
      });
      return null;
    }
  }

  /**
   * Check if the subscriber is running
   *
   * @returns {boolean} True if running
   */
  isSubscribed(): boolean {
    return this.isRunning;
  }
}

// Export singleton instance getter
export const getExecutionEventSubscriber = (): ExecutionEventSubscriber => {
  return ExecutionEventSubscriber.getInstance();
};
