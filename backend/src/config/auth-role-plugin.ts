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
import { prisma } from "./database";

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
export async function assignRoleToNewUser(userId: string): Promise<"ADMIN" | "USER"> {
  try {
    // Check if an admin already exists
    // This is safer than count() as it handles concurrent registrations better
    // (though a true distributed lock would be safest, this is sufficient for this scale)
    const existingAdmin = await prisma.user.findFirst({
      where: { role: "ADMIN" }
    });
    
    // If no admin exists, this user becomes ADMIN. Otherwise USER.
    const role = !existingAdmin ? "ADMIN" : "USER";
    
    // Update the user's role
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { role },
      select: { email: true }
    });
    
    console.log(`[Role Plugin] Assigned role ${role} to user ${userId}`);
    
    // If this is the first user (ADMIN), mark setup as complete
    if (role === "ADMIN") {
      markSetupComplete({
        siteName: "Node-Drop",
        adminEmail: updatedUser.email
      });
      console.log(`[Role Plugin] Setup marked as complete for admin ${updatedUser.email}`);
    }
    
    return role;
  } catch (error) {
    console.error("[Role Plugin] Error assigning role:", error);
    return "USER"; // Default to USER on error
  }
}

/**
 * Helper function to check if a user should be admin
 * Can be used for testing or manual role assignment
 */
export async function shouldBeAdmin(): Promise<boolean> {
  const userCount = await prisma.user.count();
  return userCount === 0;
}

/**
 * Helper function to get the appropriate role for a new user
 */
export async function getNewUserRole(): Promise<"ADMIN" | "USER"> {
  const isFirstUser = await shouldBeAdmin();
  return isFirstUser ? "ADMIN" : "USER";
}
