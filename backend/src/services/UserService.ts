/**
 * UserService Factory
 * 
 * This file provides the UserService implementation using Drizzle ORM.
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
 * Get the UserService implementation (Drizzle ORM)
 */
function getUserService(): IUserService {
  logger.debug('Initializing Drizzle UserService');
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
