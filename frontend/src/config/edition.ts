/**
 * Edition Configuration for Frontend
 * 
 * Uses shared edition config from @nodedrop/types
 * 
 * Edition is determined by:
 * 1. VITE_NODEDROP_EDITION env var (build time)
 * 2. API response from /api/edition (runtime, cached)
 */

import {
  type Edition,
  type EditionFeatures,
  type IEditionConfig,
  parseEdition,
  getEditionFeatures,
  EDITION_FEATURES,
} from "@nodedrop/types";

// Re-export types for backward compatibility
export type { Edition, EditionFeatures };
export { EDITION_FEATURES };

// State
let currentEdition: Edition = parseEdition(import.meta.env.VITE_NODEDROP_EDITION);
let currentFeatures: EditionFeatures = getEditionFeatures(currentEdition);
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
        currentEdition = parseEdition(data.data.edition);
        currentFeatures = data.data.features || getEditionFeatures(currentEdition);
      }
    }
  } catch (error) {
    // Fallback to env var / default
    console.warn('Failed to fetch edition info, using default:', currentEdition);
  }
  
  initialized = true;
}

/**
 * Frontend edition config object
 * Implements IEditionConfig interface from shared package
 */
export const editionConfig: IEditionConfig & {
  isInitialized: () => boolean;
} = {
  getEdition: () => currentEdition,
  getFeatures: () => currentFeatures,
  isCloud: () => currentEdition === 'cloud',
  isCommunity: () => currentEdition === 'community',
  isFeatureEnabled: (feature: keyof EditionFeatures) => currentFeatures[feature],
  isInitialized: () => initialized,
};

// Hook for React components
export const useEdition = () => editionConfig;
