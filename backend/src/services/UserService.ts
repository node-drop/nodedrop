/**
 * UserService Factory
 * 
 * This file provides a factory function to switch between Prisma and Drizzle
 * implementations of the UserService based on the USE_DRIZZLE_USER_SERVICE
 * environment variable.
 * 
 * This allows for gradual migration from Prisma to Drizzle without breaking
 * existing code.
 */

import { UserServiceDrizzle } from './UserService.drizzle';
import { logger } from '../utils/logger';

// Type definitions for the service interface
export interface IUserService {
  createUser(data: any): Promise<any>;
  getUserById(id: string): Promise<any>;
  getUserByEmail(email: string): Promise<any>;
  getUserProfile(id: string): Promise<any>;
  getUserPreferences(id: string): Promise<any>;
  updateUserProfile(id: string, data: any): Promise<any>;
  updateUserPreferences(id: string, preferences: any): Promise<any>;
  mergeUserPreferences(id: string, newPreferences: any): Promise<any>;
  updateUserRole(id: string, role: string): Promise<any>;
  banUser(id: string, reason?: string, expiresAt?: Date): Promise<any>;
  unbanUser(id: string): Promise<any>;
  deactivateUser(id: string): Promise<any>;
  activateUser(id: string): Promise<any>;
  deleteUser(id: string): Promise<any>;
  userExistsByEmail(email: string): Promise<boolean>;
  userExistsById(id: string): Promise<boolean>;
  getAllUsers(options?: any): Promise<any[]>;
  updateEmailVerificationStatus(id: string, verified: boolean): Promise<any>;
  setDefaultWorkspace(id: string, workspaceId: string): Promise<any>;
}

/**
 * Get the appropriate UserService implementation based on environment variable
 */
function getUserService(): IUserService {
  const useDrizzle = process.env.USE_DRIZZLE_USER_SERVICE === 'true';

  if (useDrizzle) {
    logger.info('Using Drizzle UserService');
    return new UserServiceDrizzle();
  }

  // Fallback to Prisma implementation (not yet implemented)
  // For now, we'll use Drizzle as the default
  logger.info('Using Drizzle UserService (default)');
  return new UserServiceDrizzle();
}

/**
 * Export the service instance
 */
export const userService = getUserService();

// Re-export types from Drizzle implementation
export type {
  UserProfile,
  UserPreferences,
  UserFull,
} from './UserService.drizzle';

export { UserServiceDrizzle };
