/**
 * Edition Middleware
 * 
 * Middleware to gate routes based on edition features
 */

import { Request, Response, NextFunction } from 'express';
import { editionConfig, EditionFeatures } from '../config/edition';

/**
 * Middleware that requires a specific feature to be enabled
 * Returns 403 if feature is not available in current edition
 */
export const requireEditionFeature = (feature: keyof EditionFeatures) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!editionConfig.isFeatureEnabled(feature)) {
      return res.status(403).json({
        error: 'Feature not available',
        code: 'FEATURE_NOT_AVAILABLE',
        feature,
        message: `This feature requires NodeDrop Cloud. Learn more at https://nodedrop.io/pricing`,
        edition: editionConfig.getEdition(),
      });
    }
    next();
  };
};

/**
 * Middleware that only allows cloud edition
 */
export const requireCloud = requireEditionFeature('multiWorkspace');

/**
 * Middleware that attaches edition info to request
 */
export const attachEditionInfo = (req: Request, res: Response, next: NextFunction) => {
  (req as any).edition = {
    name: editionConfig.getEdition(),
    features: editionConfig.getFeatures(),
  };
  next();
};
