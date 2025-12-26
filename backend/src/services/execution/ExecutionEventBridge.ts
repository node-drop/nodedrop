/**
 * ExecutionEventBridge - Connects ExecutionEventSubscriber to SocketService
 *
 * This module bridges the gap between Redis Pub/Sub events from workers
 * and WebSocket broadcasts to frontend clients. It subscribes to execution
 * events and forwards them to the SocketService for broadcasting.
 *
 * Features:
 * - Automatic event forwarding from Redis to WebSocket
 * - Event format transformation to match existing WebSocket format
 * - Graceful startup and shutdown
 *
 * @module services/ExecutionEventBridge
 */

import { logger } from "../../utils/logger";
import { SocketService } from "../SocketService";
import {
  ExecutionEventSubscriber,
  getExecutionEventSubscriber,
} from "./ExecutionEventSubscriber";
import { ExecutionEventMessage } from "./ExecutionEventPublisher";
import { ExecutionEventData } from "../../types/execution.types";

/**
 * ExecutionEventBridge class for connecting Redis events to WebSocket broadcasts
 *
 * @class ExecutionEventBridge
 * @example
 * ```typescript
 * const bridge = new ExecutionEventBridge(socketService);
 * await bridge.start();
 *
 * // Later, during shutdown
 * await bridge.stop();
 * ```
 */
export class ExecutionEventBridge {
  private socketService: SocketService;
  private subscriber: ExecutionEventSubscriber;
  private eventHandler: ((event: ExecutionEventMessage) => void) | null = null;
  private isRunning: boolean = false;

  /**
   * Create a new ExecutionEventBridge
   *
   * @param {SocketService} socketService - The SocketService instance for broadcasting
   */
  constructor(socketService: SocketService) {
    this.socketService = socketService;
    this.subscriber = getExecutionEventSubscriber();
  }

  /**
   * Start the event bridge
   * Subscribes to Redis events and begins forwarding to WebSocket
   *
   * @returns {Promise<void>}
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn("[ExecutionEventBridge] Already running");
      return;
    }

    // Create the event handler
    this.eventHandler = (event: ExecutionEventMessage) => {
      this.handleEvent(event);
    };

    // Register the handler
    this.subscriber.onEvent(this.eventHandler);

    // Start the subscriber
    await this.subscriber.start();

    this.isRunning = true;
    logger.info("[ExecutionEventBridge] Started - forwarding events to WebSocket");
  }

  /**
   * Stop the event bridge
   *
   * @returns {Promise<void>}
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    // Remove the event handler
    if (this.eventHandler) {
      this.subscriber.offEvent(this.eventHandler);
      this.eventHandler = null;
    }

    // Stop the subscriber
    await this.subscriber.stop();

    this.isRunning = false;
    logger.info("[ExecutionEventBridge] Stopped");
  }

  /**
   * Handle an incoming event from Redis and forward to WebSocket
   *
   * @private
   * @param {ExecutionEventMessage} event - The event from Redis
   */
  private handleEvent(event: ExecutionEventMessage): void {
    try {
      // Transform the event to match the existing WebSocket format
      const socketEvent = this.transformToSocketEvent(event);

      // Broadcast via SocketService
      this.socketService.broadcastExecutionEvent(
        event.executionId,
        socketEvent
      );

      logger.debug("[ExecutionEventBridge] Forwarded event to WebSocket", {
        type: event.type,
        executionId: event.executionId,
        nodeId: event.nodeId,
      });
    } catch (error) {
      logger.error("[ExecutionEventBridge] Failed to forward event", {
        error,
        event,
      });
    }
  }

  /**
   * Transform a Redis event message to the WebSocket event format
   *
   * @private
   * @param {ExecutionEventMessage} event - The Redis event
   * @returns {ExecutionEventData} The WebSocket event format
   */
  private transformToSocketEvent(event: ExecutionEventMessage): ExecutionEventData {
    const socketEvent: ExecutionEventData = {
      executionId: event.executionId,
      type: event.type,
      timestamp: new Date(event.timestamp),
    };

    // Add node-specific fields
    if (event.nodeId) {
      socketEvent.nodeId = event.nodeId;
    }

    // Add data payload
    if (event.data) {
      socketEvent.data = event.data;

      // Include nodeName and nodeType in data if present
      if (event.nodeName) {
        socketEvent.data.nodeName = event.nodeName;
      }
      if (event.nodeType) {
        socketEvent.data.nodeType = event.nodeType;
      }
    } else if (event.nodeName || event.nodeType) {
      // Create data object for nodeName/nodeType if no data exists
      socketEvent.data = {
        nodeName: event.nodeName,
        nodeType: event.nodeType,
      };
    }

    // Add error information
    if (event.error) {
      socketEvent.error = {
        message: event.error.message || String(event.error),
        stack: event.error.stack,
        code: event.error.code,
        nodeId: event.error.nodeId,
        timestamp: new Date(event.timestamp),
      };
    }

    return socketEvent;
  }

  /**
   * Check if the bridge is running
   *
   * @returns {boolean} True if running
   */
  isActive(): boolean {
    return this.isRunning;
  }
}

/**
 * Create and start an ExecutionEventBridge
 *
 * @param {SocketService} socketService - The SocketService instance
 * @returns {Promise<ExecutionEventBridge>} The started bridge instance
 */
export async function createExecutionEventBridge(
  socketService: SocketService
): Promise<ExecutionEventBridge> {
  const bridge = new ExecutionEventBridge(socketService);
  await bridge.start();
  return bridge;
}
