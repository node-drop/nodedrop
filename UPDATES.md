# NodeDrop Update Guide

## Manual Update Process

Self-updates via Docker socket have been disabled for security reasons. Use the manual update process below.

### Standard Deployment

```bash
# 1. Pull latest image
docker-compose pull

# 2. Restart services
docker-compose up -d
```

### With Separate Workers

```bash
# 1. Pull latest images
docker-compose -f docker-compose.yml -f docker-compose.workers.yml pull

# 2. Restart all services
docker-compose -f docker-compose.yml -f docker-compose.workers.yml up -d
```

### Development (Source Code)

```bash
# 1. Pull latest code
git pull

# 2. Install dependencies
npm install

# 3. Build
npm run build

# 4. Restart
docker-compose down
docker-compose up -d
```

## Why Self-Updates Were Disabled

Self-updates required mounting the Docker socket (`/var/run/docker.sock`) into the container, which:

- **Security Risk:** Gives container root access to the host Docker daemon
- **Anti-Pattern:** Not compatible with Kubernetes and orchestrated environments
- **Unnecessary:** Docker Compose provides better update mechanisms

## Alternative: CI/CD Webhook

For automated updates, set up a webhook that triggers:

```bash
#!/bin/bash
# webhook-update.sh

cd /path/to/nodedrop
docker-compose pull
docker-compose up -d
```

Then configure a webhook service (e.g., GitHub Actions, Jenkins) to run this script on new releases.

## Rollback

If an update causes issues:

```bash
# 1. Stop services
docker-compose down

# 2. Pull specific version
docker pull ghcr.io/node-drop/nodedrop:v1.0.8-alpha

# 3. Update docker-compose.yml to use specific version
# image: ghcr.io/node-drop/nodedrop:v1.0.8-alpha

# 4. Start services
docker-compose up -d
```
