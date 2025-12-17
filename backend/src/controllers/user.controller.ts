import { Response } from "express";
import { db } from "../db/client";
import { users } from "../db/schema/auth";
import { eq } from "drizzle-orm";
import { AuthenticatedRequest } from "../middleware/auth";
import { AppError, asyncHandler } from "../middleware/errorHandler";
import { ApiResponse } from "../types/api";
import { userServiceDrizzle } from "../services/UserService.drizzle";



/**
 * GET /api/users/preferences
 * Get current user's preferences
 */
export const getPreferences = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      throw new AppError("User not authenticated", 401, "UNAUTHORIZED");
    }

    const userPrefs = await userServiceDrizzle.getUserPreferences(req.user.id);

    if (!userPrefs) {
      throw new AppError("User not found", 404, "USER_NOT_FOUND");
    }

    const response: ApiResponse = {
      success: true,
      data: {
        preferences: userPrefs.preferences || {},
      },
    };

    res.json(response);
  }
);

/**
 * PUT /api/users/preferences
 * Update current user's preferences
 */
export const updatePreferences = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      throw new AppError("User not authenticated", 401, "UNAUTHORIZED");
    }

    const { preferences } = req.body;

    if (!preferences || typeof preferences !== "object") {
      throw new AppError(
        "Invalid preferences format",
        400,
        "INVALID_PREFERENCES"
      );
    }

    const userPrefs = await userServiceDrizzle.updateUserPreferences(req.user.id, preferences);

    if (!userPrefs) {
      throw new AppError("User not found", 404, "USER_NOT_FOUND");
    }

    const response: ApiResponse = {
      success: true,
      data: {
        preferences: userPrefs.preferences,
      },
    };

    res.json(response);
  }
);

/**
 * PATCH /api/users/preferences
 * Partially update current user's preferences (merge with existing)
 */
export const patchPreferences = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      throw new AppError("User not authenticated", 401, "UNAUTHORIZED");
    }

    const { preferences } = req.body;

    if (!preferences || typeof preferences !== "object") {
      throw new AppError(
        "Invalid preferences format",
        400,
        "INVALID_PREFERENCES"
      );
    }

    // Merge preferences using the service method
    const userPrefs = await userServiceDrizzle.mergeUserPreferences(req.user.id, preferences);

    if (!userPrefs) {
      throw new AppError("User not found", 404, "USER_NOT_FOUND");
    }

    const response: ApiResponse = {
      success: true,
      data: {
        preferences: userPrefs.preferences,
      },
    };

    res.json(response);
  }
);

/**
 * GET /api/users/profile
 * Get current user's profile information
 */
export const getProfile = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      throw new AppError("User not authenticated", 401, "UNAUTHORIZED");
    }

    const userProfile = await userServiceDrizzle.getUserProfile(req.user.id);

    if (!userProfile) {
      throw new AppError("User not found", 404, "USER_NOT_FOUND");
    }

    const response: ApiResponse = {
      success: true,
      data: {
        user: userProfile,
      },
    };

    res.json(response);
  }
);

/**
 * PUT /api/users/profile
 * Update current user's profile information
 */
export const updateProfile = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      throw new AppError("User not authenticated", 401, "UNAUTHORIZED");
    }

    const { name, email } = req.body;

    if (!name && !email) {
      throw new AppError(
        "No profile data provided",
        400,
        "NO_DATA"
      );
    }

    // Validate email format if provided
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        throw new AppError("Invalid email format", 400, "INVALID_EMAIL");
      }

      // Check if email is already taken by another user
      const existingUser = await userServiceDrizzle.getUserByEmail(email);

      if (existingUser && existingUser.id !== req.user.id) {
        throw new AppError("Email already in use", 400, "EMAIL_IN_USE");
      }
    }

    const updateData: any = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;

    const userProfile = await userServiceDrizzle.updateUserProfile(req.user.id, updateData);

    if (!userProfile) {
      throw new AppError("User not found", 404, "USER_NOT_FOUND");
    }

    const response: ApiResponse = {
      success: true,
      data: {
        user: userProfile,
      },
    };

    res.json(response);
  }
);
