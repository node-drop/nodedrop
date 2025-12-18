// @ts-nocheck
/**
 * Authentication Middleware for better-auth
 * 
 * This module provides middleware functions for authentication and authorization
 * using better-auth's session management.
 * 
 * Supports dual authentication methods:
 * - Authorization header with Bearer token (Requirements: 15.4)
 * - Cookies (default better-auth method)
 * 
 * Requirements: 9.1, 9.2, 9.3, 9.5, 4.2, 4.3, 13.1, 13.2, 13.5, 15.4
 */

import { Request, Response, NextFunction } from "express";
import { auth } from "../config/auth";
import { AppError } from "./errorHandler";
import { fromNodeHeaders } from "better-auth/node";
import { db } from "../db/client";
import { users, sessions } from "../db/schema/auth";
import { teamMembers, teams } from "../db/schema/teams";
import { eq, gt } from "drizzle-orm";

// Team role type
type TeamRole = "owner" | "admin" | "member";

/**
 * Team membership information loaded into session
 * Requirements: 13.1
 */
export interface TeamMembership {
  teamId: string;
  teamName: string;
  teamSlug: string;
  role: TeamRole;
}

/**
 * Extended Request interface with authenticated user data
 */
export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string | null;
    role: "user" | "admin";
    emailVerified: boolean;
    image: string | null;
  };
  session?: {
    id: string;
    userId: string;
    expiresAt: Date;
    token: string;
  };
  /**
   * Team memberships loaded on authentication
   * Requirements: 13.1
   */
  teamMemberships?: TeamMembership[];
  /**
   * Current active team context (for team switching)
   * Requirements: 13.5
   */
  activeTeamId?: string | null;
}

/**
 * Extract Bearer token from Authorization header
 * 
 * Requirements: 15.4
 * 
 * @param authHeader - The Authorization header value
 * @returns The token if present and valid format, null otherwise
 */
const extractBearerToken = (authHeader: string | undefined): string | null => {
  if (!authHeader) {
    return null;
  }
  
  // Check for Bearer token format
  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0].toLowerCase() !== "bearer") {
    return null;
  }
  
  return parts[1];
};

/**
 * Validate session from Bearer token by looking up in database
 * 
 * Requirements: 15.4
 * 
 * @param token - The session token from Authorization header
 * @returns Session data if valid, null otherwise
 */
const validateBearerToken = async (token: string): Promise<{
  session: {
    id: string;
    userId: string;
    expiresAt: Date;
    token: string;
  };
  user: {
    id: string;
    email: string;
    name: string | null;
    role: "user" | "admin";
    emailVerified: boolean;
    image: string | null;
    active: boolean;
    teamMemberships: Array<{
      teamId: string;
      role: TeamRole;
      team: {
        id: string;
        name: string;
        slug: string;
      };
    }>;
  };
} | null> => {
  // Look up session by token using Drizzle
  const session = await db.query.sessions.findFirst({
    where: eq(sessions.token, token),
    with: {
      user: true
    }
  });

  if (!session) {
    return null;
  }

  // Check if session is expired
  if (session.expiresAt < new Date()) {
    return null;
  }

  // Check if user is active
  if (!session.user.active) {
    return null;
  }

  // Fetch team memberships for the user
  const userTeamMemberships = await db.query.teamMembers.findMany({
    where: eq(teamMembers.userId, session.user.id),
    with: {
      team: true
    }
  });

  return {
    session: {
      id: session.id,
      userId: session.userId,
      expiresAt: session.expiresAt,
      token: session.token
    },
    user: {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      role: session.user.role as "user" | "admin",
      emailVerified: session.user.emailVerified,
      image: session.user.image,
      active: session.user.active ?? true as boolean,
      teamMemberships: userTeamMemberships.map(tm => ({
        teamId: tm.teamId,
        role: tm.role as any,
        team: {
          id: tm.team.id,
          name: tm.team.name,
          slug: tm.team.slug
        }
      }))
    }
  };
};

/**
 * Middleware to require authentication
 * 
 * Validates session using better-auth API and attaches user data to request.
 * Returns 401 for missing or invalid sessions.
 * Also loads team memberships into the session (Requirements: 13.1)
 * 
 * Supports dual authentication methods (Requirements: 15.4):
 * 1. Authorization header with Bearer token (checked first)
 * 2. Cookies (fallback to better-auth default method)
 * 
 * Requirements: 9.1, 9.2, 9.3, 13.1, 15.4
 * 
 * @example
 * router.get('/protected', requireAuth, (req, res) => {
 *   // req.user is guaranteed to be defined here
 *   // req.teamMemberships contains user's team memberships
 *   res.json({ user: req.user, teams: req.teamMemberships });
 * });
 */
