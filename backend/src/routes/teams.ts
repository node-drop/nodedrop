import { Router } from "express";
import { requireAuth } from "../middleware/auth";
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
router.get("/", requireAuth, getUserTeams);

// POST /api/teams - Create a new team
router.post("/", requireAuth, createTeam);

// GET /api/teams/:id - Get team by ID
router.get("/:id", requireAuth, getTeam);

// PUT /api/teams/:id - Update team
router.put("/:id", requireAuth, updateTeam);

// DELETE /api/teams/:id - Delete team
router.delete("/:id", requireAuth, deleteTeam);

// ============================================
// TEAM MEMBER ROUTES
// ============================================

// GET /api/teams/:id/members - Get team members
router.get("/:id/members", requireAuth, getTeamMembers);

// POST /api/teams/:id/members - Add member to team
router.post("/:id/members", requireAuth, addTeamMember);

// DELETE /api/teams/:id/members/:userId - Remove member from team
router.delete("/:id/members/:userId", requireAuth, removeTeamMember);

// PATCH /api/teams/:id/members/:userId/role - Update member role
router.patch("/:id/members/:userId/role", requireAuth, updateMemberRole);

// ============================================
// TEAM CREDENTIAL SHARING ROUTES
// ============================================

// GET /api/teams/:id/credentials - Get team credential shares
router.get("/:id/credentials", requireAuth, getTeamCredentials);

// POST /api/teams/:id/credentials/:credentialId - Share credential with team
router.post("/:id/credentials/:credentialId", requireAuth, shareCredentialWithTeam);

// DELETE /api/teams/:id/credentials/:credentialId - Unshare credential from team
router.delete("/:id/credentials/:credentialId", requireAuth, unshareCredentialFromTeam);

// PATCH /api/teams/:id/credentials/:credentialId/permission - Update team credential permission
router.patch("/:id/credentials/:credentialId/permission", requireAuth, updateTeamCredentialPermission);

// ============================================
// TEAM CONTEXT ROUTES
// ============================================

// POST /api/teams/:id/switch - Switch to a team context
// Requirements: 13.5 - Update session context without re-authentication
router.post("/:id/switch", requireAuth, switchTeam);

// POST /api/teams/clear-context - Clear team context (switch to personal)
// Requirements: 13.5 - Update session context without re-authentication
router.post("/clear-context", requireAuth, clearTeamContext);

// ============================================
// TEAM WORKFLOW ROUTES
// ============================================

// GET /api/teams/:id/workflows - Get team workflows
router.get("/:id/workflows", requireAuth, getTeamWorkflows);

// PUT /api/teams/:id/workflows/:workflowId - Assign workflow to team
router.put("/:id/workflows/:workflowId", requireAuth, assignWorkflowToTeam);

// DELETE /api/teams/:id/workflows/:workflowId - Remove workflow from team
router.delete("/:id/workflows/:workflowId", requireAuth, removeWorkflowFromTeam);

export default router;
