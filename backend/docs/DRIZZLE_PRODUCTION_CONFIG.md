# Drizzle Production Database Configuration

This document describes the production-ready database configuration for Drizzle ORM in the NodeDrop backend.

## Overview

The database client (`backend/src/db/client.ts`) has been enhanced with production-ready features:

- **Connection Pooling**: Configurable pool size with automatic connection management
- **SSL/TLS Support**: Secure database connections with certificate validation
- **Query Logging**: Optional query logging for debugging and monitoring
- **Graceful Shutdown**: Proper connection draining during application shutdown
- **Pool Statistics**: Real-time monitoring of connection pool health

## Connection Pooling

### Default Configuration

**Production Environment** (`NODE_ENV=production`):
- Maximum connections: 20
- Minimum connections: 5
- Idle timeout: 30 seconds
- Connection timeout: 5 seconds
- Max uses per connection: 7500 (connections recycled after this many uses)

**Development Environment** (`NODE_ENV=development`):
- Maximum connections: 10
- Minimum connections: 2
- Idle timeout: 10 seconds
- Connection timeout: 5 seconds

### Customizing Pool Configuration

Override default pool settings using environment variables:

```bash
# Maximum connections in pool
DB_POOL_MAX=20

# Minimum connections to maintain
DB_POOL_MIN=5

# Idle connection timeout (milliseconds)
DB_IDLE_TIMEOUT_MS=30000

# Connection acquisition timeout (milliseconds)
DB_CONNECTION_TIMEOUT_MS=5000

# Recycle connections after N uses (production only)
DB_MAX_USES=7500
```

### Pool Statistics

Monitor connection pool health using the `getPoolStats()` function:

```typescript
import { getPoolStats } from './db/client';

const stats = getPoolStats();
console.log(stats);
// Output:
// {
//   totalConnections: 15,
//   idleConnections: 12,
//   waitingRequests: 0
// }
```

## SSL/TLS Configuration

### Automatic SSL in Production

When `NODE_ENV=production`, SSL is automatically enabled with:
- Certificate validation enabled by default
- Support for custom CA certificates
- Support for mutual TLS (client certificates)

### Enabling SSL in Development

To test SSL in development, set:

```bash
DB_SSL=true
```

### Custom SSL Certificates

For environments with custom or self-signed certificates:

```bash
# Disable certificate validation (not recommended for production)
DB_SSL_REJECT_UNAUTHORIZED=false

# Provide custom CA certificate (base64-encoded)
DB_SSL_CA="base64-encoded-ca-certificate"

# Provide client certificate for mutual TLS (base64-encoded)
DB_SSL_CERT="base64-encoded-client-certificate"

# Provide client key for mutual TLS (base64-encoded)
DB_SSL_KEY="base64-encoded-client-key"
```

### Encoding Certificates

To encode certificates as base64:

```bash
# Encode CA certificate
cat ca.crt | base64 -w 0 > ca.b64

# Encode client certificate
cat client.crt | base64 -w 0 > client.b64

# Encode client key
cat client.key | base64 -w 0 > key.b64
```

Then set the environment variables with the base64 content.

## Query Logging

### Enabling Query Logging

Query logging is automatically enabled in development. To enable in production:

```bash
DB_LOG_QUERIES=true
```

### Connection Pool Event Logging

To log connection pool events (connect/remove) in development:

```bash
DB_LOG_CONNECTIONS=true
```

**Note**: Connection event logging is only available in development to avoid excessive logging in production.

## Graceful Shutdown

The application implements graceful shutdown with proper connection pool draining:

### Shutdown Process

1. Stop accepting new requests
2. Remove event listeners to prevent memory leaks
3. Shutdown services (node loader, socket service, schedule manager)
4. Drain connection pool (wait for active connections to complete)
5. Close database connection
6. Close HTTP server

### Drain Connection Pool

The `drainConnectionPool()` function waits for all active connections to complete:

```typescript
import { drainConnectionPool } from './db/client';

// Wait up to 30 seconds for connections to drain
await drainConnectionPool(30000);
```

### Graceful Shutdown Signals

The application handles:
- `SIGTERM`: Kubernetes/Docker termination signal
- `SIGINT`: Ctrl+C in terminal

Both signals trigger the same graceful shutdown sequence.

## Monitoring and Debugging

### Health Check Endpoint

The `/health` endpoint provides basic health information:

```bash
curl http://localhost:4000/health
```

Response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "service": "node-drop-backend",
  "version": "1.0.0",
  "nodes": {
    "registered_count": 42,
    "status": "ok"
  }
}
```

### Connection Pool Monitoring

Check pool statistics in your application:

```typescript
import { getPoolStats } from './db/client';

