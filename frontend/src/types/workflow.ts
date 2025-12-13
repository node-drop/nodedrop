/**
 * Frontend-specific workflow types
 * 
 * Shared types (Workflow, WorkflowNode, WorkflowConnection, etc.) are imported from @nodedrop/types.
 * This file contains only frontend-specific types that extend or complement the shared types.
 */

import {
  WorkflowNode,
  WorkflowConnection,
  NodeSetting,
  NodeProperty as SharedNodeProperty,
  NodeTypeInfo,
  CredentialSelectorConfig,
  NodeInputConfig,
} from "@nodedrop/types";

// Re-export shared types for backward compatibility
export type { 
  WorkflowNode, 
  WorkflowConnection, 
  NodeSetting,
  TriggerType,
  NodeCategory,
  ExecutionCapability,
  NodePropertyType,
  NodeDisplayOptions,
  NodeTypeOptions,
  NodePropertyOption,
  CredentialDefinition,
} from "@nodedrop/types";

// =============================================================================
// Frontend-specific Node Types (extending shared types)
// =============================================================================

/**
 * Frontend node property - uses shared NodeProperty directly
 * The shared type includes all property types: string, number, boolean, options,
 * multiOptions, json, dateTime, collection, autocomplete, credential, custom,
 * conditionRow, columnsMap, expression
 */
export type NodeProperty = SharedNodeProperty;

/**
 * Template variable for workflow templates
 */
export interface TemplateVariable {
  name: string;
  displayName: string;
  description?: string;
  type: 'string' | 'text' | 'number' | 'boolean' | 'options' | 'multiOptions' | 'json' | 'dateTime' | 'textarea' | 'password' | 'email' | 'url' | 'switch' | 'credential';
  default?: any;
  required?: boolean;
  options?: Array<{ name: string; value: any; description?: string }>;
  placeholder?: string;
  tooltip?: string;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    minLength?: number;
    maxLength?: number;
  };
  allowedTypes?: string[];
}

/**
 * Frontend NodeType - extends shared NodeTypeInfo with frontend-specific fields
 * This is the type used by the frontend for node type definitions
 * 
 * Note: The database table is named "NodeType", so we keep this name for consistency.
 * The shared package uses "NodeTypeInfo" for the same concept.
 */
export interface NodeType extends NodeTypeInfo {
  // Override credentialSelector to ensure type compatibility
  credentialSelector?: CredentialSelectorConfig;
  // Override inputsConfig to ensure type compatibility
  inputsConfig?: Record<string, NodeInputConfig>;
  // Frontend-specific fields (not in shared types)
  active?: boolean;
  id?: string;
  createdAt?: string;
  updatedAt?: string;
  settings?: Record<string, NodeSetting>;
  // Template fields (frontend-only)
  isTemplate?: boolean;
  templateData?: {
    nodes: WorkflowNode[];
    connections: WorkflowConnection[];
    variables?: TemplateVariable[];
  };
}

// =============================================================================
// Node Palette Types
// =============================================================================

export interface NodePaletteCategory {
  name: string;
  nodes: NodeType[];
}

// =============================================================================
// React Flow Types
// =============================================================================

export interface ReactFlowNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: {
    label: string;
    nodeType: string;
    parameters: Record<string, any>;
    disabled: boolean;
  };
}

export interface ReactFlowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
}

// =============================================================================
// Execution Types (Frontend-specific)
// =============================================================================

/**
 * Frontend execution state for UI
 */
export interface ExecutionState {
  status: "idle" | "running" | "success" | "error" | "cancelled" | "paused";
  progress?: number;
  startTime?: number;
  endTime?: number;
  error?: string;
  executionId?: string;
}

/**
 * Frontend workflow execution result
 */
export interface WorkflowExecutionResult {
  executionId: string;
  workflowId: string;
  status: "success" | "error" | "cancelled";
  startTime: number;
  endTime: number;
  duration: number;
  nodeResults: NodeExecutionResult[];
  error?: string;
  triggerNodeId?: string;
}

/**
 * Frontend node execution result
 */
export interface NodeExecutionResult {
  nodeId: string;
  nodeName: string;
  status: "success" | "error" | "skipped";
  startTime: number;
  endTime: number;
  duration: number;
  data?: any;
  error?: string;
}
