/**
 * @nodedrop/utils - Validation Utilities
 *
 * Consolidated validation utilities shared between frontend and backend.
 * Provides consistent validation for titles, files, workflows, and nodes.
 */

import { ErrorCodes, type ValidationError } from "./errors";

// =============================================================================
// Title Validation
// =============================================================================

/**
 * Maximum allowed title length
 */
export const MAX_TITLE_LENGTH = 100;

/**
 * Invalid characters pattern for titles
 * Disallows: < > : " / \ | ? *
 */
export const INVALID_TITLE_CHARS = /[<>:"/\\|?*]/;

/**
 * Validate a workflow or resource title
 * @param title - The title to validate
 * @returns Array of validation errors (empty if valid)
 */
export function validateTitle(title: string): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!title || title.trim().length === 0) {
    errors.push({
      field: "title",
      message: "Title is required",
      code: ErrorCodes.TITLE_EMPTY,
    });
  } else {
    if (title.length > MAX_TITLE_LENGTH) {
      errors.push({
        field: "title",
        message: `Title must be ${MAX_TITLE_LENGTH} characters or less`,
        code: ErrorCodes.TITLE_TOO_LONG,
      });
    }

    if (INVALID_TITLE_CHARS.test(title)) {
      errors.push({
        field: "title",
        message: "Title contains invalid characters",
        code: ErrorCodes.TITLE_INVALID_CHARS,
      });
    }
  }

  return errors;
}

// =============================================================================
// File Validation
// =============================================================================

/**
 * Maximum allowed file size in bytes (50MB)
 */
export const MAX_FILE_SIZE = 50 * 1024 * 1024;

/**
 * File info interface for validation (works in both browser and Node.js)
 */
export interface FileInfo {
  name: string;
  size: number;
  type?: string;
}

/**
 * Validate an import file (size and type)
 * @param file - File info object with name, size, and optional type
 * @returns Array of validation errors (empty if valid)
 */
export function validateImportFile(file: FileInfo): ValidationError[] {
  const errors: ValidationError[] = [];

  // Check file size (max 50MB)
  if (file.size > MAX_FILE_SIZE) {
    errors.push({
      field: "file",
      message: "File size must be less than 50MB",
      code: ErrorCodes.FILE_TOO_LARGE,
    });
  }

  // Check file type
  const isJsonType = file.type === "application/json";
  const hasJsonExtension = file.name.toLowerCase().endsWith(".json");

  if (!isJsonType && !hasJsonExtension) {
    errors.push({
      field: "file",
      message: "File must be a JSON file",
      code: ErrorCodes.FILE_INVALID_EXTENSION,
    });
  }

  return errors;
}

/**
 * Validate JSON content string
 * @param content - The JSON string to validate
 * @returns Array of validation errors (empty if valid)
 */
export function validateJsonContent(content: string): ValidationError[] {
  const errors: ValidationError[] = [];

  try {
    JSON.parse(content);
  } catch {
    errors.push({
      field: "content",
      message: "Invalid JSON format",
      code: ErrorCodes.FILE_CORRUPTED,
    });
  }

  return errors;
}

// =============================================================================
// Workflow Validation
// =============================================================================

/**
 * Minimal workflow interface for validation
 * Uses a subset of properties to avoid tight coupling with @nodedrop/types
 */
export interface WorkflowForValidation {
  id?: string;
  name?: string;
  nodes?: Array<{
    id: string;
    type: string;
    name?: string;
    position?: { x: number; y: number };
    parameters?: Record<string, unknown>;
  }>;
  connections?: Array<{
    id?: string;
    sourceNodeId: string;
    sourceOutput?: string;
    targetNodeId: string;
    targetInput?: string;
  }>;
}

/**
 * Validate basic workflow structure
 * @param workflow - The workflow to validate
 * @returns Array of validation errors (empty if valid)
 */
