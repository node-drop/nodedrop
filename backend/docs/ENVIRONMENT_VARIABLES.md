# Environment Variables Reference

This document provides a comprehensive reference for all environment variables used in the NodeDrop backend with Drizzle ORM.

## Overview

Environment variables are organized into the following categories:
- Database Configuration
- Drizzle ORM Configuration
- Authentication & Security
- Server Configuration
- Logging & Debugging
- External Services
- Rate Limiting
- OAuth Providers

## Database Configuration

### Core Database Settings

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | - | PostgreSQL connection string for production database. Format: `postgresql://username:password@host:port/database` |
| `TEST_DATABASE_URL` | No | - | PostgreSQL connection string for test database. Used during testing to avoid affecting production data. |

### Connection Pooling

Connection pooling manages database connections efficiently. These settings are automatically adjusted based on `NODE_ENV`.

| Variable | Default (Prod) | Default (Dev) | Description |
|----------|---|---|---|
| `DB_POOL_MAX` | 20 | 10 | Maximum number of connections to maintain in the pool. Increase for high-concurrency applications. |
| `DB_POOL_MIN` | 5 | 2 | Minimum number of connections to maintain in the pool. Helps reduce connection creation overhead. |
| `DB_IDLE_TIMEOUT_MS` | 30000 | 10000 | Time in milliseconds before idle connections are closed. Helps free up database resources. |
| `DB_CONNECTION_TIMEOUT_MS` | 5000 | 5000 | Time in milliseconds to wait for a connection from the pool. Increase if experiencing timeout errors. |
| `DB_MAX_USES` | 7500 | - | Number of times a connection can be used before it's recycled. Production only. Prevents stale connection state. |

**Recommendations**:
- **Small deployments** (< 100 concurrent users): `DB_POOL_MAX=10, DB_POOL_MIN=2`
- **Medium deployments** (100-1000 concurrent users): `DB_POOL_MAX=20, DB_POOL_MIN=5`
- **Large deployments** (> 1000 concurrent users): `DB_POOL_MAX=50, DB_POOL_MIN=10`

### SSL/TLS Configuration

Secure database connections using SSL/TLS. Automatically enabled in production.

| Variable | Default (Prod) | Default (Dev) | Description |
|----------|---|---|---|
| `DB_SSL` | true | false | Enable SSL/TLS for database connections. Always true in production. |
| `DB_SSL_REJECT_UNAUTHORIZED` | true | - | Validate SSL certificates. Set to false only for testing with self-signed certificates. |
| `DB_SSL_CA` | - | - | Base64-encoded CA certificate for custom certificate validation. |
| `DB_SSL_CERT` | - | - | Base64-encoded client certificate for mutual TLS authentication. |
| `DB_SSL_KEY` | - | - | Base64-encoded client key for mutual TLS authentication. |

**Example - Encoding Certificates**:
```bash
# Encode CA certificate
cat ca.crt | base64 -w 0 > ca.b64
export DB_SSL_CA=$(cat ca.b64)

# Encode client certificate
cat client.crt | base64 -w 0 > client.b64
export DB_SSL_CERT=$(cat client.b64)

# Encode client key
cat client.key | base64 -w 0 > key.b64
export DB_SSL_KEY=$(cat key.b64)
```

### Query Logging

Monitor database queries for debugging and performance analysis.

| Variable | Default (Prod) | Default (Dev) | Description |
|----------|---|---|---|
| `DB_LOG_QUERIES` | false | true | Enable logging of all database queries. Useful for debugging but can impact performance. |
| `DB_LOG_CONNECTIONS` | - | false | Log connection pool events (connect/remove). Development only. |

## Drizzle ORM Configuration

### Schema and Migrations

| Variable | Default | Description |
|----------|---------|-------------|
| `DRIZZLE_SCHEMA_PATH` | `./src/db/schema` | Path to Drizzle schema definitions. Used by Drizzle Kit for code generation. |
| `DRIZZLE_MIGRATIONS_PATH` | `./src/db/migrations` | Path to Drizzle migration files. Used by Drizzle Kit for migration management. |

### Service Migration Flags

These flags enable gradual migration from Prisma to Drizzle. Set to `true` to use Drizzle for a specific service.

