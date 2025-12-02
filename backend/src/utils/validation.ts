import { z } from "zod";
import {
  ExecutionStatus,
  NodeExecutionStatus,
  UserRole,
} from "../types/database";

// User validation schemas
export const userCreateSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  name: z.string().optional(),
  role: z.nativeEnum(UserRole).optional(),
});

export const userUpdateSchema = z.object({
  email: z.string().email("Invalid email format").optional(),
  name: z.string().optional(),
  role: z.nativeEnum(UserRole).optional(),
  active: z.boolean().optional(),
});

// Node validation schemas
export const nodeSchema = z.object({
  id: z.string(),
  type: z.string(),
  name: z.string(),
  description: z.string().optional(),
  parameters: z.record(z.any()),
  position: z.object({
    x: z.number(),
    y: z.number(),
  }),
  credentials: z.array(z.string()).optional(),
  disabled: z.boolean(),
  mockData: z.any().optional(),
  mockDataPinned: z.boolean().optional(),
  locked: z.boolean().optional(),
  // Group node properties
  parentId: z.string().optional(),
  extent: z
    .union([
      z.literal("parent"),
      z.tuple([z.number(), z.number(), z.number(), z.number()]),
    ])
    .optional(),
  style: z.record(z.any()).optional(),
});

export const connectionSchema = z.object({
  id: z.string(),
  sourceNodeId: z.string(),
  sourceOutput: z.string(),
  targetNodeId: z.string(),
  targetInput: z.string(),
});

export const triggerSchema = z.object({
  id: z.string(),
  type: z.enum(["webhook", "schedule", "manual"]),
  settings: z.record(z.any()),
  active: z.boolean(),
});

export const workflowSettingsSchema = z.object({
  timezone: z.string().optional(),
  saveExecutionProgress: z.boolean().optional(),
  saveDataErrorExecution: z.enum(["all", "none"]).optional(),
  saveDataSuccessExecution: z.enum(["all", "none"]).optional(),
  callerPolicy: z
    .enum(["workflowsFromSameOwner", "workflowsFromAList", "any"])
    .optional(),
  executionTimeout: z.number().positive().optional(),
});

// Workflow validation schemas
export const workflowCreateSchema = z.object({
  name: z.string().min(1, "Workflow name is required"),
  description: z.string().optional(),
  nodes: z.array(nodeSchema),
  connections: z.array(connectionSchema),
  triggers: z.array(triggerSchema),
  settings: workflowSettingsSchema,
  active: z.boolean().optional(),
});

export const workflowUpdateSchema = z.object({
  name: z.string().min(1, "Workflow name is required").optional(),
  description: z.string().optional(),
  nodes: z.array(nodeSchema).optional(),
  connections: z.array(connectionSchema).optional(),
  triggers: z.array(triggerSchema).optional(),
  settings: workflowSettingsSchema.optional(),
  active: z.boolean().optional(),
});

// Execution validation schemas
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

// Node execution validation schemas
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

// Credential validation schemas
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

// Node type validation schemas
export const nodePropertySchema = z.object({
  displayName: z.string(),
  name: z.string(),
  type: z.enum([
    "string",
    "number",
    "boolean",
    "options",
    "multiOptions",
    "json",
    "dateTime",
  ]),
  required: z.boolean().optional(),
  default: z.any().optional(),
  description: z.string().optional(),
  options: z
    .array(
      z.object({
        name: z.string(),
        value: z.any(),
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
  properties: z.array(nodePropertySchema),
  icon: z.string().optional(),
  color: z.string().optional(),
});

// Workflow validation functions
export function validateWorkflowStructure(workflow: any): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Check if all nodes referenced in connections exist
  const nodeIds = new Set(workflow.nodes.map((node: any) => node.id));

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
      (conn: any) => conn.sourceNodeId === nodeId
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
    workflow.nodes.some((node: any) =>
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

// Export validation result type
export type ValidationResult = {
  valid: boolean;
  errors: string[];
};
