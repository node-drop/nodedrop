/**
 * @nodedrop/types - Node Zod Schemas
 *
 * Zod schemas for node-related types. These schemas are the single source of truth -
 * TypeScript types are inferred from them using z.infer<typeof Schema>.
 */

import { z } from "zod";

// =============================================================================
// Node Category and Capability Schemas
// =============================================================================

/**
 * High-level category for node organization and execution control
 */
export const NodeCategorySchema = z.enum([
  "trigger",
  "action",
  "service",
  "tool",
  "condition",
  "transform",
]);
export type NodeCategory = z.infer<typeof NodeCategorySchema>;

/**
 * Execution capability of a node
 */
export const ExecutionCapabilitySchema = z.enum([
  "trigger",
  "action",
  "transform",
  "condition",
]);
export type ExecutionCapability = z.infer<typeof ExecutionCapabilitySchema>;

/**
 * Types of workflow triggers
 */
export const TriggerTypeSchema = z.enum([
  "webhook",
  "schedule",
  "manual",
  "polling",
  "workflow-called",
  "error",
]);
export type TriggerType = z.infer<typeof TriggerTypeSchema>;

// =============================================================================
// Node Property Schemas
// =============================================================================

/**
 * Available property types for node configuration
 */
export const NodePropertyTypeSchema = z.enum([
  "string",
  "number",
  "boolean",
  "options",
  "multiOptions",
  "json",
  "dateTime",
  "collection",
  "autocomplete",
  "credential",
  "custom",
  "conditionRow",
  "columnsMap",
  "expression",
]);
export type NodePropertyType = z.infer<typeof NodePropertyTypeSchema>;

/**
 * Option for select/dropdown properties
 */
export const NodePropertyOptionSchema = z.object({
  name: z.string(),
  value: z.any(),
  description: z.string().optional(),
});

// Override the inferred type to ensure value is required (z.any() infers as optional)
export interface NodePropertyOption {
  name: string;
  value: any;
  description?: string;
}

/**
 * Display options for conditional property visibility
 */
export const NodeDisplayOptionsSchema = z.object({
  show: z.record(z.array(z.any())).optional(),
  hide: z.record(z.array(z.any())).optional(),
});
export type NodeDisplayOptions = z.infer<typeof NodeDisplayOptionsSchema>;

/**
 * Type-specific options for node properties
 */
export const NodeTypeOptionsSchema = z.object({
  multipleValues: z.boolean().optional(),
  multipleValueButtonText: z.string().optional(),
  loadOptionsMethod: z.string().optional(),
  loadOptionsDependsOn: z.array(z.string()).optional(),
  minValue: z.number().optional(),
  maxValue: z.number().optional(),
  rows: z.number().optional(),
  alwaysOpenEditWindow: z.boolean().optional(),
  editor: z.string().optional(),
  editorLanguage: z.string().optional(),
});
export type NodeTypeOptions = z.infer<typeof NodeTypeOptionsSchema>;

/**
 * Definition for a node property/parameter
 */
export const NodePropertySchema = z.object({
  displayName: z.string(),
  name: z.string(),
  type: NodePropertyTypeSchema,
  required: z.boolean().optional(),
  default: z.any().optional(),
  description: z.string().optional(),
  tooltip: z.string().optional(),
  placeholder: z.string().optional(),
  options: z.array(NodePropertyOptionSchema).optional(),
  displayOptions: NodeDisplayOptionsSchema.optional(),
  typeOptions: NodeTypeOptionsSchema.optional(),
  /** Custom component identifier/name */
  component: z.string().optional(),
  /** Additional props for custom component */
  componentProps: z.record(z.any()).optional(),
  /** For credential type - array of credential type names that can be selected */
  allowedTypes: z.array(z.string()).optional(),
});

// Override the inferred type to ensure options uses the correct NodePropertyOption type
export interface NodeProperty {
  displayName: string;
  name: string;
  type: NodePropertyType;
  required?: boolean;
  default?: any;
  description?: string;
  tooltip?: string;
  placeholder?: string;
  options?: NodePropertyOption[];
  displayOptions?: NodeDisplayOptions;
  typeOptions?: NodeTypeOptions;
  /** Custom component identifier/name */
  component?: string;
  /** Additional props for custom component */
  componentProps?: Record<string, any>;
  /** For credential type - array of credential type names that can be selected */
  allowedTypes?: string[];
}

// =============================================================================
// Credential Schemas
// =============================================================================

/**
 * Configuration for unified credential selector
 */
export const CredentialSelectorConfigSchema = z.object({
  displayName: z.string(),
  description: z.string().optional(),
  placeholder: z.string().optional(),
  /** Array of credential type names that can be selected */
  allowedTypes: z.array(z.string()),
  required: z.boolean().optional(),
});
export type CredentialSelectorConfig = z.infer<typeof CredentialSelectorConfigSchema>;

/**
 * Authentication configuration for credentials
 */
export const CredentialAuthenticationSchema = z.object({
  type: z.enum(["generic", "oauth2", "oauth1"]),
  properties: z.record(z.any()),
});
export type CredentialAuthentication = z.infer<typeof CredentialAuthenticationSchema>;

/**
 * Definition for a credential type
 */
export const CredentialDefinitionSchema = z.object({
  name: z.string(),
  displayName: z.string(),
  description: z.string().optional(),
  documentationUrl: z.string().optional(),
  properties: z.array(NodePropertySchema),
  authenticate: CredentialAuthenticationSchema.optional(),
  /** Whether this credential is required for the node */
  required: z.boolean().optional(),
});
export type CredentialDefinition = z.infer<typeof CredentialDefinitionSchema>;

