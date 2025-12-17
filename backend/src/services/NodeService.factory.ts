/**
 * NodeService Factory
 *
 * This file provides the NodeService implementation using Drizzle ORM.
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
 * Get the NodeService implementation (Drizzle ORM)
 */
function getNodeService(): INodeService {
  logger.debug('Initializing Drizzle NodeService');
  return new NodeServiceDrizzle();
}

/**
 * Export the service instance
 */
export const nodeServiceDrizzle = getNodeService();

// Re-export types from Drizzle implementation
export { NodeServiceDrizzle };
