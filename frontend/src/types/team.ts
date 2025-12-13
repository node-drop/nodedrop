/**
 * Team Types - Re-exported from @nodedrop/types
 * 
 * This file re-exports shared team types from the types package.
 * All team types are now defined in @nodedrop/types for consistency
 * between frontend and backend.
 */

// Re-export all team types from shared package
export type {
  TeamRole,
  SharePermission,
  Team,
  TeamMember,
  TeamCredentialShare,
  CreateTeamRequest,
  UpdateTeamRequest,
  AddTeamMemberRequest,
  UpdateTeamMemberRoleRequest,
  ShareCredentialWithTeamRequest,
  UpdateTeamCredentialPermissionRequest,
} from "@nodedrop/types";

// Re-export schemas for validation
export {
  TeamRoleSchema,
  SharePermissionSchema,
  TeamSchema,
  TeamMemberSchema,
  TeamCredentialShareSchema,
  CreateTeamRequestSchema,
  UpdateTeamRequestSchema,
  AddTeamMemberRequestSchema,
  UpdateTeamMemberRoleRequestSchema,
  ShareCredentialWithTeamRequestSchema,
  UpdateTeamCredentialPermissionRequestSchema,
} from "@nodedrop/types";

// Note: UpdateMemberRoleRequest is exported from workspace.ts for workspace member roles
// Use UpdateTeamMemberRoleRequest for team member roles