export const requireAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let sessionData: {
      session: {
        id: string;
        userId: string;
        expiresAt: Date;
        token: string;
      };
      user: {
        id: string;
        email: string;
        name: string | null;
        role: "user" | "admin";
        emailVerified: boolean;
        image: string | null;
        active: boolean;
        teamMemberships: Array<{
          teamId: string;
          role: TeamRole;
          team: {
            id: string;
            name: string;
            slug: string;
          };
        }>;
      };
    } | null = null;

    // First, check for Authorization header with Bearer token (Requirements: 15.4)
    const authHeader = req.headers.authorization;
    const bearerToken = extractBearerToken(authHeader);
    
    if (bearerToken) {
      // Validate Bearer token directly from database
      sessionData = await validateBearerToken(bearerToken);
    }
    
    // Fall back to cookies if no valid Bearer token (Requirements: 15.4)
    if (!sessionData) {
      // Get session from better-auth using request headers (cookies)
      const session = await auth.api.getSession({
        headers: fromNodeHeaders(req.headers)
      });

      if (session && session.user) {
        // Check if session is expired
        const expiresAt = new Date(session.session.expiresAt);
        if (expiresAt >= new Date()) {
          // Fetch user from database to get custom fields (role, etc.)
          // Also fetch team memberships (Requirements: 13.1)
          const dbUser = await db.query.users.findFirst({
            where: eq(users.id, session.user.id)
          });

          if (dbUser && dbUser.active) {
            // Fetch team memberships
            const userTeamMemberships = await db.query.teamMembers.findMany({
              where: eq(teamMembers.userId, session.user.id),
              with: {
                team: true
              }
            });

            sessionData = {
              session: {
                id: session.session.id,
                userId: session.session.userId,
                expiresAt: expiresAt,
                token: session.session.token
              },
              user: {
                id: dbUser.id,
                email: dbUser.email,
                name: dbUser.name,
                role: dbUser.role as "user" | "admin",
                emailVerified: dbUser.emailVerified ?? false,
                image: dbUser.image,
                active: dbUser.active,
                teamMemberships: userTeamMemberships.map(tm => ({
                  teamId: tm.teamId,
                  role: tm.role as any,
                  team: {
                    id: tm.team.id,
                    name: tm.team.name,
                    slug: tm.team.slug
                  }
                }))
              }
            };
          }
        }
      }
    }

    // If no valid session found from either method
    if (!sessionData) {
      throw new AppError("Authentication required", 401, "UNAUTHORIZED");
    }

    // Attach user data to request (Requirements 9.2)
    req.user = {
      id: sessionData.user.id,
      email: sessionData.user.email,
      name: sessionData.user.name,
      role: sessionData.user.role,
      emailVerified: sessionData.user.emailVerified,
      image: sessionData.user.image
    };

    // Attach session data to request
    req.session = {
      id: sessionData.session.id,
      userId: sessionData.session.userId,
      expiresAt: sessionData.session.expiresAt,
      token: sessionData.session.token
    };

    // Attach team memberships to request (Requirements: 13.1)
    req.teamMemberships = sessionData.user.teamMemberships.map(membership => ({
      teamId: membership.teamId,
      teamName: membership.team.name,
      teamSlug: membership.team.slug,
      role: membership.role
    }));

    // Check for active team from header (for team switching - Requirements: 13.5)
    const activeTeamHeader = req.headers["x-active-team-id"];
    if (activeTeamHeader && typeof activeTeamHeader === "string") {
      // Verify user is a member of the requested team
      const isTeamMember = req.teamMemberships.some(
        tm => tm.teamId === activeTeamHeader
      );
      if (isTeamMember) {
        req.activeTeamId = activeTeamHeader;
      }
    }

    next();
  } catch (error) {
    // Re-throw AppError instances
    if (error instanceof AppError) {
      return next(error);
    }
    
    // Handle better-auth specific errors
    if (error instanceof Error) {
      // Log the error for debugging
      console.error("Authentication error:", error.message);
    }
    
    // Return 401 for any authentication failure (Requirements 9.3)
    next(new AppError("Invalid session", 401, "INVALID_SESSION"));
  }
};

