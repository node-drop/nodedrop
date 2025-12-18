/**
 * CredentialService - Main Export
 * 
 * This file re-exports the Drizzle ORM implementation of CredentialService
 * for backward compatibility and cleaner imports.
 */

export { CredentialServiceDrizzle as CredentialService } from './CredentialService.drizzle';
export type { CredentialData, CredentialType, CredentialProperty, CredentialWithData } from './CredentialService.drizzle';
export { getCredentialService, credentialServiceDrizzle } from './CredentialService.factory';
export type { ICredentialService } from './CredentialService.factory';
