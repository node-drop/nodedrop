/**
 * ExecutionStateStore - Redis-backed storage for workflow execution state
 *
 * Provides persistent storage for execution context and node outputs during
 * workflow execution. Enables horizontal scaling by allowing multiple workers
 * to share execution state through Redis.
 *
 * Features:
 * - Execution context persistence with 24-hour TTL
 * - Node output storage using Redis hashes
 * - Automatic TTL reduction to 1 hour after completion
 * - Map serialization/deserialization for complex data structures
 *
 * @module services/ExecutionStateStore
 */

import { getRedisClient, RedisClient } from "../config/redis";
import { logger } from "../utils/logger";

/**
 * Execution status values for queue-based execution
 */
export type QueueExecutionStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "cancelled";

/**
 * Workflow node structure for execution context
 */
export interface WorkflowNode {
  id: string;
  name: string;
  type: string;
  parameters: Record<string, any>;
  settings?: Record<string, any>;
  position?: { x: number; y: number };
  disabled?: boolean;
  credentials?: string[];
}

/**
 * Workflow connection structure
 */
export interface WorkflowConnection {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  sourceOutput?: string;
  targetInput?: string;
}

/**
 * Execution context stored in Redis
 * Contains all runtime state needed for workflow execution
 */
export interface QueueExecutionContext {
  executionId: string;
  workflowId: string;
  userId: string;
  triggerData: any;
  nodes: WorkflowNode[];
  connections: WorkflowConnection[];
  nodeIdToName: Record<string, string>;
  status: QueueExecutionStatus;
  startTime: number;
  currentNodeId?: string;
  saveToDatabase: boolean;
  singleNodeMode: boolean;
  lastCompletedNodeId?: string;
  workspaceId?: string | null;
  triggerNodeId?: string;
}

/**
 * Redis key patterns for execution state storage
 */
const REDIS_KEYS = {
  /** Key for execution context JSON */
  context: (executionId: string) => `execution:${executionId}:context`,
  /** Key for node outputs hash */
  outputs: (executionId: string) => `execution:${executionId}:outputs`,
  /** Key for execution status */
  status: (executionId: string) => `execution:${executionId}:status`,
} as const;

/**
 * Default TTL values in seconds
 */
const DEFAULT_TTL = {
  /** Default TTL for active executions: 24 hours */
  DEFAULT: 24 * 60 * 60,
  /** TTL after completion: 1 hour */
  COMPLETION: 60 * 60,
} as const;

/**
 * Get TTL values from environment variables or use defaults
 */
const getTTL = () => ({
  /** TTL for active executions (from EXECUTION_STATE_TTL env var or default 24 hours) */
  DEFAULT: parseInt(process.env.EXECUTION_STATE_TTL || String(DEFAULT_TTL.DEFAULT), 10) || DEFAULT_TTL.DEFAULT,
  /** TTL after completion (from EXECUTION_COMPLETION_TTL env var or default 1 hour) */
  COMPLETION: parseInt(process.env.EXECUTION_COMPLETION_TTL || String(DEFAULT_TTL.COMPLETION), 10) || DEFAULT_TTL.COMPLETION,
});

/**
 * TTL values - computed from environment variables
 */
const TTL = getTTL();


/**
 * ExecutionStateStore class for Redis-backed execution state management
 *
 * @class ExecutionStateStore
 * @example
 * ```typescript
 * const stateStore = ExecutionStateStore.getInstance();
 *
 * // Create execution state
 * await stateStore.createState('exec-123', context);
 *
 * // Store node output
 * await stateStore.setNodeOutput('exec-123', 'node-1', { data: 'result' });
 *
 * // Get all outputs
 * const outputs = await stateStore.getAllNodeOutputs('exec-123');
 * ```
 */
export class ExecutionStateStore {
  private static instance: ExecutionStateStore;
  private redisClient: RedisClient | null = null;
  private initialized: boolean = false;

  private constructor() {
    // Private constructor for singleton pattern
  }

  /**
   * Get the singleton instance of ExecutionStateStore
   *
   * @returns {ExecutionStateStore} The singleton instance
   */
  static getInstance(): ExecutionStateStore {
    if (!ExecutionStateStore.instance) {
      ExecutionStateStore.instance = new ExecutionStateStore();
    }
    return ExecutionStateStore.instance;
  }

  /**
   * Initialize Redis connection
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
      logger.info("[ExecutionStateStore] Redis connection initialized");
    } catch (error) {
      logger.error("[ExecutionStateStore] Failed to initialize Redis", {
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
   * Serialize execution context for Redis storage
   * Converts Map objects to JSON-serializable format
   *
   * @param {QueueExecutionContext} context - The execution context to serialize
   * @returns {string} JSON string representation
   */
  serializeContext(context: QueueExecutionContext): string {
    // Context already uses plain objects (nodeIdToName is Record<string, string>)
    // No Map conversion needed for the context itself
    return JSON.stringify(context);
  }

