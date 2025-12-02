# Multi-stage unified build for node-drop
# Stage 1: Build frontend
FROM node:22-alpine AS frontend-builder

WORKDIR /app/frontend

# Copy frontend package files
COPY frontend/package*.json ./

# Install frontend dependencies
RUN npm ci && npm cache clean --force

# Copy frontend source
COPY frontend/ ./

# Build frontend (Vite)
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# Stage 2: Build backend
FROM node:22-alpine AS backend-builder

# Install OpenSSL for Prisma
RUN apk add --no-cache openssl openssl-dev

WORKDIR /app/backend

# Copy backend package files
COPY backend/package*.json ./

# Install all dependencies (including dev for build)
RUN npm ci && npm cache clean --force

# Copy backend source
COPY backend/ ./

# Generate Prisma client and build TypeScript
RUN npx prisma generate && npm run build

# Stage 3: Production dependencies
FROM node:22-alpine AS prod-deps

# Install OpenSSL for Prisma
RUN apk add --no-cache openssl openssl-dev

WORKDIR /app/backend

# Copy backend package files
COPY backend/package*.json ./

# Install only production dependencies
RUN npm ci --omit=dev && npm cache clean --force

# Stage 4: Final production image
FROM node:22-alpine AS production

WORKDIR /app

# Install runtime dependencies
RUN apk add --no-cache curl openssl openssl-dev

# Copy backend built files
COPY --from=backend-builder /app/backend/dist ./dist
COPY --from=backend-builder /app/backend/package*.json ./
COPY --from=backend-builder /app/backend/prisma ./prisma

# Copy production node_modules
COPY --from=prod-deps /app/backend/node_modules ./node_modules

# Copy Prisma generated files
COPY --from=backend-builder /app/backend/node_modules/.prisma ./node_modules/.prisma
COPY --from=backend-builder /app/backend/node_modules/@prisma ./node_modules/@prisma

# Copy frontend built files to public directory
COPY --from=frontend-builder /app/frontend/dist ./public

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Create directories that need write access
RUN mkdir -p /app/custom-nodes /app/temp/uploads /app/temp/extract /app/logs

# Change ownership
RUN chown -R nodejs:nodejs /app

USER nodejs

# Expose single port (like n8n)
EXPOSE 5678

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=5 \
  CMD curl -f http://localhost:5678/api/health || exit 1

# Start application
# Run migrations and start server
CMD ["sh", "-c", "npx prisma migrate deploy && npm start"]
