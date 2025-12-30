/**
 * Type definitions for AI Prompt Builder
 */

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ExecutionError {
  nodeId: string;
  error: string;
}

export interface ExecutionContext {
  lastRunStatus?: 'success' | 'error' | 'running' | 'Unknown';
  errors?: ExecutionError[];
  logs?: string[];
}

export interface WorkflowPosition {
  x: number;
  y: number;
}

export interface WorkflowNode {
  id: string;
  type: string;
  name?: string;
  parameters?: Record<string, unknown>;
  position?: WorkflowPosition;
}

export interface WorkflowConnection {
  sourceNodeId: string;
  sourceOutput: string;
  targetNodeId: string;
  targetInput: string;
}

export interface Workflow {
  nodes: WorkflowNode[];
  connections: WorkflowConnection[];
}

export interface PromptBuilderOptions {
  /** Include AI agent-specific patterns in the prompt */
  includeAgentPatterns?: boolean;
  /** Enable debug logging of token estimates */
  debug?: boolean;
}