/**
 * Middleware to require specific role(s)
 * 
 * Checks user role from session and returns 403 for insufficient permissions.
 * Must be used after requireAuth middleware.
 * 
 * Requirements: 4.2, 4.3
 * 
 * @param roles - Array of allowed roles (e.g., ["admin"] or ["user", "admin"])
 * 
 * @example
 * // Require admin role
 * router.get('/admin', requireAuth, requireRole(["admin"]), (req, res) => {
 *   res.json({ message: "Admin only" });
 * });
 * 
 * @example
 * // Allow both user and admin
 * router.get('/users', requireAuth, requireRole(["user", "admin"]), (req, res) => {
 *   res.json({ message: "Authenticated users" });
 * });
 */
export const requireRole = (roles: Array<"user" | "admin">) => {
  return (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): void => {
    // Check if user is authenticated (should be called after requireAuth)
    if (!req.user) {
      return next(new AppError("Authentication required", 401, "UNAUTHORIZED"));
    }

    // Check if user has one of the required roles (Requirements 4.2)
    if (!roles.includes(req.user.role)) {
      // Return 403 for insufficient permissions (Requirements 4.3)
      return next(new AppError("Insufficient permissions", 403, "FORBIDDEN"));
    }

    next();
  };
};

/**
 * Optional authentication middleware
 * 
 * Attaches user data if a valid session exists, but continues without error
 * if no session is present. Useful for routes that have different behavior
 * for authenticated vs unauthenticated users.
 * Also loads team memberships if authenticated (Requirements: 13.1)
 * 
 * Supports dual authentication methods (Requirements: 15.4):
 * 1. Authorization header with Bearer token (checked first)
 * 2. Cookies (fallback to better-auth default method)
 * 
 * Requirements: 9.5, 13.1, 15.4
 * 
 * @example
 * router.get('/public', optionalAuth, (req, res) => {
 *   if (req.user) {
 *     res.json({ message: `Hello, ${req.user.name}`, teams: req.teamMemberships });
 *   } else {
 *     res.json({ message: "Hello, guest" });
 *   }
 * });
 */
export const optionalAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let sessionData: {
      session: {
        id: string;
        userId: string;
        expiresAt: Date;
        token: string;
      };
      user: {
        id: string;
        email: string;
        name: string | null;
        role: "user" | "admin";
        emailVerified: boolean;
        image: string | null;
        active: boolean;
        teamMemberships: Array<{
          teamId: string;
          role: TeamRole;
          team: {
            id: string;
            name: string;
            slug: string;
          };
        }>;
      };
    } | null = null;

    // First, check for Authorization header with Bearer token (Requirements: 15.4)
    const authHeader = req.headers.authorization;
    const bearerToken = extractBearerToken(authHeader);
    
    if (bearerToken) {
      // Validate Bearer token directly from database
      sessionData = await validateBearerToken(bearerToken);
    }
    
    // Fall back to cookies if no valid Bearer token (Requirements: 15.4)
    if (!sessionData) {
      // Attempt to get session from better-auth
      const session = await auth.api.getSession({
        headers: fromNodeHeaders(req.headers)
      });

      // If session exists and is valid, prepare session data
      if (session && session.user) {
        const expiresAt = new Date(session.session.expiresAt);
        
        // Only process if session is not expired
        if (expiresAt >= new Date()) {
          // Fetch user from database to get custom fields (role, etc.)
          // Also fetch team memberships (Requirements: 13.1)
          const dbUser = await db.query.users.findFirst({
            where: eq(users.id, session.user.id)
          });

          // Only use if user exists and is active
          if (dbUser && dbUser.active) {
            // Fetch team memberships
            const userTeamMemberships = await db.query.teamMembers.findMany({
              where: eq(teamMembers.userId, session.user.id),
              with: {
                team: true
              }
            });

            sessionData = {
              session: {
                id: session.session.id,
                userId: session.session.userId,
                expiresAt: expiresAt,
                token: session.session.token
              },
              user: {
                id: dbUser.id,
                email: dbUser.email,
                name: dbUser.name,
                role: dbUser.role as "user" | "admin",
                emailVerified: dbUser.emailVerified ?? false,
                image: dbUser.image,
                active: dbUser.active,
                teamMemberships: userTeamMemberships.map(tm => ({
                  teamId: tm.teamId,
                  role: tm.role as any,
                  team: {
                    id: tm.team.id,
                    name: tm.team.name,
                    slug: tm.team.slug
                  }
                }))
              }
            };
          }
        }
      }
    }

    // If valid session found from either method, attach to request
    if (sessionData) {
      req.user = {
        id: sessionData.user.id,
        email: sessionData.user.email,
        name: sessionData.user.name,
        role: sessionData.user.role,
        emailVerified: sessionData.user.emailVerified,
        image: sessionData.user.image
      };

      req.session = {
        id: sessionData.session.id,
        userId: sessionData.session.userId,
        expiresAt: sessionData.session.expiresAt,
        token: sessionData.session.token
      };

      // Attach team memberships to request (Requirements: 13.1)
      req.teamMemberships = sessionData.user.teamMemberships.map(membership => ({
        teamId: membership.teamId,
        teamName: membership.team.name,
        teamSlug: membership.team.slug,
        role: membership.role
      }));

      // Check for active team from header (for team switching - Requirements: 13.5)
      const activeTeamHeader = req.headers["x-active-team-id"];
      if (activeTeamHeader && typeof activeTeamHeader === "string") {
        // Verify user is a member of the requested team
        const isTeamMember = req.teamMemberships.some(
          tm => tm.teamId === activeTeamHeader
        );
        if (isTeamMember) {
          req.activeTeamId = activeTeamHeader;
        }
      }
    }
  } catch (error) {
    // Silently fail for optional auth - don't block the request
    // Just log for debugging purposes
    if (process.env.NODE_ENV === "development") {
      console.debug("Optional auth: No valid session found");
    }
  }

  // Always continue to next middleware
  next();
};



