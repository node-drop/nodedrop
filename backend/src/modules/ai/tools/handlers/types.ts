/**
 * Tool Handler Types
 * 
 * Defines interfaces for AI tool handlers used with Vercel AI SDK v6.
 * These handlers are called by the tool execute functions in tools.ts.
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
 * Result from a non-final tool handler (e.g., get_execution_logs, validate_workflow)
 * This data is returned to the AI model for further processing
 */
export interface ToolResult {
  /** JSON-serializable data to return to the AI */
  data: any;
}

/**
 * Handler for a single AI tool
 * 
 * Note: With Vercel AI SDK v6, the agentic loop is handled by the SDK via maxSteps.
 * The `isFinal` flag is kept for documentation purposes but the SDK determines
 * when to stop based on whether the model makes more tool calls.
 */
export interface ToolHandler {
  /** Tool name (must match the name in tools.ts) */
  name: string;
  
  /** 
   * Documentation flag indicating if this tool typically ends the conversation.
   * - true: build_workflow, advise_user, enhance_prompt (user-facing responses)
   * - false: get_latest_execution_logs, validate_workflow (intermediate tools)
   * 
   * Note: The actual loop control is handled by Vercel AI SDK's maxSteps setting.
   */
  isFinal: boolean;
  
  /**
   * Execute the tool with parsed arguments
   * @param args Parsed arguments from the AI (validated by Zod schema in tools.ts)
   * @param context Execution context with request data and current workflow
   * @returns Either a ToolResult (for intermediate tools) or GenerateWorkflowResponse (for final tools)
   */
  execute(args: any, context: ToolContext): Promise<ToolResult | GenerateWorkflowResponse>;
}
