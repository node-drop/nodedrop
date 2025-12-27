/**
 * Tool Handler Registry
 * 
 * Central registry for AI tool handlers.
 * Allows dynamic registration and lookup of tool handlers.
 */

import { logger } from '@/utils/logger';
import {
  adviseUserHandler,
  buildWorkflowHandler,
  getExecutionLogsHandler,
  validateWorkflowHandler
} from './handlers';
import { ToolHandler } from './handlers/types';

class ToolRegistry {
  private handlers: Map<string, ToolHandler> = new Map();

  /**
   * Register a tool handler
   */
  register(handler: ToolHandler): void {
    if (this.handlers.has(handler.name)) {
      logger.warn(`Tool handler '${handler.name}' is being overwritten`);
    }
    this.handlers.set(handler.name, handler);
    logger.info(`Registered tool handler: ${handler.name}`);
  }

  /**
   * Get a handler by tool name
   */
  get(name: string): ToolHandler | undefined {
    return this.handlers.get(name);
  }

  /**
   * Check if a handler exists
   */
  has(name: string): boolean {
    return this.handlers.has(name);
  }

  /**
   * Get all registered handler names
   */
  getRegisteredNames(): string[] {
    return Array.from(this.handlers.keys());
  }

  /**
   * Check if a tool is a "final" tool (ends the loop)
   */
  isFinalTool(name: string): boolean {
    const handler = this.handlers.get(name);
    return handler?.isFinal ?? false;
  }
}

// Singleton instance
export const toolRegistry = new ToolRegistry();

// Auto-register handlers on import
export function registerAllHandlers(): void {
  toolRegistry.register(buildWorkflowHandler);
  toolRegistry.register(adviseUserHandler);
  toolRegistry.register(getExecutionLogsHandler);
  toolRegistry.register(validateWorkflowHandler);
}
