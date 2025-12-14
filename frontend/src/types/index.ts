// Frontend type definitions
export * from "./api";
export * from "./auth";
export * from "./credential";
export * from "./customNode";
export * from "./environment";
export * from "./team";
export * from "./variable";
export * from "./workspace";

// Re-export shared types from @nodedrop/types
// These are the canonical types shared between frontend and backend
export type {
  // Workflow types
  Workflow,
  WorkflowNode,
  WorkflowConnection,
  WorkflowSettings,
  WorkflowMetadata,
  WorkflowShare,
  WorkflowSharePermission,
  WorkflowAnalytics,
  WorkflowTemplate,
  WorkflowFilters,
  WorkflowSortBy,
  WorkflowSortOrder,
  WorkflowImportExport,
  WorkflowTrigger,
  WorkflowHistoryEntry,
  WorkflowEditorState,
  ConnectionControlPoint,
  NodeSettingsConfig,
  NodeSetting,
  TriggerType,
  TriggerOption,
  WorkflowOption,
  // Node types from shared package
  NodeCategory,
  ExecutionCapability,
  NodePropertyType,
  NodeDisplayOptions,
  NodeTypeOptions,
  NodePropertyOption,
  CredentialSelectorConfig,
  CredentialAuthentication,
  NodeInputConfig,
  ServiceInput,
  NodeHooks,
  NodeSettings,
  NodeDefinition,
  NodeSchema,
  NodeTypeInfo,
  NodeValidationError,
  NodeValidationResult,
  NodeRegistrationResult,
  // Execution types from shared package
  NodeExecutionState,
  NodeVisualState,
  ExecutionProgress,
  ExecutionFlowStatus,
  FlowExecutionState,
  ExecutionError,
  ExecutionEvent,
  ExecutionMetrics,
  ExecutionStatus,
  ExecutionResponse,
  SingleNodeExecutionResult,
  ExecutionStats,
  ExecutionLogEntry,
  // Common types from shared package
  Timestamp,
  JsonValue,
  JsonObject,
  JsonArray,
  DeepPartial,
  Nullable,
} from "@nodedrop/types";

// Re-export enums (not types)
export { NodeExecutionStatus, BuiltInNodeTypes } from "@nodedrop/types";

// Rename shared types to avoid conflicts with frontend-specific types
export type { 
  NodeProperty as SharedNodeProperty,
  CredentialDefinition as SharedCredentialDefinition,
} from "@nodedrop/types";

// Re-export frontend-specific workflow types
// These extend or complement the shared types
export type {
  NodeType,
  NodeProperty,
  CredentialDefinition,
  TemplateVariable,
  NodePaletteCategory,
  ReactFlowNode,
  ReactFlowEdge,
  ExecutionState,
  WorkflowExecutionResult,
  NodeExecutionResult,
} from "./workflow";
