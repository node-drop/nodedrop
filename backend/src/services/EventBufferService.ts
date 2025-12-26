/**
 * EventBufferService
 * 
 * Manages event buffering in Redis for late subscribers to workflow executions.
 * Stores execution events with TTL to allow clients connecting after execution
 * has started to receive recent events.
 * 
 * Features:
 * - Redis-based event storage with automatic TTL
 * - Chronological event ordering
 * - Buffer size limits to prevent memory issues
 * - Automatic cleanup of expired buffers
 * 
 * @module services/EventBufferService
 */

import { ExecutionEventData } from "../types/execution.types";
import { getRedisClient, RedisClient } from "../config/redis";
import { logger } from "../utils/logger";

/**
 * Configuration for EventBufferService
 */
export interface EventBufferConfig {
  /** Retention time for buffers in milliseconds (default: 60000 = 60 seconds) */
  bufferRetentionMs?: number;
  /** Maximum number of execution buffers to maintain (default: 100) */
  maxBufferedExecutions?: number;
  /** Maximum events per execution buffer (default: 20) */
  maxEventsPerExecution?: number;
}

/**
 * Service for managing execution event buffers in Redis
 */
export class EventBufferService {
  private redisClient: RedisClient | null = null;
  private readonly REDIS_KEY_PREFIX = "socket:buffer:";
  private readonly DEFAULT_TTL_SECONDS = 60;
  
  private bufferRetentionMs: number;
  private maxBufferedExecutions: number;
  private maxEventsPerExecution: number;

  constructor(config?: EventBufferConfig) {
    this.bufferRetentionMs = config?.bufferRetentionMs ?? 60000;
    this.maxBufferedExecutions = config?.maxBufferedExecutions ?? 100;
    this.maxEventsPerExecution = config?.maxEventsPerExecution ?? 20;
    
    this.initializeRedis();
  }

  /**
   * Initialize Redis connection
   * Falls back gracefully if Redis is unavailable
   */
  private async initializeRedis(): Promise<void> {
    try {
      this.redisClient = await getRedisClient();
      logger.info("EventBufferService: Connected to Redis");
    } catch (error) {
      logger.warn(
        "EventBufferService: Redis unavailable, event buffering disabled",
        error
      );
      this.redisClient = null;
    }
  }

  /**
   * Ensure Redis connection is available
   * Attempts to reconnect if connection was lost
   */
  private async ensureRedis(): Promise<boolean> {
    if (!this.redisClient || !this.redisClient.isOpen) {
      try {
        this.redisClient = await getRedisClient();
        return true;
      } catch (error) {
        logger.warn("EventBufferService: Redis connection failed", error);
        this.redisClient = null;
        return false;
      }
    }
    return true;
  }

  /**
   * Generate Redis key for an execution buffer
   */
  private getRedisKey(executionId: string): string {
    return `${this.REDIS_KEY_PREFIX}${executionId}`;
  }

  /**
   * Buffer an execution event in Redis
   * Stores event with TTL and enforces buffer size limits
   * 
   * @param executionId - Unique identifier of the execution
   * @param event - Event data to buffer
   */
  async bufferEvent(
    executionId: string,
    event: ExecutionEventData
  ): Promise<void> {
    const isConnected = await this.ensureRedis();
    if (!isConnected || !this.redisClient) {
      logger.debug("EventBufferService: Skipping buffer (Redis unavailable)");
      return;
    }

    try {
      const key = this.getRedisKey(executionId);
      const eventJson = JSON.stringify(event);
      
      // Add event to the beginning of the list (LPUSH)
      await this.redisClient.lPush(key, eventJson);
      
      // Trim list to max events per execution
      await this.redisClient.lTrim(key, 0, this.maxEventsPerExecution - 1);
      
      // Set TTL (convert ms to seconds)
      const ttlSeconds = Math.ceil(this.bufferRetentionMs / 1000);
      await this.redisClient.expire(key, ttlSeconds);
      
      logger.debug(
        `EventBufferService: Buffered event for execution ${executionId}`,
        { type: event.type, nodeId: event.nodeId }
      );
    } catch (error) {
      logger.error(
        `EventBufferService: Failed to buffer event for ${executionId}`,
        error
      );
    }
  }

