import { z } from "zod";
import {
  WorkflowNodeSchema,
  WorkflowConnectionSchema,
  WorkflowSettingsSchema,
  WorkflowTriggerSchema,
} from "@nodedrop/types";

// Common schemas
export const IdParamSchema = z.object({
  id: z
    .string()
    .min(1, "ID is required")
    .regex(
      /^(c[a-z0-9]{24}|[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})$/i,
      "Invalid ID format"
    ),
});

export const PaginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
  sortBy: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

// Simple limit-only query schema for endpoints that don't need full pagination
export const LimitQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).default(10),
});

// Scheduled executions query schema
export const ScheduledExecutionsQuerySchema = LimitQuerySchema.extend({
  workflowId: z.string().cuid().optional(),
});

// Trigger events query schema
export const TriggerEventsQuerySchema = z.object({
  type: z.string().optional(),
  status: z.string().optional(),
  limit: z.coerce.number().int().positive().max(100).default(50),
  offset: z.coerce.number().int().nonnegative().default(0),
});

// Deployment history query schema
export const DeploymentHistoryQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

// =============================================================================
// Workflow API Schemas (using @nodedrop/types schemas)
// =============================================================================

/**
 * Schema for creating a new workflow via POST /api/workflows
 * Uses schemas from @nodedrop/types for consistency with the shared types package.
 * Omits server-generated fields (id, userId, createdAt, updatedAt).
 */
export const CreateWorkflowSchema = z.object({
  name: z.string().min(1, "Workflow name is required").max(255),
  description: z.string().optional(),
  category: z
    .string()
    .nullish()
    .transform((val) => val || undefined),
  tags: z.array(z.string()).default([]),
  teamId: z.string().nullable().optional(),
  // Use WorkflowNodeSchema from @nodedrop/types with default for disabled
  nodes: z
    .array(
      WorkflowNodeSchema.extend({
        disabled: z.boolean().default(false),
      })
    )
    .default([]),
  // Use WorkflowConnectionSchema from @nodedrop/types
  connections: z.array(WorkflowConnectionSchema).default([]),
  // Use WorkflowTriggerSchema from @nodedrop/types
  triggers: z.array(WorkflowTriggerSchema).default([]),
  // Use WorkflowSettingsSchema from @nodedrop/types with API-specific defaults
  settings: WorkflowSettingsSchema.extend({
    saveExecutionProgress: z.boolean().default(true),
    saveDataErrorExecution: z.enum(["all", "none"]).default("all"),
    saveDataSuccessExecution: z.enum(["all", "none"]).default("all"),
    saveExecutionToDatabase: z.boolean().default(true),
    callerPolicy: z
      .enum(["workflowsFromSameOwner", "workflowsFromAList", "any"])
      .default("workflowsFromSameOwner"),
  }).default({}),
  active: z.boolean().default(false),
});

/**
 * Schema for updating a workflow via PUT/PATCH /api/workflows/:id
 * All fields are optional to support partial updates.
 * Uses CreateWorkflowSchema.partial() as specified in Requirements 3.3.
 */
export const UpdateWorkflowSchema = CreateWorkflowSchema.partial();

export const WorkflowQuerySchema = PaginationQuerySchema.extend({
  search: z.string().optional(),
  userId: z.string().uuid().optional(),
});

// Execution schemas
export const ExecuteWorkflowSchema = z.object({
  triggerData: z.record(z.any()).optional(),
  startNodes: z.array(z.string()).optional(),
  // Optional workflow data to avoid requiring database save
  workflowData: z
    .object({
      nodes: z.array(z.any()).optional(),
      connections: z.array(z.any()).optional(),
      settings: z.any().optional(),
    })
    .optional(),
});

export const ExecutionQuerySchema = PaginationQuerySchema.extend({
  workflowId: z.string().cuid().optional(),
  status: z.enum(["RUNNING", "SUCCESS", "ERROR", "CANCELLED"]).optional(),
  startedAfter: z.string().datetime().optional(),
  startedBefore: z.string().datetime().optional(),
});

// Node schemas
export const NodeQuerySchema = PaginationQuerySchema.extend({
  category: z.string().optional(),
  search: z.string().optional(),
});

// Auth schemas
export const LoginSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const RegisterSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
});

export const ForgotPasswordSchema = z.object({
  email: z.string().email("Invalid email format"),
});

// Response types
export type ApiResponse<T = any> = {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  warnings?: Array<{
    type: string;
    message: string;
    details?: any;
  }>;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export type CreateWorkflowRequest = z.infer<typeof CreateWorkflowSchema>;
export type UpdateWorkflowRequest = z.infer<typeof UpdateWorkflowSchema>;
export type WorkflowQueryRequest = z.infer<typeof WorkflowQuerySchema>;
export type ExecuteWorkflowRequest = z.infer<typeof ExecuteWorkflowSchema>;
export type ExecutionQueryRequest = z.infer<typeof ExecutionQuerySchema>;
export type NodeQueryRequest = z.infer<typeof NodeQuerySchema>;
export type LoginRequest = z.infer<typeof LoginSchema>;
export type RegisterRequest = z.infer<typeof RegisterSchema>;
export type ForgotPasswordRequest = z.infer<typeof ForgotPasswordSchema>;
export type LimitQueryRequest = z.infer<typeof LimitQuerySchema>;
export type ScheduledExecutionsQueryRequest = z.infer<typeof ScheduledExecutionsQuerySchema>;
export type TriggerEventsQueryRequest = z.infer<typeof TriggerEventsQuerySchema>;
export type DeploymentHistoryQueryRequest = z.infer<typeof DeploymentHistoryQuerySchema>;
