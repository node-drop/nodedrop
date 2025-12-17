/**
 * NodeService Factory
 *
 * This file provides a factory function to switch between Prisma and Drizzle
 * implementations of the NodeService based on the USE_DRIZZLE_NODE_SERVICE
 * environment variable.
 *
 * This allows for gradual migration from Prisma to Drizzle without breaking
 * existing code.
 */

import { NodeServiceDrizzle } from './NodeService.drizzle';
import { logger } from '../utils/logger';

// Type definitions for the service interface
export interface INodeService {
  waitForInitialization(): Promise<void>;
  registerNode(nodeDefinition: any, isCore?: boolean, options?: any): Promise<any>;
  unregisterNode(nodeType: string): Promise<void>;
  unloadNodeFromMemory(nodeType: string): Promise<void>;
  getNodeTypes(options?: any): Promise<any[]>;
  getNodeDefinitionSync(nodeType: string): any;
  getNodeDefinition(nodeType: string): Promise<any>;
  getNodeSchema(nodeType: string): Promise<any>;
  executeNode(
    nodeType: string,
    parameters: Record<string, any>,
    inputData: any,
    credentials?: Record<string, any>,
    executionId?: string,
    userId?: string,
    options?: any,
    workflowId?: string,
    settings?: any,
    nodeOutputs?: Map<string, any>,
    nodeIdToName?: Map<string, string>
  ): Promise<any>;
  validateNodeDefinition(definition: any): any;
  activateNode(nodeType: string): Promise<any>;
  deactivateNode(nodeType: string): Promise<any>;
  getActiveNodes(): Promise<any[]>;
  getNodesWithStatus(): Promise<any[]>;
  bulkUpdateNodeStatus(nodeTypeIds: string[], active: boolean): Promise<any>;
  refreshCustomNodes(): Promise<any>;
  loadNodeOptions(
    nodeType: string,
    method: string,
    parameters?: Record<string, any>,
    credentials?: Record<string, any>
  ): Promise<any>;
}

/**
 * Get the appropriate NodeService implementation based on environment variable
 */
function getNodeService(): INodeService {
  const useDrizzle = process.env.USE_DRIZZLE_NODE_SERVICE === 'true';

  if (useDrizzle) {
    logger.info('Using Drizzle NodeService');
    return new NodeServiceDrizzle();
  }

  // Fallback to Drizzle as default
  logger.info('Using Drizzle NodeService (default)');
  return new NodeServiceDrizzle();
}

/**
 * Export the service instance
 */
export const nodeServiceDrizzle = getNodeService();

// Re-export types from Drizzle implementation
export { NodeServiceDrizzle };
