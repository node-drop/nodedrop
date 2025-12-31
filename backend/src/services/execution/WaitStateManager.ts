/**
 * WaitStateManager - Shared utility for managing wait state across execution engines
 * 
 * Extracts common wait-related functionality from FlowExecutionEngine and RealtimeExecutionEngine
 * to reduce code duplication and ensure consistent behavior.
 */

import { StoredExecutionState } from "../../db/schema/scheduled-waits";
import { logger } from "../../utils/logger";
import { getWaitJobManager } from "./WaitJobManager";

/**
 * Common interface for execution context state that can be saved/restored
 */
export interface SerializableExecutionState {
  nodeOutputs: Map<string, any>;
  nodeIdToName: Map<string, string>;
  executionPath?: string[];
  triggerData?: any;
  triggerNodeId?: string;
  executionOptions?: Record<string, any>;
  startTime: number;
  nodeStates?: Map<string, any>;
}

/**
 * Options for saving execution state
 */
export interface SaveStateOptions {
  waitId: string;
  executionId: string;
  context: SerializableExecutionState;
  pausedAtNodeId?: string;
}

/**
 * Result of building a resume context
 */
export interface ResumeContextData {
  nodeOutputs: Map<string, any>;
  nodeIdToName: Map<string, string>;
  executionPath: string[];
  triggerData: any;
  triggerNodeId?: string;
  executionOptions: Record<string, any>;
  startTime: number;
}

/**
 * WaitStateManager handles serialization and deserialization of execution state
 * for wait/resume functionality across different execution engines.
 */
export class WaitStateManager {
  /**
   * Save execution state for later resume (webhook waits or time-based waits)
   * Converts Maps to plain objects for JSON storage
   */
  static async saveExecutionState(options: SaveStateOptions): Promise<void> {
    const { waitId, executionId, context, pausedAtNodeId } = options;
    
    const waitJobManager = getWaitJobManager();
    if (!waitJobManager) {
      logger.error("[WaitStateManager] WaitJobManager not available, cannot save execution state");
      return;
    }

    // Convert Maps to plain objects for JSON storage
    const nodeOutputs = WaitStateManager.mapToObject(context.nodeOutputs);
    const nodeIdToName = WaitStateManager.mapToObject(context.nodeIdToName);
    
    // Build node states if available
    const nodeStates: Record<string, any> = {};
    if (context.nodeStates) {
      context.nodeStates.forEach((state, key) => {
        nodeStates[key] = WaitStateManager.serializeNodeState(state, key, pausedAtNodeId);
      });
    } else {
      // For engines that don't track nodeStates (like RealtimeExecutionEngine),
      // build minimal state from nodeOutputs
      context.nodeOutputs.forEach((_, nodeId) => {
        nodeStates[nodeId] = {
          identifier: nodeId,
          status: nodeId === pausedAtNodeId ? 'waiting' : 'completed',
          outputData: context.nodeOutputs.get(nodeId),
          dependencies: [],
          dependents: [],
        };
      });
      
      // Mark paused node if not in outputs
      if (pausedAtNodeId && !nodeStates[pausedAtNodeId]) {
        nodeStates[pausedAtNodeId] = {
          identifier: pausedAtNodeId,
          status: 'waiting',
          dependencies: [],
          dependents: [],
        };
      }
    }

    const executionState: StoredExecutionState = {
      nodeOutputs,
      nodeStates,
      executionPath: context.executionPath || [],
      nodeIdToName,
      triggerData: context.triggerData,
      triggerNodeId: context.triggerNodeId,
      executionOptions: context.executionOptions || {},
      startTime: context.startTime,
    };

    await waitJobManager.saveExecutionState({
      waitId,
      executionState,
    });

    logger.info("[WaitStateManager] Saved execution state for resume", {
      waitId,
      executionId,
      nodeOutputsCount: Object.keys(nodeOutputs).length,
      executionPathLength: context.executionPath?.length || 0,
    });
  }

  /**
   * Restore execution context data from saved state
   */
  static restoreContextFromState(executionState: StoredExecutionState): ResumeContextData {
    const nodeOutputs = new Map<string, any>();
    const nodeIdToName = new Map<string, string>();

    // Restore node outputs
    if (executionState.nodeOutputs) {
      for (const [key, value] of Object.entries(executionState.nodeOutputs)) {
        nodeOutputs.set(key, value);
      }
    }

    // Restore node ID to name mapping
    if (executionState.nodeIdToName) {
      for (const [key, value] of Object.entries(executionState.nodeIdToName)) {
        nodeIdToName.set(key, value);
      }
    }

    return {
      nodeOutputs,
      nodeIdToName,
      executionPath: executionState.executionPath || [],
      triggerData: executionState.triggerData,
      triggerNodeId: executionState.triggerNodeId,
      executionOptions: executionState.executionOptions || {},
      startTime: executionState.startTime,
    };
  }

  /**
   * Create standardized output data for a resumed Wait node
   */
  static createWaitNodeOutput(
    waitId: string,
    inputData: any,
    webhookData?: any
  ): {
    main: Array<{ json: any }>;
    metadata: {
      nodeType: string;
      outputCount: number;
      hasMultipleBranches: boolean;
    };
  } {
    return {
      main: [{
        json: {
          ...inputData,
          _webhookData: webhookData,
          _resumedAt: new Date().toISOString(),
          _resumedVia: 'webhook',
          _waitId: waitId,
        }
      }],
      metadata: {
        nodeType: 'wait',
        outputCount: 1,
        hasMultipleBranches: false,
      },
    };
  }

  /**
   * Convert a Map to a plain object for JSON serialization
   */
  private static mapToObject<T>(map: Map<string, T>): Record<string, T> {
    const obj: Record<string, T> = {};
    map.forEach((value, key) => {
      obj[key] = value;
    });
    return obj;
  }

  /**
   * Serialize a node state for storage
   */
  private static serializeNodeState(
    state: any,
    nodeId: string,
    pausedAtNodeId?: string
  ): any {
    return {
      identifier: state.identifier || nodeId,
      status: nodeId === pausedAtNodeId ? 'waiting' : state.status,
      inputData: state.inputData,
      outputData: state.outputData,
      dependencies: state.dependencies || [],
      dependents: state.dependents || [],
    };
  }
}
