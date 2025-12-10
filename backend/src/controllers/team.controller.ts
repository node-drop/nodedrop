import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth";
import { asyncHandler } from "../middleware/errorHandler";
import { TeamService } from "../services/TeamService";
import { ApiResponse } from "../types/api";
import { AppError } from "../utils/errors";

/**
 * GET /api/teams
 * Get all teams for current user
 */
export const getUserTeams = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      throw new AppError("User not authenticated", 401);
    }

    const teams = await TeamService.getUserTeams(req.user.id);

    const response: ApiResponse = {
      success: true,
      data: teams,
    };

    res.json(response);
  }
);

/**
 * POST /api/teams
 * Create a new team
 */
export const createTeam = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      throw new AppError("User not authenticated", 401);
    }

    const { name, slug, description, color } = req.body;

    if (!name) {
      throw new AppError("Team name is required", 400);
    }

    const team = await TeamService.createTeam({
      name,
      slug,
      description,
      color,
      ownerId: req.user.id,
    });

    const response: ApiResponse = {
      success: true,
      data: team,
    };

    res.status(201).json(response);
  }
);

/**
 * GET /api/teams/:id
 * Get team by ID
 */
export const getTeam = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      throw new AppError("User not authenticated", 401);
    }

    const team = await TeamService.getTeam(req.params.id, req.user.id);

    const response: ApiResponse = {
      success: true,
      data: team,
    };

    res.json(response);
  }
);

/**
 * PUT /api/teams/:id
 * Update team
 */
export const updateTeam = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      throw new AppError("User not authenticated", 401);
    }

    const { name, slug, description, color, settings } = req.body;

    const team = await TeamService.updateTeam(req.params.id, req.user.id, {
      name,
      slug,
      description,
      color,
      settings,
    });

    const response: ApiResponse = {
      success: true,
      data: team,
    };

    res.json(response);
  }
);

/**
 * DELETE /api/teams/:id
 * Delete team
 */
export const deleteTeam = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      throw new AppError("User not authenticated", 401);
    }

    await TeamService.deleteTeam(req.params.id, req.user.id);

    const response: ApiResponse = {
      success: true,
      data: { message: "Team deleted successfully" },
    };

    res.json(response);
  }
);

/**
 * GET /api/teams/:id/members
 * Get team members
 */
export const getTeamMembers = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      throw new AppError("User not authenticated", 401);
    }

    const members = await TeamService.getTeamMembers(
      req.params.id,
      req.user.id
    );

    const response: ApiResponse = {
      success: true,
      data: members,
    };

    res.json(response);
  }
);

/**
 * POST /api/teams/:id/members
 * Add member to team
 */
export const addTeamMember = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      throw new AppError("User not authenticated", 401);
    }

    const { email, role } = req.body;

    if (!email) {
      throw new AppError("Email is required", 400);
    }

    const member = await TeamService.addMember(req.params.id, req.user.id, {
      email,
      role,
    });

    const response: ApiResponse = {
      success: true,
      data: member,
    };

    res.status(201).json(response);
  }
);

/**
 * DELETE /api/teams/:id/members/:userId
 * Remove member from team
 */
export const removeTeamMember = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      throw new AppError("User not authenticated", 401);
    }

    await TeamService.removeMember(
      req.params.id,
      req.user.id,
      req.params.userId
    );

    const response: ApiResponse = {
      success: true,
      data: { message: "Member removed successfully" },
    };

    res.json(response);
  }
);

/**
 * PATCH /api/teams/:id/members/:userId/role
 * Update member role
 */
export const updateMemberRole = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      throw new AppError("User not authenticated", 401);
    }

    const { role } = req.body;

    if (!role) {
      throw new AppError("Role is required", 400);
    }

    const member = await TeamService.updateMemberRole(
      req.params.id,
      req.user.id,
      req.params.userId,
      role
    );

    const response: ApiResponse = {
      success: true,
      data: member,
    };

    res.json(response);
  }
);

// ============================================
// TEAM CREDENTIAL SHARING CONTROLLERS
// ============================================

/**
 * POST /api/teams/:id/credentials/:credentialId
 * Share credential with team
 */
export const shareCredentialWithTeam = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      throw new AppError("User not authenticated", 401);
    }

    const { permission = "USE" } = req.body;

    if (!["USE", "VIEW", "EDIT"].includes(permission)) {
      throw new AppError("Invalid permission. Must be USE, VIEW, or EDIT", 400);
    }

    const share = await TeamService.shareCredentialWithTeam(
      req.params.credentialId,
      req.params.id,
      req.user.id,
      permission
    );

    const response: ApiResponse = {
      success: true,
      data: share,
    };

    res.status(201).json(response);
  }
);

