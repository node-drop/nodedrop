import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'
import { Pool } from 'pg'
import { logger } from '../utils/logger'

// Global Prisma client instance
let prismaInstance: PrismaClient | undefined

declare global {
  var __prisma: PrismaClient | undefined
}

// Create Prisma client with proper configuration for Prisma 7
function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL
  
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set')
  }

  // Create a connection pool
  const pool = new Pool({ connectionString })
  
  // Create the Prisma adapter
  const adapter = new PrismaPg(pool)
  
  // @ts-ignore - Prisma 7 adapter type compatibility issue
  return new PrismaClient({
    adapter,
    log: ['query', 'info', 'warn', 'error'],
  })
}

// Lazy initialization - only create client when first accessed
function getPrismaClient(): PrismaClient {
  if (!prismaInstance) {
    if (process.env.NODE_ENV === 'production') {
      prismaInstance = createPrismaClient()
    } else {
      if (!global.__prisma) {
        global.__prisma = createPrismaClient()
      }
      prismaInstance = global.__prisma
    }
    
    // Set up logging - simplified for compatibility
    if (process.env.NODE_ENV === 'development') {
      logger.info('Database client initialized')
    }
  }
  
  return prismaInstance
}

// Database connection health check
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    await getPrismaClient().$queryRaw`SELECT 1`
    logger.info('Database connection successful')
    return true
  } catch (error) {
    logger.error('Database connection failed:', error)
    return false
  }
}

// Graceful shutdown
export async function disconnectDatabase(): Promise<void> {
  try {
    if (prismaInstance) {
      await prismaInstance.$disconnect()
      logger.info('Database disconnected successfully')
    }
  } catch (error) {
    logger.error('Error disconnecting from database:', error)
  }
}

// Export a Proxy that lazily initializes the client to ensure proper configuration
// and avoid initialization errors during import time
const prismaProxy = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getPrismaClient()
    const value = (client as any)[prop]
    
    // Bind functions to the client instance to preserve 'this' context
    if (typeof value === 'function') {
      return value.bind(client)
    }
    
    return value
  }
})

export const prisma = prismaProxy
export default prisma