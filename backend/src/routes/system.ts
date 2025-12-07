import express from 'express';
import { exec } from 'child_process';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

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
      
      // Simple version comparison (works for semver)
      const updateAvailable = latestVersion !== currentVersion && !currentVersion.includes('alpha') && !currentVersion.includes('beta');
      
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

    // Trigger update script
    // This will pull new image and restart the container
    const updateScript = `
      docker-compose pull nodedrop && \
      docker-compose up -d nodedrop
    `;

    // Execute in background
    exec(updateScript, { cwd: '/app' }, (error, _stdout, _stderr) => {
      if (error) {
        console.error('Update error:', error);
      }
    });

    res.json({
      success: true,
      message: 'Update started. The application will restart in a few moments.',
    });
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
