# Simple Coolify Deployment

## ✅ What You Have (Production Ready)

Your existing Docker setup is already production-ready and works perfectly with Coolify:

- ✅ **docker-compose.yml** - Production-ready compose file
- ✅ **backend/Dockerfile** - Multi-stage production build with Prisma support
- ✅ **frontend/Dockerfile** - Nginx-based production build
- ✅ **Health checks** - Both services have health endpoints
- ✅ **Security** - CORS, security headers, proper networking

## 🚀 Coolify Deployment (3 Steps)

### 1. Create Application in Coolify
- **Type**: Docker Compose
- **Repository**: Your Git repo
- **Compose File**: `docker-compose.yml`

### 2. Set Environment Variables in Coolify UI
**⚠️ Set these in Coolify's environment settings, NOT in Git!**

```env
# Required secrets
POSTGRES_PASSWORD=your-secure-password
JWT_SECRET=your-jwt-secret
CREDENTIAL_ENCRYPTION_KEY=64-char-hex-string

# Your domains
FRONTEND_URL=https://your-app.com
VITE_API_URL=https://api.your-app.com
CORS_ORIGIN=https://your-app.com,https://api.your-app.com
```

Use `.env.coolify.template` as reference.

### 3. Configure Domains
- **Frontend**: `your-app.com` → port 3000
- **Backend**: `api.your-app.com` → port 4000

## 🎯 That's It!

No special Coolify files needed. Your existing production setup works perfectly.

### Health Checks
- Frontend: `https://your-app.com/health`
- Backend: `https://api.your-app.com/health`

### Generate Secrets
Run the setup script to generate secure secrets:
```bash
bash scripts/setup-coolify.sh
```

## 🔧 Why This Works

1. **Existing Dockerfiles are production-ready** with multi-stage builds
2. **Health checks included** for proper monitoring
3. **Environment variables** already configured for flexibility
4. **Security** already implemented (CORS, headers, etc.)
5. **Networking** properly configured for service communication

Your current setup follows Docker and production best practices, so it works seamlessly with Coolify without any modifications!