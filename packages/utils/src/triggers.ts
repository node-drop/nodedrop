/**
 * @nodedrop/utils - Trigger Utilities
 *
 * Consolidated trigger detection and extraction utilities shared between frontend and backend.
 * These utilities provide consistent trigger handling across the application.
 *
 * @module triggers
 */

import type {
  WorkflowNode,
  TriggerType,
  NodeCategory,
} from "@nodedrop/types";

// =============================================================================
// Types
// =============================================================================

/**
 * Minimal node type definition interface for trigger detection.
 * This interface is compatible with both frontend NodeType and backend NodeDefinition.
 */
export interface NodeTypeDefinition {
  /** Unique identifier for the node type */
  identifier: string;
  /** High-level category for node organization */
  nodeCategory?: NodeCategory;
  /** Trigger-specific metadata (only for trigger nodes) */
  triggerType?: TriggerType;
}

/**
 * Extracted trigger configuration
 */
export interface ExtractedTrigger {
  /** Unique identifier for the trigger */
  id: string;
  /** Type of trigger (webhook, schedule, manual, polling, workflow-called) */
  type: TriggerType;
  /** ID of the node this trigger is associated with */
  nodeId: string;
  /** Whether the trigger is active */
  active: boolean;
  /** Trigger-specific settings */
  settings: Record<string, any>;
}

/**
 * Configuration for trigger extraction
 */
export interface TriggerExtractionConfig {
  /** Whether to use fallback detection based on node type naming patterns */
  useFallbackDetection?: boolean;
}

// =============================================================================
// Trigger Detection Functions
// =============================================================================

/**
 * Check if a node type definition is a trigger.
 * Uses nodeCategory (all trigger nodes should have this) with fallback to triggerType.
 *
 * @param nodeType - The node type definition to check
 * @returns True if the node type is a trigger
 *
 * @example
 * ```typescript
 * const webhookNode = { identifier: 'webhook-trigger', nodeCategory: 'trigger', triggerType: 'webhook' };
 * isTriggerNodeType(webhookNode); // true
 *
 * const httpNode = { identifier: 'http-request', nodeCategory: 'action' };
 * isTriggerNodeType(httpNode); // false
 * ```
 */
export function isTriggerNodeType(nodeType: NodeTypeDefinition | undefined): boolean {
  if (!nodeType) return false;

  // Check nodeCategory (all trigger nodes have this now)
  if (nodeType.nodeCategory === "trigger") return true;

  // Legacy fallback: check triggerType for older nodes
  return nodeType.triggerType !== undefined;
}

/**
 * Check if a workflow node is a trigger using available node types.
 *
 * @param node - The workflow node to check
 * @param nodeTypes - Array of available node type definitions
 * @returns True if the node is a trigger
 *
 * @example
 * ```typescript
 * const node = { id: '1', type: 'webhook-trigger', ... };
 * const nodeTypes = [{ identifier: 'webhook-trigger', triggerType: 'webhook' }];
 * isTriggerNode(node, nodeTypes); // true
 * ```
 */
export function isTriggerNode(
  node: WorkflowNode,
  nodeTypes: NodeTypeDefinition[]
): boolean {
  const nodeType = nodeTypes.find((nt) => nt.identifier === node.type);
  return isTriggerNodeType(nodeType);
}

/**
 * Get the trigger type from a workflow node.
 *
 * @param node - The workflow node to get trigger type from
 * @param nodeTypes - Array of available node type definitions
 * @returns The trigger type if the node is a trigger, undefined otherwise
 *
 * @example
 * ```typescript
 * const node = { id: '1', type: 'schedule-trigger', ... };
 * const nodeTypes = [{ identifier: 'schedule-trigger', triggerType: 'schedule' }];
 * getTriggerType(node, nodeTypes); // 'schedule'
 * ```
 */
export function getTriggerType(
  node: WorkflowNode,
  nodeTypes: NodeTypeDefinition[]
): TriggerType | undefined {
  const nodeType = nodeTypes.find((nt) => nt.identifier === node.type);
  return nodeType?.triggerType;
}

/**
 * Get all trigger nodes from a list of workflow nodes.
 *
 * @param nodes - Array of workflow nodes
 * @param nodeTypes - Array of available node type definitions
 * @returns Array of nodes that are triggers
 *
 * @example
 * ```typescript
 * const nodes = [
 *   { id: '1', type: 'webhook-trigger', ... },
 *   { id: '2', type: 'http-request', ... }
 * ];
 * const nodeTypes = [
 *   { identifier: 'webhook-trigger', triggerType: 'webhook' },
 *   { identifier: 'http-request', nodeCategory: 'action' }
 * ];
 * getTriggerNodes(nodes, nodeTypes); // [{ id: '1', type: 'webhook-trigger', ... }]
 * ```
 */
export function getTriggerNodes(
  nodes: WorkflowNode[],
  nodeTypes: NodeTypeDefinition[]
): WorkflowNode[] {
  return nodes.filter((node) => isTriggerNode(node, nodeTypes));
}

// =============================================================================
// Trigger Extraction Functions
// =============================================================================

/**
 * Infer trigger type from node type identifier using naming patterns.
 * This is a fallback when node type definitions are not available.
 *
 * @param nodeTypeId - The node type identifier
 * @returns The inferred trigger type
 */
function inferTriggerTypeFromIdentifier(nodeTypeId: string): TriggerType {
  const lowerCaseId = nodeTypeId.toLowerCase();

  if (lowerCaseId.includes("webhook")) return "webhook";
  if (lowerCaseId.includes("schedule") || lowerCaseId.includes("cron"))
    return "schedule";
  if (lowerCaseId.includes("polling")) return "polling";
  if (lowerCaseId.includes("workflow-called") || lowerCaseId.includes("workflowcalled"))
    return "workflow-called";

  // Default to manual
  return "manual";
}

