/**
 * @nodedrop/types - Workspace Types
 *
 * Shared workspace-related type definitions for multi-tenancy.
 * These types are used by both frontend and backend.
 */

import { z } from "zod";

// =============================================================================
// Workspace Role and Plan Schemas
// =============================================================================

export const WorkspaceRoleSchema = z.enum(["OWNER", "ADMIN", "MEMBER", "VIEWER"]);

export const WorkspacePlanNameSchema = z.enum(["free", "pro", "enterprise"]);

// =============================================================================
// Workspace Schemas
// =============================================================================

export const WorkspaceSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable().optional(),
  ownerId: z.string(),
  plan: WorkspacePlanNameSchema,
  maxMembers: z.number(),
  maxWorkflows: z.number(),
  maxExecutionsPerMonth: z.number(),
  maxCredentials: z.number(),
  currentMonthExecutions: z.number(),
  createdAt: z.union([z.string(), z.date()]),
  updatedAt: z.union([z.string(), z.date()]),
  owner: z.object({
    id: z.string(),
    name: z.string().nullable(),
    email: z.string(),
  }).optional(),
  userRole: WorkspaceRoleSchema.optional(),
  _count: z.object({
    members: z.number().optional(),
    workflows: z.number().optional(),
    credentials: z.number().optional(),
  }).optional(),
});

export const WorkspaceMemberSchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  userId: z.string(),
  role: WorkspaceRoleSchema,
  joinedAt: z.union([z.string(), z.date()]),
  invitedBy: z.string().optional(),
  user: z.object({
    id: z.string(),
    name: z.string().nullable(),
    email: z.string(),
    image: z.string().nullable().optional(),
  }),
});

export const WorkspaceInvitationSchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  email: z.string(),
  role: WorkspaceRoleSchema,
  token: z.string().optional(),
  expiresAt: z.union([z.string(), z.date()]),
  acceptedAt: z.union([z.string(), z.date()]).nullable().optional(),
  createdAt: z.union([z.string(), z.date()]),
  workspace: z.object({
    id: z.string(),
    name: z.string(),
    slug: z.string(),
  }).optional(),
});

export const WorkspaceUsageSchema = z.object({
  workflowCount: z.number(),
  credentialCount: z.number(),
  memberCount: z.number(),
  executionsThisMonth: z.number(),
  limits: z.object({
    maxWorkflows: z.number(),
    maxCredentials: z.number(),
    maxMembers: z.number(),
    maxExecutionsPerMonth: z.number(),
  }),
  percentages: z.object({
    workflows: z.number(),
    credentials: z.number(),
    members: z.number(),
    executions: z.number(),
  }),
});

// =============================================================================
// Workspace Plan Configuration Schema
// =============================================================================

export const WorkspacePlanConfigSchema = z.object({
  name: z.string(),
  maxMembers: z.number(),
  maxWorkflows: z.number(),
  maxExecutionsPerMonth: z.number(),
  maxCredentials: z.number(),
  maxWorkspaces: z.number(),
});

// =============================================================================
// Workspace Request Schemas
// =============================================================================

export const CreateWorkspaceRequestSchema = z.object({
  name: z.string().min(1),
  slug: z.string().optional(),
  description: z.string().optional(),
});

export const UpdateWorkspaceRequestSchema = z.object({
  name: z.string().optional(),
  slug: z.string().optional(),
  description: z.string().optional(),
  settings: z.record(z.any()).optional(),
});

export const InviteMemberRequestSchema = z.object({
  email: z.string().email(),
  role: WorkspaceRoleSchema.optional(),
});

export const UpdateMemberRoleRequestSchema = z.object({
  role: WorkspaceRoleSchema,
});

// =============================================================================
// Workspace Context Schema (for middleware)
// =============================================================================

export const WorkspaceContextSchema = z.object({
  workspaceId: z.string(),
  workspaceSlug: z.string(),
  workspaceName: z.string(),
  userRole: WorkspaceRoleSchema,
  plan: z.string(),
  limits: z.object({
    maxMembers: z.number(),
    maxWorkflows: z.number(),
    maxExecutionsPerMonth: z.number(),
    maxCredentials: z.number(),
  }),
  usage: z.object({
    currentMonthExecutions: z.number(),
  }),
});

// =============================================================================
// Type Exports (inferred from schemas)
// =============================================================================

export type WorkspaceRole = z.infer<typeof WorkspaceRoleSchema>;
export type WorkspacePlanName = z.infer<typeof WorkspacePlanNameSchema>;
export type Workspace = z.infer<typeof WorkspaceSchema>;
export type WorkspaceMember = z.infer<typeof WorkspaceMemberSchema>;
export type WorkspaceInvitation = z.infer<typeof WorkspaceInvitationSchema>;
export type WorkspaceUsage = z.infer<typeof WorkspaceUsageSchema>;
export type WorkspacePlanConfig = z.infer<typeof WorkspacePlanConfigSchema>;
export type CreateWorkspaceRequest = z.infer<typeof CreateWorkspaceRequestSchema>;
export type UpdateWorkspaceRequest = z.infer<typeof UpdateWorkspaceRequestSchema>;
export type InviteMemberRequest = z.infer<typeof InviteMemberRequestSchema>;
export type UpdateMemberRoleRequest = z.infer<typeof UpdateMemberRoleRequestSchema>;
export type WorkspaceContext = z.infer<typeof WorkspaceContextSchema>;

/**
 * Workspace with user's role included
 */
export interface WorkspaceWithRole extends Workspace {
  userRole: WorkspaceRole;
}

// =============================================================================
// Workspace Plan Constants
// =============================================================================

export const WORKSPACE_PLANS: Record<WorkspacePlanName, WorkspacePlanConfig> = {
  free: {
    name: "Free",
    maxMembers: 1,
    maxWorkflows: 5,
    maxExecutionsPerMonth: 1000,
    maxCredentials: 10,
    maxWorkspaces: 1,
  },
  pro: {
    name: "Pro",
    maxMembers: 10,
    maxWorkflows: 50,
    maxExecutionsPerMonth: 10000,
    maxCredentials: 100,
    maxWorkspaces: 5,
  },
  enterprise: {
    name: "Enterprise",
    maxMembers: -1, // unlimited
    maxWorkflows: -1,
    maxExecutionsPerMonth: -1,
    maxCredentials: -1,
    maxWorkspaces: -1,
  },
};

/**
 * Helper function to get workspace plan config by plan name
 * Returns the free plan config if the plan name is not recognized
 */
export function getWorkspacePlan(planName: string): WorkspacePlanConfig {
  if (isWorkspacePlanName(planName)) {
    return WORKSPACE_PLANS[planName];
  }
  return WORKSPACE_PLANS.free;
}

/**
 * Type guard to check if a string is a valid workspace plan name
 */
export function isWorkspacePlanName(value: string): value is WorkspacePlanName {
  return value === "free" || value === "pro" || value === "enterprise";
}
