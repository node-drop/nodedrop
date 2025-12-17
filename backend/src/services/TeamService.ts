/**
 * TeamService Factory
 * 
 * This file provides the TeamService implementation using Drizzle ORM.
 */

import { TeamServiceDrizzle } from './TeamService.drizzle';
import { logger } from '../utils/logger';

// Type definitions for the service interface
export interface ITeamService {
  createTeam(data: any): Promise<any>;
  getUserTeams(userId: string, options?: any): Promise<any[]>;
  getTeam(teamId: string, userId: string): Promise<any>;
  updateTeam(teamId: string, userId: string, data: any): Promise<any>;
  deleteTeam(teamId: string, userId: string): Promise<any>;
  addMember(teamId: string, userId: string, data: any): Promise<any>;
  removeMember(teamId: string, userId: string, targetUserId: string): Promise<any>;
  updateMemberRole(teamId: string, userId: string, targetUserId: string, newRole: string): Promise<any>;
  getTeamMembers(teamId: string, userId: string): Promise<any[]>;
  isTeamMember(teamId: string, userId: string): Promise<boolean>;
  getTeamRole(teamId: string, userId: string): Promise<string | null>;
  canManageMembers(teamId: string, userId: string): Promise<boolean>;
  shareCredentialWithTeam(credentialId: string, teamId: string, userId: string, permission?: string): Promise<any>;
  unshareCredentialFromTeam(credentialId: string, teamId: string, userId: string): Promise<any>;
  getTeamCredentialShares(teamId: string, userId: string): Promise<any[]>;
  getCredentialTeamShares(credentialId: string, userId: string): Promise<any[]>;
  updateTeamCredentialPermission(credentialId: string, teamId: string, userId: string, newPermission: string): Promise<any>;
  assignWorkflowToTeam(workflowId: string, teamId: string, userId: string): Promise<any>;
  removeWorkflowFromTeam(workflowId: string, userId: string): Promise<any>;
  getTeamWorkflows(teamId: string, userId: string): Promise<any[]>;
}

/**
 * Get the TeamService implementation (Drizzle ORM)
 */
function getTeamService(): ITeamService {
  logger.debug('Initializing Drizzle TeamService');
  return new TeamServiceDrizzle() as ITeamService;
}

/**
 * Export the service instance
 */
export const teamService: ITeamService = getTeamService();

// Re-export types from Drizzle implementation
export type {
  TeamResponse,
  TeamMemberResponse,
  TeamWithRole,
  CreateTeamData,
  UpdateTeamData,
  AddMemberData,
} from './TeamService.drizzle';

export { TeamServiceDrizzle };

// Legacy class export for backward compatibility
export class TeamService {
  /**
   * Create a new team
   */
  static async createTeam(data: any): Promise<any> {
    return teamService.createTeam(data);
  }

  /**
   * Get user's teams (owned + member of)
   */
  static async getUserTeams(userId: string, options?: any): Promise<any[]> {
    return teamService.getUserTeams(userId, options);
  }

  /**
   * Get team by ID
   */
  static async getTeam(teamId: string, userId: string): Promise<any> {
    return teamService.getTeam(teamId, userId);
  }

  /**
   * Update team
   */
  static async updateTeam(teamId: string, userId: string, data: any): Promise<any> {
    return teamService.updateTeam(teamId, userId, data);
  }

  /**
   * Delete team
   */
  static async deleteTeam(teamId: string, userId: string): Promise<any> {
    return teamService.deleteTeam(teamId, userId);
  }

  /**
   * Add member to team
   */
  static async addMember(teamId: string, userId: string, data: any): Promise<any> {
    return teamService.addMember(teamId, userId, data);
  }

  /**
   * Remove member from team
   */
  static async removeMember(teamId: string, userId: string, targetUserId: string): Promise<any> {
    return teamService.removeMember(teamId, userId, targetUserId);
  }

  /**
   * Update member role
   */
  static async updateMemberRole(
    teamId: string,
    userId: string,
    targetUserId: string,
    newRole: string
  ): Promise<any> {
    return teamService.updateMemberRole(teamId, userId, targetUserId, newRole);
  }

  /**
   * Get team members
   */
  static async getTeamMembers(teamId: string, userId: string): Promise<any[]> {
    return teamService.getTeamMembers(teamId, userId);
  }

  /**
   * Check if user is team member
   */
  static async isTeamMember(teamId: string, userId: string): Promise<boolean> {
    return teamService.isTeamMember(teamId, userId);
  }

  /**
   * Get user's role in team
   */
  static async getTeamRole(teamId: string, userId: string): Promise<string | null> {
    return teamService.getTeamRole(teamId, userId);
  }

  /**
   * Check if user can manage team members
   */
  static async canManageMembers(teamId: string, userId: string): Promise<boolean> {
    return teamService.canManageMembers(teamId, userId);
  }

  /**
   * Share credential with team
   */
  static async shareCredentialWithTeam(
    credentialId: string,
    teamId: string,
    userId: string,
    permission?: string
  ): Promise<any> {
    return teamService.shareCredentialWithTeam(credentialId, teamId, userId, permission);
  }

  /**
   * Unshare credential from team
   */
  static async unshareCredentialFromTeam(
    credentialId: string,
    teamId: string,
    userId: string
  ): Promise<any> {
    return teamService.unshareCredentialFromTeam(credentialId, teamId, userId);
  }

  /**
   * Get team credential shares
   */
  static async getTeamCredentialShares(teamId: string, userId: string): Promise<any[]> {
    return teamService.getTeamCredentialShares(teamId, userId);
  }

  /**
   * Get credentials shared with a specific team
   */
  static async getCredentialTeamShares(credentialId: string, userId: string): Promise<any[]> {
    return teamService.getCredentialTeamShares(credentialId, userId);
  }

  /**
   * Update team credential share permission
   */
  static async updateTeamCredentialPermission(
    credentialId: string,
    teamId: string,
    userId: string,
    newPermission: string
  ): Promise<any> {
    return teamService.updateTeamCredentialPermission(credentialId, teamId, userId, newPermission);
  }

  /**
   * Assign workflow to team
   */
  static async assignWorkflowToTeam(
    workflowId: string,
    teamId: string,
    userId: string
  ): Promise<any> {
    return teamService.assignWorkflowToTeam(workflowId, teamId, userId);
  }

  /**
   * Remove workflow from team (make it personal)
   */
  static async removeWorkflowFromTeam(workflowId: string, userId: string): Promise<any> {
    return teamService.removeWorkflowFromTeam(workflowId, userId);
  }

  /**
   * Get team workflows
   */
  static async getTeamWorkflows(teamId: string, userId: string): Promise<any[]> {
    return teamService.getTeamWorkflows(teamId, userId);
  }
}