| Variable | Default | Description |
|----------|---------|-------------|
| `USE_DRIZZLE_USER_SERVICE` | false | Use Drizzle for UserService (user authentication and management) |
| `USE_DRIZZLE_WORKSPACE_SERVICE` | false | Use Drizzle for WorkspaceService (workspace management) |
| `USE_DRIZZLE_TEAM_SERVICE` | false | Use Drizzle for TeamService (team management) |
| `USE_DRIZZLE_WORKFLOW_SERVICE` | false | Use Drizzle for WorkflowService (workflow definitions and management) |
| `USE_DRIZZLE_EXECUTION_SERVICE` | false | Use Drizzle for ExecutionService (workflow execution tracking) |
| `USE_DRIZZLE_CREDENTIAL_SERVICE` | false | Use Drizzle for CredentialService (credential storage and retrieval) |
| `USE_DRIZZLE_VARIABLE_SERVICE` | false | Use Drizzle for VariableService (workflow variables) |
| `USE_DRIZZLE_NODE_SERVICE` | false | Use Drizzle for NodeService (node type management) |
| `USE_DRIZZLE_TRIGGER_SERVICE` | false | Use Drizzle for TriggerService (trigger job management) |
| `USE_DRIZZLE_WEBHOOK_SERVICE` | false | Use Drizzle for WebhookService (webhook request logging) |

**Migration Strategy**:
1. Start with `USE_DRIZZLE_USER_SERVICE=true` and test thoroughly
2. Gradually enable other services one at a time
3. Monitor logs and performance after each change
4. Once all services are migrated, remove Prisma dependencies

## Authentication & Security

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `JWT_SECRET` | Yes | - | Secret key for signing JWT tokens. Must be at least 32 characters in production. Change this value in production. |
| `JWT_EXPIRES_IN` | No | `7d` | JWT token expiration time. Format: `7d`, `24h`, `3600s`, etc. |
| `CREDENTIAL_ENCRYPTION_KEY` | Yes | - | 64-character hex string for encrypting stored credentials. Must be exactly 64 characters. |
| `ENCRYPTION_KEY` | No | - | 32-character encryption key for general encryption operations. |
| `BCRYPT_ROUNDS` | No | 10 | Number of rounds for bcrypt password hashing. Higher values are more secure but slower. |
| `BETTER_AUTH_SECRET` | Yes | - | Secret for signing better-auth cookies. Must be changed in production. |

**Security Best Practices**:
- Generate strong random secrets: `openssl rand -hex 32`
- Rotate secrets regularly
- Never commit secrets to version control
- Use a secrets management system in production (e.g., AWS Secrets Manager, HashiCorp Vault)

## Server Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 4000 | Port number for the Express server. |
| `NODE_ENV` | development | Environment mode: `development`, `staging`, or `production`. Affects default configurations. |
| `BACKEND_URL` | http://localhost:4000 | Public URL of the backend server. Used for generating URLs in responses. |
| `FRONTEND_URL` | http://localhost:3000 | URL of the frontend application. Used for CORS and redirects. |
| `NODEDROP_EDITION` | community | Edition: `community` (self-hosted) or `cloud` (SaaS). |

## Logging & Debugging

| Variable | Default | Description |
|----------|---------|-------------|
| `LOG_LEVEL` | info | Logging level: `error`, `warn`, `info`, `debug`, `trace`. |

## File Storage

| Variable | Default | Description |
|----------|---------|-------------|
| `UPLOAD_DIR` | ./uploads | Directory for storing uploaded files. |
| `TEMP_DIR` | ./temp | Directory for temporary files. |

## External Services

| Variable | Default | Description |
|----------|---------|-------------|
| `REDIS_URL` | redis://localhost:6379 | Redis connection string for caching and session storage. |
| `WEBHOOK_BASE_URL` | http://localhost:4000/webhook | Base URL for webhook endpoints. Used for generating webhook URLs. |

## CORS & Development

| Variable | Default | Description |
|----------|---------|-------------|
| `ENABLE_CORS` | true | Enable CORS (Cross-Origin Resource Sharing). |
| `CORS_ORIGIN` | http://localhost:3000 | Allowed origin for CORS requests. |

## Rate Limiting

Rate limiting protects the API from abuse and excessive requests.

### Form Fetch Rate Limiting (GET requests)

| Variable | Default | Description |
|----------|---------|-------------|
| `FORM_FETCH_WINDOW_MS` | 60000 | Time window in milliseconds (1 minute). |
| `FORM_FETCH_MAX_REQUESTS` | 30 | Maximum requests allowed per window. |

### Form Submit Rate Limiting (POST requests)

| Variable | Default | Description |
|----------|---------|-------------|
| `FORM_SUBMIT_WINDOW_MS` | 900000 | Time window in milliseconds (15 minutes). |
| `FORM_SUBMIT_MAX_REQUESTS` | 5 | Maximum submissions allowed per window. |

