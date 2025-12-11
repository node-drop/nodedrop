/**
 * Edition Configuration
 * 
 * Controls which features are available based on deployment type:
 * - "community" = Open source self-hosted (free, single workspace)
 * - "cloud" = NodeDrop Cloud SaaS (multi-tenant, paid plans)
 * 
 * Set via NODEDROP_EDITION environment variable
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

class EditionConfig {
  private edition: Edition;
  private features: EditionFeatures;

  constructor() {
    this.edition = (process.env.NODEDROP_EDITION as Edition) || 'community';
    this.features = EDITION_FEATURES[this.edition];
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
