/**
 * Custom Role Plugin for better-auth
 * 
 * This plugin handles automatic role assignment during user registration:
 * - First user gets ADMIN role
 * - Subsequent users get USER role
 * 
 * Requirements: 5.3, 5.4
 */

import { markSetupComplete } from "../utils/setup";
import { db } from "./database";
import { users } from "../db/schema/auth";
import { eq } from "drizzle-orm";

/**
 * Empty plugin - role assignment is handled separately
 * 
 * The role assignment is done via a post-registration hook in the auth routes
 * to avoid issues with better-auth's response handling.
 */
export const rolePlugin = {
  id: "role-plugin"
};

/**
 * Assign role to a newly created user based on user count
 * 
 * - First user registered becomes ADMIN (Requirements 5.3)
 * - All subsequent users become USER (Requirements 5.4)
 * 
 * @param userId - The ID of the newly created user
 * @returns The assigned role
 */
export async function assignRoleToNewUser(userId: string): Promise<"admin" | "user"> {
  try {
    // Check if an admin already exists
    // This is safer than count() as it handles concurrent registrations better
    // (though a true distributed lock would be safest, this is sufficient for this scale)
    const existingAdmin = await db
      .select()
      .from(users)
      .where(eq(users.role, "admin"))
      .limit(1);
    
    // If no admin exists, this user becomes admin. Otherwise user.
    const role = existingAdmin.length === 0 ? "admin" : "user";
    
    // Update the user's role
    await db
      .update(users)
      .set({ role })
      .where(eq(users.id, userId));
    
    // Get the updated user
    const updatedUser = await db
      .select({ email: users.email })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    
    console.log(`[Role Plugin] Assigned role ${role} to user ${userId}`);
    
    // If this is the first user (admin), mark setup as complete
    if (role === "admin" && updatedUser.length > 0) {
      markSetupComplete({
        siteName: "Node-Drop",
        adminEmail: updatedUser[0].email
      });
      console.log(`[Role Plugin] Setup marked as complete for admin ${updatedUser[0].email}`);
    }
    
    return role;
  } catch (error) {
    console.error("[Role Plugin] Error assigning role:", error);
    return "user"; // Default to user on error
  }
}

/**
 * Helper function to check if a user should be admin
 * Can be used for testing or manual role assignment
 */
export async function shouldBeAdmin(): Promise<boolean> {
  const userCount = await db.select().from(users);
  return userCount.length === 0;
}

/**
 * Helper function to get the appropriate role for a new user
 */
export async function getNewUserRole(): Promise<"admin" | "user"> {
  const isFirstUser = await shouldBeAdmin();
  return isFirstUser ? "admin" : "user";
}
