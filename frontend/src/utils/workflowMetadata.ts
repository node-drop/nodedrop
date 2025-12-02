/**
 * Workflow metadata management utilities
 * Handles creation, validation, migration, and persistence of workflow metadata
 */

import { Workflow, WorkflowMetadata } from "@/types/workflow";
import { ErrorCodes, ValidationError } from "./errorHandling";

/**
 * Current metadata schema version
 */
export const CURRENT_METADATA_SCHEMA_VERSION = "1.0.0";

/**
 * Default metadata values
 */
export const DEFAULT_METADATA: Partial<WorkflowMetadata> = {
  exportVersion: "1.0.0",
  schemaVersion: CURRENT_METADATA_SCHEMA_VERSION,
  version: 1,
  tags: [],
  customProperties: {},
};

/**
 * Create default metadata for a new workflow
 */
export function createDefaultMetadata(
  title: string,
  createdBy?: string
): WorkflowMetadata {
  const now = new Date().toISOString();

  return {
    title: title || "Untitled Workflow",
    lastTitleUpdate: now,
    exportVersion: DEFAULT_METADATA.exportVersion!,
    schemaVersion: DEFAULT_METADATA.schemaVersion!,
    version: DEFAULT_METADATA.version!,
    createdBy,
    lastModifiedBy: createdBy,
    tags: [],
    customProperties: {},
  };
}

/**
 * Update metadata with new values
 */
export function updateMetadata(
  currentMetadata: WorkflowMetadata | undefined,
  updates: Partial<WorkflowMetadata>,
  modifiedBy?: string
): WorkflowMetadata {
  const now = new Date().toISOString();

  // If no current metadata exists, create default first
  const base =
    currentMetadata ||
    createDefaultMetadata(updates.title || "Untitled Workflow");

  // Update version if content has changed (excluding title-only changes)
  const shouldIncrementVersion = Object.keys(updates).some(
    (key) =>
      key !== "title" && key !== "lastTitleUpdate" && key !== "lastModifiedBy"
  );

  const updated: WorkflowMetadata = {
    ...base,
    ...updates,
    lastModifiedBy: modifiedBy || base.lastModifiedBy,
    version: shouldIncrementVersion
      ? (base.version || 1) + 1
      : base.version || 1,
    schemaVersion: CURRENT_METADATA_SCHEMA_VERSION,
  };

  // Update lastTitleUpdate if title changed
  if (updates.title && updates.title !== base.title) {
    updated.lastTitleUpdate = now;
  }

  return updated;
}

/**
 * Migrate metadata from older schema versions
 */
export function migrateMetadata(
  metadata: Partial<WorkflowMetadata> | undefined,
  workflowName?: string
): WorkflowMetadata {
  if (!metadata) {
    return createDefaultMetadata(workflowName || "Untitled Workflow");
  }

  const migrated = { ...metadata } as WorkflowMetadata;
  const now = new Date().toISOString();

  // Ensure required fields exist
  if (!migrated.title) {
    migrated.title = workflowName || "Untitled Workflow";
  }

  if (!migrated.lastTitleUpdate) {
    migrated.lastTitleUpdate = now;
  }

  if (!migrated.exportVersion) {
    migrated.exportVersion = DEFAULT_METADATA.exportVersion!;
  }

  if (!migrated.schemaVersion) {
    migrated.schemaVersion = CURRENT_METADATA_SCHEMA_VERSION;
  }

  if (!migrated.version) {
    migrated.version = 1;
  }

  if (!migrated.tags) {
    migrated.tags = [];
  }

  if (!migrated.customProperties) {
    migrated.customProperties = {};
  }

  // Handle schema version migrations
  switch (migrated.schemaVersion) {
    case "0.9.0":
    case "0.9.1":
      // Migrate from older versions - add new fields
      migrated.version = migrated.version || 1;
      migrated.tags = migrated.tags || [];
      migrated.customProperties = migrated.customProperties || {};
      migrated.schemaVersion = CURRENT_METADATA_SCHEMA_VERSION;
      break;

    case CURRENT_METADATA_SCHEMA_VERSION:
      // Already current version
      break;

    default:
      // Unknown version - treat as legacy and migrate
      console.warn(
        `Unknown metadata schema version: ${migrated.schemaVersion}`
      );
      migrated.schemaVersion = CURRENT_METADATA_SCHEMA_VERSION;
      break;
  }

  return migrated;
}

/**
 * Validate workflow metadata
 */
