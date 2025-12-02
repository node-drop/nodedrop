# Coolify Deployment Guide

This guide explains how to deploy the node drop application using Coolify.

## Prerequisites

- Coolify instance running and accessible
- Domain names configured (e.g., `your-app.yourdomain.com` and `api.your-app.yourdomain.com`)
- Git repository accessible by Coolify

## Deployment Steps

### 1. Create New Application in Coolify

1. Go to your Coolify dashboard
2. Click "New Resource" → "Application"
3. Select "Docker Compose" as the build pack
4. Connect your Git repository

### 2. Configure Build Settings

- **Build Pack**: Docker Compose
- **Docker Compose File**: `docker-compose.yml` (uses existing production-ready file)
- **Base Directory**: `/` (root of repository)

### 3. Environment Variables

**⚠️ IMPORTANT: Set these in Coolify's UI, NOT in your repository!**

In Coolify's environment variables section, add:

```env
# Database
POSTGRES_PASSWORD=your-secure-postgres-password

# JWT & Security
JWT_SECRET=your-super-secure-jwt-secret-key-for-production
CREDENTIAL_ENCRYPTION_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef

# URLs (replace with your actual domains)
FRONTEND_URL=https://your-app.yourdomain.com
VITE_API_URL=https://api.your-app.yourdomain.com

# CORS
CORS_ORIGIN=https://your-app.yourdomain.com,https://api.your-app.yourdomain.com,https://www.your-app.yourdomain.com
```

**Reference**: Use `.env.coolify.template` as a reference for variable names.

### 4. Domain Configuration

#### Frontend Service
- **Domain**: `your-app.yourdomain.com`
- **Port**: `3000`
- **Health Check Path**: `/health`

#### Backend Service  
- **Domain**: `api.your-app.yourdomain.com`
- **Port**: `4000`
- **Health Check Path**: `/health`

### 5. Volume Configuration

Ensure these volumes are configured:
- `postgres_data` - PostgreSQL data persistence
- `redis_data` - Redis data persistence

### 6. Network Configuration

The application uses a custom network `nd-network` for service communication.

## Post-Deployment

### 1. Database Setup

The PostgreSQL database will be automatically initialized on first run.

### 2. SSL Certificates

Coolify will automatically provision SSL certificates for your domains.

### 3. Health Checks

Both services include health checks:
- Frontend: `GET /health`
- Backend: `GET /health`

## Monitoring

### Logs
Access logs through Coolify dashboard:
- Application logs for debugging
- Database logs for query monitoring
- Nginx access logs for traffic analysis

### Health Status
Monitor service health through:
- Coolify dashboard health indicators
- Direct health check endpoints
- Application metrics

## Troubleshooting

### Common Issues

1. **CORS Errors**
   - Verify `CORS_ORIGIN` includes your frontend domain
   - Check that domains match exactly (including https://)

2. **Database Connection Issues**
   - Ensure PostgreSQL service is healthy
   - Verify `DATABASE_URL` environment variable

3. **Build Failures**
   - Check Docker build logs in Coolify
   - Verify all required files are in repository

4. **SSL Certificate Issues**
   - Ensure domains are properly configured in DNS
   - Check Coolify SSL certificate status

### Debug Commands

Access container logs:
```bash
# In Coolify terminal
docker logs node-drop-backend
docker logs node-drop-frontend
docker logs node-drop-postgres
```

Check service health:
```bash
curl https://api.your-app.yourdomain.com/health
curl https://your-app.yourdomain.com/health
```

## Security Considerations

1. **Environment Variables**: Never commit real secrets to repository
2. **Database**: PostgreSQL is internal-only (not exposed to internet)
3. **Redis**: Redis is internal-only (not exposed to internet)
4. **HTTPS**: All external traffic should use HTTPS
5. **CORS**: Restrict CORS origins to your actual domains

## Scaling

### Horizontal Scaling
- Backend can be scaled horizontally
- Frontend can be scaled horizontally
- Database requires vertical scaling or clustering

### Resource Limits
Configure appropriate resource limits in Coolify:
- CPU: 1-2 cores per service
- Memory: 1-2GB per service
- Storage: Adequate for database growth

## Backup Strategy

1. **Database Backups**: Configure automated PostgreSQL backups
2. **Volume Backups**: Backup persistent volumes regularly
3. **Configuration Backups**: Keep environment variables backed up

## Updates

1. Push changes to Git repository
2. Coolify will automatically detect changes
3. Trigger deployment through Coolify dashboard
4. Monitor deployment logs for issues

## Support

For deployment issues:
1. Check Coolify documentation
2. Review application logs
3. Verify environment configuration
4. Test health endpoints