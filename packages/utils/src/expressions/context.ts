/**
 * Expression Context Utilities
 * 
 * Shared utilities for building expression context (nodeIdToName, nodeOutputs).
 * Used by RealtimeExecutionEngine, ExecutionService, ExecutionEngine, FlowExecutionEngine.
 */

/**
 * Workflow node interface for expression context building
 */
export interface WorkflowNodeForContext {
  id: string;
  name?: string;
  mockData?: any;
  mockDataPinned?: boolean;
}

/**
 * Connection interface for expression context building
 */
export interface ConnectionForContext {
  sourceNodeId: string;
  targetNodeId: string;
}

/**
 * Options for building nodeOutputs map
 */
export interface BuildNodeOutputsOptions {
  /** The target node ID (for single node execution) */
  targetNodeId?: string;
  /** Connections in the workflow */
  connections?: ConnectionForContext[];
  /** Input data from frontend (may contain nodeOutputs) */
  inputData?: {
    main?: any[];
    nodeOutputs?: Record<string, any>;
  };
  /** Workflow nodes (for mock data fallback) */
  nodes?: WorkflowNodeForContext[];
  /** nodeIdToName map for adding name-based entries */
  nodeIdToName?: Map<string, string>;
}

/**
 * Builds a nodeId -> nodeName mapping for $node["Name"] expression support.
 * This allows users to reference nodes by their friendly names instead of IDs.
 * 
 * @param nodes - Array of workflow nodes
 * @returns Map of nodeId -> nodeName
 * 
 * @example
 * const nodes = [{ id: "node-123", name: "HTTP Request" }, { id: "node-456", name: "JSON" }];
 * const map = buildNodeIdToNameMap(nodes);
 * // map.get("node-123") === "HTTP Request"
 */
export function buildNodeIdToNameMap(nodes: WorkflowNodeForContext[]): Map<string, string> {
  const nodeIdToName = new Map<string, string>();
  for (const node of nodes) {
    if (node.id && node.name) {
      nodeIdToName.set(node.id, node.name);
    }
  }
  return nodeIdToName;
}

/**
 * Builds a nodeOutputs map for $node expression resolution.
 * This map contains the output data from each node, keyed by both node ID and node name.
 * 
 * Priority:
 * 1. nodeOutputs from frontend (if provided)
 * 2. Pinned mock data from source nodes
 * 3. Input data (for single connection scenarios)
 * 
 * @param options - Options for building the map
 * @returns Map of nodeId/nodeName -> output data
 */
export function buildNodeOutputsMap(options: BuildNodeOutputsOptions): Map<string, any> {
  const { targetNodeId, connections, inputData, nodes, nodeIdToName } = options;
  const nodeOutputs = new Map<string, any>();

  // Priority 1: Use nodeOutputs from frontend if provided
  if (inputData?.nodeOutputs && typeof inputData.nodeOutputs === 'object') {
    for (const [key, value] of Object.entries(inputData.nodeOutputs)) {
      nodeOutputs.set(key, value);
    }
    return nodeOutputs;
  }

  // Priority 2 & 3: Build from connections and input data
  if (targetNodeId && connections && nodes) {
    // Find all connections where target node is the target
    const inputConnections = connections.filter(
      (conn) => conn.targetNodeId === targetNodeId
    );

    for (const conn of inputConnections) {
      const sourceNodeId = conn.sourceNodeId;
      const sourceNode = nodes.find((n) => n.id === sourceNodeId);

      if (sourceNode) {
        // Priority 2: Check for pinned mock data
        if (sourceNode.mockData && sourceNode.mockDataPinned) {
          nodeOutputs.set(sourceNodeId, sourceNode.mockData);
          if (sourceNode.name) {
            nodeOutputs.set(sourceNode.name, sourceNode.mockData);
          }
        }
        // Priority 3: Use input data for single connection
        else if (inputData?.main && inputData.main.length > 0 && inputConnections.length === 1) {
          const extractedData = inputData.main.map((item: any) => {
            if (item && item.json !== undefined) {
              return item.json;
            }
            return item;
          });
          const data = extractedData.length === 1 ? extractedData[0] : extractedData;
          nodeOutputs.set(sourceNodeId, data);
          if (sourceNode.name) {
            nodeOutputs.set(sourceNode.name, data);
          }
        }
      }
    }
  }

  // Also add entries by node name using nodeIdToName map
  if (nodeIdToName && nodeOutputs.size > 0) {
    for (const [nodeId, data] of nodeOutputs.entries()) {
      const nodeName = nodeIdToName.get(nodeId);
      if (nodeName && !nodeOutputs.has(nodeName)) {
        nodeOutputs.set(nodeName, data);
      }
    }
  }

  return nodeOutputs;
}

/**
 * Creates a complete expression context for node execution.
 * This is a convenience function that builds both nodeIdToName and nodeOutputs.
 * 
 * @param nodes - Workflow nodes
 * @param options - Additional options for building nodeOutputs
 * @returns Object containing nodeIdToName and nodeOutputs maps
 */
export function buildExpressionContext(
  nodes: WorkflowNodeForContext[],
  options?: Omit<BuildNodeOutputsOptions, 'nodes' | 'nodeIdToName'>
): {
  nodeIdToName: Map<string, string>;
  nodeOutputs: Map<string, any>;
} {
  const nodeIdToName = buildNodeIdToNameMap(nodes);
  const nodeOutputs = buildNodeOutputsMap({
    ...options,
    nodes,
    nodeIdToName,
  });

  return { nodeIdToName, nodeOutputs };
}
