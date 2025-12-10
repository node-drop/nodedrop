/**
 * Workspace Types for Multi-tenancy
 * 
 * These types define the workspace-related data structures used throughout
 * the application for multi-tenant SaaS functionality.
 */

import { WorkspaceRole } from "@prisma/client";

// ============================================
// WORKSPACE TYPES
// ============================================

export interface WorkspacePlan {
  name: string;
  maxMembers: number;
  maxWorkflows: number;
  maxExecutionsPerMonth: number;
  maxCredentials: number;
}

export const WORKSPACE_PLANS: Record<string, WorkspacePlan> = {
  free: {
    name: "Free",
    maxMembers: 1,
    maxWorkflows: 5,
    maxExecutionsPerMonth: 1000,
    maxCredentials: 10,
  },
  pro: {
    name: "Pro",
    maxMembers: 10,
    maxWorkflows: 50,
    maxExecutionsPerMonth: 10000,
    maxCredentials: 100,
  },
  enterprise: {
    name: "Enterprise",
    maxMembers: -1, // unlimited
    maxWorkflows: -1,
    maxExecutionsPerMonth: -1,
    maxCredentials: -1,
  },
};

export interface CreateWorkspaceRequest {
  name: string;
  slug?: string;
  description?: string;
}

export interface UpdateWorkspaceRequest {
  name?: string;
  slug?: string;
  description?: string;
  settings?: Record<string, any>;
}

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

export interface WorkspaceWithRole extends WorkspaceResponse {
  userRole: WorkspaceRole;
}

// ============================================
// WORKSPACE MEMBER TYPES
// ============================================

export interface WorkspaceMemberResponse {
  id: string;
  workspaceId: string;
  userId: string;
  role: WorkspaceRole;
  joinedAt: Date;
  user: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  };
}

export interface InviteMemberRequest {
  email: string;
  role?: WorkspaceRole;
}

export interface UpdateMemberRoleRequest {
  role: WorkspaceRole;
}

// ============================================
// WORKSPACE INVITATION TYPES
// ============================================

export interface WorkspaceInvitationResponse {
  id: string;
  workspaceId: string;
  email: string;
  role: WorkspaceRole;
  expiresAt: Date;
  createdAt: Date;
  workspace?: {
    id: string;
    name: string;
    slug: string;
  };
}

// ============================================
// WORKSPACE CONTEXT (for middleware)
// ============================================

export interface WorkspaceContext {
  workspaceId: string;
  workspaceSlug: string;
  workspaceName: string;
  userRole: WorkspaceRole;
  plan: string;
  limits: {
    maxMembers: number;
    maxWorkflows: number;
    maxExecutionsPerMonth: number;
    maxCredentials: number;
  };
  usage: {
    currentMonthExecutions: number;
  };
}

// ============================================
// WORKSPACE USAGE TYPES
// ============================================

export interface WorkspaceUsage {
  workflowCount: number;
  credentialCount: number;
  memberCount: number;
  executionsThisMonth: number;
  limits: {
    maxWorkflows: number;
    maxCredentials: number;
    maxMembers: number;
    maxExecutionsPerMonth: number;
  };
  percentages: {
    workflows: number;
    credentials: number;
    members: number;
    executions: number;
  };
}
