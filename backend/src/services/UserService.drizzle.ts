import { eq, and } from 'drizzle-orm';
import { db } from '../db/client';
import { users } from '../db/schema/auth';
import { logger } from '../utils/logger';
import { sessions } from '../db/schema/auth';

/**
 * User data types matching Prisma return types
 */
export interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  role: string;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export interface UserPreferences {
  id: string;
  preferences: Record<string, any> | null;
}

export interface UserFull {
  id: string;
  email: string;
  emailVerified: boolean;
  name: string | null;
  image: string | null;
  role: string;
  banned: boolean;
  banReason: string | null;
  banExpires: Date | null;
  active: boolean;
  preferences: Record<string, any> | null;
  defaultWorkspaceId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * UserService with Drizzle ORM
 * Provides database operations for user management
 */
export class UserServiceDrizzle {
  /**
   * Create a new user
   */
  async createUser(data: {
    id: string;
    email: string;
    name?: string | null;
    image?: string | null;
    role?: string;
    preferences?: Record<string, any>;
  }): Promise<UserFull> {
    try {
      const result = await db
        .insert(users)
        .values({
          id: data.id,
          email: data.email,
          name: data.name || null,
          image: data.image || null,
          role: data.role || 'user',
          preferences: data.preferences || {},
        })
        .returning();

      if (!result[0]) {
        throw new Error('Failed to create user');
      }

      return this.mapUserToFull(result[0]);
    } catch (error) {
      logger.error('Error creating user:', error);
      throw error;
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(id: string): Promise<UserFull | null> {
    try {
      const result = await db.query.users.findFirst({
        where: eq(users.id, id),
      });

      return result ? this.mapUserToFull(result) : null;
    } catch (error) {
      logger.error('Error getting user by ID:', error);
      throw error;
    }
  }

  /**
   * Get user by email
   */
  async getUserByEmail(email: string): Promise<UserFull | null> {
    try {
      const result = await db.query.users.findFirst({
        where: eq(users.email, email),
      });

      return result ? this.mapUserToFull(result) : null;
    } catch (error) {
      logger.error('Error getting user by email:', error);
      throw error;
    }
  }

  /**
   * Get user profile (limited fields)
   */
  async getUserProfile(id: string): Promise<UserProfile | null> {
    try {
      const result = await db.query.users.findFirst({
        where: eq(users.id, id),
      });

      if (!result) {
        return null;
      }

      return {
        id: result.id,
        email: result.email || '',
        name: result.name || null,
        role: result.role || 'user',
        createdAt: result.createdAt || null,
        updatedAt: result.updatedAt || null,
      };
    } catch (error) {
      logger.error('Error getting user profile:', error);
      throw error;
    }
  }

  /**
   * Get user preferences
   */
  async getUserPreferences(id: string): Promise<UserPreferences | null> {
    try {
      const result = await db.query.users.findFirst({
        where: eq(users.id, id),
      });

      if (!result) {
        return null;
      }

      return {
        id: result.id,
        preferences: result.preferences as Record<string, any> | null,
      };
    } catch (error) {
      logger.error('Error getting user preferences:', error);
      throw error;
    }
  }

  /**
   * Update user profile
   */
  async updateUserProfile(
    id: string,
    data: {
      name?: string | null;
      email?: string;
    }
  ): Promise<UserProfile | null> {
    try {
      const updateData: any = {};
      if (data.name !== undefined) updateData.name = data.name;
      if (data.email !== undefined) updateData.email = data.email;
      updateData.updatedAt = new Date();

      const result = await db
        .update(users)
        .set(updateData)
        .where(eq(users.id, id))
        .returning();

      if (!result[0]) {
        return null;
      }

      return {
        id: result[0].id,
        email: result[0].email || '',
        name: result[0].name || null,
        role: result[0].role || 'user',
        createdAt: result[0].createdAt || null,
        updatedAt: result[0].updatedAt || null,
      };
    } catch (error) {
      logger.error('Error updating user profile:', error);
      throw error;
    }
  }

  /**
   * Update user preferences
   */
  async updateUserPreferences(
    id: string,
    preferences: Record<string, any>
  ): Promise<UserPreferences | null> {
    try {
      const result = await db
        .update(users)
        .set({
          preferences,
          updatedAt: new Date(),
        })
        .where(eq(users.id, id))
        .returning();

      if (!result[0]) {
        return null;
      }

      return {
        id: result[0].id,
        preferences: result[0].preferences as Record<string, any> | null,
      };
    } catch (error) {
      logger.error('Error updating user preferences:', error);
      throw error;
    }
  }

  /**
   * Merge user preferences (partial update)
   */
  async mergeUserPreferences(
    id: string,
    newPreferences: Record<string, any>
  ): Promise<UserPreferences | null> {
    try {
      // Get current preferences
      const currentUser = await db.query.users.findFirst({
        where: eq(users.id, id),
      });

      if (!currentUser) {
        return null;
      }

      const currentPrefs = (currentUser.preferences as any) || {};

      // Merge preferences with deep merge for nested objects
      const mergedPreferences = {
        ...currentPrefs,
        ...newPreferences,
        // Deep merge for nested objects like canvas settings
        canvas: {
          ...(currentPrefs.canvas || {}),
          ...(newPreferences.canvas || {}),
        },
        // pinnedNodes is a simple array, so direct replacement is fine
        ...(newPreferences.pinnedNodes !== undefined && {
          pinnedNodes: newPreferences.pinnedNodes,
        }),
      };

      const result = await db
        .update(users)
        .set({
          preferences: mergedPreferences,
          updatedAt: new Date(),
        })
        .where(eq(users.id, id))
        .returning();

      if (!result[0]) {
        return null;
      }

      return {
        id: result[0].id,
        preferences: result[0].preferences as Record<string, any> | null,
      };
    } catch (error) {
      logger.error('Error merging user preferences:', error);
      throw error;
    }
  }

  /**
   * Update user role
   */
  async updateUserRole(id: string, role: string): Promise<UserFull | null> {
    try {
      const result = await db
        .update(users)
        .set({
          role,
          updatedAt: new Date(),
        })
        .where(eq(users.id, id))
        .returning();

      if (!result[0]) {
        return null;
      }

      return this.mapUserToFull(result[0]);
    } catch (error) {
      logger.error('Error updating user role:', error);
      throw error;
    }
  }

  /**
   * Ban a user
   */
  async banUser(
    id: string,
    reason?: string,
    expiresAt?: Date
  ): Promise<UserFull | null> {
    try {
      const result = await db
        .update(users)
        .set({
          banned: true,
          banReason: reason || null,
          banExpires: expiresAt || null,
          updatedAt: new Date(),
        })
        .where(eq(users.id, id))
        .returning();

      if (!result[0]) {
        return null;
      }

      return this.mapUserToFull(result[0]);
    } catch (error) {
      logger.error('Error banning user:', error);
      throw error;
    }
  }

  /**
   * Unban a user
   */
  async unbanUser(id: string): Promise<UserFull | null> {
    try {
      const result = await db
        .update(users)
        .set({
          banned: false,
          banReason: null,
          banExpires: null,
          updatedAt: new Date(),
        })
        .where(eq(users.id, id))
        .returning();

      if (!result[0]) {
        return null;
      }

      return this.mapUserToFull(result[0]);
    } catch (error) {
      logger.error('Error unbanning user:', error);
      throw error;
    }
  }

  /**
   * Deactivate a user
   */
  async deactivateUser(id: string): Promise<UserFull | null> {
    try {
      const result = await db
        .update(users)
        .set({
          active: false,
          updatedAt: new Date(),
        })
        .where(eq(users.id, id))
        .returning();

      if (!result[0]) {
        return null;
      }

      return this.mapUserToFull(result[0]);
    } catch (error) {
      logger.error('Error deactivating user:', error);
      throw error;
    }
  }

  /**
   * Activate a user
   */
  async activateUser(id: string): Promise<UserFull | null> {
    try {
      const result = await db
        .update(users)
        .set({
          active: true,
          updatedAt: new Date(),
        })
        .where(eq(users.id, id))
        .returning();

      if (!result[0]) {
        return null;
      }

      return this.mapUserToFull(result[0]);
    } catch (error) {
      logger.error('Error activating user:', error);
      throw error;
    }
  }

  /**
   * Delete a user
   */
  async deleteUser(id: string): Promise<boolean> {
    try {
      const result = await db.delete(users).where(eq(users.id, id));

      return (result.rowCount ?? 0) > 0;
    } catch (error) {
      logger.error('Error deleting user:', error);
      throw error;
    }
  }

  /**
   * Check if user exists by email
   */
  async userExistsByEmail(email: string): Promise<boolean> {
    try {
      const result = await db.query.users.findFirst({
        where: eq(users.email, email),
      });

      return !!result;
    } catch (error) {
      logger.error('Error checking if user exists by email:', error);
      throw error;
    }
  }

  /**
   * Check if user exists by ID
   */
  async userExistsById(id: string): Promise<boolean> {
    try {
      const result = await db.query.users.findFirst({
        where: eq(users.id, id),
      });

      return !!result;
    } catch (error) {
      logger.error('Error checking if user exists by ID:', error);
      throw error;
    }
  }

  /**
   * Get all users (with optional filtering)
   */
  async getAllUsers(options?: {
    limit?: number;
    offset?: number;
    active?: boolean;
  }): Promise<UserFull[]> {
    try {
      let query = db.query.users.findMany();

      if (options?.limit) {
        query = db.query.users.findMany({
          limit: options.limit,
          offset: options.offset || 0,
        });
      }

      const results = await query;

      return results.map((user) => this.mapUserToFull(user));
    } catch (error) {
      logger.error('Error getting all users:', error);
      throw error;
    }
  }

  /**
   * Get first user by role
   */
  async getFirstUserByRole(role: string): Promise<UserFull | null> {
    try {
      const result = await db.query.users.findFirst({
        where: eq(users.role, role),
      });

      return result ? this.mapUserToFull(result) : null;
    } catch (error) {
      logger.error('Error getting first user by role:', error);
      throw error;
    }
  }

  /**
   * Delete all sessions for a user
   */
  async deleteUserSessions(userId: string): Promise<number> {
    try {
      const result = await db
        .delete(sessions)
        .where(eq(sessions.userId, userId));

      return result.rowCount ?? 0;
    } catch (error) {
      logger.error('Error deleting user sessions:', error);
      throw error;
    }
  }

  /**
   * Update user email verification status
   */
  async updateEmailVerificationStatus(
    id: string,
    verified: boolean
  ): Promise<UserFull | null> {
    try {
      const result = await db
        .update(users)
        .set({
          emailVerified: verified,
          updatedAt: new Date(),
        })
        .where(eq(users.id, id))
        .returning();

      if (!result[0]) {
        return null;
      }

      return this.mapUserToFull(result[0]);
    } catch (error) {
      logger.error('Error updating email verification status:', error);
      throw error;
    }
  }

  /**
   * Set default workspace for user
   */
  async setDefaultWorkspace(
    id: string,
    workspaceId: string
  ): Promise<UserFull | null> {
    try {
      const result = await db
        .update(users)
        .set({
          defaultWorkspaceId: workspaceId,
          updatedAt: new Date(),
        })
        .where(eq(users.id, id))
        .returning();

      if (!result[0]) {
        return null;
      }

      return this.mapUserToFull(result[0]);
    } catch (error) {
      logger.error('Error setting default workspace:', error);
      throw error;
    }
  }

  /**
   * Search for users by email or name
   */
  async searchUsers(
    query: string,
    options?: {
      limit?: number;
      excludeUserId?: string;
    }
  ): Promise<UserProfile[]> {
    try {
      const { ilike, or, ne } = await import('drizzle-orm');
      
      const conditions = [
        or(
          ilike(users.email, `%${query}%`),
          ilike(users.name, `%${query}%`)
        ),
        eq(users.active, true),
      ];

      if (options?.excludeUserId) {
        conditions.push(ne(users.id, options.excludeUserId));
      }

      const results = await db.query.users.findMany({
        where: and(...conditions),
        limit: options?.limit || 10,
        orderBy: (u) => u.email,
      });

      return results.map((user) => ({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role || 'user',
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      }));
    } catch (error) {
      logger.error('Error searching users:', error);
      throw error;
    }
  }

  /**
   * Find user by exact email
   */
  async findUserByEmail(email: string): Promise<UserProfile | null> {
    try {
      const result = await db.query.users.findFirst({
        where: and(eq(users.email, email), eq(users.active, true)),
      });

      if (!result) {
        return null;
      }

      return {
        id: result.id,
        email: result.email,
        name: result.name,
        role: result.role || 'user',
        createdAt: result.createdAt,
        updatedAt: result.updatedAt,
      };
    } catch (error) {
      logger.error('Error finding user by email:', error);
      throw error;
    }
  }

  /**
   * Helper method to map database user to UserFull type
   */
  private mapUserToFull(user: any): UserFull {
    return {
      id: user.id,
      email: user.email,
      emailVerified: user.emailVerified || false,
      name: user.name || null,
      image: user.image || null,
      role: user.role || 'user',
      banned: user.banned || false,
      banReason: user.banReason || null,
      banExpires: user.banExpires || null,
      active: user.active !== false,
      preferences: user.preferences as Record<string, any> | null,
      defaultWorkspaceId: user.defaultWorkspaceId || null,
      createdAt: user.createdAt || new Date(),
      updatedAt: user.updatedAt || new Date(),
    };
  }
}

/**
 * Export singleton instance
 */
export const userServiceDrizzle = new UserServiceDrizzle();
