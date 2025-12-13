// Node system type definitions
// Re-exports shared types from @nodedrop/types and defines backend-specific types

import { NodeSettingsConfig } from "./settings.types";

// =============================================================================
// Re-export shared types from @nodedrop/types
// =============================================================================
export {
  // Node category and capability types
  NodeCategory,
  ExecutionCapability,
  
  // Node property types
  NodePropertyType,
  NodeDisplayOptions,
  NodeTypeOptions,
  NodePropertyOption,
  NodeProperty,
  
  // Credential types
  CredentialSelectorConfig,
  CredentialAuthentication,
  CredentialDefinition,
  
  // Node input/output configuration types
  NodeInputConfig,
  ServiceInput,
  
  // Node definition types (excluding execute function - backend adds that)
  NodeHooks,
  NodeSettings,
  NodeSchema,
  NodeTypeInfo,
  
  // Node validation types
  NodeValidationError,
  NodeValidationResult,
  
  // Node registration types
  NodeRegistrationResult,
  
  // Built-in node types
  BuiltInNodeTypes,
  
  // Re-export TriggerType from workflow types
  TriggerType,
} from "@nodedrop/types";

// Import types we need to extend
import type {
  NodeProperty,
  NodeHooks,
  NodeSettings,
  CredentialDefinition,
  CredentialSelectorConfig,
  NodeInputConfig,
  ServiceInput,
  NodeCategory,
  ExecutionCapability,
  TriggerType,
} from "@nodedrop/types";

// =============================================================================
// Backend-specific types (execution-related)
// =============================================================================

/**
 * Input data structure for node execution
 */
export interface NodeInputData {
  main?: any[][];
  [key: string]: any[][] | undefined;
}

/**
 * Output data structure from node execution
 */
export interface NodeOutputData {
  main?: any[];
  [key: string]: any[] | undefined;
}

/**
 * Standardized node output format for consistent frontend handling
 */
export interface StandardizedNodeOutput {
  main: any[];
  branches?: Record<string, any[]>;
  metadata: {
    nodeType: string;
    outputCount: number;
    hasMultipleBranches: boolean;
  };
}

/**
 * Execution context provided to nodes during execution
 */
export interface NodeExecutionContext {
  getNodeParameter(parameterName: string, itemIndex?: number): any;
  getCredentials(type: string): Promise<any>;
  getInputData(inputName?: string): NodeInputData;
  helpers: NodeHelpers;
  logger: NodeLogger;
  settings?: NodeSettingsConfig;
  userId?: string;
  // Utility functions for common node operations
  resolveValue: (value: string | any, item: any) => any;
  resolvePath: (obj: any, path: string) => any;
  extractJsonData: (items: any[]) => any[];
  wrapJsonData: (items: any[]) => any[];
  normalizeInputItems: (items: any[] | any[][]) => any[];
  // State management for stateful nodes (like Loop)
  getNodeState?: () => Record<string, any>;
  setNodeState?: (state: Record<string, any>) => void;
}

/**
 * Helper functions available in node execution context
 */
export interface NodeHelpers {
  request: (options: RequestOptions) => Promise<any>;
  requestWithAuthentication: (
    credentialType: string,
    options: RequestOptions
  ) => Promise<any>;
  returnJsonArray: (jsonData: any[]) => NodeOutputData;
  normalizeItems: (items: any[]) => any[];
}

/**
 * Logger interface for node execution
 */
export interface NodeLogger {
  executionId?: string;
  debug: (message: string, extra?: any) => void;
  info: (message: string, extra?: any) => void;
  warn: (message: string, extra?: any) => void;
  error: (message: string, extra?: any) => void;
}

/**
 * Options for HTTP requests made by nodes
 */
export interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  url: string;
  headers?: Record<string, string>;
  body?: any;
  json?: boolean;
  timeout?: number;
  followRedirect?: boolean;
  ignoreHttpStatusErrors?: boolean;
}

/**
 * Node execute function signature
 */
export type NodeExecuteFunction = (
  this: NodeExecutionContext,
  inputData: NodeInputData
) => Promise<NodeOutputData[]>;

/**
 * Result of node execution
 */
export interface NodeExecutionResult {
  success: boolean;
  data?: StandardizedNodeOutput;
  error?: {
    message: string;
    stack?: string;
    httpCode?: number;
  };
}

// =============================================================================
// Backend-specific NodeDefinition (extends shared types with execute function)
// =============================================================================

/**
 * Complete node definition interface for backend
 * This extends the shared NodeDefinition with the execute function
 */
export interface NodeDefinition {
  /** Unique identifier for the node type */
  identifier: string;
  /** High-level category for organization and execution control */
  nodeCategory?: NodeCategory;
  displayName: string;
  name: string;
  group: string[];
  version: number;
  description: string;
  defaults: Record<string, any>;
  inputs: string[];
  outputs: string[];
  /** Optional names for each input */
  inputNames?: string[];
  /** Optional names for each output */
  outputNames?: string[];
  /** Service connections (rendered at bottom-right with labels) */
  serviceInputs?: ServiceInput[];
  /** Optional input configuration */
  inputsConfig?: Record<string, NodeInputConfig>;
  credentials?: CredentialDefinition[];
  credentialSelector?: CredentialSelectorConfig;
  /** Support both static and dynamic properties */
  properties: NodeProperty[] | (() => NodeProperty[]);
  /** Node execution function - backend specific */
  execute: NodeExecuteFunction;
  /** Node lifecycle hooks */
  hooks?: NodeHooks;
  icon?: string;
  color?: string;
  /** Optional custom output component identifier */
  outputComponent?: string;
  /** Trigger-specific metadata (only for trigger nodes) */
  triggerType?: TriggerType;
  /** Execution metadata */
  executionCapability?: ExecutionCapability;
  canExecuteIndividually?: boolean;
  canBeDisabled?: boolean;
  /** Dynamic options loading */
  loadOptions?: Record<
    string,
    (
      this: NodeExecutionContext
    ) => Promise<Array<{ name: string; value: any; description?: string }>>
  >;
  /** Custom settings specific to this node type */
  settings?: NodeSettings;
}
