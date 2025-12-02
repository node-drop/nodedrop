# Docker Setup Guide

This guide explains how to run the node-drop backend with Docker for development.

## Prerequisites

- Docker installed and running
- Docker Compose (usually included with Docker Desktop)
- Node.js 18+ for running the backend application

## Quick Start

### Option 1: Using Docker Compose (Recommended)

1. **Start all services:**
   ```bash
   npm run compose:setup
   ```
   This will:
   - Start PostgreSQL and Redis containers
   - Wait for services to be ready
   - Run database migrations
   - Seed the database with initial data

2. **Start the backend:**
   ```bash
   npm run dev
   ```

3. **Stop services when done:**
   ```bash
   npm run compose:down
   ```

### Option 2: Using Individual Docker Commands

1. **Start database and Redis:**
   ```bash
   npm run docker:setup
   ```

2. **Start the backend:**
   ```bash
   npm run dev
   ```

3. **Stop services when done:**
   ```bash
   npm run docker:services:stop
   ```

## Available Scripts

### Docker Compose Scripts
- `npm run compose:up` - Start PostgreSQL and Redis containers
- `npm run compose:down` - Stop and remove containers
- `npm run compose:logs` - View container logs
- `npm run compose:setup` - Start containers, wait for readiness, migrate and seed DB
- `npm run compose:dev` - Full setup + start development server

### Individual Docker Scripts
- `npm run docker:db` - Start PostgreSQL container
- `npm run docker:redis` - Start Redis container
- `npm run docker:services` - Start both PostgreSQL and Redis
- `npm run docker:setup` - Start services + migrate and seed DB
- `npm run docker:dev` - Full setup + start development server

### Stop Scripts
- `npm run docker:db:stop` - Stop and remove PostgreSQL container
- `npm run docker:redis:stop` - Stop and remove Redis container
- `npm run docker:services:stop` - Stop both services

## Container Details

### PostgreSQL
- **Image:** postgres:15
- **Container Name:** nodeDrop-postgres
- **Port:** 5432
- **Database:** node_drop_dev
- **Username:** postgres
- **Password:** postgres

### Redis
- **Image:** redis:7-alpine
- **Container Name:** nodeDrop-redis
- **Port:** 6379

### Test Database
- **Container Name:** nodeDrop-postgres-test
- **Port:** 5433
- **Database:** node_drop_test
- **Started with:** `docker-compose --profile test up`

## Data Persistence

Docker volumes are used to persist data:
- `postgres_data` - PostgreSQL data
- `redis_data` - Redis data
- `postgres_test_data` - Test database data

## Troubleshooting

### Port Conflicts
If you get port conflicts, check what's running on the ports:
```bash
# Check port 5432 (PostgreSQL)
netstat -an | findstr 5432

# Check port 6379 (Redis)
netstat -an | findstr 6379
```

### Container Issues
```bash
# Check container status
docker ps -a

# View container logs
docker logs nodeDrop-postgres
docker logs nodeDrop-redis

# Restart containers
docker restart nodeDrop-postgres nodeDrop-redis
```

### Database Issues
```bash
# Reset database (removes all data)
npm run compose:down
docker volume rm backend_postgres_data
npm run compose:setup
```

### Clean Slate
To completely reset everything:
```bash
npm run compose:down
docker volume prune
docker system prune
npm run compose:setup
```

## Environment Variables

The containers use the same environment variables as defined in `.env`:
- `DATABASE_URL="postgresql://postgres:postgres@localhost:5432/node_drop_dev"`
- `REDIS_URL="redis://localhost:6379"`

## Production Considerations

For production deployment:
1. Use proper secrets management
2. Configure resource limits
3. Set up monitoring and logging
4. Use production-ready PostgreSQL configuration
5. Consider using managed database services
6. Implement backup strategies