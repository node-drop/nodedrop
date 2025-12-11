import { apiClient } from './api'
import {
  Workspace,
  WorkspaceMember,
  WorkspaceInvitation,
  WorkspaceUsage,
  CreateWorkspaceRequest,
  UpdateWorkspaceRequest,
  InviteMemberRequest,
  UpdateMemberRoleRequest,
} from '@/types/workspace'

export class WorkspaceService {
  // ============================================
  // WORKSPACE CRUD
  // ============================================

  async getWorkspaces(): Promise<Workspace[]> {
    const response = await apiClient.get<Workspace[]>('/workspaces')
    return response.data || []
  }

  async getWorkspace(id: string): Promise<Workspace> {
    const response = await apiClient.get<Workspace>(`/workspaces/${id}`)
    if (!response.success || !response.data) {
      throw new Error('Failed to fetch workspace')
    }
    return response.data
  }

  async createWorkspace(data: CreateWorkspaceRequest): Promise<Workspace> {
    const response = await apiClient.post<Workspace>('/workspaces', data)
    if (!response.success || !response.data) {
      throw new Error('Failed to create workspace')
    }
    return response.data
  }

  async updateWorkspace(id: string, data: UpdateWorkspaceRequest): Promise<Workspace> {
    const response = await apiClient.patch<Workspace>(`/workspaces/${id}`, data)
    if (!response.success || !response.data) {
      throw new Error('Failed to update workspace')
    }
    return response.data
  }

  async deleteWorkspace(id: string): Promise<void> {
    const response = await apiClient.delete(`/workspaces/${id}`)
    if (!response.success) {
      throw new Error('Failed to delete workspace')
    }
  }

  // ============================================
  // MEMBER MANAGEMENT
  // ============================================

  async getWorkspaceMembers(workspaceId: string): Promise<WorkspaceMember[]> {
    const response = await apiClient.get<WorkspaceMember[]>(`/workspaces/${workspaceId}/members`)
    return response.data || []
  }

  async inviteMember(workspaceId: string, data: InviteMemberRequest): Promise<WorkspaceInvitation> {
    const response = await apiClient.post<WorkspaceInvitation>(
      `/workspaces/${workspaceId}/members/invite`,
      data
    )
    if (!response.success || !response.data) {
      throw new Error('Failed to invite member')
    }
    return response.data
  }

  async acceptInvitation(token: string): Promise<WorkspaceMember> {
    const response = await apiClient.post<Workspace>(
      `/workspaces/invitations/${token}/accept`
    )
    if (!response.success || !response.data) {
      throw new Error('Failed to accept invitation')
    }
    // Return workspace info (backend returns workspace after accepting)
    return response.data as any
  }

  async updateMemberRole(
    workspaceId: string,
    userId: string,
    data: UpdateMemberRoleRequest
  ): Promise<WorkspaceMember> {
    const response = await apiClient.patch<WorkspaceMember>(
      `/workspaces/${workspaceId}/members/${userId}`,
      data
    )
    if (!response.success || !response.data) {
      throw new Error('Failed to update member role')
    }
    return response.data
  }

  async removeMember(workspaceId: string, userId: string): Promise<void> {
    const response = await apiClient.delete(`/workspaces/${workspaceId}/members/${userId}`)
    if (!response.success) {
      throw new Error('Failed to remove member')
    }
  }

  // ============================================
  // USAGE & CONTEXT
  // ============================================

  async getWorkspaceUsage(workspaceId: string): Promise<WorkspaceUsage> {
    const response = await apiClient.get<WorkspaceUsage>(`/workspaces/${workspaceId}/usage`)
    if (!response.success || !response.data) {
      throw new Error('Failed to fetch workspace usage')
    }
    return response.data
  }

  async getCurrentWorkspace(): Promise<Workspace | null> {
    try {
      const response = await apiClient.get<Workspace>('/workspaces/current')
      return response.data || null
    } catch {
      return null
    }
  }

  async setDefaultWorkspace(workspaceId: string): Promise<void> {
    const response = await apiClient.post(`/workspaces/${workspaceId}/set-default`)
    if (!response.success) {
      throw new Error('Failed to set default workspace')
    }
  }
}

export const workspaceService = new WorkspaceService()
