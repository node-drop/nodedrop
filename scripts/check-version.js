#!/usr/bin/env node

/**
 * Test script to check for available updates
 * This simulates what the backend does when checking for updates
 */

const https = require('https');
const packageJson = require('../package.json');

// Helper function to compare semantic versions (including alpha/beta)
function compareVersions(v1, v2) {
  // Parse version strings like "1.0.1-alpha" or "1.0.2-alpha"
  const parseVersion = (v) => {
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

async function checkForUpdates() {
  const currentVersion = packageJson.version;
  
  console.log('🔍 Checking for updates...\n');
  console.log(`📦 Current version: ${currentVersion}`);
  
  const options = {
    hostname: 'api.github.com',
    path: '/repos/node-drop/nodedrop/releases/latest',
    method: 'GET',
    headers: {
      'User-Agent': 'NodeDrop-Update-Checker',
      'Accept': 'application/vnd.github.v3+json'
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode === 404) {
          console.log('⚠️  No releases published yet on GitHub');
          console.log('ℹ️  Running alpha/development version');
          resolve({ updateAvailable: false, currentVersion, latestVersion: currentVersion });
          return;
        }

        if (res.statusCode !== 200) {
          console.error(`❌ GitHub API returned status ${res.statusCode}`);
          reject(new Error(`HTTP ${res.statusCode}`));
          return;
        }

        try {
          const release = JSON.parse(data);
          const latestVersion = release.tag_name?.replace(/^v/, '') || currentVersion;
          
          console.log(`🌐 Latest version: ${latestVersion}`);
          
          const comparison = compareVersions(currentVersion, latestVersion);
          const updateAvailable = latestVersion !== currentVersion && comparison < 0;
          
          console.log('\n📊 Comparison result:');
          if (comparison < 0) {
            console.log(`   ${currentVersion} < ${latestVersion} (update available)`);
          } else if (comparison > 0) {
            console.log(`   ${currentVersion} > ${latestVersion} (you're ahead)`);
          } else {
            console.log(`   ${currentVersion} = ${latestVersion} (up to date)`);
          }
          
          if (updateAvailable) {
            console.log('\n✅ Update available!');
            console.log(`   You can update from ${currentVersion} to ${latestVersion}`);
            console.log(`\n📥 To update:`);
            console.log(`   docker pull ghcr.io/node-drop/nodedrop:${latestVersion}`);
            console.log(`   or`);
            console.log(`   docker pull ghcr.io/node-drop/nodedrop:latest`);
          } else {
            console.log('\n✅ You are running the latest version');
          }
          
          resolve({ updateAvailable, currentVersion, latestVersion });
        } catch (error) {
          console.error('❌ Failed to parse GitHub API response');
          reject(error);
        }
      });
    });

    req.on('error', (error) => {
      console.error('❌ Network error:', error.message);
      reject(error);
    });

    req.end();
  });
}

// Run the check
checkForUpdates()
  .then(() => {
    console.log('\n✨ Check complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Check failed:', error.message);
    process.exit(1);
  });
