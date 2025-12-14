#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Professional logging utilities
const log = {
  header: (msg) => console.log(`\n${'='.repeat(60)}\n${msg}\n${'='.repeat(60)}\n`),
  section: (msg) => console.log(`\n${msg}`),
  success: (msg) => console.log(`✓ ${msg}`),
  error: (msg) => console.error(`✗ ${msg}`),
  warning: (msg) => console.log(`⚠  ${msg}`),
  info: (msg) => console.log(`ℹ  ${msg}`),
  step: (num, total, msg) => console.log(`\n[${num}/${total}] ${msg}`),
  divider: () => console.log(`${'─'.repeat(60)}`),
  blank: () => console.log('')
};

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

function exec(command, options = {}) {
  try {
    return execSync(command, { stdio: 'inherit', ...options });
  } catch (error) {
    log.error(`Failed to execute command: ${command}`);
    throw error;
  }
}

function generateRandomString(length = 32) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

async function main() {
  log.header('🚀 Node-Drop Installation Wizard');
  log.info('This wizard will guide you through the installation process');
  log.blank();

  // Check if Docker is installed
  log.step(1, 5, 'Verifying system requirements');
  try {
    execSync('docker --version', { stdio: 'pipe' });
    log.success('Docker is installed');
  } catch (error) {
    log.error('Docker is not installed');
    log.info('Please install Docker from: https://docs.docker.com/get-docker/');
    log.blank();
    process.exit(1);
  }

  // Check if Docker is running
  try {
    execSync('docker info', { stdio: 'pipe' });
    log.success('Docker is running');
  } catch (error) {
    log.error('Docker is not running');
    log.info('Please start Docker Desktop or the Docker daemon');
    log.blank();
    process.exit(1);
  }

  // Check if Docker Compose is installed
  try {
    execSync('docker-compose --version', { stdio: 'pipe' });
    log.success('Docker Compose is installed');
  } catch (error) {
    log.error('Docker Compose is not installed');
    log.info('Please install Docker Compose from: https://docs.docker.com/compose/install/');
    log.blank();
    process.exit(1);
  }

  // Check for existing containers
  let existingComposePath = null;
  let existingSuffix = null;
  try {
    const existingContainers = execSync('docker ps -a --filter "name=nodedrop" --format "{{.Names}}"', { encoding: 'utf8' });
    if (existingContainers.trim()) {
      log.blank();
      log.warning('Found existing Node-Drop containers:');
      console.log(existingContainers);
      
      // Try to find the existing docker-compose.yml to extract the suffix
      const os = require('os');
      const homeDir = os.homedir();
      const defaultDir = path.join(homeDir, 'nodedrop');
      const possibleComposePath = path.join(defaultDir, 'docker-compose.yml');
      
      if (fs.existsSync(possibleComposePath)) {
        existingComposePath = possibleComposePath;
        const composeContent = fs.readFileSync(possibleComposePath, 'utf8');
        const suffixMatch = composeContent.match(/nodedrop-postgres-([a-z0-9]+)/);
        if (suffixMatch) {
          existingSuffix = suffixMatch[1];
          log.info(`Found existing installation with suffix: ${existingSuffix}`);
        }
      }
      
      const cleanup = await question('Do you want to remove them and start fresh? (y/n) [y]: ') || 'y';
      if (cleanup.toLowerCase() === 'y') {
        log.section('Cleaning up existing containers...');
        // Use docker-compose down if we found the compose file, otherwise force remove
        if (existingComposePath) {
          try {
            execSync(`docker-compose -f "${existingComposePath}" down`, { stdio: 'inherit' });
            log.success('Stopped and removed containers using docker-compose');
          } catch (e) {
            log.warning('docker-compose down failed, attempting force removal...');
            execSync('docker rm -f $(docker ps -a --filter "name=nodedrop" -q) 2>nul || true', { stdio: 'inherit' });
          }
        } else {
          execSync('docker rm -f $(docker ps -a --filter "name=nodedrop" -q) 2>nul || true', { stdio: 'inherit' });
        }
        log.success('Cleanup complete');
      }
    }
  } catch (error) {
    // Ignore errors checking for containers
  }

  // Ask for installation directory (use home directory by default)
  log.step(2, 5, 'Configuration setup');
  const os = require('os');
  const homeDir = os.homedir();
  const defaultDir = path.join(homeDir, 'nodedrop');
  const installDirInput = await question(`Installation directory [${defaultDir}]: `) || defaultDir;
  const installDir = path.resolve(installDirInput);

  // Create directory if it doesn't exist
  if (!fs.existsSync(installDir)) {
    fs.mkdirSync(installDir, { recursive: true });
    log.success(`Created directory: ${installDir}`);
  }

  // Ask for port
  const defaultPort = '5678';
  const port = await question(`Port to run Node-Drop [${defaultPort}]: `) || defaultPort;

  // Ask for domain (optional)
  const domain = await question(`Domain name (optional, e.g., nodedrop.example.com): `) || '';

  // Ask for database password
  const defaultDbPassword = generateRandomString(16);
  const dbPassword = await question(`PostgreSQL password [auto-generated]: `) || defaultDbPassword;

  // Generate JWT secret
  const jwtSecret = generateRandomString(32);

  // Generate credential encryption key (64 hex characters = 32 bytes)
  const credentialEncryptionKey = generateRandomString(32).split('').map(c => c.charCodeAt(0).toString(16)).join('').substring(0, 64);

  // Generate unique suffix for container names
  const uniqueSuffix = Math.random().toString(36).substring(2, 8);

  log.step(3, 5, 'Generating configuration files');

  // Create docker-compose.yml
  const dockerCompose = `services:
  postgres:
    image: postgres:15-alpine
    container_name: nodedrop-postgres-${uniqueSuffix}
    environment:
      POSTGRES_DB: node_drop
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${dbPassword}
    volumes:
      - postgres_data_${uniqueSuffix}:/var/lib/postgresql/data
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: nodedrop-redis-${uniqueSuffix}
    volumes:
      - redis_data_${uniqueSuffix}:/data
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  nodedrop:
    image: ghcr.io/node-drop/nodedrop:latest
    container_name: nodedrop-${uniqueSuffix}
    ports:
      - "${port}:5678"
    environment:
      - NODE_ENV=production
      - DOCKER_ENV=true
      - DATABASE_URL=postgresql://postgres:${dbPassword}@postgres:5432/node_drop
      - REDIS_URL=redis://redis:6379
      - JWT_SECRET=${jwtSecret}
      - CREDENTIAL_ENCRYPTION_KEY=${credentialEncryptionKey}
      - PORT=5678
      - CORS_ORIGIN=http://localhost:${port},http://127.0.0.1:${port}${domain ? `\n      - DOMAIN=${domain}` : ''}
      - CONTAINER_NAME=nodedrop-${uniqueSuffix}
      - IMAGE_NAME=ghcr.io/node-drop/nodedrop:latest
      - INSTALL_DIR=/host-compose
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - ${installDir}:/host-compose:ro
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    restart: unless-stopped

volumes:
  postgres_data_${uniqueSuffix}:
  redis_data_${uniqueSuffix}:
`;

  fs.writeFileSync(path.join(installDir, 'docker-compose.yml'), dockerCompose);
  log.success('Created docker-compose.yml');

  // Create .env file for reference
  const envFile = `# Node-Drop Configuration
# Generated by installation wizard

PORT=${port}
POSTGRES_PASSWORD=${dbPassword}
JWT_SECRET=${jwtSecret}
CREDENTIAL_ENCRYPTION_KEY=${credentialEncryptionKey}${domain ? `\nDOMAIN=${domain}` : ''}

# Database URL
DATABASE_URL=postgresql://postgres:${dbPassword}@postgres:5432/node_drop

# Redis URL
REDIS_URL=redis://redis:6379

# Access URL
${domain ? `PUBLIC_URL=https://${domain}` : `PUBLIC_URL=http://localhost:${port}`}
`;

  fs.writeFileSync(path.join(installDir, '.env'), envFile);
  log.success('Created .env file');

  // Detect platform
  const accessUrl = domain ? `https://${domain}` : `http://localhost:${port}`;

  // Create README
  const readme = `# Node-Drop Installation

## Quick Start

### Start Node-Drop
\`\`\`bash
docker-compose up -d
\`\`\`

### Stop Node-Drop
\`\`\`bash
docker-compose down
\`\`\`

### View Logs
\`\`\`bash
docker-compose logs -f
\`\`\`

## Access

Open your browser and go to:
${domain ? `https://${domain}` : `http://localhost:${port}`}

${domain ? `Note: Ensure your domain DNS points to this server and SSL is configured.` : ''}

## Configuration

Your configuration is stored in:
- docker-compose.yml (Docker setup)
- .env (environment variables)

## Backup

Your data is stored in Docker volumes:
- postgres_data (database)
- redis_data (cache)

To backup:
\`\`\`
docker-compose down
docker run --rm -v nodedrop_postgres_data:/data -v $(pwd):/backup alpine tar czf /backup/backup.tar.gz /data
\`\`\`

## Update

### In-App Updates (Recommended)
1. Log into Node-Drop
2. Click your user menu (bottom left)
3. Click "Check for Updates"
4. If available, click "Update Now"
5. The app will automatically update and restart

### Manual Update
\`\`\`
docker-compose pull
docker-compose up -d
\`\`\`

## Support

For issues and documentation, visit:
https://github.com/your-org/node-drop
`;

  fs.writeFileSync(path.join(installDir, 'README.md'), readme);
  log.success('Created README.md');

  // Automatically pull and start
  log.step(4, 5, 'Pulling Docker image');
  exec('docker pull ghcr.io/node-drop/nodedrop:latest', { cwd: installDir });

  log.step(5, 5, 'Starting Node-Drop services');
  exec('docker-compose up -d', { cwd: installDir });

  log.blank();
  log.header('✅ Installation Complete');
  
  log.section('📍 Access Information');
  log.info(`URL: ${accessUrl}/register`);
  log.info(`Installation directory: ${path.resolve(installDir)}`);
  
  if (domain) {
    log.blank();
    log.warning('Domain Configuration Required');
    log.info('Ensure your domain DNS points to this server');
    log.info('Configure SSL/TLS using nginx, Caddy, or similar');
  }
  
  log.section('🎯 Next Steps');
  console.log('  1. Visit the URL above to create your admin account');
  console.log('  2. Configure your workflows and integrations');
  console.log('  3. Review the README.md for additional commands');
  
  log.section('📚 Common Commands');
  log.divider();
  console.log(`  Start services:    cd ${installDir} && docker-compose up -d`);
  console.log(`  Stop services:     cd ${installDir} && docker-compose down`);
  console.log(`  Restart services:  cd ${installDir} && docker-compose restart`);
  console.log(`  View logs:         cd ${installDir} && docker-compose logs -f`);
  log.divider();
  log.blank();

  rl.close();
}

main().catch(error => {
  log.blank();
  log.header('❌ Installation Failed');
  log.error(error.message);
  log.blank();
  log.info('Please check the error above and try again');
  log.info('For support, visit: https://github.com/your-org/node-drop/issues');
  log.blank();
  rl.close();
  process.exit(1);
});
