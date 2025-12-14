/**
 * Authentication Routes
 * 
 * This module provides authentication endpoints using better-auth.
 * It mounts better-auth routes at /api/auth/* and provides custom endpoints
 * for API compatibility.
 * 
 * Requirements: 15.1, 15.2, 12.1, 12.4, 11.1, 11.5, 6.1, 6.2, 6.3, 6.4, 6.5, 14.1, 14.2, 14.3, 14.4
 */

import { Router, Request, Response } from "express";
import { toNodeHandler } from "better-auth/node";
import { auth } from "../config/auth";
import { requireAuth, requireRole, AuthenticatedRequest } from "../middleware/auth";
import { asyncHandler, AppError } from "../middleware/errorHandler";
import { validateBody } from "../middleware/validation";
import { ApiResponse } from "../types/api";
import { prisma } from "../config/database";
import { mapBetterAuthError } from "../utils/auth-error-mapper";
import { createPasswordResetService } from "../services/password-reset.service";
import { z } from "zod";
import bcryptjs from "bcryptjs";
import { randomBytes } from "crypto";
import {
  loginRateLimiter,
  registrationRateLimiter,
  passwordResetRateLimiter
} from "../rate-limit/auth-rate-limiters";

const router = Router();

/**
 * Validation schemas for authentication endpoints
 */
const LoginSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(8, "Password must be at least 8 characters")
});

/**
 * GET /api/auth - Auth endpoints info
 * Returns available authentication endpoints
 */
router.get("/", (_req: Request, res: Response) => {
  const response: ApiResponse = {
    success: true,
    data: {
      message: "Authentication API",
      endpoints: {
        // better-auth endpoints
        signIn: "POST /api/auth/sign-in/email",
        signUp: "POST /api/auth/sign-up/email",
        signOut: "POST /api/auth/sign-out",
        session: "GET /api/auth/get-session",
        // Custom password reset endpoints
        forgotPassword: "POST /api/auth/forgot-password",
        resetPassword: "POST /api/auth/reset-password",
        validateResetToken: "POST /api/auth/validate-reset-token",
        // Custom endpoints
        me: "GET /api/auth/me",
        setupStatus: "GET /api/auth/setup-status",
        // Admin endpoints (requires ADMIN role)
        adminRevokeSessions: "POST /api/auth/admin/revoke-sessions/:userId",
        adminDeactivateUser: "POST /api/auth/admin/deactivate-user/:userId",
        adminReactivateUser: "POST /api/auth/admin/reactivate-user/:userId"
      }
    }
  };
  res.json(response);
});

/**
 * GET /api/auth/setup-status - Check if setup is needed
 * Returns whether the system needs initial setup (first user registration)
 * 
 * Requirements: 12.1, 12.4
 */
router.get(
  "/setup-status",
  asyncHandler(async (req: Request, res: Response) => {
    // Check if any users exist
    const userCount = await prisma.user.count();
    const setupNeeded = userCount === 0;

    const response: ApiResponse = {
      success: true,
      data: {
        setupNeeded,
        message: setupNeeded ? "System setup required - first user registration needed" : "System is already set up"
      }
    };

    res.json(response);
  })
);

// Note: Login is handled by better-auth sign-in endpoint
// This custom endpoint is kept for reference but better-auth handles authentication
// POST /api/auth/sign-in/email is the primary login endpoint

/**
 * GET /api/auth/me - Get current authenticated user
 * Returns the current user's data from the session
 * 
 * Requirements: 15.2
 */
router.get(
  "/me",
  requireAuth,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    // Fetch full user data from database
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        emailVerified: true,
        image: true,
        createdAt: true,
        updatedAt: true,
        preferences: true
      }
    });

    if (!user) {
      throw new AppError("User not found", 404, "USER_NOT_FOUND");
    }

    const response: ApiResponse = {
      success: true,
      data: user
    };

    res.json(response);
  })
);

// Initialize password reset service
const passwordResetService = createPasswordResetService(prisma);

/**
 * POST /api/auth/forgot-password - Request password reset
 * Generates a secure reset token and sends reset email (logs for now)
 * Rate limited per email address to prevent abuse.
 * 
 * Requirements: 6.1, 6.2, 14.3, 14.4
 */
router.post(
  "/forgot-password",
  passwordResetRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const { email } = req.body;

    // Validate email is provided
    if (!email || typeof email !== "string") {
      throw new AppError("Email is required", 400, "VALIDATION_ERROR");
    }

    // Request password reset
    const result = await passwordResetService.requestPasswordReset(email);

    const response: ApiResponse = {
      success: result.success,
      data: {
        message: result.message
      }
    };

    res.json(response);
  })
);

/**
 * POST /api/auth/reset-password - Reset password with token
 * Validates token, updates password, and invalidates all sessions
 * 
 * Requirements: 6.3, 6.4, 6.5
 */
