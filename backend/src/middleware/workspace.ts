/**
 * Workspace Middleware
 * 
 * Provides middleware functions for workspace context injection and validation.
 * This is the core of multi-tenant request handling.
 */

import { Response, NextFunction } from "express";
import { WorkspaceRole } from "@prisma/client";
import { AuthenticatedRequest } from "./auth";
import { AppError } from "./errorHandler";
import { prisma } from "../config/database";
import { WorkspaceContext } from "../types/workspace.types";

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
      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: { defaultWorkspaceId: true },
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

    // Verify user has access to workspace
    const membership = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: req.user.id,
        },
      },
      include: {
        workspace: {
          select: {
            id: true,
            slug: true,
            name: true,
            plan: true,
            maxMembers: true,
            maxWorkflows: true,
            maxExecutionsPerMonth: true,
            maxCredentials: true,
            currentMonthExecutions: true,
          },
        },
      },
    });

    if (!membership) {
      return next(new AppError("Access denied to workspace", 403, "WORKSPACE_ACCESS_DENIED"));
    }

    // Attach workspace context to request
    req.workspace = {
      workspaceId: membership.workspace.id,
      workspaceSlug: membership.workspace.slug,
      workspaceName: membership.workspace.name,
      userRole: membership.role,
      plan: membership.workspace.plan,
      limits: {
        maxMembers: membership.workspace.maxMembers,
        maxWorkflows: membership.workspace.maxWorkflows,
        maxExecutionsPerMonth: membership.workspace.maxExecutionsPerMonth,
        maxCredentials: membership.workspace.maxCredentials,
      },
      usage: {
        currentMonthExecutions: membership.workspace.currentMonthExecutions,
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
      const workspace = await prisma.workspace.findUnique({
        where: { id: workspaceId },
        include: {
          _count: {
            select: { members: true, workflows: true, credentials: true },
          },
        },
      });

      if (!workspace) {
        return next(new AppError("Workspace not found", 404, "WORKSPACE_NOT_FOUND"));
      }

      let limitReached = false;
      let limitName = "";

      switch (resourceType) {
        case "workflow":
          if (limits.maxWorkflows !== -1 && workspace._count.workflows >= limits.maxWorkflows) {
            limitReached = true;
            limitName = "workflow";
          }
          break;
        case "credential":
          if (limits.maxCredentials !== -1 && workspace._count.credentials >= limits.maxCredentials) {
            limitReached = true;
            limitName = "credential";
          }
          break;
        case "member":
          if (limits.maxMembers !== -1 && workspace._count.members >= limits.maxMembers) {
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
      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: { defaultWorkspaceId: true },
      });

      if (user?.defaultWorkspaceId) {
        workspaceId = user.defaultWorkspaceId;
      }
    }

    if (!workspaceId) {
      return next();
    }

    // Try to get membership
    const membership = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: req.user.id,
        },
      },
      include: {
        workspace: {
          select: {
            id: true,
            slug: true,
            name: true,
            plan: true,
            maxMembers: true,
            maxWorkflows: true,
            maxExecutionsPerMonth: true,
            maxCredentials: true,
            currentMonthExecutions: true,
          },
        },
      },
    });

    if (membership) {
      req.workspace = {
        workspaceId: membership.workspace.id,
        workspaceSlug: membership.workspace.slug,
        workspaceName: membership.workspace.name,
        userRole: membership.role,
        plan: membership.workspace.plan,
        limits: {
          maxMembers: membership.workspace.maxMembers,
          maxWorkflows: membership.workspace.maxWorkflows,
          maxExecutionsPerMonth: membership.workspace.maxExecutionsPerMonth,
          maxCredentials: membership.workspace.maxCredentials,
        },
        usage: {
          currentMonthExecutions: membership.workspace.currentMonthExecutions,
        },
      };
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
