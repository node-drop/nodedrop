# Multi-stage build for production
FROM node:22-alpine AS builder

# Install OpenSSL for database connections
RUN apk add --no-cache openssl openssl-dev

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev dependencies for build)
RUN npm ci && npm cache clean --force

# Copy source code
COPY . .

# Build application
RUN npm run build

# Production stage
FROM node:22-alpine AS production

WORKDIR /app

# Install curl for health checks and OpenSSL for database connections
RUN apk add --no-cache curl openssl openssl-dev

# Copy package files
COPY package*.json ./

# Install all dependencies (including devDependencies for migrations)
RUN npm ci && npm cache clean --force

# Copy built application
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/drizzle.config.ts ./
COPY --from=builder /app/src/db ./src/db

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Create directories that need write access
RUN mkdir -p /app/custom-nodes /app/temp/uploads /app/temp/extract /app/logs

# Change ownership
RUN chown -R nodejs:nodejs /app
USER nodejs

# Expose port
EXPOSE 4000

# Health check with longer start period for initialization
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=5 \
  CMD curl -f http://localhost:4000/health || exit 1

# Start application with Drizzle migrations
# Node registration happens after server starts to avoid blocking and race conditions
CMD ["sh", "-c", "npm run db:migrate && npm start"]