/**
 * DELETE /api/teams/:id/credentials/:credentialId
 * Unshare credential from team
 */
export const unshareCredentialFromTeam = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      throw new AppError("User not authenticated", 401);
    }

    await TeamService.unshareCredentialFromTeam(
      req.params.credentialId,
      req.params.id,
      req.user.id
    );

    const response: ApiResponse = {
      success: true,
      data: { message: "Credential unshared successfully" },
    };

    res.json(response);
  }
);

/**
 * GET /api/teams/:id/credentials
 * Get team credential shares
 */
export const getTeamCredentials = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      throw new AppError("User not authenticated", 401);
    }

    const shares = await TeamService.getTeamCredentialShares(
      req.params.id,
      req.user.id
    );

    const response: ApiResponse = {
      success: true,
      data: shares,
    };

    res.json(response);
  }
);

/**
 * PATCH /api/teams/:id/credentials/:credentialId/permission
 * Update team credential permission
 */
export const updateTeamCredentialPermission = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      throw new AppError("User not authenticated", 401);
    }

    const { permission } = req.body;

    if (!permission || !["USE", "VIEW", "EDIT"].includes(permission)) {
      throw new AppError("Invalid permission. Must be USE, VIEW, or EDIT", 400);
    }

    const share = await TeamService.updateTeamCredentialPermission(
      req.params.credentialId,
      req.params.id,
      req.user.id,
      permission
    );

    const response: ApiResponse = {
      success: true,
      data: share,
    };

    res.json(response);
  }
);

// ============================================
// WORKFLOW TEAM ASSIGNMENT CONTROLLERS
// ============================================

/**
 * PUT /api/teams/:id/workflows/:workflowId
 * Assign workflow to team
 */
export const assignWorkflowToTeam = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      throw new AppError("User not authenticated", 401);
    }

    const workflow = await TeamService.assignWorkflowToTeam(
      req.params.workflowId,
      req.params.id,
      req.user.id
    );

    const response: ApiResponse = {
      success: true,
      data: workflow,
    };

    res.json(response);
  }
);

/**
 * DELETE /api/teams/:id/workflows/:workflowId
 * Remove workflow from team
 */
export const removeWorkflowFromTeam = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      throw new AppError("User not authenticated", 401);
    }

    const workflow = await TeamService.removeWorkflowFromTeam(
      req.params.workflowId,
      req.user.id
    );

    const response: ApiResponse = {
      success: true,
      data: workflow,
    };

    res.json(response);
  }
);

/**
 * GET /api/teams/:id/workflows
 * Get team workflows
 */
export const getTeamWorkflows = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      throw new AppError("User not authenticated", 401);
    }

    const workflows = await TeamService.getTeamWorkflows(
      req.params.id,
      req.user.id
    );

    const response: ApiResponse = {
      success: true,
      data: workflows,
    };

    res.json(response);
  }
);

/**
 * POST /api/teams/:id/switch
 * Switch to a team context
 * 
 * Requirements: 13.5 - Update session context without re-authentication
 * 
 * This endpoint allows users to switch their active team context.
 * The team ID is returned and should be stored client-side and sent
 * in subsequent requests via the X-Active-Team-Id header.
 */
export const switchTeam = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      throw new AppError("User not authenticated", 401);
    }

    const teamId = req.params.id;

    // Verify user is a member of the team they're switching to
    // This uses the team memberships already loaded in the session
    if (!req.teamMemberships) {
      throw new AppError("Team memberships not loaded", 500);
    }

    const membership = req.teamMemberships.find(tm => tm.teamId === teamId);
    
    if (!membership) {
      throw new AppError("You are not a member of this team", 403);
    }

    // Get full team details for the response
    const team = await TeamService.getTeam(teamId, req.user.id);

    const response: ApiResponse = {
      success: true,
      data: {
        team,
        membership: {
          teamId: membership.teamId,
          teamName: membership.teamName,
          teamSlug: membership.teamSlug,
          role: membership.role
        },
        message: "Team context switched successfully. Include X-Active-Team-Id header in subsequent requests."
      },
    };

    res.json(response);
  }
);

/**
 * POST /api/teams/clear-context
 * Clear team context (switch to personal)
 * 
 * Requirements: 13.5 - Update session context without re-authentication
 * 
 * This endpoint allows users to clear their active team context and
 * switch back to their personal context. The client should stop sending
 * the X-Active-Team-Id header after calling this endpoint.
 */
export const clearTeamContext = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      throw new AppError("User not authenticated", 401);
    }

    const response: ApiResponse = {
      success: true,
      data: {
        activeTeamId: null,
        message: "Team context cleared. Remove X-Active-Team-Id header from subsequent requests."
      },
    };

    res.json(response);
  }
);
