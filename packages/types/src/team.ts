/**
 * @nodedrop/types - Team Types
 *
 * Shared team-related type definitions.
 * These types are used by both frontend and backend.
 */

import { z } from "zod";

// =============================================================================
// Team Role and Permission Schemas
// =============================================================================

export const TeamRoleSchema = z.enum(["OWNER", "MEMBER", "VIEWER"]);

export const SharePermissionSchema = z.enum(["USE", "VIEW", "EDIT"]);

// =============================================================================
// Team Schemas
// =============================================================================

export const TeamSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  description: z.string().optional(),
  color: z.string(),
  ownerId: z.string(),
  settings: z.record(z.any()).optional(),
  createdAt: z.union([z.string(), z.date()]),
  updatedAt: z.union([z.string(), z.date()]),
  owner: z.object({
    id: z.string(),
    name: z.string().nullable(),
    email: z.string(),
  }).optional(),
  members: z.array(z.lazy(() => TeamMemberSchema)).optional(),
  userRole: TeamRoleSchema.optional(),
  _count: z.object({
    members: z.number().optional(),
    workflows: z.number().optional(),
    credentials: z.number().optional(),
  }).optional(),
});

export const TeamMemberSchema = z.object({
  id: z.string(),
  teamId: z.string(),
  userId: z.string(),
  role: TeamRoleSchema,
  joinedAt: z.union([z.string(), z.date()]),
  user: z.object({
    id: z.string(),
    name: z.string().nullable(),
    email: z.string(),
  }),
});

export const TeamCredentialShareSchema = z.object({
  id: z.string(),
  credentialId: z.string(),
  teamId: z.string(),
  permission: SharePermissionSchema,
  sharedAt: z.union([z.string(), z.date()]),
  sharedBy: z.string().optional(),
  credential: z.object({
    id: z.string(),
    name: z.string(),
    type: z.string(),
    userId: z.string(),
    createdAt: z.union([z.string(), z.date()]),
    updatedAt: z.union([z.string(), z.date()]),
    expiresAt: z.union([z.string(), z.date()]).nullable().optional(),
  }).optional(),
  team: z.object({
    id: z.string(),
    name: z.string(),
    slug: z.string(),
    color: z.string(),
  }).optional(),
  sharer: z.object({
    id: z.string(),
    name: z.string().nullable(),
    email: z.string(),
  }).optional(),
});

// =============================================================================
// Team Request Schemas
// =============================================================================

export const CreateTeamRequestSchema = z.object({
  name: z.string().min(1),
  slug: z.string().optional(),
  description: z.string().optional(),
  color: z.string().optional(),
});

export const UpdateTeamRequestSchema = z.object({
  name: z.string().optional(),
  slug: z.string().optional(),
  description: z.string().optional(),
  color: z.string().optional(),
  settings: z.record(z.any()).optional(),
});

export const AddTeamMemberRequestSchema = z.object({
  email: z.string().email(),
  role: TeamRoleSchema.optional(),
});

export const UpdateTeamMemberRoleRequestSchema = z.object({
  role: TeamRoleSchema,
});

export const ShareCredentialWithTeamRequestSchema = z.object({
  permission: SharePermissionSchema.optional(),
});

export const UpdateTeamCredentialPermissionRequestSchema = z.object({
  permission: SharePermissionSchema,
});

// =============================================================================
// Type Exports (inferred from schemas)
// =============================================================================

export type TeamRole = z.infer<typeof TeamRoleSchema>;
export type SharePermission = z.infer<typeof SharePermissionSchema>;
export type Team = z.infer<typeof TeamSchema>;
export type TeamMember = z.infer<typeof TeamMemberSchema>;
export type TeamCredentialShare = z.infer<typeof TeamCredentialShareSchema>;
export type CreateTeamRequest = z.infer<typeof CreateTeamRequestSchema>;
export type UpdateTeamRequest = z.infer<typeof UpdateTeamRequestSchema>;
export type AddTeamMemberRequest = z.infer<typeof AddTeamMemberRequestSchema>;
export type UpdateTeamMemberRoleRequest = z.infer<typeof UpdateTeamMemberRoleRequestSchema>;
export type ShareCredentialWithTeamRequest = z.infer<typeof ShareCredentialWithTeamRequestSchema>;
export type UpdateTeamCredentialPermissionRequest = z.infer<typeof UpdateTeamCredentialPermissionRequestSchema>;
