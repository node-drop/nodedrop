/**
 * Worker Entry Point
 * 
 * This is a dedicated entry point for execution workers.
 * Workers process jobs from the Redis queue without running the HTTP server.
 * 
 * Usage:
 *   npm run start:worker
 *   node dist/worker.js
 */

import 'dotenv/config';
import { checkDatabaseConnection, disconnectDatabase } from './db/client';
import { getExecutionWorker } from './services/execution/ExecutionWorker';
import { NodeService } from './services';
import { logger } from './utils/logger';

async function startWorker() {
  logger.info('🚀 Starting execution worker...');
  
  try {
    // Check database connection
    const dbConnected = await checkDatabaseConnection();
    if (!dbConnected) {
      throw new Error('Database connection failed');
    }
    logger.info('✅ Database connected');

    // Initialize NodeService
    const nodeService = new NodeService();
    await nodeService.waitForInitialization();
    
    const nodeTypes = await nodeService.getNodeTypes();
    logger.info(`✅ Loaded ${nodeTypes.length} node types`);

    // Initialize and start worker
    const worker = getExecutionWorker();
    await worker.initialize(nodeService);
    await worker.start();
    
    const status = worker.getStatus();
    logger.info('✅ Worker started successfully', {
      concurrency: process.env.EXECUTION_WORKER_CONCURRENCY || 5,
      isRunning: status.isRunning,
    });

    // Graceful shutdown handlers
    const shutdown = async (signal: string) => {
      logger.info(`${signal} received, shutting down worker gracefully...`);
      
      try {
        await worker.stop();
        logger.info('✅ Worker stopped');
        
        await disconnectDatabase();
        logger.info('✅ Database disconnected');
        
        process.exit(0);
      } catch (error) {
        logger.error('Error during shutdown:', error);
        process.exit(1);
      }
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

  } catch (error) {
    logger.error('❌ Failed to start worker:', error);
    process.exit(1);
  }
}

// Start the worker
startWorker().catch((error) => {
  logger.error('Fatal error:', error);
  process.exit(1);
});