/**
 * Middleware to require team membership for accessing team resources
 * 
 * Verifies that the authenticated user is a member of the team specified
 * in the request parameters. Must be used after requireAuth middleware.
 * 
 * Requirements: 13.2
 * 
 * @param options - Configuration options
 * @param options.teamIdParam - Name of the route parameter containing team ID (default: "id")
 * @param options.requiredRoles - Optional array of team roles required for access
 * 
 * @example
 * // Basic team membership check
 * router.get('/teams/:id/resources', requireAuth, requireTeamMembership(), (req, res) => {
 *   res.json({ message: "Team resource" });
 * });
 * 
 * @example
 * // Require specific team role
 * router.delete('/teams/:teamId/settings', requireAuth, requireTeamMembership({ 
 *   teamIdParam: "teamId",
 *   requiredRoles: ["OWNER"] 
 * }), (req, res) => {
 *   res.json({ message: "Owner only action" });
 * });
 */
export const requireTeamMembership = (options?: {
  teamIdParam?: string;
  requiredRoles?: TeamRole[];
}) => {
  const teamIdParam = options?.teamIdParam || "id";
  const requiredRoles = options?.requiredRoles;

  return (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): void => {
    // Check if user is authenticated (should be called after requireAuth)
    if (!req.user) {
      return next(new AppError("Authentication required", 401, "UNAUTHORIZED"));
    }

    // Check if team memberships are loaded
    if (!req.teamMemberships) {
      return next(new AppError("Team memberships not loaded", 500, "INTERNAL_ERROR"));
    }

    // Get team ID from route parameters
    const teamId = req.params[teamIdParam];
    if (!teamId) {
      return next(new AppError("Team ID is required", 400, "BAD_REQUEST"));
    }

    // Check if user is a member of the team (Requirements: 13.2)
    const membership = req.teamMemberships.find(tm => tm.teamId === teamId);
    if (!membership) {
      return next(new AppError("Access denied to team", 403, "TEAM_ACCESS_DENIED"));
    }

    // If specific roles are required, check the user's team role
    if (requiredRoles && requiredRoles.length > 0) {
      if (!requiredRoles.includes(membership.role)) {
        return next(new AppError(
          "Insufficient team permissions",
          403,
          "TEAM_PERMISSION_DENIED"
        ));
      }
    }

    next();
  };
};

/**
 * Helper function to check if a user has access to a team from session data
 * 
 * This is a utility function that can be used in route handlers to verify
 * team membership without using middleware.
 * 
 * Requirements: 13.2
 * 
 * @param req - The authenticated request object
 * @param teamId - The team ID to check access for
 * @returns The team membership if user has access, null otherwise
 * 
 * @example
 * router.get('/resource', requireAuth, (req, res) => {
 *   const membership = getTeamMembershipFromSession(req, someTeamId);
 *   if (!membership) {
 *     throw new AppError("Access denied", 403);
 *   }
 *   // User has access to the team
 * });
 */
