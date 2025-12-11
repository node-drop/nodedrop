/**
 * Edition Configuration for Frontend
 * 
 * Controls UI visibility based on deployment type:
 * - "community" = Open source self-hosted (free, single workspace)
 * - "cloud" = NodeDrop Cloud SaaS (multi-tenant, paid plans)
 * 
 * Edition is determined by:
 * 1. VITE_NODEDROP_EDITION env var (build time)
 * 2. API response from /api/edition (runtime, cached)
 */

export type Edition = 'community' | 'cloud';

export interface EditionFeatures {
  multiWorkspace: boolean;
  teamCollaboration: boolean;
  memberInvitations: boolean;
  planLimits: boolean;
  billing: boolean;
  sso: boolean;
  auditLogs: boolean;
  customBranding: boolean;
}

const EDITION_FEATURES: Record<Edition, EditionFeatures> = {
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

// Default to env var or community
let currentEdition: Edition = (import.meta.env.VITE_NODEDROP_EDITION as Edition) || 'community';
let currentFeatures: EditionFeatures = EDITION_FEATURES[currentEdition];
let initialized = false;

/**
 * Initialize edition from API (call once at app startup)
 */
export async function initializeEdition(): Promise<void> {
  if (initialized) return;
  
  try {
    const response = await fetch('/api/edition');
    if (response.ok) {
      const data = await response.json();
      if (data.success && data.data) {
        currentEdition = data.data.edition;
        currentFeatures = data.data.features;
      }
    }
  } catch (error) {
    // Fallback to env var / default
    console.warn('Failed to fetch edition info, using default:', currentEdition);
  }
  
  initialized = true;
}

export const editionConfig = {
  getEdition: () => currentEdition,
  getFeatures: () => currentFeatures,
  isCloud: () => currentEdition === 'cloud',
  isCommunity: () => currentEdition === 'community',
  isFeatureEnabled: (feature: keyof EditionFeatures) => currentFeatures[feature],
  isInitialized: () => initialized,
};

// Hook for React components
export const useEdition = () => editionConfig;
