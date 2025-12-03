#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

function exec(command, options = {}) {
  try {
    return execSync(command, { stdio: 'inherit', ...options });
  } catch (error) {
    console.error(`Error executing: ${command}`);
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
  console.log('\n🚀 Welcome to Node-Drop Installation Wizard\n');
  console.log('This wizard will help you set up Node-Drop in minutes.\n');

  // Check if Docker is installed
  try {
    execSync('docker --version', { stdio: 'pipe' });
    console.log('✓ Docker is installed\n');
  } catch (error) {
    console.error('✗ Docker is not installed. Please install Docker first:');
    console.error('  https://docs.docker.com/get-docker/\n');
    process.exit(1);
  }

  // Check if Docker Compose is installed
  try {
    execSync('docker-compose --version', { stdio: 'pipe' });
    console.log('✓ Docker Compose is installed\n');
  } catch (error) {
    console.error('✗ Docker Compose is not installed. Please install Docker Compose first:');
    console.error('  https://docs.docker.com/compose/install/\n');
    process.exit(1);
  }

  // Check for existing containers
  try {
    const existingContainers = execSync('docker ps -a --filter "name=nodedrop" --format "{{.Names}}"', { encoding: 'utf8' });
    if (existingContainers.trim()) {
      console.log('⚠️  Found existing Node-Drop containers:\n');
      console.log(existingContainers);
      const cleanup = await question('Do you want to remove them and start fresh? (y/n) [y]: ') || 'y';
      if (cleanup.toLowerCase() === 'y') {
        console.log('\n🧹 Cleaning up existing containers...\n');
        execSync('docker rm -f nodedrop-postgres nodedrop-redis nodedrop 2>nul || true', { stdio: 'inherit' });
        console.log('✓ Cleanup complete\n');
      }
    }
  } catch (error) {
    // Ignore errors checking for containers
  }

  // Ask for installation directory (use home directory by default)
  const os = require('os');
  const homeDir = os.homedir();
  const defaultDir = path.join(homeDir, 'nodedrop');
  const installDirInput = await question(`Installation directory [${defaultDir}]: `) || defaultDir;
  const installDir = path.resolve(installDirInput);

  // Create directory if it doesn't exist
  if (!fs.existsSync(installDir)) {
    fs.mkdirSync(installDir, { recursive: true });
    console.log(`✓ Created directory: ${installDir}\n`);
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

  console.log('\n📝 Creating configuration files...\n');

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
      - DATABASE_URL=postgresql://postgres:${dbPassword}@postgres:5432/node_drop
      - REDIS_URL=redis://redis:6379
      - JWT_SECRET=${jwtSecret}
      - CREDENTIAL_ENCRYPTION_KEY=${credentialEncryptionKey}
      - PORT=5678
      - CORS_ORIGIN=http://localhost:${port},http://127.0.0.1:${port}${domain ? `\n      - DOMAIN=${domain}` : ''}
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
  console.log('✓ Created docker-compose.yml');

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
  console.log('✓ Created .env file');

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

To update to the latest version:
\`\`\`
docker-compose pull
docker-compose up -d
\`\`\`

## Support

For issues and documentation, visit:
https://github.com/your-org/node-drop
`;

  fs.writeFileSync(path.join(installDir, 'README.md'), readme);
  console.log('✓ Created README.md\n');

  // Automatically pull and start
  console.log('📦 Pulling Docker image...\n');
  exec('docker pull ghcr.io/node-drop/nodedrop:latest', { cwd: installDir });

  console.log('\n🚀 Starting Node-Drop...\n');
  exec('docker-compose up -d', { cwd: installDir });

  console.log('\n✅ Installation complete!\n');
  console.log(`Node-Drop is starting up...`);
  console.log(`\n🎉 Next step: Create your admin account`);
  console.log(`   Visit: ${accessUrl}/register\n`);
  
  if (domain) {
    console.log(`⚠️  Note: Make sure your domain points to this server`);
    console.log(`   and you have SSL/TLS configured (nginx, Caddy, etc.)\n`);
  }
  
  console.log(`Installation directory: ${path.resolve(installDir)}\n`);
  console.log('Useful commands:');
  console.log(`  Start:   cd ${installDir}`);
  console.log(`           docker-compose up -d`);
  console.log(``);
  console.log(`  Stop:    cd ${installDir}`);
  console.log(`           docker-compose down`);
  console.log(``);
  console.log(`  Restart: cd ${installDir}`);
  console.log(`           docker-compose restart`);
  console.log(``);
  console.log(`  Logs:    cd ${installDir}`);
  console.log(`           docker-compose logs -f\n`);

  rl.close();
}

main().catch(error => {
  console.error('\n❌ Installation failed:', error.message);
  rl.close();
  process.exit(1);
});
