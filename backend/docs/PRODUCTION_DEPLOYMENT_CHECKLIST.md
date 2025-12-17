# Production Deployment Checklist for Drizzle ORM

This checklist ensures your NodeDrop backend is properly configured for production deployment with Drizzle ORM.

## Pre-Deployment Configuration

### 1. Environment Variables

- [ ] Set `NODE_ENV=production`
- [ ] Configure `DATABASE_URL` with production PostgreSQL connection string
- [ ] Enable SSL/TLS for database connections:
  - [ ] Set `DB_SSL=true` (automatic in production)
  - [ ] Set `DB_SSL_REJECT_UNAUTHORIZED=true` (default in production)
  - [ ] Provide custom CA certificate if needed: `DB_SSL_CA`
  - [ ] Provide client certificate if using mutual TLS: `DB_SSL_CERT`
  - [ ] Provide client key if using mutual TLS: `DB_SSL_KEY`

### 2. Connection Pool Configuration

- [ ] Review default pool settings for your deployment size:
  - Small (< 100 concurrent users): `DB_POOL_MAX=10, DB_POOL_MIN=2`
  - Medium (100-1000 concurrent users): `DB_POOL_MAX=20, DB_POOL_MIN=5` (default)
  - Large (> 1000 concurrent users): `DB_POOL_MAX=50, DB_POOL_MIN=10`
- [ ] Set `DB_IDLE_TIMEOUT_MS=30000` (30 seconds)
- [ ] Set `DB_CONNECTION_TIMEOUT_MS=5000` (5 seconds)
- [ ] Enable connection recycling: `DB_MAX_USES=7500`

### 3. Query Logging

- [ ] Disable query logging in production: `DB_LOG_QUERIES=false` (default)
- [ ] Disable connection pool event logging: `DB_LOG_CONNECTIONS=false` (default)
- [ ] Enable only if debugging: `DB_LOG_QUERIES=true`

### 4. Database Preparation

- [ ] Verify PostgreSQL version is 12 or higher
- [ ] Create production database
- [ ] Run Drizzle migrations: `npm run db:migrate`
- [ ] Verify all tables are created correctly
- [ ] Set up database backups
- [ ] Configure database monitoring and alerts

### 5. Application Configuration

- [ ] Set `PORT` to desired port (default: 4000)
- [ ] Configure `CORS_ORIGIN` for frontend domain
- [ ] Set `JWT_SECRET` to a strong random value
- [ ] Set `ENCRYPTION_KEY` to a strong random value
- [ ] Configure `WEBHOOK_BASE_URL` for production domain
- [ ] Set `BETTER_AUTH_SECRET` to a strong random value

### 6. Security

- [ ] Enable HTTPS/TLS for all external connections
- [ ] Configure firewall to restrict database access
- [ ] Use strong passwords for database user
- [ ] Rotate secrets regularly
- [ ] Enable database audit logging
- [ ] Set up intrusion detection

### 7. Monitoring and Logging

- [ ] Configure centralized logging (e.g., ELK, Datadog, CloudWatch)
- [ ] Set up monitoring for:
  - [ ] Database connection pool health
  - [ ] Query performance
  - [ ] Application error rates
  - [ ] Memory usage
  - [ ] CPU usage
- [ ] Configure alerts for:
  - [ ] Connection pool exhaustion
  - [ ] High query latency
  - [ ] Database connection failures
  - [ ] Application crashes

### 8. Backup and Recovery

- [ ] Set up automated database backups
- [ ] Test backup restoration process
- [ ] Document recovery procedures
- [ ] Store backups in secure location
- [ ] Verify backup retention policy

### 9. Performance Tuning

- [ ] Run performance tests with production-like load
- [ ] Monitor query performance
- [ ] Add database indexes if needed
- [ ] Optimize slow queries
- [ ] Verify connection pool is appropriately sized

### 10. Deployment

- [ ] Build Docker image with production dependencies
- [ ] Test Docker image locally
- [ ] Push image to container registry
- [ ] Deploy to production environment
- [ ] Verify application starts successfully
- [ ] Verify database connection is working
- [ ] Run smoke tests
- [ ] Monitor application for errors

## Post-Deployment Verification

### 1. Health Checks

- [ ] Verify `/health` endpoint returns `status: ok`
- [ ] Verify database connection is active
- [ ] Verify all services are initialized
- [ ] Verify nodes are loaded

### 2. Database Verification

- [ ] Verify all tables exist
- [ ] Verify data integrity
- [ ] Verify relationships are working
- [ ] Verify constraints are enforced

### 3. Connection Pool Monitoring

- [ ] Monitor pool statistics regularly
- [ ] Verify no connection pool exhaustion
- [ ] Verify idle connections are being recycled
- [ ] Verify connection timeout is not being hit

### 4. Performance Monitoring

- [ ] Monitor query performance
- [ ] Monitor application response times
- [ ] Monitor memory usage
- [ ] Monitor CPU usage

### 5. Error Monitoring

- [ ] Monitor application error logs
- [ ] Monitor database error logs
- [ ] Verify error handling is working
- [ ] Verify error alerts are being sent

## Troubleshooting

### Connection Pool Issues

If experiencing connection pool exhaustion:

1. Check `waitingRequests` in pool statistics
2. Increase `DB_POOL_MAX` if consistently high
3. Check for connection leaks in application code
4. Monitor query execution time
5. Consider query optimization

### SSL/TLS Issues

If experiencing SSL certificate errors:

1. Verify certificate is valid: `openssl x509 -in cert.pem -text -noout`
2. Check certificate chain: `openssl s_client -connect host:port`
3. Verify certificate matches hostname
4. Check certificate expiration date
5. Verify CA certificate is correct

### Performance Issues

If experiencing slow queries:

1. Enable query logging: `DB_LOG_QUERIES=true`
2. Identify slow queries
3. Add indexes to frequently queried columns
4. Optimize query logic
5. Consider query caching

### Graceful Shutdown Issues

If application doesn't shut down cleanly:

1. Check for long-running queries
2. Check for stuck connections
3. Increase drain timeout: `await drainConnectionPool(60000)`
4. Monitor pool statistics during shutdown
5. Check application logs for errors

## Related Documentation

- [Drizzle Production Configuration](./DRIZZLE_PRODUCTION_CONFIG.md)
- [Database Configuration](./DATABASE.md)
- [Drizzle ORM Documentation](https://orm.drizzle.team/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Node.js pg Library](https://node-postgres.com/)

## Support

For issues or questions:

1. Check the troubleshooting section above
2. Review application logs
3. Check database logs
4. Consult Drizzle ORM documentation
5. Open an issue on GitHub

## Deployment Completed

- [ ] All checklist items completed
- [ ] Application deployed successfully
- [ ] Health checks passing
- [ ] Monitoring configured
- [ ] Team notified of deployment
