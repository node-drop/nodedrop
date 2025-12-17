/**
 * WorkspaceService Factory
 * 
 * This file provides the WorkspaceService implementation using Drizzle ORM.
 */

import { WorkspaceServiceDrizzle } from './WorkspaceService.drizzle';
import { logger } from '../utils/logger';
import {
  CreateWorkspaceRequest,
  UpdateWorkspaceRequest,
  WorkspaceMemberResponse,
  WorkspaceResponse,
  WorkspaceUsage,
  WorkspaceWithRole,
} from '../types/workspace.types';

// Type definitions for the service interface
export interface IWorkspaceService {
  createWorkspace(userId: string, data: CreateWorkspaceRequest): Promise<WorkspaceResponse>;
  getWorkspace(workspaceId: string, userId: string): Promise<WorkspaceWithRole>;
  getWorkspaceBySlug(slug: string, userId: string): Promise<WorkspaceWithRole>;
  getUserWorkspaces(userId: string): Promise<WorkspaceWithRole[]>;
  canCreateWorkspace(userId: string): Promise<any>;
  updateWorkspace(workspaceId: string, userId: string, data: UpdateWorkspaceRequest): Promise<WorkspaceResponse>;
  deleteWorkspace(workspaceId: string, userId: string): Promise<void>;
  getMembers(workspaceId: string, userId: string): Promise<WorkspaceMemberResponse[]>;
  inviteMember(workspaceId: string, userId: string, email: string, role?: string): Promise<any>;
  acceptInvitation(token: string, userId: string): Promise<WorkspaceResponse>;
  updateMemberRole(workspaceId: string, userId: string, targetUserId: string, newRole: string): Promise<WorkspaceMemberResponse>;
  removeMember(workspaceId: string, userId: string, targetUserId: string): Promise<void>;
  getUsage(workspaceId: string, userId: string): Promise<WorkspaceUsage>;
  canCreate(workspaceId: string, resourceType: 'workflow' | 'credential' | 'member'): Promise<any>;
  incrementExecutionCount(workspaceId: string): Promise<void>;
  resetMonthlyExecutionCounts(): Promise<number>;
}

/**
 * Get the WorkspaceService implementation (Drizzle ORM)
 */
function getWorkspaceService(): IWorkspaceService {
  logger.debug('Initializing Drizzle WorkspaceService');
  return new WorkspaceServiceDrizzle() as IWorkspaceService;
}

/**
 * Export the service instance
 */
export const workspaceService: IWorkspaceService = getWorkspaceService();

// Re-export types from Drizzle implementation
export { WorkspaceServiceDrizzle };

// Legacy class export for backward compatibility
export class WorkspaceService {
  /**
   * Create a new workspace
   */
  static async createWorkspace(
    userId: string,
    data: CreateWorkspaceRequest
  ): Promise<WorkspaceResponse> {
    return workspaceService.createWorkspace(userId, data);
  }

  /**
   * Get workspace by ID (with access check)
   */
  static async getWorkspace(
    workspaceId: string,
    userId: string
  ): Promise<WorkspaceWithRole> {
    return workspaceService.getWorkspace(workspaceId, userId);
  }

  /**
   * Get workspace by slug
   */
  static async getWorkspaceBySlug(
    slug: string,
    userId: string
  ): Promise<WorkspaceWithRole> {
    return workspaceService.getWorkspaceBySlug(slug, userId);
  }

  /**
   * Get all workspaces for a user
   */
  static async getUserWorkspaces(userId: string): Promise<WorkspaceWithRole[]> {
    return workspaceService.getUserWorkspaces(userId);
  }

  /**
   * Check if user can create more workspaces
   */
  static async canCreateWorkspace(userId: string): Promise<{
    allowed: boolean;
    reason?: string;
    currentCount: number;
    maxAllowed: number;
    plan: string;
  }> {
    return workspaceService.canCreateWorkspace(userId);
  }

  /**
   * Update workspace
   */
  static async updateWorkspace(
    workspaceId: string,
    userId: string,
    data: UpdateWorkspaceRequest
  ): Promise<WorkspaceResponse> {
    return workspaceService.updateWorkspace(workspaceId, userId, data);
  }

  /**
   * Delete workspace
   */
  static async deleteWorkspace(workspaceId: string, userId: string): Promise<void> {
    return workspaceService.deleteWorkspace(workspaceId, userId);
  }

  /**
   * Get workspace members
   */
  static async getMembers(
    workspaceId: string,
    userId: string
  ): Promise<WorkspaceMemberResponse[]> {
    return workspaceService.getMembers(workspaceId, userId);
  }

  /**
   * Invite member to workspace
   */
  static async inviteMember(
    workspaceId: string,
    userId: string,
    email: string,
    role?: string
  ): Promise<{ invitationId: string; token: string }> {
    return workspaceService.inviteMember(workspaceId, userId, email, role);
  }

  /**
   * Accept workspace invitation
   */
  static async acceptInvitation(token: string, userId: string): Promise<WorkspaceResponse> {
    return workspaceService.acceptInvitation(token, userId);
  }

  /**
   * Update member role
   */
  static async updateMemberRole(
    workspaceId: string,
    userId: string,
    targetUserId: string,
    newRole: string
  ): Promise<WorkspaceMemberResponse> {
    return workspaceService.updateMemberRole(workspaceId, userId, targetUserId, newRole);
  }

  /**
   * Remove member from workspace
   */
  static async removeMember(
    workspaceId: string,
    userId: string,
    targetUserId: string
  ): Promise<void> {
    return workspaceService.removeMember(workspaceId, userId, targetUserId);
  }

  /**
   * Get workspace usage statistics
   */
  static async getUsage(workspaceId: string, userId: string): Promise<WorkspaceUsage> {
    return workspaceService.getUsage(workspaceId, userId);
  }

  /**
   * Check if workspace can create more of a resource type
   */
  static async canCreate(
    workspaceId: string,
    resourceType: 'workflow' | 'credential' | 'member'
  ): Promise<{ allowed: boolean; reason?: string }> {
    return workspaceService.canCreate(workspaceId, resourceType);
  }

  /**
   * Increment execution count for workspace
   */
  static async incrementExecutionCount(workspaceId: string): Promise<void> {
    return workspaceService.incrementExecutionCount(workspaceId);
  }

  /**
   * Reset monthly execution counts (called by scheduled job)
   */
  static async resetMonthlyExecutionCounts(): Promise<number> {
    return workspaceService.resetMonthlyExecutionCounts();
  }
}
