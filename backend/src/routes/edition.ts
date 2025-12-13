/**
 * Edition Routes
 * 
 * API endpoints for edition information
 */

import { Router, Request, Response } from "express";
import { editionConfig } from "../config/edition";

const router = Router();

/**
 * GET /api/edition
 * Get current edition information (public endpoint)
 */
router.get("/", (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      edition: editionConfig.getEdition(),
      features: editionConfig.getFeatures(),
    },
  });
});

export default router;
