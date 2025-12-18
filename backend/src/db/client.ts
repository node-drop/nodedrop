import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool, PoolClient } from 'pg';
import * as schema from './schema';
import { logger } from '../utils/logger';

/**
 * Create database pool with production-ready configuration
 * Supports connection pooling, SSL/TLS, and query logging
 */
function createDatabasePool(): Pool {
  const isProduction = process.env.NODE_ENV === 'production';
  const isDevelopment = process.env.NODE_ENV === 'development';

  // Parse connection string to extract components
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  // Connection pool configuration
  const poolConfig: any = {
    connectionString,
    // Connection pooling settings
    max: isProduction ? 20 : 10, // Maximum number of connections in pool
    min: isProduction ? 5 : 2, // Minimum number of connections to maintain
    idleTimeoutMillis: isProduction ? 30000 : 10000, // Close idle connections after 30s (prod) or 10s (dev)
    connectionTimeoutMillis: 5000, // Timeout for acquiring a connection
    maxUses: isProduction ? 7500 : undefined, // Recycle connections after N uses (production only)
  };

  // SSL/TLS configuration for production
  // Disable SSL for Docker environments (connecting to local postgres)
  const isDocker = process.env.CONTAINER_NAME === 'node-drop' || connectionString.includes('@postgres:');
  
  if (isProduction && !isDocker) {
    // Enable SSL for production (but not in Docker with local DB)
    poolConfig.ssl = {
      rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false',
      // Support custom CA certificate if provided
      ca: process.env.DB_SSL_CA ? Buffer.from(process.env.DB_SSL_CA, 'base64').toString() : undefined,
      cert: process.env.DB_SSL_CERT ? Buffer.from(process.env.DB_SSL_CERT, 'base64').toString() : undefined,
      key: process.env.DB_SSL_KEY ? Buffer.from(process.env.DB_SSL_KEY, 'base64').toString() : undefined,
    };
  } else if (process.env.DB_SSL === 'true') {
    // Allow SSL in development if explicitly enabled
    poolConfig.ssl = {
      rejectUnauthorized: false,
    };
  }

  const pool = new Pool(poolConfig);

  // Error handling for pool
  pool.on('error', (err) => {
    logger.error('Unexpected error on idle client in connection pool', {
      error: err.message,
      code: (err as any).code,
    });
  });

  // Connection event logging (development only)
  if (isDevelopment && process.env.DB_LOG_CONNECTIONS === 'true') {
    pool.on('connect', () => {
      logger.debug('New database connection established');
    });

    pool.on('remove', () => {
      logger.debug('Database connection removed from pool');
    });
  }

  return pool;
}

// Create the connection pool
const pool = createDatabasePool();

/**
 * Create Drizzle instance with optional query logging
 */
function createDrizzleInstance(pool: Pool): NodePgDatabase<typeof schema> {
  const isDevelopment = process.env.NODE_ENV === 'development';
  const enableQueryLogging = process.env.DB_LOG_QUERIES === 'true' || isDevelopment;

  const drizzleConfig: any = {
    schema,
  };

  // Enable query logging in development or when explicitly enabled
  if (enableQueryLogging) {
    drizzleConfig.logger = {
      logQuery: (query: string, params: unknown[]) => {
        logger.debug('Database query', {
          query: query.substring(0, 200), // Truncate long queries
          paramCount: params.length,
        });
      },
    };
  }

  return drizzle(pool, drizzleConfig);
}

export const db: NodePgDatabase<typeof schema> = createDrizzleInstance(pool);

/**
 * Get current pool statistics
 */
export function getPoolStats() {
  return {
    totalConnections: pool.totalCount,
    idleConnections: pool.idleCount,
    waitingRequests: pool.waitingCount,
  };
}

/**
 * Check if database connection is active
 */
export async function checkDatabaseConnection(): Promise<boolean> {
  let client: PoolClient | null = null;
  try {
    client = await pool.connect();
    await client.query('SELECT 1');
    logger.info('Database connection successful', getPoolStats());
    return true;
  } catch (error) {
    logger.error('Database connection failed:', {
      error: error instanceof Error ? error.message : String(error),
      poolStats: getPoolStats(),
    });
    return false;
  } finally {
    if (client) {
      client.release();
    }
  }
}

/**
 * Gracefully disconnect from database
 */
export async function disconnectDatabase(): Promise<void> {
  try {
    const stats = getPoolStats();
    logger.info('Closing database connection pool', stats);
    
    await pool.end();
    logger.info('Database connection pool closed successfully');
  } catch (error) {
    logger.error('Error closing database connection:', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Drain the connection pool (useful for graceful shutdown)
 * Waits for all active connections to complete before closing
 */
export async function drainConnectionPool(timeoutMs: number = 30000): Promise<void> {
  const startTime = Date.now();
  
  while (pool.totalCount > 0 && Date.now() - startTime < timeoutMs) {
    const stats = getPoolStats();
    if (stats.totalConnections === 0) {
      break;
    }
    
    logger.debug('Waiting for connections to drain', stats);
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  if (pool.totalCount > 0) {
    logger.warn('Connection pool did not fully drain before timeout', getPoolStats());
  }
}

export default db;
