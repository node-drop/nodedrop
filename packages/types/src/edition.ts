/**
 * @nodedrop/types - Edition Configuration
 * 
 * Shared edition configuration for NodeDrop.
 * Controls which features are available based on deployment type:
 * - "community" = Open source self-hosted (free, single workspace)
 * - "cloud" = NodeDrop Cloud SaaS (multi-tenant, paid plans)
 */

// =============================================================================
// Types
// =============================================================================

/**
 * Available editions of NodeDrop
 */
export type Edition = 'community' | 'cloud';

/**
 * Feature flags controlled by edition
 */
export interface EditionFeatures {
  /** Allow multiple workspaces per user */
  multiWorkspace: boolean;
  /** Enable team collaboration features */
  teamCollaboration: boolean;
  /** Allow inviting members to workspaces */
  memberInvitations: boolean;
  /** Enforce plan-based limits */
  planLimits: boolean;
  /** Enable billing and subscription management */
  billing: boolean;
  /** Enable SSO authentication */
  sso: boolean;
  /** Enable audit logging */
  auditLogs: boolean;
  /** Enable custom branding */
  customBranding: boolean;
}

// =============================================================================
// Feature Configuration
// =============================================================================

/**
 * Feature configuration for each edition
 */
export const EDITION_FEATURES: Record<Edition, EditionFeatures> = {
  community: {
    multiWorkspace: false,
    teamCollaboration: false,
    memberInvitations: false,
    planLimits: false,
    billing: false,
    sso: false,
    auditLogs: false,
    customBranding: false,
  },
  cloud: {
    multiWorkspace: true,
    teamCollaboration: true,
    memberInvitations: true,
    planLimits: true,
    billing: true,
    sso: true,
    auditLogs: true,
    customBranding: true,
  },
};

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Check if a string is a valid edition
 */
export function isValidEdition(value: string | undefined): value is Edition {
  return value === 'community' || value === 'cloud';
}

/**
 * Get features for an edition
 */
export function getEditionFeatures(edition: Edition): EditionFeatures {
  return EDITION_FEATURES[edition];
}

/**
 * Get the default edition (community)
 */
export function getDefaultEdition(): Edition {
  return 'community';
}

/**
 * Parse edition from string, returning default if invalid
 */
export function parseEdition(value: string | undefined): Edition {
  return isValidEdition(value) ? value : getDefaultEdition();
}

// =============================================================================
// Edition Config Interface
// =============================================================================

/**
 * Interface for edition configuration instances
 * Both frontend and backend implement this interface
 */
export interface IEditionConfig {
  getEdition(): Edition;
  getFeatures(): EditionFeatures;
  isCloud(): boolean;
  isCommunity(): boolean;
  isFeatureEnabled(feature: keyof EditionFeatures): boolean;
}

/**
 * Create a base edition config object
 * Can be extended by frontend/backend with environment-specific initialization
 */
export function createEditionConfig(edition: Edition): IEditionConfig {
  const features = getEditionFeatures(edition);
  
  return {
    getEdition: () => edition,
    getFeatures: () => features,
    isCloud: () => edition === 'cloud',
    isCommunity: () => edition === 'community',
    isFeatureEnabled: (feature: keyof EditionFeatures) => features[feature],
  };
}