  /**
   * Retrieve buffered events for an execution
   * Returns events in chronological order (oldest first)
   * 
   * @param executionId - Unique identifier of the execution
   * @returns Array of buffered events in chronological order
   */
  async getBufferedEvents(executionId: string): Promise<ExecutionEventData[]> {
    const isConnected = await this.ensureRedis();
    if (!isConnected || !this.redisClient) {
      logger.debug("EventBufferService: No buffered events (Redis unavailable)");
      return [];
    }

    try {
      const key = this.getRedisKey(executionId);
      
      // Get all events from the list (LRANGE 0 -1)
      const eventJsonArray = await this.redisClient.lRange(key, 0, -1);
      
      if (eventJsonArray.length === 0) {
        return [];
      }
      
      // Parse JSON events
      const events = eventJsonArray.map((json) => JSON.parse(json) as ExecutionEventData);
      
      // Reverse to get chronological order (oldest first)
      // LPUSH adds to beginning, so newest is first in Redis list
      events.reverse();
      
      logger.debug(
        `EventBufferService: Retrieved ${events.length} buffered events for ${executionId}`
      );
      
      return events;
    } catch (error) {
      logger.error(
        `EventBufferService: Failed to retrieve buffered events for ${executionId}`,
        error
      );
      return [];
    }
  }

  /**
   * Update TTL for a buffer after execution completes
   * Sets TTL to retention period to keep events available for late subscribers
   * 
   * @param executionId - Unique identifier of the execution
   */
  async setCompletionTTL(executionId: string): Promise<void> {
    const isConnected = await this.ensureRedis();
    if (!isConnected || !this.redisClient) {
      return;
    }

    try {
      const key = this.getRedisKey(executionId);
      const ttlSeconds = Math.ceil(this.bufferRetentionMs / 1000);
      
      await this.redisClient.expire(key, ttlSeconds);
      
      logger.debug(
        `EventBufferService: Set completion TTL for ${executionId} to ${ttlSeconds}s`
      );
    } catch (error) {
      logger.error(
        `EventBufferService: Failed to set completion TTL for ${executionId}`,
        error
      );
    }
  }

  /**
   * Manually delete a buffer
   * Used for immediate cleanup when buffer is no longer needed
   * 
   * @param executionId - Unique identifier of the execution
   */
  async deleteBuffer(executionId: string): Promise<void> {
    const isConnected = await this.ensureRedis();
    if (!isConnected || !this.redisClient) {
      return;
    }

    try {
      const key = this.getRedisKey(executionId);
      await this.redisClient.del(key);
      
      logger.debug(`EventBufferService: Deleted buffer for ${executionId}`);
    } catch (error) {
      logger.error(
        `EventBufferService: Failed to delete buffer for ${executionId}`,
        error
      );
    }
  }

  /**
   * Clean up expired buffers
   * This is a maintenance operation that can be called periodically
   * Note: Redis automatically removes keys when TTL expires, so this is optional
   */
  async cleanupExpiredBuffers(): Promise<void> {
    const isConnected = await this.ensureRedis();
    if (!isConnected || !this.redisClient) {
      return;
    }

    try {
      // Scan for all buffer keys
      const pattern = `${this.REDIS_KEY_PREFIX}*`;
      const keys: string[] = [];
      
      // Use SCAN to iterate through keys (more efficient than KEYS)
      let cursor = 0;
      do {
        const result = await this.redisClient.scan(cursor, {
          MATCH: pattern,
          COUNT: 100,
        });
        cursor = result.cursor;
        keys.push(...result.keys);
      } while (cursor !== 0);
      
      logger.debug(
        `EventBufferService: Found ${keys.length} buffer keys during cleanup`
      );
      
      // Redis automatically removes expired keys, but we can check TTL
      // and log for monitoring purposes
      for (const key of keys) {
        const ttl = await this.redisClient.ttl(key);
        if (ttl === -2) {
          // Key doesn't exist (already expired)
          logger.debug(`EventBufferService: Key ${key} already expired`);
        } else if (ttl === -1) {
          // Key exists but has no TTL (shouldn't happen, but handle it)
          logger.warn(`EventBufferService: Key ${key} has no TTL, deleting`);
          await this.redisClient.del(key);
        }
      }
    } catch (error) {
      logger.error("EventBufferService: Failed to cleanup expired buffers", error);
    }
  }

  /**
   * Get the number of currently buffered executions
   * Useful for monitoring and debugging
   */
  async getBufferCount(): Promise<number> {
    const isConnected = await this.ensureRedis();
    if (!isConnected || !this.redisClient) {
      return 0;
    }

    try {
      const pattern = `${this.REDIS_KEY_PREFIX}*`;
      let count = 0;
      let cursor = 0;
      
      do {
        const result = await this.redisClient.scan(cursor, {
          MATCH: pattern,
          COUNT: 100,
        });
        cursor = result.cursor;
        count += result.keys.length;
      } while (cursor !== 0);
      
      return count;
    } catch (error) {
      logger.error("EventBufferService: Failed to get buffer count", error);
      return 0;
    }
  }
}
