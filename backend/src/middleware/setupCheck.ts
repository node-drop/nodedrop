import { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';

const SETUP_COMPLETE_FILE = path.join(__dirname, '../../.setup-complete');

export const requireSetup = (req: Request, res: Response, next: NextFunction) => {
  // Skip setup check for setup routes
  if (req.path.startsWith('/api/setup')) {
    return next();
  }

  // Check if setup is complete
  const setupComplete = fs.existsSync(SETUP_COMPLETE_FILE);

  if (!setupComplete) {
    return res.status(503).json({
      error: 'Setup required',
      message: 'Please complete the initial setup',
      setupRequired: true,
    });
  }

  next();
};