router.post(
  "/reset-password",
  asyncHandler(async (req: Request, res: Response) => {
    const { email, token, newPassword } = req.body;

    // Validate required fields
    if (!email || typeof email !== "string") {
      throw new AppError("Email is required", 400, "VALIDATION_ERROR");
    }
    if (!token || typeof token !== "string") {
      throw new AppError("Reset token is required", 400, "VALIDATION_ERROR");
    }
    if (!newPassword || typeof newPassword !== "string") {
      throw new AppError("New password is required", 400, "VALIDATION_ERROR");
    }

    // Validate password length
    if (newPassword.length < 8) {
      throw new AppError("Password must be at least 8 characters", 400, "PASSWORD_TOO_SHORT");
    }
    if (newPassword.length > 128) {
      throw new AppError("Password must be less than 128 characters", 400, "PASSWORD_TOO_LONG");
    }

    // Reset password
    const result = await passwordResetService.resetPassword(email, token, newPassword);

    if (!result.success) {
      throw new AppError(result.message, 400, result.code || "RESET_FAILED");
    }

    const response: ApiResponse = {
      success: true,
      data: {
        message: result.message
      }
    };

    res.json(response);
  })
);

/**
 * POST /api/auth/validate-reset-token - Validate a reset token
 * Checks if the token is valid and not expired (useful for frontend validation)
 * 
 * Requirements: 6.3, 6.4
 */
router.post(
  "/validate-reset-token",
  asyncHandler(async (req: Request, res: Response) => {
    const { email, token } = req.body;

    // Validate required fields
    if (!email || typeof email !== "string") {
      throw new AppError("Email is required", 400, "VALIDATION_ERROR");
    }
    if (!token || typeof token !== "string") {
      throw new AppError("Reset token is required", 400, "VALIDATION_ERROR");
    }

    // Validate token
    const validation = await passwordResetService.validateResetToken(email, token);

    if (!validation.valid) {
      throw new AppError(validation.message || "Invalid token", 400, validation.code || "INVALID_TOKEN");
    }

    const response: ApiResponse = {
      success: true,
      data: {
        valid: true,
        message: "Token is valid"
      }
    };

    res.json(response);
  })
);

/**
 * POST /api/auth/admin/revoke-sessions/:userId - Revoke all sessions for a user
 * Admin-only endpoint to invalidate all active sessions for a target user.
 * 
 * Requirements: 7.5
 */
router.post(
  "/admin/revoke-sessions/:userId",
  requireAuth,
  requireRole(["admin"]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { userId } = req.params;

    // Validate userId is provided
    if (!userId || typeof userId !== "string") {
      throw new AppError("User ID is required", 400, "VALIDATION_ERROR");
    }

    // Check if target user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, role: true }
    });

    if (!targetUser) {
      throw new AppError("User not found", 404, "USER_NOT_FOUND");
    }

    // Prevent admin from revoking their own sessions via this endpoint
    if (targetUser.id === req.user!.id) {
      throw new AppError(
        "Cannot revoke your own sessions via this endpoint. Use sign-out instead.",
        400,
        "CANNOT_REVOKE_SELF"
      );
    }

    // Delete all sessions for the target user
    const deleteResult = await prisma.session.deleteMany({
      where: { userId: userId }
    });

    const response: ApiResponse = {
      success: true,
      data: {
        message: `Successfully revoked ${deleteResult.count} session(s) for user ${targetUser.email}`,
        revokedCount: deleteResult.count,
        userId: targetUser.id,
        userEmail: targetUser.email
      }
    };

    res.json(response);
  })
);

/**
 * POST /api/auth/admin/deactivate-user/:userId - Deactivate a user and revoke sessions
 * Admin-only endpoint to deactivate a user account and invalidate all their sessions.
 * 
 * Requirements: 7.5
 */
router.post(
  "/admin/deactivate-user/:userId",
  requireAuth,
  requireRole(["admin"]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { userId } = req.params;

    // Validate userId is provided
    if (!userId || typeof userId !== "string") {
      throw new AppError("User ID is required", 400, "VALIDATION_ERROR");
    }

    // Check if target user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, role: true, active: true }
    });

    if (!targetUser) {
      throw new AppError("User not found", 404, "USER_NOT_FOUND");
    }

    // Prevent admin from deactivating themselves
    if (targetUser.id === req.user!.id) {
      throw new AppError(
        "Cannot deactivate your own account",
        400,
        "CANNOT_DEACTIVATE_SELF"
      );
    }

    // Deactivate user and delete all their sessions in a transaction
    const [updatedUser, deleteResult] = await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: { active: false }
      }),
      prisma.session.deleteMany({
        where: { userId: userId }
      })
    ]);

    const response: ApiResponse = {
      success: true,
      data: {
        message: `Successfully deactivated user ${targetUser.email} and revoked ${deleteResult.count} session(s)`,
        userId: updatedUser.id,
        userEmail: updatedUser.email,
        active: updatedUser.active,
        revokedSessionCount: deleteResult.count
      }
    };

    res.json(response);
  })
);

