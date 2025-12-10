import express from 'express';
import { spawn } from 'child_process';
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

// Check for updates
router.get('/updates/check', requireAuth, async (_req, res) => {
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
      console.log('[Update Check] Fetching from:', githubApiUrl);
      
      const response = await fetch(githubApiUrl, {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'NodeDrop-Update-Checker'
        }
      });
      
      console.log('[Update Check] GitHub API status:', response.status);
      
      if (!response.ok) {
        // No releases published yet
        if (response.status === 404) {
          console.log('[Update Check] No releases found (404)');
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
router.post('/updates/install', requireAuth, requireRole(["ADMIN"]), async (req, res) => {
  try {

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
      // Get installation directory from environment
      // INSTALL_DIR should be the path inside the container where docker-compose.yml is mounted
      const installDir = process.env.INSTALL_DIR;
      
      if (!installDir) {
        return res.status(400).json({
          error: 'Update not configured',
          message: 'INSTALL_DIR environment variable not set. Please use manual update method.',
          manualCommand: `docker pull ${imageName} && docker stop ${containerName} && docker rm ${containerName} && docker run ...`
        });
      }

      console.log('[Update] Starting update process...');
      console.log('[Update] Install Dir:', installDir);
      console.log('[Update] Container Name:', containerName);
      console.log('[Update] Image Name:', imageName);

      // CRITICAL: Send response BEFORE starting update
      // This ensures the user gets feedback before container is killed
      res.json({
        success: true,
        message: 'Update started. The application will restart in a few moments.',
        note: 'Please refresh your browser after 30-60 seconds',
        estimatedTime: '30-60 seconds'
      });

      // Wait for response to be fully sent, then trigger update
      // This solves the "self-update paradox":
      // 1. Response is sent to user
      // 2. After delay, we spawn a detached process
      // 3. The detached process runs on the HOST (via Docker socket)
      // 4. Even when this container dies, the HOST process continues
      // 5. Docker Compose recreates the container with new image
      setTimeout(() => {
        console.log('[Update] Executing update command...');
        
        // Try docker-compose first (v1), fall back to docker compose (v2)
        // Build the update command - properly stop containers first to avoid name conflicts
        // Then pull new image and start with fresh containers
        const updateCommand = `docker pull ${imageName} && (docker-compose -f ${installDir}/docker-compose.yml down && docker-compose -f ${installDir}/docker-compose.yml up -d || docker compose -f ${installDir}/docker-compose.yml down && docker compose -f ${installDir}/docker-compose.yml up -d)`;
        console.log('[Update] Command:', updateCommand);
        
        // Use spawn with detached mode for better reliability
        // This ensures the process continues even if parent (this container) dies
        const updateProcess = spawn('/bin/sh', ['-c', updateCommand], {
          detached: true,
          stdio: ['ignore', 'ignore', 'pipe'] // Capture stderr for logging
        });
        
        // Log any errors
        if (updateProcess.stderr) {
          updateProcess.stderr.on('data', (data) => {
            console.error('[Update] stderr:', data.toString());
          });
        }
        
        // Unref so this process doesn't keep the container alive
        updateProcess.unref();
        
        console.log('[Update] Update process spawned (PID:', updateProcess.pid, ')');
        console.log('[Update] Container will restart shortly...');
      }, 3000); // 3 second delay to ensure response is fully sent

    } catch (error) {
      console.error('Update failed:', error);
      
      // Only send response if not already sent
      if (!res.headersSent) {
        res.status(500).json({ 
          error: 'Failed to start update',
          message: 'In-app updates require Docker socket access with write permissions.',
          instructions: [
            'Ensure docker-compose.yml has:',
            'volumes:',
            '  - /var/run/docker.sock:/var/run/docker.sock',
            '',
            'And container is NOT running with user restrictions',
            'Then restart: docker-compose down && docker-compose up -d'
          ]
        });
      }
    }
  } catch (error: any) {
    console.error('Error installing update:', error);
    res.status(500).json({ error: 'Failed to install update' });
  }
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
