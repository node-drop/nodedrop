# 🔄 Updating Node-Drop

## How Updates Work

When a new version is released:
1. A GitHub release is created (e.g., `v1.0.5-alpha`)
2. GitHub Actions automatically builds and publishes a Docker image to GHCR
3. The image is tagged with the version (e.g., `1.0.5-alpha`) and `latest`

## Checking for Updates

### From the Application
1. Click on your user menu in the sidebar
2. Select "Check for Updates"
3. The app will check GitHub for the latest release and compare with your current version

### From Command Line
```bash
npm run check-version
```

## Updating Your Installation

### Method 1: In-App Update (Easiest) ⭐

The easiest way to update is directly from the application:

1. Click on your **user menu** in the sidebar (bottom left)
2. Click **"Check for Updates"**
3. If an update is available, click **"Update Now"** in the notification
4. The application will automatically:
   - Pull the latest Docker image
   - Restart the container
   - Apply database migrations
5. Refresh your browser after ~30 seconds

**Requirements:**
- Docker socket must be mounted (already configured in `docker-compose.published.yml`)
- User must be an administrator

**Note:** The in-app update feature requires the container to have access to the Docker socket. This is already configured in the published docker-compose file.

### Method 2: Using `latest` Tag (Manual)

If you're using `docker-compose.published.yml` with the `latest` tag:

```bash
# Stop the current container
docker-compose -f docker-compose.published.yml down

# Pull the latest image
docker pull ghcr.io/node-drop/nodedrop:latest

# Start with the new image
docker-compose -f docker-compose.published.yml up -d
```

### Method 2: Using Specific Version Tag (Recommended for Production)

Pin to a specific version for more control:

```bash
# Set the version you want
export NODEDROP_VERSION=1.0.5-alpha

# Or add to .env file:
echo "NODEDROP_VERSION=1.0.5-alpha" >> .env

# Pull the specific version
docker pull ghcr.io/node-drop/nodedrop:1.0.5-alpha

# Restart with the new version
docker-compose -f docker-compose.published.yml down
docker-compose -f docker-compose.published.yml up -d
```



## Update Process Details

### What Happens During Update

1. **Pull**: Downloads the new Docker image from GHCR
2. **Stop**: Stops the current container
3. **Start**: Starts a new container with the new image
4. **Migrate**: Database migrations run automatically on startup
5. **Ready**: Application is ready with the new version

### Data Persistence

Your data is safe during updates because it's stored in Docker volumes:
- `postgres_data` - Database
- `redis_data` - Cache
- `custom_nodes_data` - Custom nodes
- `temp_data` - Temporary files
- `logs_data` - Application logs

These volumes persist across container updates.

## Rollback to Previous Version

If something goes wrong, you can rollback:

```bash
# Stop current version
docker-compose -f docker-compose.published.yml down

# Pull and run specific older version
export NODEDROP_VERSION=1.0.4-alpha
docker pull ghcr.io/node-drop/nodedrop:1.0.4-alpha
docker-compose -f docker-compose.published.yml up -d
```

## Automatic Updates (Future Feature)

The in-app "Install Update" button is currently disabled because:
- It requires the container to have access to Docker socket
- This poses security risks
- Manual updates are safer and more reliable

For now, use the manual update methods above.

## Version Pinning Best Practices

### Development
```yaml
# Use latest for development
image: ghcr.io/node-drop/nodedrop:latest
```

### Production
```yaml
# Pin to specific version for production
image: ghcr.io/node-drop/nodedrop:${NODEDROP_VERSION:-1.0.4-alpha}
```

### Staging
```yaml
# Use major version for staging (gets latest patches)
image: ghcr.io/node-drop/nodedrop:1.0
```

## Troubleshooting Updates

### Update Check Says "No Updates Available" But New Version Exists

This means:
1. No GitHub release has been created yet (only Docker image published)
2. You need to create a GitHub release from the tag

### Image Pull Fails

```bash
# Login to GHCR (if repository is private)
echo $GITHUB_TOKEN | docker login ghcr.io -u YOUR_USERNAME --password-stdin

# Then try pulling again
docker pull ghcr.io/node-drop/nodedrop:latest
```

### Container Won't Start After Update

```bash
# Check logs
docker-compose -f docker-compose.published.yml logs nodedrop

# Common issues:
# 1. Database migration failed - check postgres logs
# 2. Environment variables missing - check .env file
# 3. Port conflict - check if port 5678 is available
```

### Database Migration Issues

```bash
# Run migrations manually
docker-compose -f docker-compose.published.yml exec nodedrop npx prisma migrate deploy

# Or reset database (WARNING: deletes all data)
docker-compose -f docker-compose.published.yml down -v
docker-compose -f docker-compose.published.yml up -d
```

## Release Schedule

- **Alpha releases**: Frequent, may have breaking changes
- **Beta releases**: Weekly, more stable
- **Stable releases**: Monthly, production-ready

## Staying Informed

- Watch the GitHub repository for release notifications
- Check the [Releases page](https://github.com/node-drop/nodedrop/releases)
- Subscribe to release notifications in GitHub
