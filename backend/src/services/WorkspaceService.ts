/**
 * Workspace Service
 * 
 * Handles all workspace-related operations for multi-tenant SaaS functionality.
 * This includes workspace CRUD, member management, invitations, and usage tracking.
 */

import { PrismaClient, WorkspaceRole } from "@prisma/client";
import { AppError } from "../middleware/errorHandler";
import { logger } from "../utils/logger";
import { randomBytes } from "crypto";
import {
  CreateWorkspaceRequest,
  UpdateWorkspaceRequest,
  WorkspaceResponse,
  WorkspaceWithRole,
  WorkspaceMemberResponse,
  WorkspaceUsage,
  WORKSPACE_PLANS,
} from "../types/workspace.types";

const prisma = new PrismaClient();

export class WorkspaceService {
  /**
   * Generate URL-friendly slug from workspace name
   */
  private static generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .substring(0, 50);
  }

  /**
   * Generate unique invitation token
   */
  private static generateInviteToken(): string {
    return randomBytes(32).toString("hex");
  }

  // ============================================
  // WORKSPACE CRUD
  // ============================================

  /**
   * Create a new workspace
   */
  static async createWorkspace(
    userId: string,
    data: CreateWorkspaceRequest
  ): Promise<WorkspaceResponse> {
    try {
      // Check user's workspace limit based on their highest plan
      const userWorkspaces = await prisma.workspaceMember.findMany({
        where: { 
          userId,
          role: WorkspaceRole.OWNER, // Only count workspaces they own
        },
        include: {
          workspace: {
            select: { plan: true },
          },
        },
      });

      // Determine user's effective plan (highest plan among owned workspaces, or free if none)
      let effectivePlan = "free";
      for (const membership of userWorkspaces) {
        const plan = membership.workspace.plan;
        if (plan === "enterprise") {
          effectivePlan = "enterprise";
          break;
        } else if (plan === "pro" && effectivePlan !== "enterprise") {
          effectivePlan = "pro";
        }
      }

      const planLimits = WORKSPACE_PLANS[effectivePlan] || WORKSPACE_PLANS.free;
      const ownedWorkspaceCount = userWorkspaces.length;

      // Check if user can create more workspaces
      if (planLimits.maxWorkspaces !== -1 && ownedWorkspaceCount >= planLimits.maxWorkspaces) {
        throw new AppError(
          `Workspace limit reached. ${effectivePlan === "free" ? "Upgrade to Pro for more workspaces." : "Upgrade your plan for more workspaces."}`,
          403,
          "WORKSPACE_LIMIT_REACHED"
        );
      }

      const slug = data.slug || this.generateSlug(data.name);

      // Check if slug already exists
      const existingWorkspace = await prisma.workspace.findUnique({
        where: { slug },
      });

      if (existingWorkspace) {
        throw new AppError("Workspace slug already exists", 400, "SLUG_EXISTS");
      }

      // Get default plan limits for new workspace (always starts as free)
      const newWorkspacePlanLimits = WORKSPACE_PLANS.free;

      // Create workspace with owner as member
      const workspace = await prisma.workspace.create({
        data: {
          name: data.name,
          slug,
          description: data.description,
          ownerId: userId,
          plan: "free",
          maxMembers: newWorkspacePlanLimits.maxMembers,
          maxWorkflows: newWorkspacePlanLimits.maxWorkflows,
          maxExecutionsPerMonth: newWorkspacePlanLimits.maxExecutionsPerMonth,
          maxCredentials: newWorkspacePlanLimits.maxCredentials,
          members: {
            create: {
              userId,
              role: WorkspaceRole.OWNER,
            },
          },
        },
        include: {
          _count: {
            select: { members: true, workflows: true, credentials: true },
          },
        },
      });

      // Update user's default workspace if not set
      await prisma.user.update({
        where: { id: userId },
        data: {
          defaultWorkspaceId: workspace.id,
        },
      });

      logger.info(`Workspace created: ${workspace.id} by user ${userId}`);

      return workspace;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error("Error creating workspace:", error);
      throw new AppError("Failed to create workspace", 500, "WORKSPACE_CREATE_ERROR");
    }
  }

  /**
   * Get workspace by ID (with access check)
   */
  static async getWorkspace(
    workspaceId: string,
    userId: string
  ): Promise<WorkspaceWithRole> {
    try {
      const workspace = await prisma.workspace.findUnique({
        where: { id: workspaceId },
        include: {
          owner: {
            select: { id: true, name: true, email: true },
          },
          _count: {
            select: { members: true, workflows: true, credentials: true },
          },
        },
      });

      if (!workspace) {
        throw new AppError("Workspace not found", 404, "WORKSPACE_NOT_FOUND");
      }

      // Check if user has access
      const membership = await prisma.workspaceMember.findUnique({
        where: {
          workspaceId_userId: { workspaceId, userId },
        },
      });

      if (!membership) {
        throw new AppError("Access denied to workspace", 403, "WORKSPACE_ACCESS_DENIED");
      }

      return {
        ...workspace,
        userRole: membership.role,
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error("Error getting workspace:", error);
      throw new AppError("Failed to get workspace", 500, "WORKSPACE_GET_ERROR");
    }
  }

  /**
   * Get workspace by slug
   */
  static async getWorkspaceBySlug(
    slug: string,
    userId: string
  ): Promise<WorkspaceWithRole> {
    try {
      const workspace = await prisma.workspace.findUnique({
        where: { slug },
      });

      if (!workspace) {
        throw new AppError("Workspace not found", 404, "WORKSPACE_NOT_FOUND");
      }

      return this.getWorkspace(workspace.id, userId);
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error("Error getting workspace by slug:", error);
      throw new AppError("Failed to get workspace", 500, "WORKSPACE_GET_ERROR");
    }
  }

  /**
   * Get all workspaces for a user
   */
  static async getUserWorkspaces(userId: string): Promise<WorkspaceWithRole[]> {
    try {
      const memberships = await prisma.workspaceMember.findMany({
        where: { userId },
        include: {
          workspace: {
            include: {
              owner: {
                select: { id: true, name: true, email: true },
              },
              _count: {
                select: { members: true, workflows: true, credentials: true },
              },
            },
          },
        },
        orderBy: { joinedAt: "asc" },
      });

      return memberships.map((m) => ({
        ...m.workspace,
        userRole: m.role,
      }));
    } catch (error) {
      logger.error("Error getting user workspaces:", error);
      throw new AppError("Failed to get workspaces", 500, "WORKSPACES_GET_ERROR");
    }
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
    try {
      const ownedWorkspaces = await prisma.workspaceMember.findMany({
        where: { 
          userId,
          role: WorkspaceRole.OWNER,
        },
        include: {
          workspace: {
            select: { plan: true },
          },
        },
      });

      // Determine user's effective plan
      let effectivePlan = "free";
      for (const membership of ownedWorkspaces) {
        const plan = membership.workspace.plan;
        if (plan === "enterprise") {
          effectivePlan = "enterprise";
          break;
        } else if (plan === "pro" && effectivePlan !== "enterprise") {
          effectivePlan = "pro";
        }
      }

      const planLimits = WORKSPACE_PLANS[effectivePlan] || WORKSPACE_PLANS.free;
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
      logger.error("Error checking workspace limit:", error);
      return { allowed: false, reason: "Error checking limits", currentCount: 0, maxAllowed: 0, plan: "free" };
    }
  }


  /**
   * Update workspace
   */
  static async updateWorkspace(
    workspaceId: string,
    userId: string,
    data: UpdateWorkspaceRequest
  ): Promise<WorkspaceResponse> {
    try {
      // Check access and role
      const membership = await prisma.workspaceMember.findUnique({
        where: {
          workspaceId_userId: { workspaceId, userId },
        },
      });

      if (!membership) {
        throw new AppError("Access denied to workspace", 403, "WORKSPACE_ACCESS_DENIED");
      }

      if (membership.role !== WorkspaceRole.OWNER && membership.role !== WorkspaceRole.ADMIN) {
        throw new AppError("Only owners and admins can update workspace", 403, "INSUFFICIENT_PERMISSIONS");
      }

      // If slug is being updated, check uniqueness
      if (data.slug) {
        const existingWorkspace = await prisma.workspace.findFirst({
          where: {
            slug: data.slug,
            id: { not: workspaceId },
          },
        });

        if (existingWorkspace) {
          throw new AppError("Workspace slug already exists", 400, "SLUG_EXISTS");
        }
      }

      const workspace = await prisma.workspace.update({
        where: { id: workspaceId },
        data: {
          ...(data.name && { name: data.name }),
          ...(data.slug && { slug: data.slug }),
          ...(data.description !== undefined && { description: data.description }),
          ...(data.settings && { settings: data.settings }),
        },
        include: {
          _count: {
            select: { members: true, workflows: true, credentials: true },
          },
        },
      });

      logger.info(`Workspace updated: ${workspaceId} by user ${userId}`);

      return workspace;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error("Error updating workspace:", error);
      throw new AppError("Failed to update workspace", 500, "WORKSPACE_UPDATE_ERROR");
    }
  }

  /**
   * Delete workspace
   */
  static async deleteWorkspace(workspaceId: string, userId: string): Promise<void> {
    try {
      const workspace = await prisma.workspace.findUnique({
        where: { id: workspaceId },
      });

      if (!workspace) {
        throw new AppError("Workspace not found", 404, "WORKSPACE_NOT_FOUND");
      }

      if (workspace.ownerId !== userId) {
        throw new AppError("Only workspace owner can delete workspace", 403, "INSUFFICIENT_PERMISSIONS");
      }

      // Delete workspace (cascade will handle members, workflows, etc.)
      await prisma.workspace.delete({
        where: { id: workspaceId },
      });

      // Update user's default workspace if this was their default
      await prisma.user.updateMany({
        where: { defaultWorkspaceId: workspaceId },
        data: { defaultWorkspaceId: null },
      });

      logger.info(`Workspace deleted: ${workspaceId} by user ${userId}`);
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error("Error deleting workspace:", error);
      throw new AppError("Failed to delete workspace", 500, "WORKSPACE_DELETE_ERROR");
    }
  }

  // ============================================
  // MEMBER MANAGEMENT
  // ============================================

  /**
   * Get workspace members
   */
  static async getMembers(
    workspaceId: string,
    userId: string
  ): Promise<WorkspaceMemberResponse[]> {
    try {
      // Check access
      const membership = await prisma.workspaceMember.findUnique({
        where: {
          workspaceId_userId: { workspaceId, userId },
        },
      });

      if (!membership) {
        throw new AppError("Access denied to workspace", 403, "WORKSPACE_ACCESS_DENIED");
      }

      const members = await prisma.workspaceMember.findMany({
        where: { workspaceId },
        include: {
          user: {
            select: { id: true, name: true, email: true, image: true },
          },
        },
        orderBy: { joinedAt: "asc" },
      });

      return members;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error("Error getting workspace members:", error);
      throw new AppError("Failed to get members", 500, "MEMBERS_GET_ERROR");
    }
  }


  /**
   * Invite member to workspace
   */
  static async inviteMember(
    workspaceId: string,
    userId: string,
    email: string,
    role: WorkspaceRole = WorkspaceRole.MEMBER
  ): Promise<{ invitationId: string; token: string }> {
    try {
      // Check access and role
      const membership = await prisma.workspaceMember.findUnique({
        where: {
          workspaceId_userId: { workspaceId, userId },
        },
      });

      if (!membership) {
        throw new AppError("Access denied to workspace", 403, "WORKSPACE_ACCESS_DENIED");
      }

      if (membership.role !== WorkspaceRole.OWNER && membership.role !== WorkspaceRole.ADMIN) {
        throw new AppError("Only owners and admins can invite members", 403, "INSUFFICIENT_PERMISSIONS");
      }

      // Check workspace limits
      const workspace = await prisma.workspace.findUnique({
        where: { id: workspaceId },
        include: {
          _count: { select: { members: true } },
        },
      });

      if (!workspace) {
        throw new AppError("Workspace not found", 404, "WORKSPACE_NOT_FOUND");
      }

      if (workspace.maxMembers !== -1 && workspace._count.members >= workspace.maxMembers) {
        throw new AppError("Workspace member limit reached", 400, "MEMBER_LIMIT_REACHED");
      }

      // Check if user is already a member
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        const existingMembership = await prisma.workspaceMember.findUnique({
          where: {
            workspaceId_userId: { workspaceId, userId: existingUser.id },
          },
        });

        if (existingMembership) {
          throw new AppError("User is already a member", 400, "ALREADY_MEMBER");
        }
      }

      // Check for existing pending invitation
      const existingInvitation = await prisma.workspaceInvitation.findUnique({
        where: {
          workspaceId_email: { workspaceId, email },
        },
      });

      if (existingInvitation && existingInvitation.expiresAt > new Date()) {
        throw new AppError("Invitation already sent", 400, "INVITATION_EXISTS");
      }

      // Delete expired invitation if exists
      if (existingInvitation) {
        await prisma.workspaceInvitation.delete({
          where: { id: existingInvitation.id },
        });
      }

      // Create invitation
      const token = this.generateInviteToken();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

      const invitation = await prisma.workspaceInvitation.create({
        data: {
          workspaceId,
          email,
          role,
          token,
          invitedBy: userId,
          expiresAt,
        },
      });

      logger.info(`Invitation sent for workspace ${workspaceId} to ${email}`);

      // TODO: Send invitation email

      return { invitationId: invitation.id, token };
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error("Error inviting member:", error);
      throw new AppError("Failed to invite member", 500, "INVITE_ERROR");
    }
  }

  /**
   * Accept workspace invitation
   */
  static async acceptInvitation(token: string, userId: string): Promise<WorkspaceResponse> {
    try {
      const invitation = await prisma.workspaceInvitation.findUnique({
        where: { token },
      });

      if (!invitation) {
        throw new AppError("Invalid invitation", 400, "INVALID_INVITATION");
      }

      if (invitation.expiresAt < new Date()) {
        throw new AppError("Invitation expired", 400, "INVITATION_EXPIRED");
      }

      if (invitation.acceptedAt) {
        throw new AppError("Invitation already accepted", 400, "INVITATION_USED");
      }

      // Verify user email matches invitation
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user || user.email !== invitation.email) {
        throw new AppError("Invitation is for a different email", 400, "EMAIL_MISMATCH");
      }

      // Check if already a member
      const existingMembership = await prisma.workspaceMember.findUnique({
        where: {
          workspaceId_userId: { workspaceId: invitation.workspaceId, userId },
        },
      });

      if (existingMembership) {
        throw new AppError("Already a member of this workspace", 400, "ALREADY_MEMBER");
      }

      // Add member and mark invitation as accepted
      await prisma.$transaction([
        prisma.workspaceMember.create({
          data: {
            workspaceId: invitation.workspaceId,
            userId,
            role: invitation.role,
            invitedBy: invitation.invitedBy,
          },
        }),
        prisma.workspaceInvitation.update({
          where: { id: invitation.id },
          data: { acceptedAt: new Date() },
        }),
      ]);

      logger.info(`User ${userId} joined workspace ${invitation.workspaceId}`);

      return this.getWorkspace(invitation.workspaceId, userId);
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error("Error accepting invitation:", error);
      throw new AppError("Failed to accept invitation", 500, "ACCEPT_INVITATION_ERROR");
    }
  }


  /**
   * Update member role
   */
  static async updateMemberRole(
    workspaceId: string,
    userId: string,
    targetUserId: string,
    newRole: WorkspaceRole
  ): Promise<WorkspaceMemberResponse> {
    try {
      // Check access and role
      const membership = await prisma.workspaceMember.findUnique({
        where: {
          workspaceId_userId: { workspaceId, userId },
        },
      });

      if (!membership) {
        throw new AppError("Access denied to workspace", 403, "WORKSPACE_ACCESS_DENIED");
      }

      if (membership.role !== WorkspaceRole.OWNER) {
        throw new AppError("Only owners can change member roles", 403, "INSUFFICIENT_PERMISSIONS");
      }

      // Can't change own role
      if (userId === targetUserId) {
        throw new AppError("Cannot change your own role", 400, "CANNOT_CHANGE_OWN_ROLE");
      }

      // Can't set someone else as OWNER (ownership transfer is separate)
      if (newRole === WorkspaceRole.OWNER) {
        throw new AppError("Use transfer ownership to change owner", 400, "USE_TRANSFER_OWNERSHIP");
      }

      const targetMembership = await prisma.workspaceMember.findUnique({
        where: {
          workspaceId_userId: { workspaceId, userId: targetUserId },
        },
      });

      if (!targetMembership) {
        throw new AppError("Member not found", 404, "MEMBER_NOT_FOUND");
      }

      const updated = await prisma.workspaceMember.update({
        where: { id: targetMembership.id },
        data: { role: newRole },
        include: {
          user: {
            select: { id: true, name: true, email: true, image: true },
          },
        },
      });

      logger.info(`Member role updated in workspace ${workspaceId}: ${targetUserId} -> ${newRole}`);

      return updated;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error("Error updating member role:", error);
      throw new AppError("Failed to update member role", 500, "UPDATE_ROLE_ERROR");
    }
  }

  /**
   * Remove member from workspace
   */
  static async removeMember(
    workspaceId: string,
    userId: string,
    targetUserId: string
  ): Promise<void> {
    try {
      // Check access and role
      const membership = await prisma.workspaceMember.findUnique({
        where: {
          workspaceId_userId: { workspaceId, userId },
        },
      });

      if (!membership) {
        throw new AppError("Access denied to workspace", 403, "WORKSPACE_ACCESS_DENIED");
      }

      // Users can remove themselves, or admins/owners can remove others
      const isSelfRemoval = userId === targetUserId;
      const canRemoveOthers = membership.role === WorkspaceRole.OWNER || membership.role === WorkspaceRole.ADMIN;

      if (!isSelfRemoval && !canRemoveOthers) {
        throw new AppError("Insufficient permissions to remove member", 403, "INSUFFICIENT_PERMISSIONS");
      }

      // Can't remove workspace owner
      const workspace = await prisma.workspace.findUnique({
        where: { id: workspaceId },
      });

      if (workspace?.ownerId === targetUserId) {
        throw new AppError("Cannot remove workspace owner", 400, "CANNOT_REMOVE_OWNER");
      }

      await prisma.workspaceMember.delete({
        where: {
          workspaceId_userId: { workspaceId, userId: targetUserId },
        },
      });

      // Clear default workspace if this was their default
      await prisma.user.updateMany({
        where: {
          id: targetUserId,
          defaultWorkspaceId: workspaceId,
        },
        data: { defaultWorkspaceId: null },
      });

      logger.info(`Member removed from workspace ${workspaceId}: ${targetUserId}`);
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error("Error removing member:", error);
      throw new AppError("Failed to remove member", 500, "REMOVE_MEMBER_ERROR");
    }
  }

  // ============================================
  // USAGE & LIMITS
  // ============================================

  /**
   * Get workspace usage statistics
   */
  static async getUsage(workspaceId: string, userId: string): Promise<WorkspaceUsage> {
    try {
      // Check access
      const membership = await prisma.workspaceMember.findUnique({
        where: {
          workspaceId_userId: { workspaceId, userId },
        },
      });

      if (!membership) {
        throw new AppError("Access denied to workspace", 403, "WORKSPACE_ACCESS_DENIED");
      }

      const workspace = await prisma.workspace.findUnique({
        where: { id: workspaceId },
        include: {
          _count: {
            select: { members: true, workflows: true, credentials: true },
          },
        },
      });

      if (!workspace) {
        throw new AppError("Workspace not found", 404, "WORKSPACE_NOT_FOUND");
      }

      const limits = {
        maxWorkflows: workspace.maxWorkflows,
        maxCredentials: workspace.maxCredentials,
        maxMembers: workspace.maxMembers,
        maxExecutionsPerMonth: workspace.maxExecutionsPerMonth,
      };

      const calcPercentage = (current: number, max: number) => {
        if (max === -1) return 0; // unlimited
        return Math.round((current / max) * 100);
      };

      return {
        workflowCount: workspace._count.workflows,
        credentialCount: workspace._count.credentials,
        memberCount: workspace._count.members,
        executionsThisMonth: workspace.currentMonthExecutions,
        limits,
        percentages: {
          workflows: calcPercentage(workspace._count.workflows, limits.maxWorkflows),
          credentials: calcPercentage(workspace._count.credentials, limits.maxCredentials),
          members: calcPercentage(workspace._count.members, limits.maxMembers),
          executions: calcPercentage(workspace.currentMonthExecutions, limits.maxExecutionsPerMonth),
        },
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error("Error getting workspace usage:", error);
      throw new AppError("Failed to get usage", 500, "USAGE_GET_ERROR");
    }
  }

  /**
   * Check if workspace can create more of a resource type
   */
  static async canCreate(
    workspaceId: string,
    resourceType: "workflow" | "credential" | "member"
  ): Promise<{ allowed: boolean; reason?: string }> {
    try {
      const workspace = await prisma.workspace.findUnique({
        where: { id: workspaceId },
        include: {
          _count: {
            select: { members: true, workflows: true, credentials: true },
          },
        },
      });

      if (!workspace) {
        return { allowed: false, reason: "Workspace not found" };
      }

      switch (resourceType) {
        case "workflow":
          if (workspace.maxWorkflows === -1) return { allowed: true };
          if (workspace._count.workflows >= workspace.maxWorkflows) {
            return { allowed: false, reason: "Workflow limit reached" };
          }
          break;
        case "credential":
          if (workspace.maxCredentials === -1) return { allowed: true };
          if (workspace._count.credentials >= workspace.maxCredentials) {
            return { allowed: false, reason: "Credential limit reached" };
          }
          break;
        case "member":
          if (workspace.maxMembers === -1) return { allowed: true };
          if (workspace._count.members >= workspace.maxMembers) {
            return { allowed: false, reason: "Member limit reached" };
          }
          break;
      }

      return { allowed: true };
    } catch (error) {
      logger.error("Error checking workspace limits:", error);
      return { allowed: false, reason: "Error checking limits" };
    }
  }

  /**
   * Increment execution count for workspace
   */
  static async incrementExecutionCount(workspaceId: string): Promise<void> {
    try {
      await prisma.workspace.update({
        where: { id: workspaceId },
        data: {
          currentMonthExecutions: { increment: 1 },
        },
      });
    } catch (error) {
      logger.error("Error incrementing execution count:", error);
      // Don't throw - this shouldn't block execution
    }
  }

  /**
   * Reset monthly execution counts (called by scheduled job)
   */
  static async resetMonthlyExecutionCounts(): Promise<number> {
    try {
      const result = await prisma.workspace.updateMany({
        where: {
          usageResetAt: {
            lt: new Date(new Date().setDate(1)), // First of current month
          },
        },
        data: {
          currentMonthExecutions: 0,
          usageResetAt: new Date(),
        },
      });

      logger.info(`Reset execution counts for ${result.count} workspaces`);
      return result.count;
    } catch (error) {
      logger.error("Error resetting execution counts:", error);
      throw error;
    }
  }
}