  /**
   * Deserialize execution context from Redis storage
   * Reconstructs the context from JSON format
   *
   * @param {string} data - JSON string from Redis
   * @returns {QueueExecutionContext} The reconstructed execution context
   */
  deserializeContext(data: string): QueueExecutionContext {
    const parsed = JSON.parse(data);
    // Context uses plain objects, no Map reconstruction needed
    return parsed as QueueExecutionContext;
  }

  /**
   * Serialize node output for Redis hash storage
   * Handles Map objects and other complex types
   *
   * @param {any} output - The node output to serialize
   * @returns {string} JSON string representation
   */
  serializeNodeOutput(output: any): string {
    return JSON.stringify(output, (_key, value) => {
      // Convert Map to array of entries for serialization
      if (value instanceof Map) {
        return {
          __type: "Map",
          entries: Array.from(value.entries()),
        };
      }
      return value;
    });
  }

  /**
   * Deserialize node output from Redis hash storage
   * Reconstructs Map objects and other complex types
   *
   * @param {string} data - JSON string from Redis
   * @returns {any} The reconstructed node output
   */
  deserializeNodeOutput(data: string): any {
    return JSON.parse(data, (_key, value) => {
      // Reconstruct Map from serialized format
      if (value && typeof value === "object" && value.__type === "Map") {
        return new Map(value.entries);
      }
      return value;
    });
  }


  /**
   * Create initial execution state in Redis
   *
   * @param {string} executionId - Unique execution identifier
   * @param {QueueExecutionContext} context - The execution context to store
   * @returns {Promise<void>}
   */
  async createState(
    executionId: string,
    context: QueueExecutionContext
  ): Promise<void> {
    const redis = await this.ensureRedis();

    const contextKey = REDIS_KEYS.context(executionId);
    const statusKey = REDIS_KEYS.status(executionId);
    const outputsKey = REDIS_KEYS.outputs(executionId);

    const serializedContext = this.serializeContext(context);

    // Use pipeline for atomic operations
    const pipeline = redis.multi();
    pipeline.setEx(contextKey, TTL.DEFAULT, serializedContext);
    pipeline.setEx(statusKey, TTL.DEFAULT, context.status);
    // Initialize empty outputs hash with TTL
    pipeline.hSet(outputsKey, "__init", "true");
    pipeline.expire(outputsKey, TTL.DEFAULT);

    await pipeline.exec();

    logger.info(`[ExecutionStateStore] Created state for execution ${executionId}`, {
      executionId,
      workflowId: context.workflowId,
      status: context.status,
    });
  }

  /**
   * Get execution state from Redis
   *
   * @param {string} executionId - Unique execution identifier
   * @returns {Promise<QueueExecutionContext | null>} The execution context or null if not found
   */
  async getState(executionId: string): Promise<QueueExecutionContext | null> {
    const redis = await this.ensureRedis();

    const contextKey = REDIS_KEYS.context(executionId);
    const data = await redis.get(contextKey);

    if (!data) {
      logger.debug(`[ExecutionStateStore] State not found for execution ${executionId}`);
      return null;
    }

    return this.deserializeContext(data);
  }

  /**
   * Store node output in Redis hash
   *
   * @param {string} executionId - Unique execution identifier
   * @param {string} nodeId - The node identifier
   * @param {any} output - The node output data
   * @returns {Promise<void>}
   */
  async setNodeOutput(
    executionId: string,
    nodeId: string,
    output: any
  ): Promise<void> {
    const redis = await this.ensureRedis();

    const outputsKey = REDIS_KEYS.outputs(executionId);
    const serializedOutput = this.serializeNodeOutput(output);

    await redis.hSet(outputsKey, nodeId, serializedOutput);

    logger.debug(`[ExecutionStateStore] Stored output for node ${nodeId}`, {
      executionId,
      nodeId,
    });
  }

  /**
   * Get node output from Redis hash
   *
   * @param {string} executionId - Unique execution identifier
   * @param {string} nodeId - The node identifier
   * @returns {Promise<any | null>} The node output or null if not found
   */
  async getNodeOutput(executionId: string, nodeId: string): Promise<any | null> {
    const redis = await this.ensureRedis();

    const outputsKey = REDIS_KEYS.outputs(executionId);
    const data = await redis.hGet(outputsKey, nodeId);

    if (!data) {
      return null;
    }

    return this.deserializeNodeOutput(data);
  }

  /**
   * Get all node outputs from Redis hash
   *
   * @param {string} executionId - Unique execution identifier
   * @returns {Promise<Map<string, any>>} Map of nodeId to output data
   */
  async getAllNodeOutputs(executionId: string): Promise<Map<string, any>> {
    const redis = await this.ensureRedis();

    const outputsKey = REDIS_KEYS.outputs(executionId);
    const allOutputs = await redis.hGetAll(outputsKey);

    const outputMap = new Map<string, any>();

    for (const [nodeId, data] of Object.entries(allOutputs)) {
      // Skip the initialization marker
      if (nodeId === "__init") continue;
      outputMap.set(nodeId, this.deserializeNodeOutput(data));
    }

    return outputMap;
  }


