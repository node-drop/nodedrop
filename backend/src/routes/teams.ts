import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { requireWorkspace } from "../middleware/workspace";
import {
  addTeamMember,
  assignWorkflowToTeam,
  clearTeamContext,
  createTeam,
  deleteTeam,
  getTeam,
  getTeamCredentials,
  getTeamMembers,
  getTeamWorkflows,
  getUserTeams,
  removeTeamMember,
  removeWorkflowFromTeam,
  shareCredentialWithTeam,
  switchTeam,
  unshareCredentialFromTeam,
  updateMemberRole,
  updateTeam,
  updateTeamCredentialPermission,
} from "../controllers/team.controller";

const router = Router();

/**
 * Team routes
 * All routes require authentication
 */

// ============================================
// TEAM CRUD ROUTES
// ============================================

// GET /api/teams - Get all teams for current user
router.get("/", requireAuth, requireWorkspace, getUserTeams);

// POST /api/teams - Create a new team
router.post("/", requireAuth, requireWorkspace, createTeam);

// GET /api/teams/:id - Get team by ID
router.get("/:id", requireAuth, requireWorkspace, getTeam);

// PUT /api/teams/:id - Update team
router.put("/:id", requireAuth, requireWorkspace, updateTeam);

// DELETE /api/teams/:id - Delete team
router.delete("/:id", requireAuth, requireWorkspace, deleteTeam);

// ============================================
// TEAM MEMBER ROUTES
// ============================================

// GET /api/teams/:id/members - Get team members
router.get("/:id/members", requireAuth, requireWorkspace, getTeamMembers);

// POST /api/teams/:id/members - Add member to team
router.post("/:id/members", requireAuth, requireWorkspace, addTeamMember);

// DELETE /api/teams/:id/members/:userId - Remove member from team
router.delete("/:id/members/:userId", requireAuth, requireWorkspace, removeTeamMember);

// PATCH /api/teams/:id/members/:userId/role - Update member role
router.patch("/:id/members/:userId/role", requireAuth, requireWorkspace, updateMemberRole);

// ============================================
// TEAM CREDENTIAL SHARING ROUTES
// ============================================

// GET /api/teams/:id/credentials - Get team credential shares
router.get("/:id/credentials", requireAuth, requireWorkspace, getTeamCredentials);

// POST /api/teams/:id/credentials/:credentialId - Share credential with team
router.post("/:id/credentials/:credentialId", requireAuth, requireWorkspace, shareCredentialWithTeam);

// DELETE /api/teams/:id/credentials/:credentialId - Unshare credential from team
router.delete("/:id/credentials/:credentialId", requireAuth, requireWorkspace, unshareCredentialFromTeam);

// PATCH /api/teams/:id/credentials/:credentialId/permission - Update team credential permission
router.patch("/:id/credentials/:credentialId/permission", requireAuth, requireWorkspace, updateTeamCredentialPermission);

// ============================================
// TEAM CONTEXT ROUTES
// ============================================

// POST /api/teams/:id/switch - Switch to a team context
// Requirements: 13.5 - Update session context without re-authentication
router.post("/:id/switch", requireAuth, requireWorkspace, switchTeam);

// POST /api/teams/clear-context - Clear team context (switch to personal)
// Requirements: 13.5 - Update session context without re-authentication
router.post("/clear-context", requireAuth, requireWorkspace, clearTeamContext);

// ============================================
// TEAM WORKFLOW ROUTES
// ============================================

// GET /api/teams/:id/workflows - Get team workflows
router.get("/:id/workflows", requireAuth, requireWorkspace, getTeamWorkflows);

// PUT /api/teams/:id/workflows/:workflowId - Assign workflow to team
router.put("/:id/workflows/:workflowId", requireAuth, requireWorkspace, assignWorkflowToTeam);

// DELETE /api/teams/:id/workflows/:workflowId - Remove workflow from team
router.delete("/:id/workflows/:workflowId", requireAuth, requireWorkspace, removeWorkflowFromTeam);

export default router;