/**
 * Check if a node type identifier looks like a trigger based on naming patterns.
 *
 * @param nodeTypeId - The node type identifier
 * @returns True if the identifier suggests a trigger node
 */
function looksLikeTrigger(nodeTypeId: string): boolean {
  return nodeTypeId.toLowerCase().includes("trigger");
}

/**
 * Extract triggers from workflow nodes.
 * Uses node types for accurate trigger detection when available,
 * with fallback to naming pattern detection.
 *
 * @param nodes - Array of workflow nodes
 * @param nodeTypes - Optional array of node type definitions for accurate detection
 * @param config - Optional configuration for extraction behavior
 * @returns Array of extracted trigger configurations
 *
 * @example
 * ```typescript
 * // With node types (recommended)
 * const triggers = extractTriggersFromNodes(nodes, nodeTypes);
 *
 * // Without node types (fallback detection)
 * const triggers = extractTriggersFromNodes(nodes);
 * ```
 */
export function extractTriggersFromNodes(
  nodes: WorkflowNode[],
  nodeTypes?: NodeTypeDefinition[],
  config: TriggerExtractionConfig = {}
): ExtractedTrigger[] {
  const { useFallbackDetection = true } = config;

  if (!Array.isArray(nodes)) {
    return [];
  }

  // If nodeTypes are provided, use them for accurate trigger detection
  if (nodeTypes && nodeTypes.length > 0) {
    return nodes
      .filter((node) => {
        const nodeType = nodeTypes.find((nt) => nt.identifier === node.type);
        return nodeType?.triggerType !== undefined;
      })
      .map((node) => {
        const nodeType = nodeTypes.find((nt) => nt.identifier === node.type);
        const triggerType = nodeType?.triggerType || "manual";

        return {
          id: `trigger-${node.id}`,
          type: triggerType,
          nodeId: node.id,
          active: !node.disabled,
          settings: {
            description:
              node.parameters?.description || `${node.name} trigger`,
            ...node.parameters,
          },
        };
      });
  }

  // Fallback: Simple extraction based on node type naming patterns
  // This ensures backward compatibility if nodeTypes are not provided
  if (!useFallbackDetection) {
    return [];
  }

  return nodes
    .filter((node) => looksLikeTrigger(node.type))
    .map((node) => {
      const triggerType = inferTriggerTypeFromIdentifier(node.type);

      return {
        id: `trigger-${node.id}`,
        type: triggerType,
        nodeId: node.id,
        active: !node.disabled,
        settings: {
          description: node.parameters?.description || `${node.name} trigger`,
          ...node.parameters,
        },
      };
    });
}

// =============================================================================
// Trigger Normalization Functions
// =============================================================================

/**
 * Normalize triggers to ensure they have the active property set.
 *
 * @param triggers - Array of trigger configurations
 * @returns Normalized array of triggers with active property guaranteed
 *
 * @example
 * ```typescript
 * const triggers = [{ id: 't1', type: 'webhook', nodeId: 'n1', settings: {} }];
 * normalizeTriggers(triggers);
 * // [{ id: 't1', type: 'webhook', nodeId: 'n1', settings: {}, active: true }]
 * ```
 */
export function normalizeTriggers(
  triggers: Array<Partial<ExtractedTrigger> & { id: string; type: TriggerType; nodeId: string }>
): ExtractedTrigger[] {
  if (!Array.isArray(triggers)) {
    return [];
  }

  return triggers.map((trigger) => ({
    ...trigger,
    // Set active to true if not explicitly set
    active: trigger.active !== undefined ? trigger.active : true,
    // Ensure settings is always an object
    settings: trigger.settings || {},
  }));
}

/**
 * Filter triggers by type.
 *
 * @param triggers - Array of trigger configurations
 * @param type - The trigger type to filter by
 * @returns Array of triggers matching the specified type
 */
export function filterTriggersByType(
  triggers: ExtractedTrigger[],
  type: TriggerType
): ExtractedTrigger[] {
  return triggers.filter((trigger) => trigger.type === type);
}

/**
 * Get active triggers from a list.
 *
 * @param triggers - Array of trigger configurations
 * @returns Array of active triggers
 */
export function getActiveTriggers(
  triggers: ExtractedTrigger[]
): ExtractedTrigger[] {
  return triggers.filter((trigger) => trigger.active);
}

/**
 * Check if a workflow has any triggers of a specific type.
 *
 * @param nodes - Array of workflow nodes
 * @param nodeTypes - Array of available node type definitions
 * @param type - The trigger type to check for
 * @returns True if the workflow has at least one trigger of the specified type
 */
export function hasTriggerOfType(
  nodes: WorkflowNode[],
  nodeTypes: NodeTypeDefinition[],
  type: TriggerType
): boolean {
  const triggerNodes = getTriggerNodes(nodes, nodeTypes);
  return triggerNodes.some((node) => getTriggerType(node, nodeTypes) === type);
}

/**
 * Count triggers by type in a workflow.
 *
 * @param nodes - Array of workflow nodes
 * @param nodeTypes - Array of available node type definitions
 * @returns Object mapping trigger types to their counts
 */
export function countTriggersByType(
  nodes: WorkflowNode[],
  nodeTypes: NodeTypeDefinition[]
): Partial<Record<TriggerType, number>> {
  const triggerNodes = getTriggerNodes(nodes, nodeTypes);
  const counts: Partial<Record<TriggerType, number>> = {};

  for (const node of triggerNodes) {
    const type = getTriggerType(node, nodeTypes);
    if (type) {
      counts[type] = (counts[type] || 0) + 1;
    }
  }

  return counts;
}