  /**
   * Update execution status in Redis
   *
   * @param {string} executionId - Unique execution identifier
   * @param {QueueExecutionStatus} status - The new status
   * @returns {Promise<void>}
   */
  async updateStatus(
    executionId: string,
    status: QueueExecutionStatus
  ): Promise<void> {
    const redis = await this.ensureRedis();

    const statusKey = REDIS_KEYS.status(executionId);
    const contextKey = REDIS_KEYS.context(executionId);

    // Update status key
    await redis.set(statusKey, status);

    // Also update status in context
    const contextData = await redis.get(contextKey);
    if (contextData) {
      const context = this.deserializeContext(contextData);
      context.status = status;
      const ttl = await redis.ttl(contextKey);
      await redis.setEx(contextKey, ttl > 0 ? ttl : TTL.DEFAULT, this.serializeContext(context));
    }

    logger.info(`[ExecutionStateStore] Updated status for execution ${executionId}`, {
      executionId,
      status,
    });
  }

  /**
   * Set completion TTL (1 hour) for all execution keys
   * Called after execution completes or fails
   *
   * @param {string} executionId - Unique execution identifier
   * @returns {Promise<void>}
   */
  async setCompletionTTL(executionId: string): Promise<void> {
    const redis = await this.ensureRedis();

    const contextKey = REDIS_KEYS.context(executionId);
    const statusKey = REDIS_KEYS.status(executionId);
    const outputsKey = REDIS_KEYS.outputs(executionId);

    // Use pipeline for atomic TTL updates
    const pipeline = redis.multi();
    pipeline.expire(contextKey, TTL.COMPLETION);
    pipeline.expire(statusKey, TTL.COMPLETION);
    pipeline.expire(outputsKey, TTL.COMPLETION);

    await pipeline.exec();

    logger.info(`[ExecutionStateStore] Set completion TTL for execution ${executionId}`, {
      executionId,
      ttlSeconds: TTL.COMPLETION,
    });
  }

  /**
   * Delete execution state from Redis
   * Used for cleanup or cancellation
   *
   * @param {string} executionId - Unique execution identifier
   * @returns {Promise<void>}
   */
  async deleteState(executionId: string): Promise<void> {
    const redis = await this.ensureRedis();

    const contextKey = REDIS_KEYS.context(executionId);
    const statusKey = REDIS_KEYS.status(executionId);
    const outputsKey = REDIS_KEYS.outputs(executionId);

    await redis.del([contextKey, statusKey, outputsKey]);

    logger.info(`[ExecutionStateStore] Deleted state for execution ${executionId}`, {
      executionId,
    });
  }

  /**
   * Update the last completed node ID in execution context
   * Used for retry resume functionality
   *
   * @param {string} executionId - Unique execution identifier
   * @param {string} nodeId - The last successfully completed node ID
   * @returns {Promise<void>}
   */
  async updateLastCompletedNode(
    executionId: string,
    nodeId: string
  ): Promise<void> {
    const redis = await this.ensureRedis();

    const contextKey = REDIS_KEYS.context(executionId);
    const contextData = await redis.get(contextKey);

    if (contextData) {
      const context = this.deserializeContext(contextData);
      context.lastCompletedNodeId = nodeId;
      const ttl = await redis.ttl(contextKey);
      await redis.setEx(contextKey, ttl > 0 ? ttl : TTL.DEFAULT, this.serializeContext(context));

      logger.debug(`[ExecutionStateStore] Updated lastCompletedNodeId for execution ${executionId}`, {
        executionId,
        nodeId,
      });
    }
  }

  /**
   * Update current node ID in execution context
   *
   * @param {string} executionId - Unique execution identifier
   * @param {string} nodeId - The currently executing node ID
   * @returns {Promise<void>}
   */
  async updateCurrentNode(
    executionId: string,
    nodeId: string
  ): Promise<void> {
    const redis = await this.ensureRedis();

    const contextKey = REDIS_KEYS.context(executionId);
    const contextData = await redis.get(contextKey);

    if (contextData) {
      const context = this.deserializeContext(contextData);
      context.currentNodeId = nodeId;
      const ttl = await redis.ttl(contextKey);
      await redis.setEx(contextKey, ttl > 0 ? ttl : TTL.DEFAULT, this.serializeContext(context));
    }
  }

  /**
   * Check if execution state exists
   *
   * @param {string} executionId - Unique execution identifier
   * @returns {Promise<boolean>} True if state exists
   */
  async exists(executionId: string): Promise<boolean> {
    const redis = await this.ensureRedis();
    const contextKey = REDIS_KEYS.context(executionId);
    const exists = await redis.exists(contextKey);
    return exists === 1;
  }

  /**
   * Get execution status
   *
   * @param {string} executionId - Unique execution identifier
   * @returns {Promise<QueueExecutionStatus | null>} The status or null if not found
   */
  async getStatus(executionId: string): Promise<QueueExecutionStatus | null> {
    const redis = await this.ensureRedis();
    const statusKey = REDIS_KEYS.status(executionId);
    const status = await redis.get(statusKey);
    return status as QueueExecutionStatus | null;
  }
}

// Export singleton instance getter
export const getExecutionStateStore = (): ExecutionStateStore => {
  return ExecutionStateStore.getInstance();
};
