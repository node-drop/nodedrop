import express from 'express';
import { requireAuth, requireRole } from '../middleware/auth';

const router = express.Router();

// Helper function to compare semantic versions (including alpha/beta)
function compareVersions(v1: string, v2: string): number {
  // Parse version strings like "1.0.1-alpha" or "1.0.2-alpha"
  const parseVersion = (v: string) => {
    const match = v.match(/^(\d+)\.(\d+)\.(\d+)(?:-(.+))?$/);
    if (!match) return { major: 0, minor: 0, patch: 0, prerelease: '' };
    return {
      major: parseInt(match[1], 10),
      minor: parseInt(match[2], 10),
      patch: parseInt(match[3], 10),
      prerelease: match[4] || '',
    };
  };

  const ver1 = parseVersion(v1);
  const ver2 = parseVersion(v2);

  // Compare major.minor.patch
  if (ver1.major !== ver2.major) return ver1.major - ver2.major;
  if (ver1.minor !== ver2.minor) return ver1.minor - ver2.minor;
  if (ver1.patch !== ver2.patch) return ver1.patch - ver2.patch;

  // If versions are equal, compare prerelease
  // No prerelease (stable) > prerelease (alpha/beta)
  if (!ver1.prerelease && ver2.prerelease) return 1;
  if (ver1.prerelease && !ver2.prerelease) return -1;
  
  // Both have prerelease, compare alphabetically
  return ver1.prerelease.localeCompare(ver2.prerelease);
}

// Check for updates - DISABLED FOR SECURITY
// Self-updates via Docker socket have been disabled
router.get('/updates/check', requireAuth, async (_req, res) => {
  res.json({
    updateAvailable: false,
    currentVersion: process.env.APP_VERSION || process.env.npm_package_version || '1.0.0-alpha',
    message: 'Self-updates are disabled. Please update manually using docker-compose.',
    instructions: [
      'To update NodeDrop:',
      '1. docker-compose pull',
      '2. docker-compose up -d',
      '',
      'Or for separate workers:',
      '1. docker-compose -f docker-compose.yml -f docker-compose.workers.yml pull',
      '2. docker-compose -f docker-compose.yml -f docker-compose.workers.yml up -d'
    ]
  });
});

// Trigger update - DISABLED FOR SECURITY
// Self-updates via Docker socket have been disabled
router.post('/updates/install', requireAuth, requireRole(["admin"]), async (req, res) => {
  res.status(400).json({ 
    error: 'Self-updates are disabled',
    message: 'For security reasons, self-updates via Docker socket have been disabled.',
    instructions: [
      'To update NodeDrop manually:',
      '1. docker-compose pull',
      '2. docker-compose up -d',
      '',
      'The application will automatically restart with the new version.'
    ]
  });
});

// Get system info
router.get('/info', requireAuth, async (_req, res) => {
  try {
    const info = {
      version: process.env.APP_VERSION || process.env.npm_package_version || '1.0.0-alpha',
      gitSha: process.env.GIT_SHA || 'unknown',
      buildDate: process.env.BUILD_DATE || 'unknown',
      nodeVersion: process.version,
      platform: process.platform,
      uptime: process.uptime(),
      environment: process.env.NODE_ENV,
      isDocker: process.env.DOCKER_ENV === 'true' || process.env.NODE_ENV === 'production',
    };

    res.json(info);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get system info' });
  }
});

// Health check endpoint (public, no auth required)
// Used by frontend to detect when update is complete
router.get('/health', async (_req, res) => {
  try {
    res.json({
      status: 'ok',
      version: process.env.APP_VERSION || process.env.npm_package_version || '1.0.0-alpha',
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ status: 'error' });
  }
});

export default router;