### General API Rate Limiting

| Variable | Default | Description |
|----------|---------|-------------|
| `API_WINDOW_MS` | 60000 | Time window in milliseconds (1 minute). |
| `API_MAX_REQUESTS` | 100 | Maximum API requests allowed per window. |

### Authentication Rate Limiting

| Variable | Default | Description |
|----------|---------|-------------|
| `AUTH_WINDOW_MS` | 900000 | Time window in milliseconds (15 minutes). |
| `AUTH_MAX_REQUESTS` | 5 | Maximum authentication attempts allowed per window. |

### Rate Limiting Control

| Variable | Default | Description |
|----------|---------|-------------|
| `RATE_LIMIT_ENABLED` | true | Enable/disable rate limiting globally. |
| `RATE_LIMIT_SKIP_LOCALHOST` | true | Skip rate limiting for localhost requests (development). |

## OAuth Providers

OAuth providers enable social login functionality. Leave empty to disable.

### Google OAuth

| Variable | Default | Description |
|----------|---------|-------------|
| `GOOGLE_CLIENT_ID` | - | Google OAuth 2.0 Client ID from Google Cloud Console. |
| `GOOGLE_CLIENT_SECRET` | - | Google OAuth 2.0 Client Secret from Google Cloud Console. |

### GitHub OAuth

| Variable | Default | Description |
|----------|---------|-------------|
| `GITHUB_CLIENT_ID` | - | GitHub OAuth App Client ID. |
| `GITHUB_CLIENT_SECRET` | - | GitHub OAuth App Client Secret. |

## Environment-Specific Configurations

### Development Environment

```bash
NODE_ENV=development
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/node_drop
DB_LOG_QUERIES=true
DB_LOG_CONNECTIONS=false
LOG_LEVEL=debug
RATE_LIMIT_SKIP_LOCALHOST=true
```

### Production Environment

```bash
NODE_ENV=production
DATABASE_URL=postgresql://username:password@prod-host:5432/node_drop
DB_POOL_MAX=20
DB_POOL_MIN=5
DB_SSL=true
DB_SSL_REJECT_UNAUTHORIZED=true
DB_LOG_QUERIES=false
LOG_LEVEL=info
RATE_LIMIT_SKIP_LOCALHOST=false
```

### Testing Environment

```bash
NODE_ENV=test
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/node_drop_test
TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/node_drop_test
DB_LOG_QUERIES=false
LOG_LEVEL=error
RATE_LIMIT_ENABLED=false
```

## Configuration Validation

The application validates environment variables on startup. Missing required variables will cause the application to fail to start.

### Required Variables

- `DATABASE_URL`: Database connection string
- `JWT_SECRET`: JWT signing secret
- `CREDENTIAL_ENCRYPTION_KEY`: Credential encryption key
- `BETTER_AUTH_SECRET`: Better-auth cookie signing secret

### Optional Variables

All other variables have sensible defaults and are optional.

## Troubleshooting

### Database Connection Issues

**Problem**: `ECONNREFUSED` or `ETIMEDOUT` errors

**Solutions**:
1. Verify `DATABASE_URL` is correct
2. Check PostgreSQL server is running
3. Verify network connectivity to database host
4. Increase `DB_CONNECTION_TIMEOUT_MS` if network is slow

### SSL Certificate Errors

**Problem**: `CERTIFICATE_VERIFY_FAILED` errors

**Solutions**:
1. Verify certificate is valid: `openssl x509 -in cert.pem -text -noout`
2. Set `DB_SSL_REJECT_UNAUTHORIZED=false` for testing (not recommended for production)
3. Provide custom CA certificate via `DB_SSL_CA`

### Connection Pool Exhaustion

**Problem**: `waitingRequests > 0` for extended periods

**Solutions**:
1. Increase `DB_POOL_MAX`
2. Reduce query execution time
3. Check for connection leaks
4. Monitor application logs

### Rate Limiting Issues

**Problem**: Legitimate requests are being rate limited

**Solutions**:
1. Increase `*_MAX_REQUESTS` values
2. Increase `*_WINDOW_MS` values
3. Set `RATE_LIMIT_SKIP_LOCALHOST=true` for development
4. Disable rate limiting for specific endpoints in code

## Related Documentation

- [Drizzle Production Configuration](./DRIZZLE_PRODUCTION_CONFIG.md)
- [Production Deployment Checklist](./PRODUCTION_DEPLOYMENT_CHECKLIST.md)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Node.js pg Library](https://node-postgres.com/)
