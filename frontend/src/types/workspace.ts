/**
 * Workspace Types - Re-exported from @nodedrop/types
 * 
 * This file re-exports shared workspace types from the types package.
 * All workspace types are now defined in @nodedrop/types for consistency
 * between frontend and backend.
 */

// Re-export all workspace types from shared package
export type {
  WorkspaceRole,
  WorkspacePlanName,
  Workspace,
  WorkspaceMember,
  WorkspaceInvitation,
  WorkspaceUsage,
  WorkspacePlanConfig,
  CreateWorkspaceRequest,
  UpdateWorkspaceRequest,
  InviteMemberRequest,
  UpdateMemberRoleRequest,
  WorkspaceContext,
  WorkspaceWithRole,
} from "@nodedrop/types";

// Re-export schemas for validation
export {
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
  WORKSPACE_PLANS,
} from "@nodedrop/types";


