
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
  openAiKey?: string; // Optional: allow user to pass OpenAI key if not in env (deprecated, use apiKey)
  apiKey?: string;    // Optional: allow user to pass API key if not in env
  provider?: 'openai' | 'anthropic';  // Optional: AI provider
  userId?: string;     // Optional: for user preference lookup
  model?: string;      // Optional: helpful override
  chatHistory?: { role: 'user' | 'assistant' | 'system', content: string }[];
  executionContext?: ExecutionContext;
}

export interface AgentEvent {
  type: 'status' | 'node-selection' | 'planning' | 'tool-use' | 'thinking';
  message: string;
  nodes?: string[];
  tool?: string;
}

export interface GenerateWorkflowResponse {
  workflow: Workflow | null;
  message: string;
  missingNodeTypes: string[];
  thinkingEvents?: AgentEvent[];
  thinkingDuration?: number;
  tokenUsage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

