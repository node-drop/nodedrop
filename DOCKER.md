# 🐳 Docker Setup

## Quick Start

### For Development
```bash
npm run docker:setup
```

This single command will:
- Check Docker is running
- Create `.env` from template
- Build and start all services
- Show you the URLs

### Manual Commands

```bash
# Start development environment
docker-compose up --build

# Start in background
docker-compose up -d --build

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Clean everything (including data)
docker-compose down -v --remove-orphans
```

## File Structure

- `docker-compose.yml` - Production configuration
- `docker-compose.override.yml` - Development overrides (auto-loaded)
- `backend/Dockerfile` - Production backend image
- `backend/Dockerfile.dev` - Development backend image
- `frontend/Dockerfile` - Production frontend image  
- `frontend/Dockerfile.dev` - Development frontend image

## How It Works

Docker Compose automatically loads `docker-compose.override.yml` for development, which:
- Exposes database ports for local tools
- Mounts source code for hot reloading
- Uses development Dockerfiles
- Sets development environment variables

For production, use:
```bash
docker-compose -f docker-compose.yml up
```

## Troubleshooting

### Services won't start
```bash
# Check Docker is running
docker info

# View detailed logs
docker-compose logs [service-name]

# Rebuild from scratch
docker-compose down -v
docker-compose up --build --force-recreate
```

### Port conflicts
Edit `docker-compose.override.yml` to change ports:
```yaml
services:
  frontend:
    ports:
      - "3001:3000"  # Change 3000 to 3001
```

### Database issues
```bash
# Reset database
docker-compose down -v
docker-compose up postgres -d
# Wait for it to start, then:
docker-compose up
```