/**
 * Workspace Middleware
 * 
 * Provides middleware functions for workspace context injection and validation.
 * This is the core of multi-tenant request handling.
 */

import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "./auth";
import { AppError } from "./errorHandler";
import { db } from "../db/client";
import { workspaceMembers, workspaces } from "../db/schema/workspace";
import { eq, and } from "drizzle-orm";
import { WorkspaceContext } from "../types/workspace.types";

// Workspace role type
type WorkspaceRole = "owner" | "admin" | "member";

/**
 * Extended Request interface with workspace context
 */
export interface WorkspaceRequest extends AuthenticatedRequest {
  workspace?: WorkspaceContext;
}

/**
 * Middleware to require workspace context
 * 
 * Reads workspace ID from:
 * 1. x-workspace-id header
 * 2. Route parameter :workspaceId
 * 3. User's default workspace (fallback)
 * 
 * Must be used after requireAuth middleware.
 */
export const requireWorkspace = async (
  req: WorkspaceRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      return next(new AppError("Authentication required", 401, "UNAUTHORIZED"));
    }

    // Get workspace ID from various sources
    let workspaceId: string | undefined;

    // 1. Check header
    const headerWorkspaceId = req.headers["x-workspace-id"];
    if (headerWorkspaceId && typeof headerWorkspaceId === "string") {
      workspaceId = headerWorkspaceId;
    }

    // 2. Check route parameter
    if (!workspaceId && req.params.workspaceId) {
      workspaceId = req.params.workspaceId;
    }

    // 3. Fall back to user's default workspace
    if (!workspaceId) {
      const { users } = await import("../db/schema/auth");
      const user = await db.query.users.findFirst({
        where: eq(users.id, req.user.id),
        columns: { defaultWorkspaceId: true },
      });

      if (user?.defaultWorkspaceId) {
        workspaceId = user.defaultWorkspaceId;
      }
    }

    if (!workspaceId) {
      return next(new AppError(
        "Workspace context required. Provide x-workspace-id header or set a default workspace.",
        400,
        "WORKSPACE_REQUIRED"
      ));
    }

    // Verify user has access to workspace using Drizzle
    const membership = await db.query.workspaceMembers.findFirst({
      where: and(
        eq(workspaceMembers.workspaceId, workspaceId),
        eq(workspaceMembers.userId, req.user.id)
      ),
      with: {
        workspace: true
      }
    });

    if (!membership) {
      return next(new AppError(
        "User does not have access to this workspace",
        403,
        "WORKSPACE_ACCESS_DENIED"
      ));
    }

    // Extract workspace data
    const workspace = membership.workspace;
    if (!workspace) {
      return next(new AppError(
        "Workspace not found",
        404,
        "WORKSPACE_NOT_FOUND"
      ));
    }

    // Attach workspace context to request
    req.workspace = {
      workspaceId: workspace.id,
      workspaceSlug: workspace.slug,
      workspaceName: workspace.name,
      userRole: membership.role as WorkspaceRole,
      plan: workspace.plan as any,
      limits: {
        maxMembers: workspace.maxMembers,
        maxWorkflows: workspace.maxWorkflows,
        maxExecutionsPerMonth: workspace.maxExecutionsPerMonth,
        maxCredentials: workspace.maxCredentials,
      },
      usage: {
        currentMonthExecutions: workspace.currentMonthExecutions,
      },
    };

    next();
  } catch (error) {
    if (error instanceof AppError) {
      return next(error);
    }
    console.error("Workspace middleware error:", error);
    next(new AppError("Failed to validate workspace", 500, "WORKSPACE_ERROR"));
  }
};

/**
 * Middleware to require specific workspace role(s)
 * 
 * Must be used after requireWorkspace middleware.
 */
export const requireWorkspaceRole = (roles: WorkspaceRole[]) => {
  return (
    req: WorkspaceRequest,
    res: Response,
    next: NextFunction
  ): void => {
    if (!req.workspace) {
      return next(new AppError("Workspace context required", 400, "WORKSPACE_REQUIRED"));
    }

    if (!roles.includes(req.workspace.userRole)) {
      return next(new AppError(
        "Insufficient workspace permissions",
        403,
        "WORKSPACE_PERMISSION_DENIED"
      ));
    }

    next();
  };
};

/**
 * Middleware to check workspace resource limits before creation
 */