/**
 * POST /api/auth/admin/reactivate-user/:userId - Reactivate a deactivated user
 * Admin-only endpoint to reactivate a previously deactivated user account.
 * 
 * Requirements: 7.5
 */
router.post(
  "/admin/reactivate-user/:userId",
  requireAuth,
  requireRole(["admin"]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { userId } = req.params;

    // Validate userId is provided
    if (!userId || typeof userId !== "string") {
      throw new AppError("User ID is required", 400, "VALIDATION_ERROR");
    }

    // Check if target user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, role: true, active: true }
    });

    if (!targetUser) {
      throw new AppError("User not found", 404, "USER_NOT_FOUND");
    }

    if (targetUser.active) {
      throw new AppError("User is already active", 400, "USER_ALREADY_ACTIVE");
    }

    // Reactivate user
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { active: true }
    });

    const response: ApiResponse = {
      success: true,
      data: {
        message: `Successfully reactivated user ${targetUser.email}`,
        userId: updatedUser.id,
        userEmail: updatedUser.email,
        active: updatedUser.active
      }
    };

    res.json(response);
  })
);

/**
 * Rate limiting middleware for better-auth sign-in endpoint
 * Applied before the better-auth handler for login requests
 * 
 * Requirements: 14.1, 14.4
 */
router.post("/sign-in/*", loginRateLimiter);

/**
 * Rate limiting middleware for better-auth sign-up endpoint
 * Applied before the better-auth handler for registration requests
 * 
 * Requirements: 14.2, 14.4
 */
router.post("/sign-up/*", registrationRateLimiter);

/**
 * Custom sign-out handler to ensure proper session cleanup
 * 
 * This handler wraps better-auth's sign-out to add logging and ensure
 * the session is properly deleted from the database.
 * 
 * Requirements: 15.1, 7.4
 */
router.post("/sign-out", async (req: Request, res: Response) => {
  try {
    console.log(`[Auth] POST /sign-out - Starting logout`);
    
    // First, try to get the current session to delete it from DB
    try {
      const session = await auth.api.getSession({
        headers: req.headers as any
      });
      
      if (session?.session?.id) {
        // Delete the session from database
        await prisma.session.delete({
          where: { id: session.session.id }
        }).catch(err => {
          console.log(`[Auth] Session already deleted or not found: ${err.message}`);
        });
        console.log(`[Auth] Deleted session ${session.session.id} from database`);
      }
    } catch (sessionError) {
      console.log(`[Auth] No active session to delete: ${sessionError}`);
    }
    
    // Call better-auth handler for sign-out (this clears cookies)
    const handler = toNodeHandler(auth);
    await handler(req, res);
    
    console.log(`[Auth] POST /sign-out - Logout completed`);
  } catch (error) {
    console.error("[Auth] Error in sign-out handler:", error);
    
    // Even on error, try to clear cookies
    res.clearCookie("nd_auth.session_token");
    res.clearCookie("nd_auth.session_data");
    
    // Map better-auth errors to ApiResponse format
    const mappedError = mapBetterAuthError(error);
    
    res.status(mappedError.statusCode).json({
      success: false,
      error: {
        code: mappedError.code,
        message: mappedError.message,
        ...(mappedError.details && { details: mappedError.details })
      }
    } as ApiResponse);
  }
});

// Sign-up is now handled by better-auth with admin plugin
// First user automatically becomes admin, subsequent users get "user" role

/**
 * better-auth route handler
 * 
 * This handles all better-auth routes including:
 * - POST /api/auth/sign-in/email - Email/password login
 * - POST /api/auth/sign-out - Logout
 * - GET /api/auth/get-session - Get current session
 * 
 * Note: sign-up/email is handled separately above for role assignment
 * 
 * Requirements: 15.1
 */
router.all("/*", async (req: Request, res: Response) => {
  try {
    console.log(`[Auth] ${req.method} ${req.path}`, { body: req.body ? Object.keys(req.body) : 'no body' });
    
    // Convert Express request/response to Node handler format
    const handler = toNodeHandler(auth);
    await handler(req, res);
  } catch (error) {
    console.error("[Auth] Error in better-auth handler:", error);
    
    // Map better-auth errors to ApiResponse format
    const mappedError = mapBetterAuthError(error);
    
    res.status(mappedError.statusCode).json({
      success: false,
      error: {
        code: mappedError.code,
        message: mappedError.message,
        ...(mappedError.details && { details: mappedError.details })
      }
    } as ApiResponse);
  }
});

export { router as authRoutes };
