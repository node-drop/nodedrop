/**
 * @nodedrop/types - Node Types
 *
 * Consolidated node definition type definitions shared between frontend and backend.
 * This module provides the single source of truth for node definitions, properties,
 * credentials, and related types.
 *
 * Types are inferred from Zod schemas to ensure runtime validation and compile-time
 * type safety are always in sync.
 */

import { z } from "zod";

// Import types from workflow.ts for use in this module
// Note: NodeSetting, NodeSettingsConfig, and TriggerType are exported from workflow.ts
// to avoid duplicate exports
import type { NodeSetting, NodeSettingsConfig, TriggerType } from "./workflow";

// Import schemas from the schemas module
import {
  // Category and capability schemas
  NodeCategorySchema,
  ExecutionCapabilitySchema,
  // Property schemas
  NodePropertyTypeSchema,
  NodePropertyOptionSchema,
  NodeDisplayOptionsSchema,
  NodeTypeOptionsSchema,
  NodePropertySchema,
  // Credential schemas
  CredentialSelectorConfigSchema,
  CredentialAuthenticationSchema,
  CredentialDefinitionSchema,
  // Input/Output configuration schemas
  NodeInputConfigSchema,
  ServiceInputSchema,
  // Settings schemas
  NodeSettingsSchema,
  // Node definition schemas
  NodeTypeInfoSchema,
  NodeSchemaSchema,
  // Validation schemas
  NodeValidationErrorSchema,
  NodeValidationResultSchema,
  // Registration schemas
  NodeRegistrationResultSchema,
} from "./schemas/node.schemas";

// =============================================================================
// Re-export Schemas for direct access
// Note: NodeSettingSchema, NodeSettingsConfigSchema, and TriggerTypeSchema are
// exported from workflow.ts to avoid duplicate exports
// =============================================================================

export {
  NodeCategorySchema,
  ExecutionCapabilitySchema,
  NodePropertyTypeSchema,
  NodePropertyOptionSchema,
  NodeDisplayOptionsSchema,
  NodeTypeOptionsSchema,
  NodePropertySchema,
  CredentialSelectorConfigSchema,
  CredentialAuthenticationSchema,
  CredentialDefinitionSchema,
  NodeInputConfigSchema,
  ServiceInputSchema,
  NodeSettingsSchema,
  NodeTypeInfoSchema,
  NodeSchemaSchema,
  NodeValidationErrorSchema,
  NodeValidationResultSchema,
  NodeRegistrationResultSchema,
};

// =============================================================================
// Node Category and Capability Types (inferred from schemas)
// =============================================================================

/**
 * High-level category for node organization and execution control
 */
export type NodeCategory = z.infer<typeof NodeCategorySchema>;

/**
 * Execution capability of a node
 */
export type ExecutionCapability = z.infer<typeof ExecutionCapabilitySchema>;

// TriggerType is exported from workflow.ts to avoid duplicate exports
// Re-export for backward compatibility within this module
export type { TriggerType };

// =============================================================================
// Node Property Types (inferred from schemas)
// =============================================================================

/**
 * Available property types for node configuration
 */
export type NodePropertyType = z.infer<typeof NodePropertyTypeSchema>;

/**
 * Display options for conditional property visibility
 */
export type NodeDisplayOptions = z.infer<typeof NodeDisplayOptionsSchema>;

/**
 * Type-specific options for node properties
 */
export type NodeTypeOptions = z.infer<typeof NodeTypeOptionsSchema>;

/**
 * Option for select/dropdown properties
 */
export type NodePropertyOption = z.infer<typeof NodePropertyOptionSchema>;

/**
 * Definition for a node property/parameter
 */
export type NodeProperty = z.infer<typeof NodePropertySchema>;

// =============================================================================
// Credential Types (inferred from schemas)
// =============================================================================

/**
 * Configuration for unified credential selector
 */
export type CredentialSelectorConfig = z.infer<typeof CredentialSelectorConfigSchema>;

/**
 * Authentication configuration for credentials
 */
export type CredentialAuthentication = z.infer<typeof CredentialAuthenticationSchema>;

/**
 * Definition for a credential type
 */
export type CredentialDefinition = z.infer<typeof CredentialDefinitionSchema>;

// =============================================================================
// Node Input/Output Configuration Types (inferred from schemas)
// =============================================================================

/**
 * Configuration for a node input
 */
export type NodeInputConfig = z.infer<typeof NodeInputConfigSchema>;

/**
 * Service input configuration for AI Agent nodes
 */
export type ServiceInput = z.infer<typeof ServiceInputSchema>;

// =============================================================================
// Node Settings Types
// Note: NodeSetting and NodeSettingsConfig are exported from workflow.ts
// to avoid duplicate exports. Re-export for backward compatibility.
// =============================================================================

// Re-export NodeSetting and NodeSettingsConfig from workflow.ts
export type { NodeSetting, NodeSettingsConfig };

/**
 * Node settings definition (flat object of settings)
 */
export type NodeSettings = z.infer<typeof NodeSettingsSchema>;

// =============================================================================
// Node Definition Types
// =============================================================================

/**
 * Node lifecycle hooks
 */
export interface NodeHooks {
  activate?: () => Promise<void>;
  deactivate?: () => Promise<void>;
}

/**
 * Complete node definition interface
 * This is the full definition used by the backend for node registration and execution
 * Note: This interface contains functions and cannot be fully represented as a Zod schema
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
  /** Keywords for AI semantic search and understanding */
  keywords?: string[];
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
  /** Custom settings specific to this node type */
  settings?: NodeSettings;
}

// =============================================================================
// Node Schema Types (inferred from schemas)
// =============================================================================

/**
 * Serializable node schema (without execute function)
 * Used for API responses and frontend consumption
 */
export type NodeSchema = z.infer<typeof NodeSchemaSchema>;

/**
 * Node type information for frontend display
 */
export type NodeTypeInfo = z.infer<typeof NodeTypeInfoSchema>;

// =============================================================================
// Node Validation Types (inferred from schemas)
// =============================================================================

/**
 * Validation error for a node property
 */
export type NodeValidationError = z.infer<typeof NodeValidationErrorSchema>;

/**
 * Result of node validation
 */
export type NodeValidationResult = z.infer<typeof NodeValidationResultSchema>;

// =============================================================================
// Node Registration Types (inferred from schemas)
// =============================================================================

/**
 * Result of node registration
 */
export type NodeRegistrationResult = z.infer<typeof NodeRegistrationResultSchema>;

// =============================================================================
// Built-in Node Types
// =============================================================================

/**
 * Enum of built-in node type identifiers
 */
export enum BuiltInNodeTypes {
  HTTP_REQUEST = "http-request",
  JSON = "json",
  SET = "set",
  IF = "if",
  CODE = "code",
  WEBHOOK = "webhook",
  WEBHOOK_TRIGGER = "webhook-trigger",
  SCHEDULE_TRIGGER = "schedule-trigger",
  MANUAL_TRIGGER = "manual-trigger",
  WORKFLOW_CALLED = "workflow-called",
  OPENAI = "openai",
  ANTHROPIC = "anthropic",
}