export const checkWorkspaceLimit = (resourceType: "workflow" | "credential" | "member") => {
  return async (
    req: WorkspaceRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.workspace) {
        return next(new AppError("Workspace context required", 400, "WORKSPACE_REQUIRED"));
      }

      const { workspaceId, limits } = req.workspace;

      // Get current counts
      const { workflows: workflowsTable } = await import("../db/schema/workflows");
      const { credentials } = await import("../db/schema/credentials");
      const { count } = await import("drizzle-orm");

      const workspace = await db.query.workspaces.findFirst({
        where: eq(workspaces.id, workspaceId),
      });

      if (!workspace) {
        return next(new AppError("Workspace not found", 404, "WORKSPACE_NOT_FOUND"));
      }

      // Get counts for each resource type
      const [workflowCount, credentialCount, memberCount] = await Promise.all([
        db.select({ count: count() }).from(workflowsTable).where(eq(workflowsTable.workspaceId, workspaceId)),
        db.select({ count: count() }).from(credentials).where(eq(credentials.workspaceId, workspaceId)),
        db.select({ count: count() }).from(workspaceMembers).where(eq(workspaceMembers.workspaceId, workspaceId)),
      ]);

      let limitReached = false;
      let limitName = "";

      switch (resourceType) {
        case "workflow":
          if (limits.maxWorkflows !== -1 && (workflowCount[0]?.count || 0) >= limits.maxWorkflows) {
            limitReached = true;
            limitName = "workflow";
          }
          break;
        case "credential":
          if (limits.maxCredentials !== -1 && (credentialCount[0]?.count || 0) >= limits.maxCredentials) {
            limitReached = true;
            limitName = "credential";
          }
          break;
        case "member":
          if (limits.maxMembers !== -1 && (memberCount[0]?.count || 0) >= limits.maxMembers) {
            limitReached = true;
            limitName = "member";
          }
          break;
      }

      if (limitReached) {
        return next(new AppError(
          `Workspace ${limitName} limit reached. Upgrade your plan for more.`,
          403,
          "WORKSPACE_LIMIT_REACHED"
        ));
      }

      next();
    } catch (error) {
      if (error instanceof AppError) {
        return next(error);
      }
      next(new AppError("Failed to check workspace limits", 500, "LIMIT_CHECK_ERROR"));
    }
  };
};

/**
 * Optional workspace middleware
 * 
 * Attaches workspace context if available, but doesn't require it.
 * Useful for routes that work with or without workspace context.
 */
export const optionalWorkspace = async (
  req: WorkspaceRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      return next();
    }

    // Get workspace ID from header or default
    let workspaceId: string | undefined;

    const headerWorkspaceId = req.headers["x-workspace-id"];
    if (headerWorkspaceId && typeof headerWorkspaceId === "string") {
      workspaceId = headerWorkspaceId;
    }

    if (!workspaceId) {
      const { users } = await import("../db/schema/auth");
      const user = await db.query.users.findFirst({
        where: eq(users.id, req.user.id),
        columns: { defaultWorkspaceId: true },
      });

      if (user?.defaultWorkspaceId) {
        workspaceId = user.defaultWorkspaceId;
      }
    }

    if (!workspaceId) {
      return next();
    }

    // Try to get membership with workspace details
    const membership = await db.query.workspaceMembers.findFirst({
      where: and(
        eq(workspaceMembers.workspaceId, workspaceId),
        eq(workspaceMembers.userId, req.user.id)
      ),
    });

    if (membership) {
      // Get workspace details
      const workspace = await db.query.workspaces.findFirst({
        where: eq(workspaces.id, workspaceId),
      });

      if (workspace) {
        req.workspace = {
          workspaceId: workspace.id,
          workspaceSlug: workspace.slug,
          workspaceName: workspace.name,
          userRole: membership.role as WorkspaceRole,
          plan: workspace.plan,
          limits: {
            maxMembers: workspace.maxMembers,
            maxWorkflows: workspace.maxWorkflows,
            maxExecutionsPerMonth: workspace.maxExecutionsPerMonth,
            maxCredentials: workspace.maxCredentials,
          },
          usage: {
            currentMonthExecutions: workspace.currentMonthExecutions,
          },
        };
      }
    }

    next();
  } catch (error) {
    // Silently continue without workspace context
    next();
  }
};

/**
 * Helper to get workspace ID from request
 */
export const getWorkspaceId = (req: WorkspaceRequest): string | undefined => {
  return req.workspace?.workspaceId;
};

/**
 * Helper to check if user has specific workspace role
 */
export const hasWorkspaceRole = (req: WorkspaceRequest, roles: WorkspaceRole[]): boolean => {
  if (!req.workspace) return false;
  return roles.includes(req.workspace.userRole);
};
