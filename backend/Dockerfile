# Multi-stage build for production
FROM oven/bun:1-alpine AS builder

# Install OpenSSL for database connections
RUN apk add --no-cache openssl openssl-dev

WORKDIR /app

# Copy package files
COPY package.json bun.lock* ./

# Install all dependencies
RUN bun install --frozen-lockfile

# Copy source code
COPY . .

# Note: Bun runs TypeScript directly, no build needed

# Production stage
FROM oven/bun:1-alpine AS production

WORKDIR /app

# Install curl for health checks and OpenSSL for database connections
RUN apk add --no-cache curl openssl openssl-dev

# Copy package files
COPY package.json bun.lock* ./

# Install all dependencies (including devDependencies for migrations)
RUN bun install --frozen-lockfile

# Copy source code (Bun runs TypeScript directly)
COPY --from=builder /app/src ./src
COPY --from=builder /app/drizzle.config.ts ./
COPY --from=builder /app/custom-nodes ./custom-nodes

# Create non-root user
RUN addgroup -g 1001 -S bunuser && \
    adduser -S bunuser -u 1001

# Create directories that need write access
RUN mkdir -p /app/custom-nodes /app/temp/uploads /app/temp/extract /app/logs

# Change ownership
RUN chown -R bunuser:bunuser /app
USER bunuser

# Expose port
EXPOSE 4000

# Health check with longer start period for initialization
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=5 \
  CMD curl -f http://localhost:4000/health || exit 1

# Start application with Drizzle migrations
CMD ["sh", "-c", "bun run db:migrate && bun run start"]