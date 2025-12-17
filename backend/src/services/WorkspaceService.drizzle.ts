import { eq, and } from 'drizzle-orm';
import { db } from '../db/client';
import { workspaces, workspaceMembers, workspaceInvitations } from '../db/schema/workspace';
import { users } from '../db/schema/auth';
import { logger } from '../utils/logger';
import { AppError } from '../middleware/errorHandler';
import {
  CreateWorkspaceRequest,
  UpdateWorkspaceRequest,
  WorkspaceMemberResponse,
  WorkspaceResponse,
  WorkspaceUsage,
  WorkspaceWithRole,
  getWorkspacePlan,
} from '../types/workspace.types';
import { randomBytes } from 'crypto';

/**
 * WorkspaceService with Drizzle ORM
 * Provides database operations for workspace management
 */
export class WorkspaceServiceDrizzle {
  /**
   * Generate URL-friendly slug from workspace name
   */
  private static generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 50);
  }

  /**
   * Generate unique invitation token
   */
  private static generateInviteToken(): string {
    return randomBytes(32).toString('hex');
  }

  /**
   * Create a new workspace
   */
  async createWorkspace(
    userId: string,
    data: CreateWorkspaceRequest
  ): Promise<WorkspaceResponse> {
    try {
      const userWorkspaces = await db.query.workspaceMembers.findMany({
        where: and(
          eq(workspaceMembers.userId, userId),
          eq(workspaceMembers.role, 'OWNER')
        ),
        with: {
          workspace: {
            columns: { plan: true },
          },
        },
      });

      let effectivePlan = 'free';
      for (const membership of userWorkspaces) {
        const plan = membership.workspace.plan;
        if (plan === 'enterprise') {
          effectivePlan = 'enterprise';
          break;
        } else if (plan === 'pro' && effectivePlan !== 'enterprise') {
          effectivePlan = 'pro';
        }
      }

      const planLimits = getWorkspacePlan(effectivePlan);
      const ownedWorkspaceCount = userWorkspaces.length;

      if (planLimits.maxWorkspaces !== -1 && ownedWorkspaceCount >= planLimits.maxWorkspaces) {
        throw new AppError(
          `Workspace limit reached. ${effectivePlan === 'free' ? 'Upgrade to Pro for more workspaces.' : 'Upgrade your plan for more workspaces.'}`,
          403,
          'WORKSPACE_LIMIT_REACHED'
        );
      }

      const slug = data.slug || WorkspaceServiceDrizzle.generateSlug(data.name);

      const existingWorkspace = await db.query.workspaces.findFirst({
        where: eq(workspaces.slug, slug),
      });

      if (existingWorkspace) {
        throw new AppError('Workspace slug already exists', 400, 'SLUG_EXISTS');
      }

      const newWorkspacePlanLimits = getWorkspacePlan('free');

      const newWorkspace = await db
        .insert(workspaces)
        .values({
          name: data.name,
          slug,
          description: data.description || null,
          ownerId: userId,
          plan: 'free',
          maxMembers: newWorkspacePlanLimits.maxMembers,
          maxWorkflows: newWorkspacePlanLimits.maxWorkflows,
          maxExecutionsPerMonth: newWorkspacePlanLimits.maxExecutionsPerMonth,
          maxCredentials: newWorkspacePlanLimits.maxCredentials,
        })
        .returning();

      if (!newWorkspace[0]) {
        throw new Error('Failed to create workspace');
      }

      await db.insert(workspaceMembers).values({
        workspaceId: newWorkspace[0].id,
        userId,
        role: 'OWNER',
      });

      const user = await db.query.users.findFirst({
        where: eq(users.id, userId),
      });

      if (user && !user.defaultWorkspaceId) {
        await db
          .update(users)
          .set({ defaultWorkspaceId: newWorkspace[0].id })
          .where(eq(users.id, userId));
      }

      logger.info(`Workspace created: ${newWorkspace[0].id} by user ${userId}`);

      return this.mapWorkspaceToResponse(newWorkspace[0]);
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error creating workspace:', error);
      throw new AppError('Failed to create workspace', 500, 'WORKSPACE_CREATE_ERROR');
    }
  }

  /**
   * Get workspace by ID
   */
  async getWorkspace(
    workspaceId: string,
    userId: string
  ): Promise<WorkspaceWithRole> {
    try {
      const workspace = await db.query.workspaces.findFirst({
        where: eq(workspaces.id, workspaceId),
      });

      if (!workspace) {
        throw new AppError('Workspace not found', 404, 'WORKSPACE_NOT_FOUND');
      }

      const membership = await db.query.workspaceMembers.findFirst({
        where: and(
          eq(workspaceMembers.workspaceId, workspaceId),
          eq(workspaceMembers.userId, userId)
        ),
      });

      if (!membership) {
        throw new AppError('Access denied to workspace', 403, 'WORKSPACE_ACCESS_DENIED');
      }

      return {
        ...this.mapWorkspaceToResponse(workspace),
        userRole: membership.role as any,
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error getting workspace:', error);
      throw new AppError('Failed to get workspace', 500, 'WORKSPACE_GET_ERROR');
    }
  }

  /**
   * Get workspace by slug
   */
  async getWorkspaceBySlug(
    slug: string,
    userId: string
  ): Promise<WorkspaceWithRole> {
    try {
      const workspace = await db.query.workspaces.findFirst({
        where: eq(workspaces.slug, slug),
      });

      if (!workspace) {
        throw new AppError('Workspace not found', 404, 'WORKSPACE_NOT_FOUND');
      }

      return this.getWorkspace(workspace.id, userId);
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error getting workspace by slug:', error);
      throw new AppError('Failed to get workspace', 500, 'WORKSPACE_GET_ERROR');
    }
  }

  /**
   * Get all workspaces for a user
   */
  async getUserWorkspaces(userId: string): Promise<WorkspaceWithRole[]> {
    try {
      const memberships = await db.query.workspaceMembers.findMany({
        where: eq(workspaceMembers.userId, userId),
        with: {
          workspace: true,
        },
        orderBy: (fields) => fields.joinedAt,
      });

      return memberships.map((m) => ({
        ...this.mapWorkspaceToResponse(m.workspace),
        userRole: m.role as any,
      }));
    } catch (error) {
      logger.error('Error getting user workspaces:', error);
      throw new AppError('Failed to get workspaces', 500, 'WORKSPACES_GET_ERROR');
    }
  }

  /**
   * Check if user can create more workspaces
   */
  async canCreateWorkspace(userId: string): Promise<{
    allowed: boolean;
    reason?: string;
    currentCount: number;
    maxAllowed: number;
    plan: string;
  }> {
    try {
      const ownedWorkspaces = await db.query.workspaceMembers.findMany({
        where: and(
          eq(workspaceMembers.userId, userId),
          eq(workspaceMembers.role, 'OWNER')
        ),
        with: {
          workspace: {
            columns: { plan: true },
          },
        },
      });

      let effectivePlan = 'free';
      for (const membership of ownedWorkspaces) {
        const plan = membership.workspace.plan;
        if (plan === 'enterprise') {
          effectivePlan = 'enterprise';
          break;
        } else if (plan === 'pro' && effectivePlan !== 'enterprise') {
          effectivePlan = 'pro';
        }
      }

      const planLimits = getWorkspacePlan(effectivePlan);
      const currentCount = ownedWorkspaces.length;
      const maxAllowed = planLimits.maxWorkspaces;

      if (maxAllowed === -1) {
        return { allowed: true, currentCount, maxAllowed, plan: effectivePlan };
      }

      if (currentCount >= maxAllowed) {
        return {
          allowed: false,
          reason: `You've reached the maximum of ${maxAllowed} workspace${maxAllowed !== 1 ? 's' : ''} for the ${planLimits.name} plan.`,
          currentCount,
          maxAllowed,
          plan: effectivePlan,
        };
      }

      return { allowed: true, currentCount, maxAllowed, plan: effectivePlan };
    } catch (error) {
      logger.error('Error checking workspace limit:', error);
      return { allowed: false, reason: 'Error checking limits', currentCount: 0, maxAllowed: 0, plan: 'free' };
    }
  }

  /**
   * Update workspace
   */
  async updateWorkspace(
    workspaceId: string,
    userId: string,
    data: UpdateWorkspaceRequest
  ): Promise<WorkspaceResponse> {
    try {
      const membership = await db.query.workspaceMembers.findFirst({
        where: and(
          eq(workspaceMembers.workspaceId, workspaceId),
          eq(workspaceMembers.userId, userId)
        ),
      });

      if (!membership) {
        throw new AppError('Access denied to workspace', 403, 'WORKSPACE_ACCESS_DENIED');
      }

      if (membership.role !== 'OWNER' && membership.role !== 'ADMIN') {
        throw new AppError('Only owners and admins can update workspace', 403, 'INSUFFICIENT_PERMISSIONS');
      }

      if (data.slug) {
        const existingWorkspace = await db.query.workspaces.findFirst({
          where: and(
            eq(workspaces.slug, data.slug),
            eq(workspaces.id, workspaceId)
          ),
        });

        if (existingWorkspace) {
          throw new AppError('Workspace slug already exists', 400, 'SLUG_EXISTS');
        }
      }

      const updateData: any = {};
      if (data.name) updateData.name = data.name;
      if (data.slug) updateData.slug = data.slug;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.settings) updateData.settings = data.settings;
      updateData.updatedAt = new Date();

      const result = await db
        .update(workspaces)
        .set(updateData)
        .where(eq(workspaces.id, workspaceId))
        .returning();

      if (!result[0]) {
        throw new Error('Failed to update workspace');
      }

      logger.info(`Workspace updated: ${workspaceId} by user ${userId}`);

      return this.mapWorkspaceToResponse(result[0]);
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error updating workspace:', error);
      throw new AppError('Failed to update workspace', 500, 'WORKSPACE_UPDATE_ERROR');
    }
  }

  /**
   * Delete workspace
   */
  async deleteWorkspace(workspaceId: string, userId: string): Promise<void> {
    try {
      const workspace = await db.query.workspaces.findFirst({
        where: eq(workspaces.id, workspaceId),
      });

      if (!workspace) {
        throw new AppError('Workspace not found', 404, 'WORKSPACE_NOT_FOUND');
      }

      if (workspace.ownerId !== userId) {
        throw new AppError('Only workspace owner can delete workspace', 403, 'INSUFFICIENT_PERMISSIONS');
      }

      await db.delete(workspaces).where(eq(workspaces.id, workspaceId));

      await db
        .update(users)
        .set({ defaultWorkspaceId: null })
        .where(eq(users.defaultWorkspaceId, workspaceId));

      logger.info(`Workspace deleted: ${workspaceId} by user ${userId}`);
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error deleting workspace:', error);
      throw new AppError('Failed to delete workspace', 500, 'WORKSPACE_DELETE_ERROR');
    }
  }

  /**
   * Get workspace members
   */
  async getMembers(
    workspaceId: string,
    userId: string
  ): Promise<WorkspaceMemberResponse[]> {
    try {
      const membership = await db.query.workspaceMembers.findFirst({
        where: and(
          eq(workspaceMembers.workspaceId, workspaceId),
          eq(workspaceMembers.userId, userId)
        ),
      });

      if (!membership) {
        throw new AppError('Access denied to workspace', 403, 'WORKSPACE_ACCESS_DENIED');
      }

      const members = await db.query.workspaceMembers.findMany({
        where: eq(workspaceMembers.workspaceId, workspaceId),
        with: {
          user: {
            columns: { id: true, name: true, email: true, image: true },
          },
        },
        orderBy: (fields) => fields.joinedAt,
      });

      return members as WorkspaceMemberResponse[];
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error getting workspace members:', error);
      throw new AppError('Failed to get members', 500, 'MEMBERS_GET_ERROR');
    }
  }

  /**
   * Invite member to workspace
   */
  async inviteMember(
    workspaceId: string,
    userId: string,
    email: string,
    role: string = 'MEMBER'
  ): Promise<{ invitationId: string; token: string }> {
    try {
      const membership = await db.query.workspaceMembers.findFirst({
        where: and(
          eq(workspaceMembers.workspaceId, workspaceId),
          eq(workspaceMembers.userId, userId)
        ),
      });

      if (!membership) {
        throw new AppError('Access denied to workspace', 403, 'WORKSPACE_ACCESS_DENIED');
      }

      if (membership.role !== 'OWNER' && membership.role !== 'ADMIN') {
        throw new AppError('Only owners and admins can invite members', 403, 'INSUFFICIENT_PERMISSIONS');
      }

      const workspace = await db.query.workspaces.findFirst({
        where: eq(workspaces.id, workspaceId),
      });

      if (!workspace) {
        throw new AppError('Workspace not found', 404, 'WORKSPACE_NOT_FOUND');
      }

      const memberCount = await db.query.workspaceMembers.findMany({
        where: eq(workspaceMembers.workspaceId, workspaceId),
      });

      if (workspace.maxMembers && workspace.maxMembers !== -1 && memberCount.length >= workspace.maxMembers) {
        throw new AppError('Workspace member limit reached', 400, 'MEMBER_LIMIT_REACHED');
      }

      const existingUser = await db.query.users.findFirst({
        where: eq(users.email, email),
      });

      if (existingUser) {
        const existingMembership = await db.query.workspaceMembers.findFirst({
          where: and(
            eq(workspaceMembers.workspaceId, workspaceId),
            eq(workspaceMembers.userId, existingUser.id)
          ),
        });

        if (existingMembership) {
          throw new AppError('User is already a member', 400, 'ALREADY_MEMBER');
        }
      }

      const existingInvitation = await db.query.workspaceInvitations.findFirst({
        where: and(
          eq(workspaceInvitations.workspaceId, workspaceId),
          eq(workspaceInvitations.email, email)
        ),
      });

      if (existingInvitation && existingInvitation.expiresAt > new Date()) {
        throw new AppError('Invitation already sent', 400, 'INVITATION_EXISTS');
      }

      if (existingInvitation) {
        await db.delete(workspaceInvitations).where(eq(workspaceInvitations.id, existingInvitation.id));
      }

      const token = WorkspaceServiceDrizzle.generateInviteToken();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const invitation = await db
        .insert(workspaceInvitations)
        .values({
          workspaceId,
          email,
          role: role as any,
          token,
          invitedBy: userId,
          expiresAt,
        })
        .returning();

      if (!invitation[0]) {
        throw new Error('Failed to create invitation');
      }

      logger.info(`Invitation sent for workspace ${workspaceId} to ${email}`);

      return { invitationId: invitation[0].id, token };
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error inviting member:', error);
      throw new AppError('Failed to invite member', 500, 'INVITE_ERROR');
    }
  }

  /**
   * Accept workspace invitation
   */
  async acceptInvitation(token: string, userId: string): Promise<WorkspaceResponse> {
    try {
      const invitation = await db.query.workspaceInvitations.findFirst({
        where: eq(workspaceInvitations.token, token),
      });

      if (!invitation) {
        throw new AppError('Invalid invitation', 400, 'INVALID_INVITATION');
      }

      if (invitation.expiresAt < new Date()) {
        throw new AppError('Invitation expired', 400, 'INVITATION_EXPIRED');
      }

      if (invitation.acceptedAt) {
        throw new AppError('Invitation already accepted', 400, 'INVITATION_USED');
      }

      const user = await db.query.users.findFirst({
        where: eq(users.id, userId),
      });

      if (!user || user.email !== invitation.email) {
        throw new AppError('Invitation is for a different email', 400, 'EMAIL_MISMATCH');
      }

      const existingMembership = await db.query.workspaceMembers.findFirst({
        where: and(
          eq(workspaceMembers.workspaceId, invitation.workspaceId),
          eq(workspaceMembers.userId, userId)
        ),
      });

      if (existingMembership) {
        throw new AppError('Already a member of this workspace', 400, 'ALREADY_MEMBER');
      }

      await db.insert(workspaceMembers).values({
        workspaceId: invitation.workspaceId,
        userId,
        role: invitation.role,
        invitedBy: invitation.invitedBy,
      });

      await db
        .update(workspaceInvitations)
        .set({ acceptedAt: new Date() })
        .where(eq(workspaceInvitations.id, invitation.id));

      logger.info(`User ${userId} joined workspace ${invitation.workspaceId}`);

      const workspace = await db.query.workspaces.findFirst({
        where: eq(workspaces.id, invitation.workspaceId),
      });

      if (!workspace) {
        throw new Error('Workspace not found');
      }

      return this.mapWorkspaceToResponse(workspace);
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error accepting invitation:', error);
      throw new AppError('Failed to accept invitation', 500, 'ACCEPT_INVITATION_ERROR');
    }
  }

  /**
   * Update member role
   */
  async updateMemberRole(
    workspaceId: string,
    userId: string,
    targetUserId: string,
    newRole: string
  ): Promise<WorkspaceMemberResponse> {
    try {
      const membership = await db.query.workspaceMembers.findFirst({
        where: and(
          eq(workspaceMembers.workspaceId, workspaceId),
          eq(workspaceMembers.userId, userId)
        ),
      });

      if (!membership) {
        throw new AppError('Access denied to workspace', 403, 'WORKSPACE_ACCESS_DENIED');
      }

      if (membership.role !== 'OWNER') {
        throw new AppError('Only owners can change member roles', 403, 'INSUFFICIENT_PERMISSIONS');
      }

      if (userId === targetUserId) {
        throw new AppError('Cannot change your own role', 400, 'CANNOT_CHANGE_OWN_ROLE');
      }

      if (newRole === 'OWNER') {
        throw new AppError('Use transfer ownership to change owner', 400, 'USE_TRANSFER_OWNERSHIP');
      }

      const targetMembership = await db.query.workspaceMembers.findFirst({
        where: and(
          eq(workspaceMembers.workspaceId, workspaceId),
          eq(workspaceMembers.userId, targetUserId)
        ),
        with: {
          user: {
            columns: { id: true, name: true, email: true, image: true },
          },
        },
      });

      if (!targetMembership) {
        throw new AppError('Member not found', 404, 'MEMBER_NOT_FOUND');
      }

      const updated = await db
        .update(workspaceMembers)
        .set({ role: newRole as any })
        .where(eq(workspaceMembers.id, targetMembership.id))
        .returning();

      if (!updated[0]) {
        throw new Error('Failed to update member role');
      }

      logger.info(`Member role updated in workspace ${workspaceId}: ${targetUserId} -> ${newRole}`);

      return {
        ...updated[0],
        user: targetMembership.user,
      } as WorkspaceMemberResponse;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error updating member role:', error);
      throw new AppError('Failed to update member role', 500, 'UPDATE_ROLE_ERROR');
    }
  }

  /**
   * Remove member from workspace
   */
  async removeMember(
    workspaceId: string,
    userId: string,
    targetUserId: string
  ): Promise<void> {
    try {
      const membership = await db.query.workspaceMembers.findFirst({
        where: and(
          eq(workspaceMembers.workspaceId, workspaceId),
          eq(workspaceMembers.userId, userId)
        ),
      });

      if (!membership) {
        throw new AppError('Access denied to workspace', 403, 'WORKSPACE_ACCESS_DENIED');
      }

      const isSelfRemoval = userId === targetUserId;
      const canRemoveOthers = membership.role === 'OWNER' || membership.role === 'ADMIN';

      if (!isSelfRemoval && !canRemoveOthers) {
        throw new AppError('Insufficient permissions to remove member', 403, 'INSUFFICIENT_PERMISSIONS');
      }

      const workspace = await db.query.workspaces.findFirst({
        where: eq(workspaces.id, workspaceId),
      });

      if (workspace?.ownerId === targetUserId) {
        throw new AppError('Cannot remove workspace owner', 400, 'CANNOT_REMOVE_OWNER');
      }

      await db
        .delete(workspaceMembers)
        .where(
          and(
            eq(workspaceMembers.workspaceId, workspaceId),
            eq(workspaceMembers.userId, targetUserId)
          )
        );

      await db
        .update(users)
        .set({ defaultWorkspaceId: null })
        .where(
          and(
            eq(users.id, targetUserId),
            eq(users.defaultWorkspaceId, workspaceId)
          )
        );

      logger.info(`Member removed from workspace ${workspaceId}: ${targetUserId}`);
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error removing member:', error);
      throw new AppError('Failed to remove member', 500, 'REMOVE_MEMBER_ERROR');
    }
  }

  /**
   * Get workspace usage statistics
   */
  async getUsage(workspaceId: string, userId: string): Promise<WorkspaceUsage> {
    try {
      const membership = await db.query.workspaceMembers.findFirst({
        where: and(
          eq(workspaceMembers.workspaceId, workspaceId),
          eq(workspaceMembers.userId, userId)
        ),
      });

      if (!membership) {
        throw new AppError('Access denied to workspace', 403, 'WORKSPACE_ACCESS_DENIED');
      }

      const workspace = await db.query.workspaces.findFirst({
        where: eq(workspaces.id, workspaceId),
      });

      if (!workspace) {
        throw new AppError('Workspace not found', 404, 'WORKSPACE_NOT_FOUND');
      }

      const limits = {
        maxWorkflows: workspace.maxWorkflows || -1,
        maxCredentials: workspace.maxCredentials || -1,
        maxMembers: workspace.maxMembers || -1,
        maxExecutionsPerMonth: workspace.maxExecutionsPerMonth || -1,
      };

      const calcPercentage = (current: number, max: number) => {
        if (max === -1) return 0;
        return Math.round((current / max) * 100);
      };

      return {
        workflowCount: 0,
        credentialCount: 0,
        memberCount: 0,
        executionsThisMonth: workspace.currentMonthExecutions || 0,
        limits,
        percentages: {
          workflows: calcPercentage(0, limits.maxWorkflows),
          credentials: calcPercentage(0, limits.maxCredentials),
          members: calcPercentage(0, limits.maxMembers),
          executions: calcPercentage(workspace.currentMonthExecutions || 0, limits.maxExecutionsPerMonth),
        },
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error getting workspace usage:', error);
      throw new AppError('Failed to get usage', 500, 'USAGE_GET_ERROR');
    }
  }

  /**
   * Check if workspace can create more of a resource type
   */
  async canCreate(
    workspaceId: string,
    resourceType: 'workflow' | 'credential' | 'member'
  ): Promise<{ allowed: boolean; reason?: string }> {
    try {
      const workspace = await db.query.workspaces.findFirst({
        where: eq(workspaces.id, workspaceId),
      });

      if (!workspace) {
        return { allowed: false, reason: 'Workspace not found' };
      }

      switch (resourceType) {
        case 'workflow':
          if (!workspace.maxWorkflows || workspace.maxWorkflows === -1) return { allowed: true };
          break;
        case 'credential':
          if (!workspace.maxCredentials || workspace.maxCredentials === -1) return { allowed: true };
          break;
        case 'member':
          if (!workspace.maxMembers || workspace.maxMembers === -1) return { allowed: true };
          const memberCount = await db.query.workspaceMembers.findMany({
            where: eq(workspaceMembers.workspaceId, workspaceId),
          });
          if (memberCount.length >= workspace.maxMembers) {
            return { allowed: false, reason: 'Member limit reached' };
          }
          break;
      }

      return { allowed: true };
    } catch (error) {
      logger.error('Error checking workspace limits:', error);
      return { allowed: false, reason: 'Error checking limits' };
    }
  }

  /**
   * Increment execution count for workspace
   */
  async incrementExecutionCount(workspaceId: string): Promise<void> {
    try {
      const workspace = await db.query.workspaces.findFirst({
        where: eq(workspaces.id, workspaceId),
      });

      if (workspace) {
        await db
          .update(workspaces)
          .set({
            currentMonthExecutions: (workspace.currentMonthExecutions || 0) + 1,
          })
          .where(eq(workspaces.id, workspaceId));
      }
    } catch (error) {
      logger.error('Error incrementing execution count:', error);
    }
  }

  /**
   * Reset monthly execution counts
   */
  async resetMonthlyExecutionCounts(): Promise<number> {
    try {
      const firstOfMonth = new Date();
      firstOfMonth.setDate(1);
      firstOfMonth.setHours(0, 0, 0, 0);

      await db
        .update(workspaces)
        .set({
          currentMonthExecutions: 0,
          usageResetAt: new Date(),
        })
        .where(eq(workspaces.usageResetAt, firstOfMonth));

      logger.info(`Reset execution counts for workspaces`);
      return 0;
    } catch (error) {
      logger.error('Error resetting execution counts:', error);
      throw error;
    }
  }

  /**
   * Map workspace database record to response type
   */
  private mapWorkspaceToResponse(workspace: any): WorkspaceResponse {
    return {
      id: workspace.id,
      name: workspace.name,
      slug: workspace.slug,
      description: workspace.description || null,
      ownerId: workspace.ownerId,
      plan: workspace.plan,
      maxMembers: workspace.maxMembers,
      maxWorkflows: workspace.maxWorkflows,
      maxExecutionsPerMonth: workspace.maxExecutionsPerMonth,
      maxCredentials: workspace.maxCredentials,
      currentMonthExecutions: workspace.currentMonthExecutions,
      createdAt: workspace.createdAt,
      updatedAt: workspace.updatedAt,
    };
  }
}

/**
 * Export singleton instance
 */
export const workspaceServiceDrizzle = new WorkspaceServiceDrizzle();
