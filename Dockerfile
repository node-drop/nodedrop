# Multi-stage unified build for node-drop
# Stage 1: Build frontend
FROM oven/bun:1-alpine AS frontend-builder

WORKDIR /app

# Copy root package files for workspace setup
COPY package.json bun.lock* ./

# Copy workspace packages that frontend depends on
COPY packages/types ./packages/types
COPY packages/utils ./packages/utils

# Copy frontend package files
COPY frontend/package.json ./frontend/

# Install workspace dependencies
RUN bun install --frozen-lockfile

# Build workspace packages first
RUN cd packages/types && bun run build
RUN cd packages/utils && bun run build

# Copy frontend source
WORKDIR /app/frontend
COPY frontend/ ./

# Build frontend (Vite)
# Use relative URL so it works in any environment (localhost, production domain, etc.)
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL
RUN bun run build

# Stage 2: Build backend
FROM oven/bun:1-alpine AS backend-builder

# Install OpenSSL for database connections
RUN apk add --no-cache openssl openssl-dev

WORKDIR /app

# Copy root package files for workspace setup
COPY package.json bun.lock* ./

# Copy workspace packages that backend depends on
COPY packages/types ./packages/types
COPY packages/utils ./packages/utils

# Copy backend package files and Drizzle configuration
COPY backend/package.json ./backend/
COPY backend/drizzle.config.ts ./backend/
COPY backend/src/db ./backend/src/db

# Install workspace dependencies
RUN bun install --frozen-lockfile

# Build workspace packages first (types, then utils which depends on types)
RUN cd packages/types && bun run build
RUN cd packages/utils && bun run build

# Copy backend source
WORKDIR /app/backend
COPY backend/ ./

# Note: Bun runs TypeScript directly, no build needed for backend

# Stage 3: Final production image
FROM oven/bun:1-alpine AS production

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
COPY --from=backend-builder /app/package.json ./
COPY --from=backend-builder /app/bun.lock* ./

# Copy backend source files (Bun runs TypeScript directly)
COPY --from=backend-builder /app/backend/src ./backend/src
COPY --from=backend-builder /app/backend/package.json ./backend/
COPY --from=backend-builder /app/backend/drizzle.config.ts ./backend/

# Copy all node_modules from builder (includes all dependencies)
COPY --from=backend-builder /app/node_modules ./node_modules
COPY --from=backend-builder /app/backend/node_modules ./backend/node_modules
COPY --from=backend-builder /app/packages ./packages

# Copy custom nodes
COPY --from=backend-builder /app/backend/custom-nodes ./backend/custom-nodes

# Copy frontend built files to backend/public directory
COPY --from=frontend-builder /app/frontend/dist ./backend/public

# Create non-root user
RUN addgroup -g 1001 -S bunuser && \
    adduser -S bunuser -u 1001

# Create directories that need write access
RUN mkdir -p /app/custom-nodes /app/temp/uploads /app/temp/extract /app/logs

# Change ownership
RUN chown -R bunuser:bunuser /app

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
CMD ["sh", "-c", "cd /app/backend && bun run db:migrate && bun run start"]
