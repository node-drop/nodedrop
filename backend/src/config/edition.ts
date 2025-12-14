/**
 * Edition Configuration for Backend
 * 
 * Uses shared edition config from @nodedrop/types
 * Set via NODEDROP_EDITION environment variable
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

/**
 * Backend-specific edition config class
 * Extends the shared config with backend-specific functionality
 */
class EditionConfig implements IEditionConfig {
  private edition: Edition;
  private features: EditionFeatures;

  constructor() {
    this.edition = parseEdition(process.env.NODEDROP_EDITION);
    this.features = getEditionFeatures(this.edition);
  }

  getEdition(): Edition {
    return this.edition;
  }

  isCloud(): boolean {
    return this.edition === 'cloud';
  }

  isCommunity(): boolean {
    return this.edition === 'community';
  }

  getFeatures(): EditionFeatures {
    return this.features;
  }

  isFeatureEnabled(feature: keyof EditionFeatures): boolean {
    return this.features[feature];
  }

  /**
   * Check if a specific feature is available
   * Use this in routes/services to gate cloud-only features
   * Throws an error if the feature is not available
   */
  requireFeature(feature: keyof EditionFeatures): void {
    if (!this.features[feature]) {
      const error = new Error(
        `This feature requires NodeDrop Cloud. Learn more at https://nodedrop.io/pricing`
      );
      (error as any).statusCode = 403;
      (error as any).code = 'FEATURE_NOT_AVAILABLE';
      throw error;
    }
  }
}

export const editionConfig = new EditionConfig();

// Convenience exports
export const isCloud = () => editionConfig.isCloud();
export const isCommunity = () => editionConfig.isCommunity();
export const isFeatureEnabled = (feature: keyof EditionFeatures) => 
  editionConfig.isFeatureEnabled(feature);
export const requireFeature = (feature: keyof EditionFeatures) => 
  editionConfig.requireFeature(feature);
