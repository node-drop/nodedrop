import { eq, and, or } from 'drizzle-orm';
import { db } from '../db/client';
import { teams, teamMembers } from '../db/schema/teams';
import { users } from '../db/schema/auth';
import { credentials, credentialShares } from '../db/schema/credentials';
import { workflows } from '../db/schema/workflows';
import { logger } from '../utils/logger';
import { AppError } from '../utils/errors';

/**
 * Team data types matching Prisma return types
 */
export interface TeamResponse {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  ownerId: string;
  workspaceId: string | null;
  color: string;
  settings: Record<string, any> | null;
  createdAt: Date;
  updatedAt: Date;
  owner?: {
    id: string;
    name: string | null;
    email: string;
  };
  _count?: {
    members: number;
    workflows: number;
    sharedCredentials: number;
  };
}

export interface TeamMemberResponse {
  id: string;
  teamId: string;
  userId: string;
  role: string;
  joinedAt: Date;
  user?: {
    id: string;
    name: string | null;
    email: string;
  };
}

export interface TeamWithRole extends TeamResponse {
  userRole: string;
}

export interface CreateTeamData {
  name: string;
  slug?: string;
  description?: string;
  color?: string;
  ownerId: string;
  workspaceId?: string;
}

export interface UpdateTeamData {
  name?: string;
  slug?: string;
  description?: string;
  color?: string;
  settings?: any;
}

export interface AddMemberData {
  email: string;
  role?: string;
}

/**
 * TeamService with Drizzle ORM
 * Provides database operations for team management
 */
