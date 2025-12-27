
import { Workflow } from '@/types/database';


export interface ExecutionContext {
  lastRunStatus?: 'success' | 'error' | 'running';
  lastRunTime?: string;
  errors?: { nodeId: string; error: string }[];
  logs?: string[];
}

export interface GenerateWorkflowRequest {
  prompt: string;
  currentWorkflow?: Workflow;
  workflowId?: string;   // Explicit workflow ID for DB lookups (fallback if currentWorkflow.id missing)
  openAiKey?: string; // Optional: allow user to pass key if not in env
  userId?: string;     // Optional: for user preference lookup
  model?: string;      // Optional: helpful override
  chatHistory?: { role: 'user' | 'assistant' | 'system', content: string }[];
  executionContext?: ExecutionContext;
}

export interface GenerateWorkflowResponse {
  workflow: Workflow;
  message: string;
  missingNodeTypes: string[];
}

export type ToolResult = {
    toolCallId: string;
    role: 'tool';
    name: string;
    content: string;
};
