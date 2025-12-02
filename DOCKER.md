# 🐳 Docker Setup

## Architecture

Node-drop uses a **unified single-container architecture** (like n8n), where the backend serves the frontend static files. This simplifies deployment - just one image to pull and run!

- **Single container** running on port **5678**
- Backend serves frontend via Express
- Postgres and Redis run as separate services
- Multi-platform support (amd64, arm64)

## Quick Start

### Option 1: Using Published Images (Recommended)

The easiest way to run node-drop is using our pre-built Docker images:

```bash
# Pull the latest image
docker pull ghcr.io/node-drop/nodedrop:latest

# Run with docker-compose
docker-compose -f docker-compose.published.yml up
```

Access the application at **http://localhost:5678**

### Option 2: Build from Source

```bash
# For development (with hot reload)
npm run docker:setup

# For production (build locally)
docker-compose up --build
```

## Published Images

Images are automatically published to GitHub Container Registry (GHCR) on every push to `main` and for version tags.

### Image Tags

- `latest` - Latest stable version from main branch
- `v1.0.0` - Specific version tags
- `sha-abc123` - Git commit SHA for traceability

### Pulling Specific Versions

```bash
# Latest version
docker pull ghcr.io/node-drop/nodedrop:latest

# Specific version
docker pull ghcr.io/node-drop/nodedrop:v1.0.0

# Specific commit
docker pull ghcr.io/node-drop/nodedrop:sha-abc123
```

### Version Pinning

Set the `NODEDROP_VERSION` environment variable:

```bash
# In .env file
NODEDROP_VERSION=v1.0.0

# Or inline
NODEDROP_VERSION=v1.0.0 docker-compose -f docker-compose.published.yml up
```

## File Structure

- `Dockerfile` - Unified production image (frontend + backend)
- `docker-compose.yml` - Build from source
- `docker-compose.published.yml` - Use published images
- `docker-compose.override.yml` - Development overrides (auto-loaded)
- `backend/Dockerfile.dev` - Development backend image
- `frontend/Dockerfile.dev` - Development frontend image

## How It Works

### Production (Unified Image)

The unified Dockerfile:
1. **Stage 1**: Builds frontend (Vite)
2. **Stage 2**: Builds backend (TypeScript)
3. **Stage 3**: Combines both into single image
   - Backend serves frontend from `/public`
   - Single port: 5678
   - All-in-one container

### Development

Docker Compose automatically loads `docker-compose.override.yml` for development, which:
- Uses separate dev Dockerfiles for hot reload
- Mounts source code as volumes
- Exposes database ports for local tools
- Sets development environment variables

## Troubleshooting

### Services won't start
```bash
# Check Docker is running
docker info

# View detailed logs
docker-compose logs nodedrop

# Rebuild from scratch
docker-compose down -v
docker-compose up --build --force-recreate
```

### Port conflicts
Edit `docker-compose.yml` or `docker-compose.published.yml` to change ports:
```yaml
services:
  nodedrop:
    ports:
      - "8080:5678"  # Change 5678 to 8080
```

### Database issues
```bash
# Reset database
docker-compose down -v
docker-compose up postgres -d
# Wait for it to start, then:
docker-compose up
```

### Image pull issues
```bash
# Login to GHCR (if private)
echo $GITHUB_TOKEN | docker login ghcr.io -u USERNAME --password-stdin

# Pull with specific version
docker pull ghcr.io/node-drop/nodedrop:latest
```

## Migration from Multi-Container Setup

If you were using the old setup with separate backend/frontend containers:

1. **Update docker-compose.yml** - Already done, uses unified architecture
2. **Update environment variables** - Remove `FRONTEND_URL`, `VITE_API_URL`
3. **Update port** - Change from 3000/4000 to 5678
4. **Rebuild** - Run `docker-compose down -v && docker-compose up --build`

## Publishing Images (for Maintainers)

Images are automatically published via GitHub Actions when:
- Pushing to `main` branch → tagged as `latest`
- Creating version tags (e.g., `v1.0.0`) → tagged with version
- Manual workflow dispatch

To manually trigger a build:
1. Go to GitHub Actions tab
2. Select "Docker Image Publishing" workflow
3. Click "Run workflow"