export function validateWorkflowStructure(
  workflow: WorkflowForValidation | null | undefined
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!workflow) {
    errors.push({
      field: "workflow",
      message: "Workflow is required",
      code: ErrorCodes.VALIDATION_ERROR,
    });
    return errors;
  }

  // Validate workflow name
  if (workflow.name) {
    const titleErrors = validateTitle(workflow.name);
    errors.push(
      ...titleErrors.map((e) => ({
        ...e,
        field: `workflow.${e.field === "title" ? "name" : e.field}`,
      }))
    );
  }

  // Validate nodes array exists
  if (!workflow.nodes || !Array.isArray(workflow.nodes)) {
    errors.push({
      field: "workflow.nodes",
      message: "Workflow must have a nodes array",
      code: ErrorCodes.VALIDATION_ERROR,
    });
  } else if (workflow.nodes.length === 0) {
    errors.push({
      field: "workflow.nodes",
      message: "Workflow must contain at least one node",
      code: ErrorCodes.VALIDATION_ERROR,
    });
  }

  // Validate connections array exists
  if (workflow.connections && !Array.isArray(workflow.connections)) {
    errors.push({
      field: "workflow.connections",
      message: "Workflow connections must be an array",
      code: ErrorCodes.VALIDATION_ERROR,
    });
  }

  return errors;
}

/**
 * Validate workflow nodes
 * @param nodes - Array of workflow nodes to validate
 * @returns Array of validation errors (empty if valid)
 */
export function validateWorkflowNodes(
  nodes: WorkflowForValidation["nodes"]
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!nodes || !Array.isArray(nodes)) {
    return errors;
  }

  const nodeIds = new Set<string>();

  nodes.forEach((node, index) => {
    const fieldPrefix = `nodes[${index}]`;

    // Check for duplicate node IDs
    if (node.id) {
      if (nodeIds.has(node.id)) {
        errors.push({
          field: `${fieldPrefix}.id`,
          message: `Duplicate node ID: ${node.id}`,
          code: ErrorCodes.VALIDATION_ERROR,
        });
      } else {
        nodeIds.add(node.id);
      }
    } else {
      errors.push({
        field: `${fieldPrefix}.id`,
        message: "Node ID is required",
        code: ErrorCodes.VALIDATION_ERROR,
      });
    }

    // Validate node type
    if (!node.type || node.type.trim().length === 0) {
      errors.push({
        field: `${fieldPrefix}.type`,
        message: "Node type is required",
        code: ErrorCodes.VALIDATION_ERROR,
      });
    }

    // Validate node position
    if (node.position) {
      if (
        typeof node.position.x !== "number" ||
        typeof node.position.y !== "number" ||
        isNaN(node.position.x) ||
        isNaN(node.position.y)
      ) {
        errors.push({
          field: `${fieldPrefix}.position`,
          message: "Node must have valid position coordinates",
          code: ErrorCodes.VALIDATION_ERROR,
        });
      }
    }
  });

  return errors;
}

/**
 * Validate workflow connections
 * @param connections - Array of workflow connections to validate
 * @param nodes - Array of workflow nodes (for reference validation)
 * @returns Array of validation errors (empty if valid)
 */
export function validateWorkflowConnections(
  connections: WorkflowForValidation["connections"],
  nodes?: WorkflowForValidation["nodes"]
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!connections || !Array.isArray(connections)) {
    return errors;
  }

  const nodeIds = new Set(nodes?.map((n) => n.id) || []);
  const connectionKeys = new Set<string>();

  connections.forEach((connection, index) => {
    const fieldPrefix = `connections[${index}]`;
    const connectionKey = `${connection.sourceNodeId}->${connection.targetNodeId}`;

    // Check for duplicate connections
    if (connectionKeys.has(connectionKey)) {
      errors.push({
        field: fieldPrefix,
        message: `Duplicate connection: ${connectionKey}`,
        code: ErrorCodes.VALIDATION_ERROR,
      });
    } else {
      connectionKeys.add(connectionKey);
    }

    // Validate source node exists (if nodes provided)
    if (nodes && nodeIds.size > 0 && !nodeIds.has(connection.sourceNodeId)) {
      errors.push({
        field: `${fieldPrefix}.sourceNodeId`,
        message: `Source node not found: ${connection.sourceNodeId}`,
        code: ErrorCodes.VALIDATION_ERROR,
      });
    }

    // Validate target node exists (if nodes provided)
    if (nodes && nodeIds.size > 0 && !nodeIds.has(connection.targetNodeId)) {
      errors.push({
        field: `${fieldPrefix}.targetNodeId`,
        message: `Target node not found: ${connection.targetNodeId}`,
        code: ErrorCodes.VALIDATION_ERROR,
      });
    }

    // Check for self-connections
    if (connection.sourceNodeId === connection.targetNodeId) {
      errors.push({
        field: fieldPrefix,
        message: "Node cannot connect to itself",
        code: ErrorCodes.VALIDATION_ERROR,
      });
    }
  });

  return errors;
}

