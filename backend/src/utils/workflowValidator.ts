/**
 * Workflow validation utilities
 * 
 * Uses shared Zod schemas from @nodedrop/types for consistent validation
 * across frontend and backend.
 */

import { z } from "zod";
import {
  WorkflowNodeSchema,
  WorkflowConnectionSchema,
  WorkflowTriggerSchema,
  WorkflowSettingsSchema,
  safeParse,
  formatZodErrorString,
} from "@nodedrop/types";

// =============================================================================
// Validation Result Types
// =============================================================================

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
}

// =============================================================================
// Workflow Data Schema (for validation input)
// =============================================================================

/**
 * Schema for validating incoming workflow data.
 * Uses shared schemas from @nodedrop/types as the source of truth.
 */
const WorkflowDataSchema = z.object({
  nodes: z.array(WorkflowNodeSchema),
  connections: z.array(WorkflowConnectionSchema).optional().default([]),
  triggers: z.array(WorkflowTriggerSchema).optional().default([]),
  settings: WorkflowSettingsSchema.optional(),
});

type WorkflowData = z.infer<typeof WorkflowDataSchema>;

// =============================================================================
// Main Validation Function
// =============================================================================

/**
 * Validate workflow structure and data using Zod schemas.
 * Combines schema validation with structural checks (circular deps, orphans, etc.)
 */
export function validateWorkflow(workflowData: unknown): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Step 1: Schema validation using shared Zod schemas
  const parseResult = safeParse(WorkflowDataSchema, workflowData);
  
  if (!parseResult.success) {
    const schemaErrors = formatZodErrorString(parseResult.error);
    errors.push(`Schema validation failed: ${schemaErrors}`);
    return { isValid: false, errors, warnings };
  }

  const validatedData = parseResult.data;

  // Step 2: Basic validation - must have at least one node
  if (validatedData.nodes.length === 0) {
    errors.push("Workflow must contain at least one node");
    return { isValid: false, errors, warnings };
  }

  const nodeIds = new Set<string>(validatedData.nodes.map((node) => node.id));
  const nodeIdArray = Array.from(nodeIds);

  // Step 3: Check for duplicate node IDs
  if (nodeIdArray.length !== validatedData.nodes.length) {
    errors.push("Workflow contains duplicate node IDs");
  }

  const connections = validatedData.connections ?? [];
  const triggers = validatedData.triggers ?? [];

  // Step 4: Validate node connections
  validateConnections(connections, nodeIds, errors);

  // Step 5: Check for circular dependencies
  if (detectCircularDependencies(validatedData.nodes, connections)) {
    errors.push("Workflow contains circular dependencies");
  }

  // Step 6: Check for orphaned nodes (warning only)
  checkOrphanedNodes(connections, nodeIdArray, warnings);

  // Step 7: Validate triggers reference existing nodes
  validateTriggers(triggers, nodeIds, errors);

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

// =============================================================================
// Connection Validation
// =============================================================================

/**
 * Validate node connections for structural integrity
 */
function validateConnections(
  connections: z.infer<typeof WorkflowConnectionSchema>[],
  nodeIds: Set<string>,
  errors: string[]
): void {
  if (connections.length === 0) return;

  const connectionIds = new Set<string>();

  for (const connection of connections) {
    // Check for duplicate connection IDs
    if (connectionIds.has(connection.id)) {
      errors.push(`Duplicate connection ID: ${connection.id}`);
    }
    connectionIds.add(connection.id);

    // Validate source node exists
    if (!nodeIds.has(connection.sourceNodeId)) {
      errors.push(`Invalid connection: source node ${connection.sourceNodeId} not found`);
    }

    // Validate target node exists
    if (!nodeIds.has(connection.targetNodeId)) {
      errors.push(`Invalid connection: target node ${connection.targetNodeId} not found`);
    }

    // Check for self-connections
    if (connection.sourceNodeId === connection.targetNodeId) {
      errors.push(`Node ${connection.sourceNodeId} cannot connect to itself`);
    }
  }
}

// =============================================================================
// Orphaned Node Detection
// =============================================================================

/**
 * Check for orphaned nodes (nodes with no connections) - generates warnings
 */
function checkOrphanedNodes(
  connections: z.infer<typeof WorkflowConnectionSchema>[],
  nodeIdArray: string[],
  warnings: string[]
): void {
  if (connections.length === 0) return;

  const connectedNodes = new Set<string>();
  connections.forEach((conn) => {
    connectedNodes.add(conn.sourceNodeId);
    connectedNodes.add(conn.targetNodeId);
  });

  const orphanedNodes = nodeIdArray.filter((nodeId) => !connectedNodes.has(nodeId));
  if (orphanedNodes.length > 0) {
    warnings.push(`Orphaned nodes detected: ${orphanedNodes.join(", ")}`);
  }
}

// =============================================================================
// Trigger Validation
// =============================================================================

/**
 * Validate triggers reference existing nodes
 */
function validateTriggers(
  triggers: z.infer<typeof WorkflowTriggerSchema>[],
  nodeIds: Set<string>,
  errors: string[]
): void {
  if (triggers.length === 0) return;

  for (const trigger of triggers) {
    // Only validate nodeId if it's present (it's optional in the schema)
    if (trigger.nodeId && !nodeIds.has(trigger.nodeId)) {
      errors.push(`Trigger ${trigger.id} references non-existent node ${trigger.nodeId}`);
    }
  }
}

// =============================================================================
// Circular Dependency Detection
// =============================================================================

/**
 * Detect circular dependencies in workflow graph using DFS
 */
function detectCircularDependencies(
  nodes: z.infer<typeof WorkflowNodeSchema>[],
  connections: z.infer<typeof WorkflowConnectionSchema>[]
): boolean {
  const graph = new Map<string, string[]>();
  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  // Build adjacency list
  nodes.forEach((node) => graph.set(node.id, []));
  connections.forEach((conn) => {
    const sourceConnections = graph.get(conn.sourceNodeId) || [];
    sourceConnections.push(conn.targetNodeId);
    graph.set(conn.sourceNodeId, sourceConnections);
  });

  // DFS to detect cycles
  const hasCycle = (nodeId: string): boolean => {
    if (recursionStack.has(nodeId)) return true;
    if (visited.has(nodeId)) return false;

    visited.add(nodeId);
    recursionStack.add(nodeId);

    const neighbors = graph.get(nodeId) || [];
    for (const neighbor of neighbors) {
      if (hasCycle(neighbor)) return true;
    }

    recursionStack.delete(nodeId);
    return false;
  };

  // Check each node for cycles
  for (const node of nodes) {
    if (!visited.has(node.id) && hasCycle(node.id)) {
      return true;
    }
  }

  return false;
}
