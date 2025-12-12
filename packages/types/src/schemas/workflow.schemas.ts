/**
 * @nodedrop/types - Workflow Zod Schemas
 *
 * Zod schemas for workflow-related types. These schemas are the single source of truth -
 * TypeScript types are inferred from them using z.infer<typeof Schema>.
 */

import { z } from "zod";
import { NodeSettingSchema, NodeSettingsConfigSchema } from "./node.schemas";

// =============================================================================
// Node Settings Schemas (Re-export for convenience)
// =============================================================================

// NodeSettingSchema and NodeSettingsConfigSchema are defined in node.schemas.ts
// Re-export the types for workflow context
export { NodeSettingSchema, NodeSettingsConfigSchema };
export type { NodeSetting, NodeSettingsConfig } from "./node.schemas";

// =============================================================================
// Connection Control Point Schema
// =============================================================================

/**
 * Control point for editable edges
 */
export const ConnectionControlPointSchema = z.object({
  id: z.string(),
  x: z.number(),
  y: z.number(),
  active: z.boolean().optional(),
});
export type ConnectionControlPoint = z.infer<typeof ConnectionControlPointSchema>;

// =============================================================================
// Workflow Node Schema
// =============================================================================

/**
 * Represents a node within a workflow
 */
export const WorkflowNodeSchema = z.object({
  id: z.string(),
  type: z.string(),
  name: z.string(),
  description: z.string().optional(),
  parameters: z.record(z.any()),
  position: z.object({ x: z.number(), y: z.number() }),
  credentials: z.array(z.string()).optional(),
  disabled: z.boolean(),
  locked: z.boolean().optional(),
  mockData: z.any().optional(),
  mockDataPinned: z.boolean().optional(),
  /** Settings configuration for this node instance */
  settings: NodeSettingsConfigSchema.optional(),
  /** Visual properties */
  icon: z.string().optional(),
  color: z.string().optional(),
  /** Group node properties */
  parentId: z.string().optional(),
  extent: z
    .union([
      z.literal("parent"),
      z.tuple([z.number(), z.number(), z.number(), z.number()]),
    ])
    .optional(),
  style: z
    .object({
      width: z.number().optional(),
      height: z.number().optional(),
      backgroundColor: z.string().optional(),
    })
    .catchall(z.any())
    .optional(),
});
export type WorkflowNode = z.infer<typeof WorkflowNodeSchema>;

// =============================================================================
// Workflow Connection Schema
// =============================================================================

/**
 * Represents a connection between two nodes in a workflow
 */
export const WorkflowConnectionSchema = z.object({
  id: z.string(),
  sourceNodeId: z.string(),
  sourceOutput: z.string(),
  targetNodeId: z.string(),
  targetInput: z.string(),
  /** Edge algorithm type (Step, Linear, CatmullRom, BezierCatmullRom) */
  algorithm: z.string().optional(),
  /** Control points for editable edges */
  controlPoints: z.array(ConnectionControlPointSchema).optional(),
});
export type WorkflowConnection = z.infer<typeof WorkflowConnectionSchema>;

// =============================================================================
// Workflow Settings Schema
// =============================================================================

/**
 * Workflow-level settings configuration
 */
export const WorkflowSettingsSchema = z.object({
  timezone: z.string().optional(),
  saveDataErrorExecution: z.enum(["all", "none"]).optional(),
  saveDataSuccessExecution: z.enum(["all", "none"]).optional(),
  saveManualExecutions: z.boolean().optional(),
  /** Skip saving executions to database (for high-traffic APIs) */
  saveExecutionToDatabase: z.boolean().optional(),
  callerPolicy: z
    .enum(["workflowsFromSameOwner", "workflowsFromAList", "any"])
    .optional(),
  /** Execution timeout in milliseconds (backend only) */
  executionTimeout: z.number().optional(),
  /** Whether to save execution progress (backend only) */
  saveExecutionProgress: z.boolean().optional(),
  /** ID of workflow to execute when this workflow fails (n8n-style error handling) */
  errorWorkflowId: z.string().optional(),
});
export type WorkflowSettings = z.infer<typeof WorkflowSettingsSchema>;

// =============================================================================
// Workflow Metadata Schema
// =============================================================================

/**
 * Metadata about a workflow for import/export and versioning
 */
export const WorkflowMetadataSchema = z.object({
  title: z.string(),
  lastTitleUpdate: z.string(),
  exportVersion: z.string(),
  importSource: z.string().optional(),
  createdBy: z.string().optional(),
  lastModifiedBy: z.string().optional(),
  version: z.number().optional(),
  schemaVersion: z.string().optional(),
  tags: z.array(z.string()).optional(),
  customProperties: z.record(z.any()).optional(),
});
export type WorkflowMetadata = z.infer<typeof WorkflowMetadataSchema>;

// =============================================================================
// Workflow Sharing Schemas
// =============================================================================

/**
 * Permission levels for shared workflows
 */
export const WorkflowSharePermissionSchema = z.enum(["view", "edit", "admin"]);
export type WorkflowSharePermission = z.infer<typeof WorkflowSharePermissionSchema>;

/**
 * Represents a workflow share with another user
 */
export const WorkflowShareSchema = z.object({
  userId: z.string(),
  userEmail: z.string(),
  permission: WorkflowSharePermissionSchema,
  sharedAt: z.string(),
});
export type WorkflowShare = z.infer<typeof WorkflowShareSchema>;

// =============================================================================
// Workflow Analytics Schema
// =============================================================================

/**
 * Analytics data for a workflow
 */
export const WorkflowAnalyticsSchema = z.object({
  totalExecutions: z.number(),
  successfulExecutions: z.number(),
  failedExecutions: z.number(),
  averageExecutionTime: z.number(),
  lastExecutedAt: z.string().optional(),
  popularityScore: z.number(),
});
export type WorkflowAnalytics = z.infer<typeof WorkflowAnalyticsSchema>;