export const getTeamMembershipFromSession = (
  req: AuthenticatedRequest,
  teamId: string
): TeamMembership | null => {
  if (!req.teamMemberships) {
    return null;
  }
  return req.teamMemberships.find(tm => tm.teamId === teamId) || null;
};

/**
 * Helper function to check if user has a specific role in a team
 * 
 * Requirements: 13.2
 * 
 * @param req - The authenticated request object
 * @param teamId - The team ID to check
 * @param roles - Array of acceptable roles
 * @returns true if user has one of the specified roles in the team
 */
export const hasTeamRole = (
  req: AuthenticatedRequest,
  teamId: string,
  roles: TeamRole[]
): boolean => {
  const membership = getTeamMembershipFromSession(req, teamId);
  if (!membership) {
    return false;
  }
  return roles.includes(membership.role);
};


/**
 * Validate that a target user has an active session
 * 
 * This function checks if a user has at least one valid (non-expired) session.
 * Used for credential sharing validation (Requirements: 13.3)
 * 
 * @param userId - The user ID to check for active sessions
 * @returns true if user has at least one active session, false otherwise
 */
export const hasActiveSession = async (userId: string): Promise<boolean> => {
  const now = new Date();
  
  const activeSession = await db.query.sessions.findFirst({
    where: eq(sessions.userId, userId)
  });
  
  // Check if session exists and is not expired
  if (!activeSession || activeSession.expiresAt < now) {
    return false;
  }
  
  return true;
};

/**
 * Middleware to validate credential sharing between users
 * 
 * Validates that both the current user (sharer) and the target user
 * have valid sessions before allowing credential sharing.
 * Must be used after requireAuth middleware.
 * 
 * Requirements: 13.3
 * 
 * @example
 * router.post('/:id/share', requireAuth, validateCredentialSharing, (req, res) => {
 *   // Both users have valid sessions
 * });
 */
export const validateCredentialSharing = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Check if current user is authenticated (should be called after requireAuth)
    if (!req.user || !req.session) {
      return next(new AppError("Authentication required", 401, "UNAUTHORIZED"));
    }

    // Get target user ID from request body
    const targetUserId = req.body.userId;
    
    // If no target user specified, skip validation (might be team sharing)
    if (!targetUserId) {
      return next();
    }

    // Validate that target user exists
    const targetUser = await db.query.users.findFirst({
      where: eq(users.id, targetUserId)
    });

    if (!targetUser) {
      return next(new AppError("Target user not found", 404, "USER_NOT_FOUND"));
    }

    // Check if target user is active
    if (!targetUser.active) {
      return next(new AppError(
        "Cannot share with deactivated user",
        400,
        "USER_DEACTIVATED"
      ));
    }

    // Validate that target user has an active session (Requirements: 13.3)
    const targetHasSession = await hasActiveSession(targetUserId);
    
    if (!targetHasSession) {
      return next(new AppError(
        "Target user does not have an active session",
        400,
        "TARGET_NO_SESSION"
      ));
    }

    next();
  } catch (error) {
    if (error instanceof AppError) {
      return next(error);
    }
    next(new AppError("Credential sharing validation failed", 500, "INTERNAL_ERROR"));
  }
};

/**
 * Helper function to validate credential sharing permissions
 * 
 * Checks if both users have valid sessions and the sharer has permission
 * to share the credential.
 * 
 * Requirements: 13.3
 * 
 * @param sharerId - The user ID of the person sharing the credential
 * @param targetUserId - The user ID of the person receiving the share
 * @returns Object with validation result and any error message
 */
export const validateCredentialSharingPermissions = async (
  sharerId: string,
  targetUserId: string
): Promise<{ valid: boolean; error?: string }> => {
  // Check if sharer has active session
  const sharerHasSession = await hasActiveSession(sharerId);
  if (!sharerHasSession) {
    return { valid: false, error: "Sharer does not have an active session" };
  }

  // Check if target user exists and is active
  const targetUser = await db.query.users.findFirst({
    where: eq(users.id, targetUserId)
  });

  if (!targetUser) {
    return { valid: false, error: "Target user not found" };
  }

  if (!targetUser.active) {
    return { valid: false, error: "Target user is deactivated" };
  }

  // Check if target has active session
  const targetHasSession = await hasActiveSession(targetUserId);
  if (!targetHasSession) {
    return { valid: false, error: "Target user does not have an active session" };
  }

  return { valid: true };
};


