/**
 * Workspace Types for Multi-tenancy
 * 
 * Re-exports shared types from @nodedrop/types and defines backend-specific types.
 */

import { WorkspaceRole as PrismaWorkspaceRole } from "@prisma/client";

// =============================================================================
// Re-export shared types from @nodedrop/types
// =============================================================================
export {
  // Types (excluding WorkspaceWithRole - we define a backend-specific version)
  type WorkspaceRole,
  type WorkspacePlanName,
  type Workspace,
  type WorkspaceMember,
  type WorkspaceInvitation,
  type WorkspaceUsage,
  type WorkspacePlanConfig,
  type CreateWorkspaceRequest,
  type UpdateWorkspaceRequest,
  type InviteMemberRequest,
  type UpdateMemberRoleRequest,
  type WorkspaceContext,
  // Schemas
  WorkspaceRoleSchema,
  WorkspacePlanNameSchema,
  WorkspaceSchema,
  WorkspaceMemberSchema,
  WorkspaceInvitationSchema,
  WorkspaceUsageSchema,
  CreateWorkspaceRequestSchema,
  UpdateWorkspaceRequestSchema,
  InviteMemberRequestSchema,
  UpdateMemberRoleRequestSchema,
  WorkspaceContextSchema,
  // Constants and helpers
  WORKSPACE_PLANS,
  getWorkspacePlan,
  isWorkspacePlanName,
} from "@nodedrop/types";

// =============================================================================
// Backend-specific types (using Prisma types)
// =============================================================================

/**
 * Workspace response type for API responses
 * Uses Prisma's WorkspaceRole for compatibility with database queries
 * Note: plan is string to match Prisma's return type
 */
export interface WorkspaceResponse {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  ownerId: string;
  plan: string;
  maxMembers: number;
  maxWorkflows: number;
  maxExecutionsPerMonth: number;
  maxCredentials: number;
  currentMonthExecutions: number;
  createdAt: Date;
  updatedAt: Date;
  _count?: {
    members: number;
    workflows: number;
    credentials: number;
  };
}

/**
 * Backend-specific WorkspaceWithRole that uses string for plan
 * to match Prisma's return type
 */
export interface WorkspaceWithRole extends WorkspaceResponse {
  userRole: PrismaWorkspaceRole;
}

/**
 * Workspace member response for API responses
 * Uses Prisma's WorkspaceRole for compatibility with database queries
 */
export interface WorkspaceMemberResponse {
  id: string;
  workspaceId: string;
  userId: string;
  role: PrismaWorkspaceRole;
  joinedAt: Date;
  user: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  };
}

/**
 * Workspace invitation response for API responses
 */
export interface WorkspaceInvitationResponse {
  id: string;
  workspaceId: string;
  email: string;
  role: PrismaWorkspaceRole;
  expiresAt: Date;
  createdAt: Date;
  workspace?: {
    id: string;
    name: string;
    slug: string;
  };
}