// =============================================================================
// Core Workflow Schema
// =============================================================================

/**
 * Core workflow interface representing a complete workflow definition
 */
export const WorkflowSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  userId: z.string(),
  teamId: z.string().nullable().optional(),
  nodes: z.array(WorkflowNodeSchema),
  connections: z.array(WorkflowConnectionSchema),
  settings: WorkflowSettingsSchema,
  active: z.boolean(),
  tags: z.array(z.string()).optional(),
  category: z.string().optional(),
  isTemplate: z.boolean().optional(),
  isPublic: z.boolean().optional(),
  sharedWith: z.array(WorkflowShareSchema).optional(),
  analytics: WorkflowAnalyticsSchema.optional(),
  metadata: WorkflowMetadataSchema.optional(),
  createdAt: z.union([z.string(), z.date()]),
  updatedAt: z.union([z.string(), z.date()]),
});
export type Workflow = z.infer<typeof WorkflowSchema>;

// =============================================================================
// Workflow Template Schema
// =============================================================================

/**
 * Represents a workflow template that can be used to create new workflows
 */
export const WorkflowTemplateSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  category: z.string(),
  tags: z.array(z.string()),
  nodes: z.array(WorkflowNodeSchema),
  connections: z.array(WorkflowConnectionSchema),
  settings: WorkflowSettingsSchema,
  author: z.string(),
  downloads: z.number(),
  rating: z.number(),
  createdAt: z.union([z.string(), z.date()]),
  updatedAt: z.union([z.string(), z.date()]),
});
export type WorkflowTemplate = z.infer<typeof WorkflowTemplateSchema>;

// =============================================================================
// Workflow Filter Schemas
// =============================================================================

/**
 * Sort options for workflow listings
 */
export const WorkflowSortBySchema = z.enum([
  "name",
  "createdAt",
  "updatedAt",
  "popularity",
  "executions",
]);
export type WorkflowSortBy = z.infer<typeof WorkflowSortBySchema>;

/**
 * Sort order for workflow listings
 */
export const WorkflowSortOrderSchema = z.enum(["asc", "desc"]);
export type WorkflowSortOrder = z.infer<typeof WorkflowSortOrderSchema>;

/**
 * Filter options for querying workflows
 */
export const WorkflowFiltersSchema = z.object({
  search: z.string().optional(),
  tags: z.array(z.string()).optional(),
  category: z.string().optional(),
  isTemplate: z.boolean().optional(),
  isPublic: z.boolean().optional(),
  active: z.boolean().optional(),
  userId: z.string().optional(),
  sortBy: WorkflowSortBySchema.optional(),
  sortOrder: WorkflowSortOrderSchema.optional(),
  page: z.number().optional(),
  limit: z.number().optional(),
  offset: z.number().optional(),
});
export type WorkflowFilters = z.infer<typeof WorkflowFiltersSchema>;

// =============================================================================
// Workflow Import/Export Schema
// =============================================================================

/**
 * Structure for workflow import/export operations
 */
export const WorkflowImportExportSchema = z.object({
  workflow: WorkflowSchema.omit({
    id: true,
    userId: true,
    createdAt: true,
    updatedAt: true,
  }),
  version: z.string(),
  exportedAt: z.string(),
  exportedBy: z.string(),
});
export type WorkflowImportExport = z.infer<typeof WorkflowImportExportSchema>;

// =============================================================================
// Workflow Trigger Schemas
// =============================================================================

/**
 * Types of workflow triggers (re-exported from node.schemas for convenience)
 */
export { TriggerTypeSchema } from "./node.schemas";
export type { TriggerType } from "./node.schemas";

/**
 * Represents a trigger configuration for a workflow
 */
import { TriggerTypeSchema as NodeTriggerTypeSchema } from "./node.schemas";

export const WorkflowTriggerSchema = z.object({
  id: z.string(),
  type: NodeTriggerTypeSchema,
  settings: z.record(z.any()),
  active: z.boolean(),
  nodeId: z.string().optional(),
  description: z.string().optional(),
});
export type WorkflowTrigger = z.infer<typeof WorkflowTriggerSchema>;

/**
 * Trigger option for workflow trigger selection
 */
export const TriggerOptionSchema = z.object({
  id: z.string(),
  type: NodeTriggerTypeSchema,
  nodeId: z.string(),
  description: z.string().optional(),
  settings: z.record(z.any()).optional(),
});
export type TriggerOption = z.infer<typeof TriggerOptionSchema>;

/**
 * Workflow option with associated triggers
 */
export const WorkflowOptionSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  active: z.boolean(),
  triggers: z.array(TriggerOptionSchema),
});
export type WorkflowOption = z.infer<typeof WorkflowOptionSchema>;

// =============================================================================
// Workflow Editor State Schemas (Frontend-specific but shared for consistency)
// =============================================================================

/**
 * History entry for workflow undo/redo functionality
 */
export const WorkflowHistoryEntrySchema = z.object({
  workflow: WorkflowSchema,
  timestamp: z.number(),
  action: z.string(),
});
export type WorkflowHistoryEntry = z.infer<typeof WorkflowHistoryEntrySchema>;

/**
 * State of the workflow editor
 */
export const WorkflowEditorStateSchema = z.object({
  workflow: WorkflowSchema.nullable(),
  selectedNodeId: z.string().nullable(),
  isLoading: z.boolean(),
  isDirty: z.boolean(),
  history: z.array(WorkflowHistoryEntrySchema),
  historyIndex: z.number(),
});
export type WorkflowEditorState = z.infer<typeof WorkflowEditorStateSchema>;