// Log pool stats periodically
setInterval(() => {
  const stats = getPoolStats();
  console.log('Pool stats:', stats);
}, 60000); // Every minute
```

### Query Performance

Enable query logging to monitor query performance:

```bash
DB_LOG_QUERIES=true
```

Queries will be logged with:
- Query text (first 200 characters)
- Parameter count
- Timestamp

## Best Practices

### 1. Connection Pool Sizing

- **Small deployments** (< 100 concurrent users): `max=10, min=2`
- **Medium deployments** (100-1000 concurrent users): `max=20, min=5`
- **Large deployments** (> 1000 concurrent users): `max=50, min=10`

Monitor actual usage and adjust based on `waitingRequests` metric.

### 2. SSL/TLS in Production

- Always enable SSL in production (`NODE_ENV=production`)
- Use certificate validation (`DB_SSL_REJECT_UNAUTHORIZED=true`)
- Rotate certificates regularly
- Monitor certificate expiration

### 3. Connection Recycling

- Enable connection recycling in production (`DB_MAX_USES=7500`)
- This prevents long-lived connections from accumulating stale state
- Adjust based on your database's connection limits

### 4. Timeout Configuration

- Connection timeout: 5 seconds (default, suitable for most cases)
- Idle timeout: 30 seconds (production), 10 seconds (development)
- Adjust based on your network latency and database load

### 5. Monitoring

- Monitor pool statistics regularly
- Alert on high `waitingRequests` (indicates pool exhaustion)
- Monitor query performance with query logging
- Track connection errors and reconnection attempts

## Troubleshooting

### Connection Pool Exhaustion

**Symptom**: `waitingRequests > 0` for extended periods

**Solutions**:
1. Increase `DB_POOL_MAX`
2. Reduce query execution time
3. Check for connection leaks (connections not being released)
4. Monitor application logs for errors

### SSL Certificate Errors

**Symptom**: `CERTIFICATE_VERIFY_FAILED` or similar SSL errors

**Solutions**:
1. Verify certificate is valid: `openssl x509 -in cert.pem -text -noout`
2. Check certificate chain: `openssl s_client -connect host:port`
3. Disable validation for testing: `DB_SSL_REJECT_UNAUTHORIZED=false`
4. Provide custom CA: `DB_SSL_CA="base64-encoded-ca"`

### Connection Timeout

**Symptom**: `connect ETIMEDOUT` errors

**Solutions**:
1. Increase `DB_CONNECTION_TIMEOUT_MS`
2. Check network connectivity to database
3. Check database server is running and accepting connections
4. Check firewall rules allow connections

### Graceful Shutdown Timeout

**Symptom**: Application doesn't shut down within expected time

**Solutions**:
1. Increase drain timeout: `await drainConnectionPool(60000)`
2. Check for long-running queries
3. Check for stuck connections
4. Monitor pool statistics during shutdown

## Environment Variables Reference

| Variable | Default (Prod) | Default (Dev) | Description |
|----------|---|---|---|
| `DATABASE_URL` | Required | Required | PostgreSQL connection string |
| `NODE_ENV` | - | - | Set to `production` for production config |
| `DB_POOL_MAX` | 20 | 10 | Maximum connections in pool |
| `DB_POOL_MIN` | 5 | 2 | Minimum connections to maintain |
| `DB_IDLE_TIMEOUT_MS` | 30000 | 10000 | Idle connection timeout (ms) |
| `DB_CONNECTION_TIMEOUT_MS` | 5000 | 5000 | Connection acquisition timeout (ms) |
| `DB_MAX_USES` | 7500 | - | Recycle connections after N uses |
| `DB_SSL` | true | false | Enable SSL connections |
| `DB_SSL_REJECT_UNAUTHORIZED` | true | - | Validate SSL certificates |
| `DB_SSL_CA` | - | - | Custom CA certificate (base64) |
| `DB_SSL_CERT` | - | - | Client certificate (base64) |
| `DB_SSL_KEY` | - | - | Client key (base64) |
| `DB_LOG_QUERIES` | false | true | Enable query logging |
| `DB_LOG_CONNECTIONS` | - | false | Log connection pool events |

## Related Documentation

- [Drizzle ORM Documentation](https://orm.drizzle.team/)
- [PostgreSQL Connection Pooling](https://www.postgresql.org/docs/current/runtime-config-connection.html)
- [Node.js pg Library](https://node-postgres.com/)
- [SSL/TLS Configuration](https://node-postgres.com/features/ssl)
