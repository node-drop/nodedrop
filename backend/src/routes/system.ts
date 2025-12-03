import express from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();
const execAsync = promisify(exec);

// Check for updates
router.get('/updates/check', authenticateToken, async (req, res) => {
  try {
    // Check if running in Docker
    const isDocker = process.env.DOCKER_ENV === 'true' || process.env.NODE_ENV === 'production';
    
    if (!isDocker) {
      return res.json({
        updateAvailable: false,
        message: 'Updates are only available for Docker installations',
      });
    }

    try {
      // Get current container image digest
      const { stdout: currentImageId } = await execAsync('docker inspect --format="{{.Image}}" $(hostname)');
      const currentId = currentImageId.trim();
      
      // Get latest image digest from registry (without pulling)
      const { stdout: latestManifest } = await execAsync('docker manifest inspect ghcr.io/nodedrop/nodedrop:latest -v');
      const manifest = JSON.parse(latestManifest);
      const latestDigest = manifest.Descriptor?.digest || manifest[0]?.Descriptor?.digest;
      
      // Compare digests
      const updateAvailable = latestDigest && !currentId.includes(latestDigest);
      
      res.json({
        updateAvailable,
        currentVersion: process.env.npm_package_version || '1.0.1-beta',
        message: updateAvailable ? 'A new version is available' : 'You are running the latest version',
      });
    } catch (dockerError) {
      // If Docker commands fail, assume no update available
      console.warn('Could not check Docker image versions:', dockerError);
      res.json({
        updateAvailable: false,
        currentVersion: process.env.npm_package_version || '1.0.1-beta',
        message: 'Unable to check for updates at this time',
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
    exec(updateScript, { cwd: '/app' }, (error, stdout, stderr) => {
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
router.get('/info', authenticateToken, async (req, res) => {
  try {
    const info = {
      version: process.env.npm_package_version || '1.0.0',
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
