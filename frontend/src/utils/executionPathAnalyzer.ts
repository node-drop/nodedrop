/**
 * ExecutionPathAnalyzer
 *
 * Analyzes workflow graphs to determine which nodes will be affected by an execution.
 * Uses graph traversal (BFS) to find all downstream nodes from a trigger point.
 *
 * Key Features:
 * - Calculates execution paths from trigger nodes
 * - Handles cycles and complex graphs
 * - Returns ordered list of affected nodes
 * - Supports conditional branches and loops
 */

import type { Workflow, WorkflowConnection } from "../types/workflow";

export interface ExecutionPath {
  triggerNodeId: string;
  affectedNodeIds: string[];
  totalNodes: number;
  depth: number; // Maximum depth from trigger
}

/**
 * Calculate which nodes will be affected when executing from a trigger node.
 * Uses Breadth-First Search (BFS) to traverse the workflow graph.
 *
 * @param triggerNodeId - The node where execution starts (trigger node)
 * @param workflow - The workflow containing nodes and connections
 * @returns Array of node IDs that will be affected by this execution
 */
export function getAffectedNodes(
  triggerNodeId: string,
  workflow: Workflow
): string[] {
  const visited = new Set<string>();
  const queue: string[] = [triggerNodeId];
  const affectedNodes: string[] = [triggerNodeId];

  // Build adjacency map for faster lookups
  const adjacencyMap = buildAdjacencyMap(workflow.connections);

  while (queue.length > 0) {
    const currentNodeId = queue.shift()!;

    // Skip if already visited (handles cycles)
    if (visited.has(currentNodeId)) continue;
    visited.add(currentNodeId);

    // Get all nodes connected from this node
    const outgoingNodes = adjacencyMap.get(currentNodeId) || [];

    for (const targetNodeId of outgoingNodes) {
      if (!visited.has(targetNodeId)) {
        queue.push(targetNodeId);
        affectedNodes.push(targetNodeId);
      }
    }
  }

  return affectedNodes;
}

/**
 * Calculate execution path with detailed information
 */
export function calculateExecutionPath(
  triggerNodeId: string,
  workflow: Workflow
): ExecutionPath {
  const affectedNodeIds = getAffectedNodes(triggerNodeId, workflow);
  const depth = calculateMaxDepth(triggerNodeId, workflow.connections);

  return {
    triggerNodeId,
    affectedNodeIds,
    totalNodes: affectedNodeIds.length,
    depth,
  };
}

/**
 * Build adjacency map from connections for faster traversal
 * Map<sourceNodeId, targetNodeId[]>
 */
function buildAdjacencyMap(
  connections: WorkflowConnection[]
): Map<string, string[]> {
  const adjacencyMap = new Map<string, string[]>();

  for (const connection of connections) {
    const { sourceNodeId, targetNodeId } = connection;

    if (!adjacencyMap.has(sourceNodeId)) {
      adjacencyMap.set(sourceNodeId, []);
    }

    adjacencyMap.get(sourceNodeId)!.push(targetNodeId);
  }

  return adjacencyMap;
}

/**
 * Calculate maximum depth from trigger node
 */
function calculateMaxDepth(
  triggerNodeId: string,
  connections: WorkflowConnection[]
): number {
  const adjacencyMap = buildAdjacencyMap(connections);
  const visited = new Set<string>();
  let maxDepth = 0;

  // BFS with depth tracking
  const queue: Array<{ nodeId: string; depth: number }> = [
    { nodeId: triggerNodeId, depth: 0 },
  ];

  while (queue.length > 0) {
    const { nodeId, depth } = queue.shift()!;

    if (visited.has(nodeId)) continue;
    visited.add(nodeId);

    maxDepth = Math.max(maxDepth, depth);

    const outgoingNodes = adjacencyMap.get(nodeId) || [];
    for (const targetNodeId of outgoingNodes) {
      if (!visited.has(targetNodeId)) {
        queue.push({ nodeId: targetNodeId, depth: depth + 1 });
      }
    }
  }

  return maxDepth;
}

/**
 * Check if a node is reachable from a trigger node
 */
export function isNodeReachableFromTrigger(
  nodeId: string,
  triggerNodeId: string,
  workflow: Workflow
): boolean {
  const affectedNodes = getAffectedNodes(triggerNodeId, workflow);
  return affectedNodes.includes(nodeId);
}

/**
 * Get all trigger nodes in a workflow
 * (Nodes with no incoming connections)
 */
export function getTriggerNodes(workflow: Workflow): string[] {
  const nodesWithIncoming = new Set<string>();

  // Find all nodes that have incoming connections
  for (const connection of workflow.connections) {
    nodesWithIncoming.add(connection.targetNodeId);
  }

  // Nodes without incoming connections are potential triggers
  const triggerNodes = workflow.nodes
    .filter((node) => !nodesWithIncoming.has(node.id))
    .map((node) => node.id);

  return triggerNodes;
}

/**
 * Get execution paths for all triggers in a workflow
 */
export function getAllExecutionPaths(workflow: Workflow): ExecutionPath[] {
  const triggerNodes = getTriggerNodes(workflow);

  return triggerNodes.map((triggerNodeId) =>
    calculateExecutionPath(triggerNodeId, workflow)
  );
}

/**
 * Find which execution path a node belongs to
 */
export function findNodeExecutionPath(
  nodeId: string,
  workflow: Workflow
): ExecutionPath | null {
  const allPaths = getAllExecutionPaths(workflow);

  for (const path of allPaths) {
    if (path.affectedNodeIds.includes(nodeId)) {
      return path;
    }
  }

  return null;
}

/**
 * Check if two nodes are in the same execution path
 */
export function areNodesInSamePath(
  nodeId1: string,
  nodeId2: string,
  workflow: Workflow
): boolean {
  const path1 = findNodeExecutionPath(nodeId1, workflow);
  const path2 = findNodeExecutionPath(nodeId2, workflow);

  if (!path1 || !path2) return false;

  return path1.triggerNodeId === path2.triggerNodeId;
}

/**
 * Get nodes that will execute after a given node
 */
export function getDownstreamNodes(
  nodeId: string,
  workflow: Workflow
): string[] {
  const affectedNodes = getAffectedNodes(nodeId, workflow);

  // Remove the starting node from results
  return affectedNodes.filter((id) => id !== nodeId);
}

/**
 * Get nodes that execute before a given node
 */
export function getUpstreamNodes(nodeId: string, workflow: Workflow): string[] {
  const upstreamNodes: string[] = [];
  const visited = new Set<string>();

  // Build reverse adjacency map (target -> sources)
  const reverseAdjacencyMap = new Map<string, string[]>();
  for (const connection of workflow.connections) {
    const { sourceNodeId, targetNodeId } = connection;

    if (!reverseAdjacencyMap.has(targetNodeId)) {
      reverseAdjacencyMap.set(targetNodeId, []);
    }

    reverseAdjacencyMap.get(targetNodeId)!.push(sourceNodeId);
  }

  // BFS backwards
  const queue: string[] = [nodeId];

  while (queue.length > 0) {
    const currentNodeId = queue.shift()!;

    if (visited.has(currentNodeId)) continue;
    visited.add(currentNodeId);

    const incomingNodes = reverseAdjacencyMap.get(currentNodeId) || [];

    for (const sourceNodeId of incomingNodes) {
      if (!visited.has(sourceNodeId)) {
        queue.push(sourceNodeId);
        upstreamNodes.push(sourceNodeId);
      }
    }
  }

  return upstreamNodes;
}
