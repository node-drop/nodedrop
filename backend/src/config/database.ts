import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import { logger } from '../utils/logger'

// Global Prisma client instance
let prisma: PrismaClient | undefined

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

// Lazy initialization function
function getPrismaClient(): PrismaClient {
  if (!prisma) {
    if (process.env.NODE_ENV === 'production') {
      prisma = createPrismaClient()
    } else {
      if (!global.__prisma) {
        global.__prisma = createPrismaClient()
      }
      prisma = global.__prisma
    }
    
    // Set up logging - simplified for compatibility
    if (process.env.NODE_ENV === 'development') {
      logger.info('Database client initialized')
    }
  }
  
  return prisma
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
    if (prisma) {
      await prisma.$disconnect()
      logger.info('Database disconnected successfully')
    }
  } catch (error) {
    logger.error('Error disconnecting from database:', error)
  }
}

// Export a proxy that lazily initializes the client
const prismaProxy = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getPrismaClient()
    return (client as any)[prop]
  }
})

export { prismaProxy as prisma }
export default prismaProxy