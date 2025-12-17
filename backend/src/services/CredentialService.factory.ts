/**
 * CredentialService Factory
 *
 * This file provides a factory function to switch between Prisma and Drizzle
 * implementations of the CredentialService based on the USE_DRIZZLE_CREDENTIAL_SERVICE
 * environment variable.
 *
 * This allows for gradual migration from Prisma to Drizzle without breaking
 * existing code.
 */

import { CredentialServiceDrizzle } from './CredentialService.drizzle';
import { logger } from '../utils/logger';

// Type definitions for the service interface
export interface ICredentialService {
  registerCoreCredentials(): void;
  registerCredentialType(credentialType: any): void;
  unregisterCredentialType(credentialTypeName: string): void;
  createCredential(
    userId: string,
    name: string,
    type: string,
    data: any,
    expiresAt?: Date,
    options?: any
  ): Promise<any>;
  getCredential(id: string, userId: string): Promise<any>;
  getCredentialById(id: string): Promise<any>;
  getCredentials(userId: string, type?: string, options?: any): Promise<any>;
  updateCredential(id: string, userId: string, updates: any): Promise<any>;
  deleteCredential(id: string, userId: string): Promise<void>;
  getCredentialForExecution(credentialId: string, userId: string): Promise<any>;
  testCredential(type: string, data: any): Promise<any>;
  getExpiringCredentials(userId: string, warningDays?: number): Promise<any>;
  rotateCredential(id: string, userId: string, newData: any): Promise<any>;
  getCredentialTypes(): any[];
  getCredentialType(type: string): any;
  shareCredential(
    credentialId: string,
    ownerUserId: string,
    shareWithUserId: string,
    permission?: string,
    sharedByUserId?: string
  ): Promise<any>;
  shareCredentialWithTeam(
    credentialId: string,
    ownerUserId: string,
    teamId: string,
    permission?: string,
    sharedByUserId?: string
  ): Promise<any>;
  unshareCredential(
    credentialId: string,
    ownerUserId: string,
    shareWithUserId: string
  ): Promise<void>;
  unshareCredentialFromTeam(
    credentialId: string,
    ownerUserId: string,
    teamId: string
  ): Promise<void>;
  getCredentialShares(credentialId: string, ownerUserId: string): Promise<any>;
  updateSharePermission(
    credentialId: string,
    ownerUserId: string,
    shareWithUserId: string,
    newPermission: string
  ): Promise<any>;
  updateTeamSharePermission(
    credentialId: string,
    ownerUserId: string,
    teamId: string,
    newPermission: string
  ): Promise<any>;
  getSharedCredentials(userId: string): Promise<any>;
}

/**
 * Get the appropriate CredentialService implementation based on environment variable
 */
export function getCredentialService(): ICredentialService {
  const useDrizzle = process.env.USE_DRIZZLE_CREDENTIAL_SERVICE === 'true';

  if (useDrizzle) {
    logger.info('Using Drizzle CredentialService');
    return new CredentialServiceDrizzle();
  }

  // Fallback to Prisma implementation (not yet implemented)
  // For now, we'll use Drizzle as the default
  logger.info('Using Drizzle CredentialService (default)');
  return new CredentialServiceDrizzle();
}

/**
 * Export the service instance
 */
export const credentialServiceDrizzle = getCredentialService();

// Re-export types from Drizzle implementation
export { CredentialServiceDrizzle };
