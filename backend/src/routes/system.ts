import express from 'express';
import { exec } from 'child_process';
import { authenticateToken } from '../middleware/auth';

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

// Check for updates
router.get('/updates/check', authenticateToken, async (_req, res) => {
  try {
    // Check if running in Docker
    const isDocker = process.env.DOCKER_ENV === 'true' || process.env.NODE_ENV === 'production';
    
    if (!isDocker) {
      return res.json({
        updateAvailable: false,
        currentVersion: process.env.APP_VERSION || process.env.npm_package_version || '1.0.0-alpha',
        message: 'Updates are only available for Docker installations',
      });
    }

    try {
      // Get current version from environment (set during Docker build)
      const currentVersion = process.env.APP_VERSION || process.env.npm_package_version || '1.0.0-alpha';
      
      console.log('[Update Check] Current version:', currentVersion);
      console.log('[Update Check] APP_VERSION:', process.env.APP_VERSION);
      console.log('[Update Check] npm_package_version:', process.env.npm_package_version);
      
      // Check GitHub API for latest release
      const githubApiUrl = 'https://api.github.com/repos/node-drop/nodedrop/releases/latest';
      const response = await fetch(githubApiUrl, {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'NodeDrop-Update-Checker'
        }
      });
      
      if (!response.ok) {
        // No releases published yet
        if (response.status === 404) {
          return res.json({
            updateAvailable: false,
            currentVersion,
            message: 'You are running the latest version',
            note: 'No stable releases published yet. Running alpha version.',
          });
        }
        throw new Error(`GitHub API returned ${response.status}`);
      }
      
      const release = await response.json() as { tag_name?: string; name?: string };
      const latestVersion = release.tag_name?.replace(/^v/, '') || currentVersion;
      
      console.log('[Update Check] Latest version from GitHub:', latestVersion);
      console.log('[Update Check] Comparison result:', compareVersions(currentVersion, latestVersion));
      
      // Compare versions (including alpha/beta)
      const updateAvailable = latestVersion !== currentVersion && compareVersions(currentVersion, latestVersion) < 0;
      
      res.json({
        updateAvailable,
        currentVersion,
        latestVersion,
        message: updateAvailable 
          ? `A new version (${latestVersion}) is available` 
          : 'You are running the latest version',
      });
    } catch (checkError) {
      // If check fails, return graceful response
      console.warn('Could not check for updates:', checkError);
      res.json({
        updateAvailable: false,
        currentVersion: process.env.APP_VERSION || process.env.npm_package_version || '1.0.0-alpha',
        message: 'You are running the latest version',
      });
    }
  } catch (error: any) {
    console.error('Error checking for updates:', error);
    res.status(500).json({ error: 'Failed to check for updates' });
  }
});

// Trigger update (admin only)
router.post('/updates/install', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    const user = (req as any).user;
    if (user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Only administrators can update the system' });
    }

    // Check if running in Docker
    const isDocker = process.env.DOCKER_ENV === 'true' || process.env.NODE_ENV === 'production';
    
    if (!isDocker) {
      return res.status(400).json({ 
        error: 'Updates are only available for Docker installations',
        message: 'Please update manually using git pull and npm install'
      });
    }

    // Get container name and image
    const containerName = process.env.CONTAINER_NAME || 'node-drop';
    const imageName = process.env.IMAGE_NAME || 'ghcr.io/node-drop/nodedrop:latest';

    try {
      // Try to pull new image and restart container using Docker API
      // This requires Docker socket to be mounted
      const updateScript = `
        echo "Pulling latest image..." && \
        docker pull ${imageName} && \
        echo "Restarting container..." && \
        docker restart ${containerName}
      `;

      // Execute update in background
      exec(updateScript, (error, stdout, stderr) => {
        if (error) {
          console.error('Update error:', error);
          console.error('stderr:', stderr);
        } else {
          console.log('Update output:', stdout);
        }
      });

      res.json({
        success: true,
        message: 'Update started. The application will restart in a few moments.',
      });
    } catch (error) {
      console.error('Update failed:', error);
      res.status(500).json({ 
        error: 'Failed to start update',
        message: 'Docker socket may not be available. Please update manually or mount Docker socket.',
      });
    }
  } catch (error: any) {
    console.error('Error installing update:', error);
    res.status(500).json({ error: 'Failed to install update' });
  }
});

// Get system info
router.get('/info', authenticateToken, async (_req, res) => {
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

export default router;
