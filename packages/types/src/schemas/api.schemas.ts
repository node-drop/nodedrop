/**
 * @nodedrop/types - API Request Zod Schemas
 *
 * Zod schemas for API request validation. These schemas can be used by both
 * frontend (form validation) and backend (API validation).
 * 
 * Uses z.coerce for query parameters that come as strings from HTTP requests.
 */

import { z } from "zod";
import {
  WorkflowNodeSchema,
  WorkflowConnectionSchema,
  WorkflowSettingsSchema,
  WorkflowTriggerSchema,
} from "./workflow.schemas";

// =============================================================================
// ID Parameter Schemas
// =============================================================================

/**
 * Schema for validating resource IDs
 * Supports both CUID (c + 24 chars) and UUID formats
 */
export const IdParamSchema = z.object({
  id: z
    .string()
    .min(1, "ID is required")
    .regex(
      /^(c[a-z0-9]{24}|[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})$/i,
      "Invalid ID format"
    ),
});
export type IdParam = z.infer<typeof IdParamSchema>;

// =============================================================================
// Pagination Schemas
// =============================================================================

/**
 * Standard pagination query parameters
 * Uses z.coerce for query string parsing
 */
export const PaginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
  sortBy: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});
export type PaginationQuery = z.infer<typeof PaginationQuerySchema>;

/**
 * Simple limit-only query schema for endpoints that don't need full pagination
 */
export const LimitQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).default(10),
});
export type LimitQuery = z.infer<typeof LimitQuerySchema>;

/**
 * Scheduled executions query schema
 */
export const ScheduledExecutionsQuerySchema = LimitQuerySchema.extend({
  workflowId: z.string().cuid().optional(),
});
export type ScheduledExecutionsQuery = z.infer<typeof ScheduledExecutionsQuerySchema>;

/**
 * Trigger events query schema
 */
export const TriggerEventsQuerySchema = z.object({
  type: z.string().optional(),
  status: z.string().optional(),
  limit: z.coerce.number().int().positive().max(100).default(50),
  offset: z.coerce.number().int().nonnegative().default(0),
});
export type TriggerEventsQuery = z.infer<typeof TriggerEventsQuerySchema>;

/**
 * Deployment history query schema
 */
export const DeploymentHistoryQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});
export type DeploymentHistoryQuery = z.infer<typeof DeploymentHistoryQuerySchema>;

// =============================================================================
// Auth Schemas
// =============================================================================

/**
 * Login request schema
 */
export const LoginSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});
export type LoginRequest = z.infer<typeof LoginSchema>;

/**
 * Registration request schema
 */
export const RegisterSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
});
export type RegisterRequest = z.infer<typeof RegisterSchema>;

/**
 * Forgot password request schema
 */
export const ForgotPasswordSchema = z.object({
  email: z.string().email("Invalid email format"),
});
export type ForgotPasswordRequest = z.infer<typeof ForgotPasswordSchema>;

// =============================================================================
// Workflow API Schemas
// =============================================================================

/**
 * Schema for creating a new workflow via POST /api/workflows
 * Uses schemas from workflow.schemas.ts for consistency.
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
  nodes: z
    .array(
      WorkflowNodeSchema.extend({
        disabled: z.boolean().default(false),
      })
    )
    .default([]),
  connections: z.array(WorkflowConnectionSchema).default([]),
  triggers: z.array(WorkflowTriggerSchema).default([]),
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
export type CreateWorkflowRequest = z.infer<typeof CreateWorkflowSchema>;

/**
 * Schema for updating a workflow via PUT/PATCH /api/workflows/:id
 * All fields are optional to support partial updates.
 */
export const UpdateWorkflowSchema = CreateWorkflowSchema.partial();
export type UpdateWorkflowRequest = z.infer<typeof UpdateWorkflowSchema>;

/**
 * Workflow query/filter schema
 */
export const WorkflowQuerySchema = PaginationQuerySchema.extend({
  search: z.string().optional(),
  userId: z.string().uuid().optional(),
});
export type WorkflowQuery = z.infer<typeof WorkflowQuerySchema>;

// =============================================================================
// Execution API Schemas
// =============================================================================

/**
 * Schema for executing a workflow
 */
export const ExecuteWorkflowSchema = z.object({
  triggerData: z.record(z.any()).optional(),
  startNodes: z.array(z.string()).optional(),
  workflowData: z
    .object({
      nodes: z.array(z.any()).optional(),
      connections: z.array(z.any()).optional(),
      settings: z.any().optional(),
    })
    .optional(),
});
export type ExecuteWorkflowRequest = z.infer<typeof ExecuteWorkflowSchema>;

/**
 * Execution query/filter schema
 */
export const ExecutionQuerySchema = PaginationQuerySchema.extend({
  workflowId: z.string().cuid().optional(),
  status: z.enum(["RUNNING", "SUCCESS", "ERROR", "CANCELLED"]).optional(),
  startedAfter: z.string().datetime().optional(),
  startedBefore: z.string().datetime().optional(),
});
export type ExecutionQuery = z.infer<typeof ExecutionQuerySchema>;

// =============================================================================
// Node API Schemas
// =============================================================================

/**
 * Node query/filter schema
 */
export const NodeQuerySchema = PaginationQuerySchema.extend({
  category: z.string().optional(),
  search: z.string().optional(),
});
export type NodeQuery = z.infer<typeof NodeQuerySchema>;