export function validateMetadata(
  metadata: WorkflowMetadata | undefined
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!metadata) {
    errors.push({
      field: "metadata",
      message: "Metadata is required",
      code: ErrorCodes.VALIDATION_ERROR,
    });
    return errors;
  }

  // Validate required fields
  if (!metadata.title || metadata.title.trim().length === 0) {
    errors.push({
      field: "metadata.title",
      message: "Title is required",
      code: ErrorCodes.TITLE_EMPTY,
    });
  }

  if (metadata.title && metadata.title.length > 200) {
    errors.push({
      field: "metadata.title",
      message: "Title must be 200 characters or less",
      code: ErrorCodes.TITLE_TOO_LONG,
    });
  }

  if (!metadata.lastTitleUpdate) {
    errors.push({
      field: "metadata.lastTitleUpdate",
      message: "Last title update timestamp is required",
      code: ErrorCodes.VALIDATION_ERROR,
    });
  }

  if (!metadata.exportVersion) {
    errors.push({
      field: "metadata.exportVersion",
      message: "Export version is required",
      code: ErrorCodes.VALIDATION_ERROR,
    });
  }

  if (!metadata.schemaVersion) {
    errors.push({
      field: "metadata.schemaVersion",
      message: "Schema version is required",
      code: ErrorCodes.VALIDATION_ERROR,
    });
  }

  // Validate version number
  if (
    metadata.version !== undefined &&
    (metadata.version < 1 || !Number.isInteger(metadata.version))
  ) {
    errors.push({
      field: "metadata.version",
      message: "Version must be a positive integer",
      code: ErrorCodes.VALIDATION_ERROR,
    });
  }

  // Validate tags
  if (metadata.tags) {
    if (!Array.isArray(metadata.tags)) {
      errors.push({
        field: "metadata.tags",
        message: "Tags must be an array",
        code: ErrorCodes.VALIDATION_ERROR,
      });
    } else {
      metadata.tags.forEach((tag, index) => {
        if (typeof tag !== "string") {
          errors.push({
            field: `metadata.tags[${index}]`,
            message: "Tag must be a string",
            code: ErrorCodes.VALIDATION_ERROR,
          });
        } else if (tag.length > 50) {
          errors.push({
            field: `metadata.tags[${index}]`,
            message: "Tag must be 50 characters or less",
            code: ErrorCodes.VALIDATION_ERROR,
          });
        }
      });
    }
  }

  // Validate custom properties
  if (
    metadata.customProperties &&
    typeof metadata.customProperties !== "object"
  ) {
    errors.push({
      field: "metadata.customProperties",
      message: "Custom properties must be an object",
      code: ErrorCodes.VALIDATION_ERROR,
    });
  }

  return errors;
}

/**
 * Ensure workflow has valid metadata
 */
export function ensureWorkflowMetadata(
  workflow: Workflow,
  createdBy?: string
): Workflow {
  let migratedMetadata = migrateMetadata(workflow.metadata, workflow.name);

  // Set createdBy if provided and not already set
  if (createdBy && !migratedMetadata.createdBy) {
    migratedMetadata = {
      ...migratedMetadata,
      createdBy,
      lastModifiedBy: createdBy,
    };
  }

  return {
    ...workflow,
    metadata: migratedMetadata,
  };
}

/**
 * Update workflow title through metadata
 */
export function updateWorkflowTitle(
  workflow: Workflow,
  newTitle: string,
  modifiedBy?: string
): Workflow {
  const updatedMetadata = updateMetadata(
    workflow.metadata,
    { title: newTitle },
    modifiedBy
  );

  return {
    ...workflow,
    name: newTitle, // Keep name in sync with metadata title
    metadata: updatedMetadata,
  };
}

/**
 * Add custom property to workflow metadata
 */
export function addCustomProperty(
  workflow: Workflow,
  key: string,
  value: any,
  modifiedBy?: string
): Workflow {
  const currentCustomProperties = workflow.metadata?.customProperties || {};

  const updatedMetadata = updateMetadata(
    workflow.metadata,
    {
      customProperties: {
        ...currentCustomProperties,
        [key]: value,
      },
    },
    modifiedBy
  );

  return {
    ...workflow,
    metadata: updatedMetadata,
  };
}

/**
 * Remove custom property from workflow metadata
 */
export function removeCustomProperty(
  workflow: Workflow,
  key: string,
  modifiedBy?: string
): Workflow {
  const currentCustomProperties = workflow.metadata?.customProperties || {};
  const { [key]: removed, ...remainingProperties } = currentCustomProperties;

  const updatedMetadata = updateMetadata(
    workflow.metadata,
    {
      customProperties: remainingProperties,
    },
    modifiedBy
  );

  return {
    ...workflow,
    metadata: updatedMetadata,
  };
}

/**
 * Add tag to workflow metadata
 */
export function addTag(
  workflow: Workflow,
  tag: string,
  modifiedBy?: string
): Workflow {
  const currentTags = workflow.metadata?.tags || [];

  // Don't add duplicate tags
  if (currentTags.includes(tag)) {
    return workflow;
  }

  const updatedMetadata = updateMetadata(
    workflow.metadata,
    {
      tags: [...currentTags, tag],
    },
    modifiedBy
  );

  return {
    ...workflow,
    metadata: updatedMetadata,
  };
}

/**
 * Remove tag from workflow metadata
 */
export function removeTag(
  workflow: Workflow,
  tag: string,
  modifiedBy?: string
): Workflow {
  const currentTags = workflow.metadata?.tags || [];
  const updatedTags = currentTags.filter((t) => t !== tag);

  const updatedMetadata = updateMetadata(
    workflow.metadata,
    {
      tags: updatedTags,
    },
    modifiedBy
  );

  return {
    ...workflow,
    metadata: updatedMetadata,
  };
}

/**
 * Get metadata summary for display
 */
export function getMetadataSummary(metadata: WorkflowMetadata | undefined): {
  title: string;
  version: number;
  lastModified: string;
  tags: string[];
  hasCustomProperties: boolean;
} {
  if (!metadata) {
    return {
      title: "Untitled Workflow",
      version: 1,
      lastModified: "Unknown",
      tags: [],
      hasCustomProperties: false,
    };
  }

  return {
    title: metadata.title,
    version: metadata.version || 1,
    lastModified: metadata.lastTitleUpdate,
    tags: metadata.tags || [],
    hasCustomProperties:
      Object.keys(metadata.customProperties || {}).length > 0,
  };
}
