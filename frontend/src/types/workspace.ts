// Workspace-related type definitions for multi-tenancy

export type WorkspaceRole = 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER'

export type WorkspacePlan = 'free' | 'pro' | 'enterprise'

export interface Workspace {
  id: string
  name: string
  slug: string
  description?: string | null
  ownerId: string
  plan: WorkspacePlan
  maxMembers: number
  maxWorkflows: number
  maxExecutionsPerMonth: number
  maxCredentials: number
  currentMonthExecutions: number
  createdAt: string
  updatedAt: string
  owner?: {
    id: string
    name: string | null
    email: string
  }
  userRole?: WorkspaceRole
  _count?: {
    members?: number
    workflows?: number
    credentials?: number
  }
}

export interface WorkspaceMember {
  id: string
  workspaceId: string
  userId: string
  role: WorkspaceRole
  joinedAt: string
  invitedBy?: string
  user: {
    id: string
    name: string | null
    email: string
    image?: string | null
  }
}

export interface WorkspaceInvitation {
  id: string
  workspaceId: string
  email: string
  role: WorkspaceRole
  token: string
  expiresAt: string
  acceptedAt?: string | null
  createdAt: string
  workspace?: {
    id: string
    name: string
    slug: string
  }
}

export interface WorkspaceUsage {
  workflowCount: number
  credentialCount: number
  memberCount: number
  executionsThisMonth: number
  limits: {
    maxWorkflows: number
    maxCredentials: number
    maxMembers: number
    maxExecutionsPerMonth: number
  }
  percentages: {
    workflows: number
    credentials: number
    members: number
    executions: number
  }
}

export interface CreateWorkspaceRequest {
  name: string
  slug?: string
  description?: string
}

export interface UpdateWorkspaceRequest {
  name?: string
  slug?: string
  description?: string
  settings?: Record<string, any>
}

export interface InviteMemberRequest {
  email: string
  role?: WorkspaceRole
}

export interface UpdateMemberRoleRequest {
  role: WorkspaceRole
}

export interface WorkspaceWithRole extends Workspace {
  userRole: WorkspaceRole
}