export class TeamServiceDrizzle {
  /**
   * Generate URL-friendly slug from team name
   */
  private static generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 50);
  }

  /**
   * Create a new team
   */
  async createTeam(data: CreateTeamData): Promise<TeamResponse> {
    try {
      // Generate slug from name if not provided
      const slug = data.slug || TeamServiceDrizzle.generateSlug(data.name);

      // Check if slug already exists (within workspace if provided)
      let existingTeam;
      if (data.workspaceId) {
        existingTeam = await db.query.teams.findFirst({
          where: and(
            eq(teams.slug, slug),
            eq(teams.workspaceId, data.workspaceId)
          ),
        });
      } else {
        existingTeam = await db.query.teams.findFirst({
          where: eq(teams.slug, slug),
        });
      }

      if (existingTeam) {
        throw new AppError('Team slug already exists', 400);
      }

      // Create team
      const newTeam = await db
        .insert(teams)
        .values({
          name: data.name,
          slug,
          description: data.description || null,
          color: data.color || '#3b82f6',
          ownerId: data.ownerId,
          workspaceId: data.workspaceId || null,
        })
        .returning();

      if (!newTeam[0]) {
        throw new Error('Failed to create team');
      }

      // Add owner as team member with OWNER role
      await db.insert(teamMembers).values({
        teamId: newTeam[0].id,
        userId: data.ownerId,
        role: 'OWNER',
      });

      logger.info(`Team created: ${newTeam[0].id} by user ${data.ownerId}`);

      // Fetch the team with owner info
      return this.getTeamWithOwner(newTeam[0].id);
    } catch (error) {
      logger.error('Error creating team:', error);
      throw error;
    }
  }

  /**
   * Get user's teams (owned + member of)
   */
  async getUserTeams(
    userId: string,
    options?: { workspaceId?: string }
  ): Promise<TeamWithRole[]> {
    try {
      // Get teams where user is owner or member
      const userTeams = await db.query.teams.findMany({
        where: or(
          eq(teams.ownerId, userId),
          // This will be handled by checking membership separately
        ),
        with: {
          owner: {
            columns: { id: true, name: true, email: true },
          },
          members: {
            with: {
              user: {
                columns: { id: true, name: true, email: true },
              },
            },
          },
        },
      });

      // Filter by workspace if provided
      let filteredTeams = userTeams;
      if (options?.workspaceId) {
        filteredTeams = userTeams.filter(
          (t) => t.workspaceId === options.workspaceId
        );
      }

      // Add user's role to each team and filter to only teams user is part of
      const teamsWithRole = filteredTeams
        .filter((team) => {
          const membership = team.members.find((m) => m.userId === userId);
          return team.ownerId === userId || !!membership;
        })
        .map((team) => {
          const membership = team.members.find((m) => m.userId === userId);
          return {
            ...this.mapTeamToResponse(team),
            userRole: membership?.role || 'OWNER',
          };
        });

      return teamsWithRole;
    } catch (error) {
      logger.error('Error getting user teams:', error);
      throw error;
    }
  }

  /**
   * Get team by ID
   */
  async getTeam(teamId: string, userId: string): Promise<TeamWithRole> {
    try {
      const team = await db.query.teams.findFirst({
        where: eq(teams.id, teamId),
        with: {
          owner: {
            columns: { id: true, name: true, email: true },
          },
          members: {
            with: {
              user: {
                columns: { id: true, name: true, email: true },
              },
            },
          },
        },
      });

      if (!team) {
        throw new AppError('Team not found', 404);
      }

      // Check if user has access
      const isMember = team.members.some((m) => m.userId === userId);
      if (!isMember && team.ownerId !== userId) {
        throw new AppError('Access denied', 403);
      }

      const membership = team.members.find((m) => m.userId === userId);
      return {
        ...this.mapTeamToResponse(team),
        userRole: membership?.role || 'OWNER',
      };
    } catch (error) {
      logger.error('Error getting team:', error);
      throw error;
    }
  }

  /**
   * Update team
   */
  async updateTeam(
    teamId: string,
    userId: string,
    data: UpdateTeamData
  ): Promise<TeamResponse> {
    try {
      // Check if user is owner
      const team = await db.query.teams.findFirst({
        where: eq(teams.id, teamId),
      });

      if (!team) {
        throw new AppError('Team not found', 404);
      }

      if (team.ownerId !== userId) {
        throw new AppError('Only team owner can update team', 403);
      }

      // If slug is being updated, check uniqueness
      if (data.slug && data.slug !== team.slug) {
        const existingTeam = await db.query.teams.findFirst({
          where: eq(teams.slug, data.slug),
        });

        if (existingTeam) {
          throw new AppError('Team slug already exists', 400);
        }
      }

      const updateData: any = {};
      if (data.name !== undefined) updateData.name = data.name;
      if (data.slug !== undefined) updateData.slug = data.slug;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.color !== undefined) updateData.color = data.color;
      if (data.settings !== undefined) updateData.settings = data.settings;
      updateData.updatedAt = new Date();

      const updatedTeam = await db
        .update(teams)
        .set(updateData)
        .where(eq(teams.id, teamId))
        .returning();

      if (!updatedTeam[0]) {
        throw new Error('Failed to update team');
      }

      logger.info(`Team updated: ${teamId} by user ${userId}`);

      return this.getTeamWithOwner(teamId);
    } catch (error) {
      logger.error('Error updating team:', error);
      throw error;
    }
  }

  /**
   * Delete team
   */
  async deleteTeam(teamId: string, userId: string): Promise<{ success: boolean }> {
    try {
      // Check if user is owner
      const team = await db.query.teams.findFirst({
        where: eq(teams.id, teamId),
      });

      if (!team) {
        throw new AppError('Team not found', 404);
      }

      if (team.ownerId !== userId) {
        throw new AppError('Only team owner can delete team', 403);
      }

      // Delete team (cascade will handle members)
      await db.delete(teams).where(eq(teams.id, teamId));

      logger.info(`Team deleted: ${teamId} by user ${userId}`);

      return { success: true };
    } catch (error) {
      logger.error('Error deleting team:', error);
      throw error;
    }
  }

  /**
   * Add member to team
   */
  async addMember(
    teamId: string,
    userId: string,
    data: AddMemberData
  ): Promise<TeamMemberResponse> {
    try {
      // Check if user is owner or admin
      const canManage = await this.canManageMembers(teamId, userId);
      if (!canManage) {
        throw new AppError('Only team owner can add members', 403);
      }

      // Get the team
      const team = await db.query.teams.findFirst({
        where: eq(teams.id, teamId),
      });

      if (!team) {
        throw new AppError('Team not found', 404);
      }

      // Find user by email
      const targetUser = await db.query.users.findFirst({
        where: eq(users.email, data.email),
      });

      if (!targetUser) {
        throw new AppError('User not found', 404);
      }

      // Check if already a team member
      const existingMember = await db.query.teamMembers.findFirst({
        where: and(
          eq(teamMembers.teamId, teamId),
          eq(teamMembers.userId, targetUser.id)
        ),
      });

      if (existingMember) {
        throw new AppError('User is already a team member', 400);
      }

      // Add member
      const member = await db
        .insert(teamMembers)
        .values({
          teamId,
          userId: targetUser.id,
          role: data.role || 'MEMBER',
        })
        .returning();

      if (!member[0]) {
        throw new Error('Failed to add member');
      }

      logger.info(`Member added to team ${teamId}: ${targetUser.id}`);

      // Fetch member with user info
      return this.getTeamMemberWithUser(member[0].id);
    } catch (error) {
      logger.error('Error adding team member:', error);
      throw error;
    }
  }

  /**
   * Remove member from team
   */
  async removeMember(
    teamId: string,
    userId: string,
    targetUserId: string
  ): Promise<{ success: boolean }> {
    try {
      // Check if user can manage members
      const canManage = await this.canManageMembers(teamId, userId);
      if (!canManage) {
        throw new AppError('Only team owner can remove members', 403);
      }

      // Can't remove team owner
      const team = await db.query.teams.findFirst({
        where: eq(teams.id, teamId),
      });

      if (team?.ownerId === targetUserId) {
        throw new AppError('Cannot remove team owner', 400);
      }

      // Remove member
      await db
        .delete(teamMembers)
        .where(
          and(
            eq(teamMembers.teamId, teamId),
            eq(teamMembers.userId, targetUserId)
          )
        );

      logger.info(`Member removed from team ${teamId}: ${targetUserId}`);

      return { success: true };
    } catch (error) {
      logger.error('Error removing team member:', error);
      throw error;
    }
  }

  /**
   * Update member role
   */
  async updateMemberRole(
    teamId: string,
    userId: string,
    targetUserId: string,
    newRole: string
  ): Promise<TeamMemberResponse> {
    try {
      // Check if user is owner
      const team = await db.query.teams.findFirst({
        where: eq(teams.id, teamId),
      });

      if (!team) {
        throw new AppError('Team not found', 404);
      }

      if (team.ownerId !== userId) {
        throw new AppError('Only team owner can change roles', 403);
      }

      // Can't change owner's role
      if (team.ownerId === targetUserId) {
        throw new AppError('Cannot change team owner\'s role', 400);
      }

      // Update role
      const member = await db
        .update(teamMembers)
        .set({ role: newRole })
        .where(
          and(
            eq(teamMembers.teamId, teamId),
            eq(teamMembers.userId, targetUserId)
          )
        )
        .returning();

      if (!member[0]) {
        throw new Error('Failed to update member role');
      }

      logger.info(
        `Member role updated in team ${teamId}: ${targetUserId} -> ${newRole}`
      );

      return this.getTeamMemberWithUser(member[0].id);
    } catch (error) {
      logger.error('Error updating member role:', error);
      throw error;
    }
  }

  /**
   * Get team members
   */
  async getTeamMembers(
    teamId: string,
    userId: string
  ): Promise<TeamMemberResponse[]> {
    try {
      // Check if user has access to team
      const isMember = await this.isTeamMember(teamId, userId);
      if (!isMember) {
        throw new AppError('Access denied', 403);
      }

      const members = await db.query.teamMembers.findMany({
        where: eq(teamMembers.teamId, teamId),
        with: {
          user: {
            columns: { id: true, name: true, email: true },
          },
        },
        orderBy: (fields) => fields.joinedAt,
      });

      return members as TeamMemberResponse[];
    } catch (error) {
      logger.error('Error getting team members:', error);
      throw error;
    }
  }

  /**
   * Check if user is team member
   */
  async isTeamMember(teamId: string, userId: string): Promise<boolean> {
    try {
      const member = await db.query.teamMembers.findFirst({
        where: and(
          eq(teamMembers.teamId, teamId),
          eq(teamMembers.userId, userId)
        ),
      });

      return !!member;
    } catch (error) {
      logger.error('Error checking team membership:', error);
      return false;
    }
  }

  /**
   * Get user's role in team
   */
  async getTeamRole(teamId: string, userId: string): Promise<string | null> {
    try {
      const member = await db.query.teamMembers.findFirst({
        where: and(
          eq(teamMembers.teamId, teamId),
          eq(teamMembers.userId, userId)
        ),
      });

      return member?.role || null;
    } catch (error) {
      logger.error('Error getting team role:', error);
      return null;
    }
  }

  /**
   * Check if user can manage team members
   */
  async canManageMembers(teamId: string, userId: string): Promise<boolean> {
    try {
      const team = await db.query.teams.findFirst({
        where: eq(teams.id, teamId),
      });

      return team?.ownerId === userId;
    } catch (error) {
      logger.error('Error checking member management permissions:', error);
      return false;
    }
  }

  /**
   * Share credential with team
   */
  async shareCredentialWithTeam(
    credentialId: string,
    teamId: string,
    userId: string,
    permission: 'USE' | 'VIEW' | 'EDIT' = 'USE'
  ): Promise<any> {
    try {
      // Verify user owns the credential
      const credential = await db.query.credentials.findFirst({
        where: and(
          eq(credentials.id, credentialId),
          eq(credentials.userId, userId)
        ),
      });

      if (!credential) {
        throw new AppError('Credential not found or access denied', 404);
      }

      // Verify user has access to team
      const isMember = await this.isTeamMember(teamId, userId);
      if (!isMember) {
        throw new AppError('Access denied to team', 403);
      }

      // Check if already shared
      const existingShare = await db.query.credentialShares.findFirst({
        where: and(
          eq(credentialShares.credentialId, credentialId),
          eq(credentialShares.sharedWithTeamId, teamId)
        ),
      });

      if (existingShare) {
        throw new AppError('Credential already shared with this team', 400);
      }

      // Create share
      const share = await db
        .insert(credentialShares)
        .values({
          credentialId,
          ownerUserId: userId,
          sharedWithUserId: null,
          sharedWithTeamId: teamId,
          permission,
          sharedByUserId: userId,
        })
        .returning();

      if (!share[0]) {
        throw new Error('Failed to share credential');
      }

      logger.info(
        `Credential shared with team: ${credentialId} -> ${teamId} (permission: ${permission})`
      );

      return share[0];
    } catch (error) {
      logger.error('Error sharing credential with team:', error);
      throw error;
    }
  }

  /**
   * Unshare credential from team
   */
  async unshareCredentialFromTeam(
    credentialId: string,
    teamId: string,
    userId: string
  ): Promise<{ success: boolean }> {
    try {
      // Verify user owns the credential
      const credential = await db.query.credentials.findFirst({
        where: and(
          eq(credentials.id, credentialId),
          eq(credentials.userId, userId)
        ),
      });

      if (!credential) {
        throw new AppError('Credential not found or access denied', 404);
      }

      // Delete share
      await db
        .delete(credentialShares)
        .where(
          and(
            eq(credentialShares.credentialId, credentialId),
            eq(credentialShares.sharedWithTeamId, teamId)
          )
        );

      logger.info(`Credential unshared from team: ${credentialId} -> ${teamId}`);

      return { success: true };
    } catch (error) {
      logger.error('Error unsharing credential from team:', error);
      throw error;
    }
  }

  /**
   * Get team credential shares
   */
  async getTeamCredentialShares(
    teamId: string,
    userId: string
  ): Promise<any[]> {
    try {
      // Verify user has access to team
      const isMember = await this.isTeamMember(teamId, userId);
      if (!isMember) {
        throw new AppError('Access denied to team', 403);
      }

      const shares = await db.query.credentialShares.findMany({
        where: eq(credentialShares.sharedWithTeamId, teamId),
        with: {
          credential: {
            columns: {
              id: true,
              name: true,
              type: true,
              userId: true,
              createdAt: true,
              updatedAt: true,
              expiresAt: true,
            },
          },
          sharedBy: {
            columns: { id: true, name: true, email: true },
          },
        },
        orderBy: (fields) => fields.sharedAt,
      });

      return shares;
    } catch (error) {
      logger.error('Error getting team credential shares:', error);
      throw error;
    }
  }

  /**
   * Get credentials shared with a specific team
   */
  async getCredentialTeamShares(
    credentialId: string,
    userId: string
  ): Promise<any[]> {
    try {
      // Verify user owns the credential
      const credential = await db.query.credentials.findFirst({
        where: and(
          eq(credentials.id, credentialId),
          eq(credentials.userId, userId)
        ),
      });

      if (!credential) {
        throw new AppError('Credential not found or access denied', 404);
      }

      const shares = await db.query.credentialShares.findMany({
        where: and(
          eq(credentialShares.credentialId, credentialId),
          // Only get shares where sharedWithTeamId is not null
        ),
        with: {
          sharedWithTeam: {
            columns: { id: true, name: true, slug: true, color: true },
          },
        },
        orderBy: (fields) => fields.sharedAt,
      });

      // Filter to only team shares
      return shares.filter((s) => s.sharedWithTeamId !== null);
    } catch (error) {
      logger.error('Error getting credential team shares:', error);
      throw error;
    }
  }

  /**
   * Update team credential share permission
   */
  async updateTeamCredentialPermission(
    credentialId: string,
    teamId: string,
    userId: string,
    newPermission: 'USE' | 'VIEW' | 'EDIT'
  ): Promise<any> {
    try {
      // Verify user owns the credential
      const credential = await db.query.credentials.findFirst({
        where: and(
          eq(credentials.id, credentialId),
          eq(credentials.userId, userId)
        ),
      });

      if (!credential) {
        throw new AppError('Credential not found or access denied', 404);
      }

      const updated = await db
        .update(credentialShares)
        .set({ permission: newPermission })
        .where(
          and(
            eq(credentialShares.credentialId, credentialId),
            eq(credentialShares.sharedWithTeamId, teamId)
          )
        )
        .returning();

      if (!updated[0]) {
        throw new AppError('Share not found', 404);
      }

      logger.info(
        `Team credential permission updated: ${credentialId} -> ${teamId} to ${newPermission}`
      );

      return updated[0];
    } catch (error) {
      logger.error('Error updating team credential permission:', error);
      throw error;
    }
  }

  /**
   * Assign workflow to team
   */
  async assignWorkflowToTeam(
    workflowId: string,
    teamId: string,
    userId: string
  ): Promise<any> {
    try {
      // Verify user owns the workflow
      const workflow = await db.query.workflows.findFirst({
        where: and(
          eq(workflows.id, workflowId),
          eq(workflows.userId, userId)
        ),
      });

      if (!workflow) {
        throw new AppError('Workflow not found or access denied', 404);
      }

      // Verify user has access to team
      const isMember = await this.isTeamMember(teamId, userId);
      if (!isMember) {
        throw new AppError('Access denied to team', 403);
      }

      // Update workflow
      const updatedWorkflow = await db
        .update(workflows)
        .set({ teamId })
        .where(eq(workflows.id, workflowId))
        .returning();

      if (!updatedWorkflow[0]) {
        throw new Error('Failed to assign workflow');
      }

      logger.info(`Workflow assigned to team: ${workflowId} -> ${teamId}`);

      return updatedWorkflow[0];
    } catch (error) {
      logger.error('Error assigning workflow to team:', error);
      throw error;
    }
  }

  /**
   * Remove workflow from team (make it personal)
   */
  async removeWorkflowFromTeam(
    workflowId: string,
    userId: string
  ): Promise<any> {
    try {
      // Verify user owns the workflow
      const workflow = await db.query.workflows.findFirst({
        where: and(
          eq(workflows.id, workflowId),
          eq(workflows.userId, userId)
        ),
      });

      if (!workflow) {
        throw new AppError('Workflow not found or access denied', 404);
      }

      // Update workflow
      const updatedWorkflow = await db
        .update(workflows)
        .set({ teamId: null })
        .where(eq(workflows.id, workflowId))
        .returning();

      if (!updatedWorkflow[0]) {
        throw new Error('Failed to remove workflow from team');
      }

      logger.info(`Workflow removed from team: ${workflowId}`);

      return updatedWorkflow[0];
    } catch (error) {
      logger.error('Error removing workflow from team:', error);
      throw error;
    }
  }

  /**
   * Get team workflows
   */
  async getTeamWorkflows(teamId: string, userId: string): Promise<any[]> {
    try {
      // Verify user has access to team
      const isMember = await this.isTeamMember(teamId, userId);
      if (!isMember) {
        throw new AppError('Access denied to team', 403);
      }

      const teamWorkflows = await db.query.workflows.findMany({
        where: eq(workflows.teamId, teamId),
        with: {
          user: {
            columns: { id: true, name: true, email: true },
          },
        },
        orderBy: (fields) => fields.updatedAt,
      });

      return teamWorkflows;
    } catch (error) {
      logger.error('Error getting team workflows:', error);
      throw error;
    }
  }

  /**
   * Helper method to get team with owner info
   */
  private async getTeamWithOwner(teamId: string): Promise<TeamResponse> {
    const team = await db.query.teams.findFirst({
      where: eq(teams.id, teamId),
      with: {
        owner: {
          columns: { id: true, name: true, email: true },
        },
      },
    });

    if (!team) {
      throw new Error('Team not found');
    }

    return this.mapTeamToResponse(team);
  }

  /**
   * Helper method to get team member with user info
   */
  private async getTeamMemberWithUser(
    memberId: string
  ): Promise<TeamMemberResponse> {
    const member = await db.query.teamMembers.findFirst({
      where: eq(teamMembers.id, memberId),
      with: {
        user: {
          columns: { id: true, name: true, email: true },
        },
      },
    });

    if (!member) {
      throw new Error('Team member not found');
    }

    return member as TeamMemberResponse;
  }

  /**
   * Helper method to map team database record to response type
   */
  private mapTeamToResponse(team: any): TeamResponse {
    return {
      id: team.id,
      name: team.name,
      slug: team.slug,
      description: team.description || null,
      ownerId: team.ownerId,
      workspaceId: team.workspaceId || null,
      color: team.color || '#3b82f6',
      settings: team.settings as Record<string, any> | null,
      createdAt: team.createdAt,
      updatedAt: team.updatedAt,
      owner: team.owner,
    };
  }
}

/**
 * Export singleton instance
 */
export const teamServiceDrizzle = new TeamServiceDrizzle();
