/**
 * @nodedrop/types - Workflow Types
 *
 * Consolidated workflow-related type definitions shared between frontend and backend.
 * This module provides the single source of truth for workflow, node, and connection types.
 *
 * Types are inferred from Zod schemas to ensure runtime validation and compile-time
 * type safety are always in sync.
 */

import { z } from "zod";

// Import schemas from the schemas module
import {
  // Node settings schemas (defined in node.schemas but used in workflow context)
  NodeSettingSchema,
  NodeSettingsConfigSchema,
} from "./schemas/node.schemas";

import {
  // Connection schemas
  ConnectionControlPointSchema,
  // Workflow node schemas
  WorkflowNodeSchema,
  // Workflow connection schemas
  WorkflowConnectionSchema,
  // Workflow settings schemas
  WorkflowSettingsSchema,
  // Workflow metadata schemas
  WorkflowMetadataSchema,
  // Workflow sharing schemas
  WorkflowSharePermissionSchema,
  WorkflowShareSchema,
  // Workflow analytics schemas
  WorkflowAnalyticsSchema,
  // Core workflow schema
  WorkflowSchema,
  // Workflow template schema
  WorkflowTemplateSchema,
  // Workflow filter schemas
  WorkflowSortBySchema,
  WorkflowSortOrderSchema,
  WorkflowFiltersSchema,
  // Workflow import/export schema
  WorkflowImportExportSchema,
  // Workflow trigger schemas
  TriggerTypeSchema,
  WorkflowTriggerSchema,
  TriggerOptionSchema,
  WorkflowOptionSchema,
  // Workflow editor state schemas
  WorkflowHistoryEntrySchema,
  WorkflowEditorStateSchema,
} from "./schemas/workflow.schemas";

// =============================================================================
// Re-export Schemas for direct access
// =============================================================================

export {
  NodeSettingSchema,
  NodeSettingsConfigSchema,
  ConnectionControlPointSchema,
  WorkflowNodeSchema,
  WorkflowConnectionSchema,
  WorkflowSettingsSchema,
  WorkflowMetadataSchema,
  WorkflowSharePermissionSchema,
  WorkflowShareSchema,
  WorkflowAnalyticsSchema,
  WorkflowSchema,
  WorkflowTemplateSchema,
  WorkflowSortBySchema,
  WorkflowSortOrderSchema,
  WorkflowFiltersSchema,
  WorkflowImportExportSchema,
  TriggerTypeSchema,
  WorkflowTriggerSchema,
  TriggerOptionSchema,
  WorkflowOptionSchema,
  WorkflowHistoryEntrySchema,
  WorkflowEditorStateSchema,
};

// =============================================================================
// Node Settings Types (inferred from schemas)
// =============================================================================

/**
 * Settings are stored as a flat object with key-value pairs
 */
export type NodeSettingsConfig = z.infer<typeof NodeSettingsConfigSchema>;

/**
 * Definition for a node setting configuration option
 */
export type NodeSetting = z.infer<typeof NodeSettingSchema>;

// =============================================================================
// Workflow Node Types (inferred from schemas)
// =============================================================================

/**
 * Represents a node within a workflow
 */
export type WorkflowNode = z.infer<typeof WorkflowNodeSchema>;

// =============================================================================
// Workflow Connection Types (inferred from schemas)
// =============================================================================

/**
 * Control point for editable edges
 */
export type ConnectionControlPoint = z.infer<typeof ConnectionControlPointSchema>;

/**
 * Represents a connection between two nodes in a workflow
 */
export type WorkflowConnection = z.infer<typeof WorkflowConnectionSchema>;

// =============================================================================
// Workflow Settings Types (inferred from schemas)
// =============================================================================

/**
 * Workflow-level settings configuration
 */
export type WorkflowSettings = z.infer<typeof WorkflowSettingsSchema>;

// =============================================================================
// Workflow Metadata Types (inferred from schemas)
// =============================================================================

/**
 * Metadata about a workflow for import/export and versioning
 */
export type WorkflowMetadata = z.infer<typeof WorkflowMetadataSchema>;

// =============================================================================
// Workflow Sharing Types (inferred from schemas)
// =============================================================================

/**
 * Permission levels for shared workflows
 */
export type WorkflowSharePermission = z.infer<typeof WorkflowSharePermissionSchema>;

/**
 * Represents a workflow share with another user
 */
export type WorkflowShare = z.infer<typeof WorkflowShareSchema>;

// =============================================================================
// Workflow Analytics Types (inferred from schemas)
// =============================================================================

/**
 * Analytics data for a workflow
 */
export type WorkflowAnalytics = z.infer<typeof WorkflowAnalyticsSchema>;

// =============================================================================
// Core Workflow Type (inferred from schema)
// =============================================================================

/**
 * Core workflow interface representing a complete workflow definition
 */
export type Workflow = z.infer<typeof WorkflowSchema>;

// =============================================================================
// Workflow Template Types (inferred from schemas)
// =============================================================================

/**
 * Represents a workflow template that can be used to create new workflows
 */
export type WorkflowTemplate = z.infer<typeof WorkflowTemplateSchema>;

// =============================================================================
// Workflow Filter Types (inferred from schemas)
// =============================================================================

/**
 * Sort options for workflow listings
 */
export type WorkflowSortBy = z.infer<typeof WorkflowSortBySchema>;

/**
 * Sort order for workflow listings
 */
export type WorkflowSortOrder = z.infer<typeof WorkflowSortOrderSchema>;

/**
 * Filter options for querying workflows
 */
export type WorkflowFilters = z.infer<typeof WorkflowFiltersSchema>;

// =============================================================================
// Workflow Import/Export Types (inferred from schemas)
// =============================================================================

/**
 * Structure for workflow import/export operations
 */
export type WorkflowImportExport = z.infer<typeof WorkflowImportExportSchema>;

// =============================================================================
// Workflow Trigger Types (inferred from schemas)
// =============================================================================

/**
 * Types of workflow triggers
 */
export type TriggerType = z.infer<typeof TriggerTypeSchema>;

/**
 * Represents a trigger configuration for a workflow
 */
export type WorkflowTrigger = z.infer<typeof WorkflowTriggerSchema>;

/**
 * Trigger option for workflow trigger selection
 */
export type TriggerOption = z.infer<typeof TriggerOptionSchema>;

/**
 * Workflow option with associated triggers
 */
export type WorkflowOption = z.infer<typeof WorkflowOptionSchema>;

// =============================================================================
// Workflow Editor State Types (inferred from schemas)
// =============================================================================

/**
 * History entry for workflow undo/redo functionality
 */
export type WorkflowHistoryEntry = z.infer<typeof WorkflowHistoryEntrySchema>;

/**
 * State of the workflow editor
 */
export type WorkflowEditorState = z.infer<typeof WorkflowEditorStateSchema>;
