/**
 * Tool Handler Types
 * 
 * Defines interfaces for AI tool handlers in the agentic loop.
 */

import { GenerateWorkflowRequest, GenerateWorkflowResponse } from '@/modules/ai/types';
import { Workflow } from '@/types/database';

/**
 * Context passed to tool handlers during execution
 */
export interface ToolContext {
  /** The original request */
  request: GenerateWorkflowRequest;
  /** Current workflow state */
  currentWorkflow?: Workflow;
  /** Database client (for handlers that need DB access) */
  db: any;
}

/**
 * Result from a tool handler
 */
export interface ToolResult {
  /** JSON-serializable data to return to the AI */
  data: any;
}

/**
 * Handler for a single AI tool
 */
export interface ToolHandler {
  /** Tool name (must match the name in tools.ts) */
  name: string;
  
  /** 
   * If true, this tool ends the agentic loop and returns to user.
   * Examples: build_workflow, advise_user
   * If false, the result is fed back to the AI for another turn.
   * Examples: get_latest_execution_logs
   */
  isFinal: boolean;
  
  /**
   * Execute the tool with parsed arguments
   * @param args Parsed arguments from the AI
   * @param context Execution context
   */
  execute(args: any, context: ToolContext): Promise<ToolResult | GenerateWorkflowResponse>;
}