// =============================================================================
// Node Input/Output Configuration Schemas
// =============================================================================

/**
 * Configuration for a node input
 */
export const NodeInputConfigSchema = z.object({
  position: z.enum(["left", "right", "top", "bottom"]).optional(),
  displayName: z.string().optional(),
  required: z.boolean().optional(),
});
export type NodeInputConfig = z.infer<typeof NodeInputConfigSchema>;

/**
 * Service input configuration for AI Agent nodes
 */
export const ServiceInputSchema = z.object({
  name: z.string(),
  displayName: z.string(),
  required: z.boolean().optional(),
  description: z.string().optional(),
});
export type ServiceInput = z.infer<typeof ServiceInputSchema>;

// =============================================================================
// Node Settings Schemas
// =============================================================================

/**
 * Definition for a node setting configuration option
 */
export const NodeSettingSchema = z.object({
  displayName: z.string(),
  name: z.string(),
  type: z.enum(["string", "number", "boolean", "options", "json"]),
  default: z.any(),
  description: z.string(),
  placeholder: z.string().optional(),
  required: z.boolean().optional(),
  disabled: z.boolean().optional(),
  hidden: z.boolean().optional(),
  options: z
    .array(
      z.object({
        name: z.string(),
        value: z.any(),
        description: z.string().optional(),
      })
    )
    .optional(),
  displayOptions: z
    .object({
      show: z.record(z.array(z.any())).optional(),
      hide: z.record(z.array(z.any())).optional(),
    })
    .optional(),
});
export type NodeSetting = z.infer<typeof NodeSettingSchema>;

/**
 * Node settings definition (flat object of settings)
 */
export const NodeSettingsSchema = z.record(NodeSettingSchema);
export type NodeSettings = z.infer<typeof NodeSettingsSchema>;

/**
 * Settings are stored as a flat object with key-value pairs
 */
export const NodeSettingsConfigSchema = z.record(z.any());
export type NodeSettingsConfig = z.infer<typeof NodeSettingsConfigSchema>;

// =============================================================================
// Node Definition Schemas
// =============================================================================

/**
 * Node type information for frontend display
 */
export const NodeTypeInfoSchema = z.object({
  /** Unique identifier for the node type */
  identifier: z.string(),
  displayName: z.string(),
  name: z.string(),
  description: z.string(),
  group: z.array(z.string()),
  version: z.number(),
  defaults: z.record(z.any()),
  inputs: z.array(z.string()),
  outputs: z.array(z.string()),
  /** Optional labeled input names */
  inputNames: z.array(z.string()).optional(),
  /** Optional labeled output names */
  outputNames: z.array(z.string()).optional(),
  /** Optional service inputs for AI Agent nodes */
  serviceInputs: z.array(ServiceInputSchema).optional(),
  /** Optional input configuration */
  inputsConfig: z.record(NodeInputConfigSchema).optional(),
  properties: z.array(NodePropertySchema),
  credentials: z.array(CredentialDefinitionSchema).optional(),
  credentialSelector: CredentialSelectorConfigSchema.optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
  /** Optional custom output component identifier */
  outputComponent: z.string().optional(),
  /** Node category for high-level organization */
  nodeCategory: NodeCategorySchema.optional(),
  /** Trigger-specific metadata */
  triggerType: TriggerTypeSchema.optional(),
  /** Execution metadata */
  executionCapability: ExecutionCapabilitySchema.optional(),
  canExecuteIndividually: z.boolean().optional(),
  canBeDisabled: z.boolean().optional(),
});
export type NodeTypeInfo = z.infer<typeof NodeTypeInfoSchema>;

/**
 * Serializable node schema (without execute function)
 * Used for API responses and frontend consumption
 */
export const NodeSchemaSchema = z.object({
  /** Unique identifier for the node type */
  identifier: z.string(),
  /** High-level category */
  nodeCategory: NodeCategorySchema.optional(),
  displayName: z.string(),
  name: z.string(),
  group: z.array(z.string()),
  version: z.number(),
  description: z.string(),
  defaults: z.record(z.any()),
  inputs: z.array(z.string()),
  outputs: z.array(z.string()),
  /** Optional input configuration */
  inputsConfig: z.record(NodeInputConfigSchema).optional(),
  properties: z.array(NodePropertySchema),
  credentials: z.array(CredentialDefinitionSchema).optional(),
  credentialSelector: CredentialSelectorConfigSchema.optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
});
export type NodeSchema = z.infer<typeof NodeSchemaSchema>;

// =============================================================================
// Node Validation Schemas
// =============================================================================

/**
 * Validation error for a node property
 */
export const NodeValidationErrorSchema = z.object({
  property: z.string(),
  message: z.string(),
  value: z.any().optional(),
});
export type NodeValidationError = z.infer<typeof NodeValidationErrorSchema>;

/**
 * Result of node validation
 */
export const NodeValidationResultSchema = z.object({
  valid: z.boolean(),
  errors: z.array(NodeValidationErrorSchema),
});
export type NodeValidationResult = z.infer<typeof NodeValidationResultSchema>;

// =============================================================================
// Node Registration Schemas
// =============================================================================

/**
 * Result of node registration
 */
export const NodeRegistrationResultSchema = z.object({
  success: z.boolean(),
  identifier: z.string().optional(),
  errors: z.array(z.string()).optional(),
});
export type NodeRegistrationResult = z.infer<typeof NodeRegistrationResultSchema>;
