/**
 * Workspace Routes
 * 
 * API endpoints for workspace management in multi-tenant SaaS.
 * 
 * Edition behavior:
 * - Community: Single workspace per user, no multi-workspace features
 * - Cloud: Full multi-workspace, team collaboration, invitations
 */

import { Router, Response } from "express";
import { WorkspaceRole } from "@prisma/client";
import { requireAuth, AuthenticatedRequest } from "../middleware/auth";
import { 
  requireWorkspace, 
  requireWorkspaceRole, 
  WorkspaceRequest 
} from "../middleware/workspace";
import { requireEditionFeature } from "../middleware/edition";
import { asyncHandler } from "../middleware/asyncHandler";
import { WorkspaceService } from "../services/WorkspaceService";
import { AppError } from "../middleware/errorHandler";
import { isFeatureEnabled } from "../config/edition";

const router = Router();

// ============================================
// WORKSPACE CRUD
// ============================================

/**
 * GET /api/workspaces
 * List all workspaces for the authenticated user
 */
router.get(
  "/",
  requireAuth,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const workspaces = await WorkspaceService.getUserWorkspaces(req.user!.id);
    res.json({ success: true, data: workspaces });
  })
);

/**
 * GET /api/workspaces/can-create
 * Check if user can create more workspaces
 * Cloud only - Community edition always returns false (single workspace)
 */
router.get(
  "/can-create",
  requireAuth,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    // In community edition, users cannot create additional workspaces
    if (!isFeatureEnabled('multiWorkspace')) {
      res.json({ 
        success: true, 
        data: { 
          allowed: false, 
          reason: 'Multi-workspace is a Cloud feature. Upgrade to NodeDrop Cloud for multiple workspaces.',
          currentCount: 1,
          maxAllowed: 1
        } 
      });
      return;
    }
    const result = await WorkspaceService.canCreateWorkspace(req.user!.id);
    res.json({ success: true, data: result });
  })
);

/**
 * POST /api/workspaces
 * Create a new workspace
 * Cloud only - Community edition has single workspace created at registration
 */
router.post(
  "/",
  requireAuth,
  requireEditionFeature('multiWorkspace'),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { name, slug, description } = req.body;

    if (!name) {
      throw new AppError("Workspace name is required", 400, "NAME_REQUIRED");
    }

    const workspace = await WorkspaceService.createWorkspace(req.user!.id, {
      name,
      slug,
      description,
    });

    res.status(201).json({ success: true, data: workspace });
  })
);

/**
 * GET /api/workspaces/:workspaceId
 * Get workspace details
 */
router.get(
  "/:workspaceId",
  requireAuth,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const workspace = await WorkspaceService.getWorkspace(
      req.params.workspaceId,
      req.user!.id
    );
    res.json({ success: true, data: workspace });
  })
);

/**
 * PATCH /api/workspaces/:workspaceId
 * Update workspace
 */
router.patch(
  "/:workspaceId",
  requireAuth,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { name, slug, description, settings } = req.body;

    const workspace = await WorkspaceService.updateWorkspace(
      req.params.workspaceId,
      req.user!.id,
      { name, slug, description, settings }
    );

    res.json({ success: true, data: workspace });
  })
);

/**
 * DELETE /api/workspaces/:workspaceId
 * Delete workspace (owner only)
 */
router.delete(
  "/:workspaceId",
  requireAuth,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    await WorkspaceService.deleteWorkspace(req.params.workspaceId, req.user!.id);
    res.json({ success: true });
  })
);

// ============================================
// WORKSPACE MEMBERS
// ============================================

/**
 * GET /api/workspaces/:workspaceId/members
 * List workspace members
 */
router.get(
  "/:workspaceId/members",
  requireAuth,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const members = await WorkspaceService.getMembers(
      req.params.workspaceId,
      req.user!.id
    );
    res.json({ success: true, data: members });
  })
);

/**
 * POST /api/workspaces/:workspaceId/members/invite
 * Invite a new member to workspace
 * Cloud only - Community edition is single-user
 */
router.post(
  "/:workspaceId/members/invite",
  requireAuth,
  requireEditionFeature('memberInvitations'),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { email, role } = req.body;

    if (!email) {
      throw new AppError("Email is required", 400, "EMAIL_REQUIRED");
    }

    const validRoles = [WorkspaceRole.ADMIN, WorkspaceRole.MEMBER, WorkspaceRole.VIEWER];
    const memberRole = role && validRoles.includes(role) ? role : WorkspaceRole.MEMBER;

    const invitation = await WorkspaceService.inviteMember(
      req.params.workspaceId,
      req.user!.id,
      email,
      memberRole
    );

    res.status(201).json({ success: true, data: invitation });
  })
);

/**
 * POST /api/workspaces/invitations/:token/accept
 * Accept a workspace invitation
 * Cloud only - Community edition is single-user
 */
router.post(
  "/invitations/:token/accept",
  requireAuth,
  requireEditionFeature('memberInvitations'),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const workspace = await WorkspaceService.acceptInvitation(
      req.params.token,
      req.user!.id
    );
    res.json({ success: true, data: workspace });
  })
);

/**
 * PATCH /api/workspaces/:workspaceId/members/:userId
 * Update member role
 */
router.patch(
  "/:workspaceId/members/:userId",
  requireAuth,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { role } = req.body;

    if (!role) {
      throw new AppError("Role is required", 400, "ROLE_REQUIRED");
    }

    const validRoles = [WorkspaceRole.ADMIN, WorkspaceRole.MEMBER, WorkspaceRole.VIEWER];
    if (!validRoles.includes(role)) {
      throw new AppError("Invalid role", 400, "INVALID_ROLE");
    }

    const member = await WorkspaceService.updateMemberRole(
      req.params.workspaceId,
      req.user!.id,
      req.params.userId,
      role
    );

    res.json({ success: true, data: member });
  })
);

/**
 * DELETE /api/workspaces/:workspaceId/members/:userId
 * Remove member from workspace
 */
router.delete(
  "/:workspaceId/members/:userId",
  requireAuth,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    await WorkspaceService.removeMember(
      req.params.workspaceId,
      req.user!.id,
      req.params.userId
    );
    res.json({ success: true });
  })
);

// ============================================
// WORKSPACE USAGE
// ============================================

/**
 * GET /api/workspaces/:workspaceId/usage
 * Get workspace usage statistics
 */
router.get(
  "/:workspaceId/usage",
  requireAuth,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const usage = await WorkspaceService.getUsage(
      req.params.workspaceId,
      req.user!.id
    );
    res.json({ success: true, data: usage });
  })
);

// ============================================
// CURRENT WORKSPACE CONTEXT
// ============================================

/**
 * GET /api/workspaces/current
 * Get current workspace context (from header or default)
 */
router.get(
  "/current",
  requireAuth,
  requireWorkspace,
  asyncHandler(async (req: WorkspaceRequest, res: Response) => {
    res.json({ success: true, data: req.workspace });
  })
);

/**
 * POST /api/workspaces/:workspaceId/set-default
 * Set workspace as user's default
 */
router.post(
  "/:workspaceId/set-default",
  requireAuth,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    // Verify user has access to workspace
    const workspace = await WorkspaceService.getWorkspace(
      req.params.workspaceId,
      req.user!.id
    );

    // Update user's default workspace
    const { prisma } = await import("../config/database");
    await prisma.user.update({
      where: { id: req.user!.id },
      data: { defaultWorkspaceId: workspace.id },
    });

    res.json({ success: true, defaultWorkspaceId: workspace.id });
  })
);

export default router;