/**
 * Detect circular dependencies in workflow connections
 * @param connections - Array of workflow connections
 * @returns true if circular dependency detected, false otherwise
 */
export function hasCircularDependency(
  connections: WorkflowForValidation["connections"]
): boolean {
  if (!connections || connections.length === 0) {
    return false;
  }

  // Build adjacency list
  const graph = new Map<string, string[]>();

  connections.forEach((conn) => {
    if (!graph.has(conn.sourceNodeId)) {
      graph.set(conn.sourceNodeId, []);
    }
    graph.get(conn.sourceNodeId)!.push(conn.targetNodeId);
  });

  // DFS to detect cycles
  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  function hasCycle(nodeId: string): boolean {
    if (recursionStack.has(nodeId)) {
      return true;
    }
    if (visited.has(nodeId)) {
      return false;
    }

    visited.add(nodeId);
    recursionStack.add(nodeId);

    const neighbors = graph.get(nodeId) || [];
    for (const neighbor of neighbors) {
      if (hasCycle(neighbor)) {
        return true;
      }
    }

    recursionStack.delete(nodeId);
    return false;
  }

  // Check all nodes
  for (const nodeId of graph.keys()) {
    if (hasCycle(nodeId)) {
      return true;
    }
  }

  return false;
}

/**
 * Comprehensive workflow validation
 * @param workflow - The workflow to validate
 * @returns Object with isValid flag and array of errors
 */
export function validateWorkflow(workflow: WorkflowForValidation | null | undefined): {
  isValid: boolean;
  errors: ValidationError[];
} {
  const errors: ValidationError[] = [];

  // Validate structure
  const structureErrors = validateWorkflowStructure(workflow);
  errors.push(...structureErrors);

  // If basic structure is invalid, return early
  if (!workflow || structureErrors.length > 0) {
    return { isValid: false, errors };
  }

  // Validate nodes
  const nodeErrors = validateWorkflowNodes(workflow.nodes);
  errors.push(...nodeErrors);

  // Validate connections
  const connectionErrors = validateWorkflowConnections(
    workflow.connections,
    workflow.nodes
  );
  errors.push(...connectionErrors);

  // Check for circular dependencies
  if (workflow.connections && hasCircularDependency(workflow.connections)) {
    errors.push({
      field: "workflow.connections",
      message: "Circular dependency detected in workflow",
      code: ErrorCodes.VALIDATION_ERROR,
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// =============================================================================
// Generic Validation Helpers
// =============================================================================

/**
 * Check if a value is empty (null, undefined, empty string, empty array, empty object)
 * @param value - The value to check
 * @returns true if empty, false otherwise
 */
export function isEmpty(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === "string") return value.trim().length === 0;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === "object") return Object.keys(value).length === 0;
  return false;
}

/**
 * Check if a string is a valid email format
 * @param email - The email string to validate
 * @returns true if valid email format, false otherwise
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Check if a string is a valid URL
 * @param url - The URL string to validate
 * @returns true if valid URL, false otherwise
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Combine multiple validation results
 * @param results - Array of validation error arrays
 * @returns Combined array of all validation errors
 */
export function combineValidationErrors(
  ...results: ValidationError[][]
): ValidationError[] {
  return results.flat();
}
