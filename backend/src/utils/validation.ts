import { z } from "zod";
import {
  // Workflow schemas from shared types
  WorkflowNodeSchema,
  WorkflowConnectionSchema,
  WorkflowSettingsSchema,
  WorkflowTriggerSchema,
  // Node schemas from shared types
  NodePropertySchema,
  // Validation utilities from shared types
  validate,
  safeParse,
  formatZodError,
  formatZodErrorString,
} from "@nodedrop/types";
import {
  ExecutionStatus,
  NodeExecutionStatus,
} from "../types/database";

// =============================================================================
// Re-export shared schemas for backward compatibility
// =============================================================================

export {
  WorkflowNodeSchema as nodeSchema,
  WorkflowConnectionSchema as connectionSchema,
  WorkflowSettingsSchema as workflowSettingsSchema,
  WorkflowTriggerSchema as triggerSchema,
  NodePropertySchema as nodePropertySchema,
};

// Re-export validation utilities
export { validate, safeParse, formatZodError, formatZodErrorString };

// =============================================================================
// User validation schemas (backend-specific, not in shared types)
// =============================================================================

const userRoleSchema = z.enum(["user", "admin"]);

export const userCreateSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  name: z.string().optional(),
  role: userRoleSchema.optional(),
});

export const userUpdateSchema = z.object({
  email: z.string().email("Invalid email format").optional(),
  name: z.string().optional(),
  role: userRoleSchema.optional(),
  active: z.boolean().optional(),
});

// =============================================================================
// Workflow validation schemas (using shared schemas)
// =============================================================================

export const workflowCreateSchema = z.object({
  name: z.string().min(1, "Workflow name is required"),
  description: z.string().optional(),
  nodes: z.array(WorkflowNodeSchema),
  connections: z.array(WorkflowConnectionSchema),
  triggers: z.array(WorkflowTriggerSchema),
  settings: WorkflowSettingsSchema,
  active: z.boolean().optional(),
});

export const workflowUpdateSchema = z.object({
  name: z.string().min(1, "Workflow name is required").optional(),
  description: z.string().optional(),
  nodes: z.array(WorkflowNodeSchema).optional(),
  connections: z.array(WorkflowConnectionSchema).optional(),
  triggers: z.array(WorkflowTriggerSchema).optional(),
  settings: WorkflowSettingsSchema.optional(),
  active: z.boolean().optional(),
});

// =============================================================================
// Execution validation schemas (backend-specific)
// =============================================================================

export const executionCreateSchema = z.object({
  workflowId: z.string(),
  triggerData: z.any().optional(),
});

export const executionUpdateSchema = z.object({
  status: z.nativeEnum(ExecutionStatus).optional(),
  finishedAt: z.date().optional(),
  error: z
    .object({
      message: z.string(),
      stack: z.string().optional(),
      timestamp: z.date(),
      nodeId: z.string().optional(),
    })
    .optional(),
});

// =============================================================================
// Node execution validation schemas (backend-specific)
// =============================================================================

export const nodeExecutionCreateSchema = z.object({
  nodeId: z.string(),
  executionId: z.string(),
  inputData: z.any().optional(),
});

export const nodeExecutionUpdateSchema = z.object({
  status: z.nativeEnum(NodeExecutionStatus).optional(),
  outputData: z.any().optional(),
  error: z
    .object({
      message: z.string(),
      stack: z.string().optional(),
      timestamp: z.date(),
      httpCode: z.number().optional(),
    })
    .optional(),
  startedAt: z.date().optional(),
  finishedAt: z.date().optional(),
});

// =============================================================================
// Credential validation schemas (backend-specific)
// =============================================================================

export const credentialCreateSchema = z.object({
  name: z.string().min(1, "Credential name is required"),
  type: z.string().min(1, "Credential type is required"),
  data: z.any(), // Raw credential data (will be encrypted)
  expiresAt: z.date().optional(),
});

export const credentialUpdateSchema = z.object({
  name: z.string().min(1, "Credential name is required").optional(),
  data: z.any().optional(), // Raw credential data (will be encrypted)
  expiresAt: z.date().optional(),
});

// =============================================================================
// Node type validation schemas (using shared schemas)
// =============================================================================

export const nodeTypeCreateSchema = z.object({
  type: z.string().min(1, "Node type is required"),
  displayName: z.string().min(1, "Display name is required"),
  name: z.string().min(1, "Name is required"),
  group: z.array(z.string()),
  version: z.number().positive(),
  description: z.string(),
  defaults: z.record(z.any()),
  inputs: z.array(z.string()),
  outputs: z.array(z.string()),
  properties: z.array(NodePropertySchema),
  icon: z.string().optional(),
  color: z.string().optional(),
});

// =============================================================================
// Workflow structure validation (using shared schemas)
// =============================================================================

/**
 * Validates workflow structure including node references and circular dependencies.
 * Uses shared WorkflowNodeSchema and WorkflowConnectionSchema for type safety.
 */
export function validateWorkflowStructure(workflow: {
  nodes: z.infer<typeof WorkflowNodeSchema>[];
  connections: z.infer<typeof WorkflowConnectionSchema>[];
  triggers: z.infer<typeof WorkflowTriggerSchema>[];
}): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Check if all nodes referenced in connections exist
  const nodeIds = new Set(workflow.nodes.map((node) => node.id));

  for (const connection of workflow.connections) {
    if (!nodeIds.has(connection.sourceNodeId)) {
      errors.push(
        `Connection references non-existent source node: ${connection.sourceNodeId}`
      );
    }
    if (!nodeIds.has(connection.targetNodeId)) {
      errors.push(
        `Connection references non-existent target node: ${connection.targetNodeId}`
      );
    }
  }

  // Check for circular dependencies
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

    const outgoingConnections = workflow.connections.filter(
      (conn) => conn.sourceNodeId === nodeId
    );

    for (const connection of outgoingConnections) {
      if (hasCycle(connection.targetNodeId)) {
        return true;
      }
    }

    recursionStack.delete(nodeId);
    return false;
  }

  for (const node of workflow.nodes) {
    if (hasCycle(node.id)) {
      errors.push("Workflow contains circular dependencies");
      break;
    }
  }

  // Check if workflow has at least one trigger or manual start node
  const hasTrigger =
    workflow.triggers.length > 0 ||
    workflow.nodes.some((node) =>
      ["manual-trigger", "workflow-called"].includes(node.type)
    );

  if (!hasTrigger) {
    errors.push("Workflow must have at least one trigger or manual start node");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// Export validation result type (for backward compatibility)
export type ValidationResult = {
  valid: boolean;
  errors: string[];
};
