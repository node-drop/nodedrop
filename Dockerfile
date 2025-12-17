# Multi-stage unified build for node-drop
# Stage 1: Build frontend
FROM node:22-alpine AS frontend-builder

WORKDIR /app

# Copy root package files for workspace setup
COPY package*.json ./

# Copy workspace packages that frontend depends on
COPY packages/types ./packages/types
COPY packages/utils ./packages/utils

# Copy frontend package files
COPY frontend/package*.json ./frontend/

# Install workspace dependencies
RUN npm install -g typescript
RUN npm install --workspace=packages/types --workspace=packages/utils --workspace=frontend && npm cache clean --force

# Build workspace packages first
RUN npm run build --workspace=packages/types
RUN npm run build --workspace=packages/utils

# Copy frontend source
WORKDIR /app/frontend
COPY frontend/ ./

# Build frontend (Vite)
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# Stage 2: Build backend
FROM node:22-alpine AS backend-builder

# Install OpenSSL for database connections
RUN apk add --no-cache openssl openssl-dev

WORKDIR /app

# Copy root package files for workspace setup
COPY package*.json ./

# Copy workspace packages that backend depends on
COPY packages/types ./packages/types
COPY packages/utils ./packages/utils

# Copy backend package files and Drizzle configuration
COPY backend/package*.json ./backend/
COPY backend/drizzle.config.ts ./backend/
COPY backend/src/db ./backend/src/db

# Install workspace dependencies
RUN npm install -g typescript
RUN npm install --workspace=packages/types --workspace=packages/utils --workspace=backend && npm cache clean --force

# Build workspace packages first (types, then utils which depends on types)
RUN npm run build --workspace=packages/types

# Fix ESM imports in packages/types
RUN node -e "const fs=require('fs'),path=require('path');function fix(f){let c=fs.readFileSync(f,'utf8');c=c.replace(/from\s+['\"](\.[^'\"]*?)['\"](?!\.js)/g,(m,p)=>{if(p.endsWith('.js')||p.endsWith('.json'))return m;const r=path.resolve(path.dirname(f),p);return fs.existsSync(r+'.js')?'from \\''+p+'.js\\'':fs.existsSync(path.join(r,'index.js'))?'from \\''+p+'/index.js\\'':m;});fs.writeFileSync(f,c);}function walk(d){fs.readdirSync(d).forEach(f=>{const fp=path.join(d,f);if(fs.statSync(fp).isDirectory())walk(fp);else if(f.endsWith('.js'))fix(fp);});}walk('packages/types/dist');"

RUN npm run build --workspace=packages/utils

# Fix ESM imports in packages/utils
RUN node -e "const fs=require('fs'),path=require('path');function fix(f){let c=fs.readFileSync(f,'utf8');c=c.replace(/from\s+['\"](\.[^'\"]*?)['\"](?!\.js)/g,(m,p)=>{if(p.endsWith('.js')||p.endsWith('.json'))return m;const r=path.resolve(path.dirname(f),p);return fs.existsSync(r+'.js')?'from \\''+p+'.js\\'':fs.existsSync(path.join(r,'index.js'))?'from \\''+p+'/index.js\\'':m;});fs.writeFileSync(f,c);}function walk(d){fs.readdirSync(d).forEach(f=>{const fp=path.join(d,f);if(fs.statSync(fp).isDirectory())walk(fp);else if(f.endsWith('.js'))fix(fp);});}walk('packages/utils/dist');"

# Copy backend source
WORKDIR /app/backend
COPY backend/ ./

# Build TypeScript
RUN npm run build

# Stage 3: Final production image
FROM node:22-alpine AS production

# Build arguments for version tracking
ARG GIT_SHA=unknown
ARG BUILD_DATE=unknown
ARG VERSION=unknown

# Set as environment variables
ENV GIT_SHA=$GIT_SHA \
    BUILD_DATE=$BUILD_DATE \
    APP_VERSION=$VERSION

WORKDIR /app

# Install runtime dependencies including Docker CLI and Compose for updates
RUN apk add --no-cache curl openssl openssl-dev docker-cli docker-cli-compose

# Copy root package files
COPY --from=backend-builder /app/package*.json ./

# Copy backend built files to backend directory
COPY --from=backend-builder /app/backend/dist ./backend/dist
COPY --from=backend-builder /app/backend/package*.json ./backend/
COPY --from=backend-builder /app/backend/drizzle.config.ts ./backend/
COPY --from=backend-builder /app/backend/src/db ./backend/src/db

# Copy all node_modules from builder (includes all dependencies)
COPY --from=backend-builder /app/node_modules ./node_modules
COPY --from=backend-builder /app/backend/node_modules ./backend/node_modules
COPY --from=backend-builder /app/packages ./packages

# Copy frontend built files to backend/public directory
COPY --from=frontend-builder /app/frontend/dist ./backend/public

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Create directories that need write access
RUN mkdir -p /app/custom-nodes /app/temp/uploads /app/temp/extract /app/logs

# Change ownership
RUN chown -R nodejs:nodejs /app

# Note: USER directive removed to allow docker-compose to set user
# For auto-updates, container needs root access to Docker socket
# If you don't need auto-updates, add "user: 1001:1001" in docker-compose.yml

# Expose single port
EXPOSE 5678

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=5 \
  CMD curl -f http://localhost:5678/api/health || exit 1

# Start application
# Run Drizzle migrations and start server
CMD ["sh", "-c", "cd /app/backend && npx drizzle-kit migrate && node dist/index.js"]
