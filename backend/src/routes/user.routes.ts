import { Response, Router } from "express";
import {
    getPreferences,
    getProfile,
    patchPreferences,
    updatePreferences,
    updateProfile,
} from "../controllers/user.controller";
import { asyncHandler } from "../middleware/asyncHandler";
import { AuthenticatedRequest, requireAuth } from "../middleware/auth";
import { AppError } from "../utils/errors";
import { userServiceDrizzle } from "../services/UserService.drizzle";

const router = Router();

/**
 * User routes
 * All routes require authentication
 */

// GET /api/users/profile - Get current user's profile
router.get("/profile", requireAuth, getProfile);

// PUT /api/users/profile - Update current user's profile
router.put("/profile", requireAuth, updateProfile);

// GET /api/users/preferences - Get current user's preferences
router.get("/preferences", requireAuth, getPreferences);

// PUT /api/users/preferences - Replace all preferences
router.put("/preferences", requireAuth, updatePreferences);

// PATCH /api/users/preferences - Merge preferences (partial update)
router.patch("/preferences", requireAuth, patchPreferences);

// GET /api/users/search - Search users by email or name (for credential sharing)
router.get(
  "/search",
  requireAuth,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { query, email } = req.query;

    if (!query && !email) {
      throw new AppError("Query or email parameter is required", 400);
    }

    let users;

    if (email) {
      // Exact email search
      const user = await userServiceDrizzle.findUserByEmail(email as string);
      users = user ? [user] : [];
    } else {
      // Fuzzy search by email or name
      users = await userServiceDrizzle.searchUsers(query as string, {
        limit: 10,
        excludeUserId: req.user!.id,
      });
    }

    res.json({
      success: true,
      data: users,
    });
  })
);

export default router;
