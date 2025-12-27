
import { Workflow } from '@/types/database';

export interface GenerateWorkflowRequest {
  prompt: string;
  currentWorkflow?: Workflow;
  openAiKey?: string; // Optional: allow user to pass key if not in env
  userId?: string;     // Optional: for user preference lookup
  model?: string;      // Optional: helpful override
  chatHistory?: { role: 'user' | 'assistant' | 'system', content: string }[];
}

export interface GenerateWorkflowResponse {
  workflow: Workflow;
  message: string;
  missingNodeTypes: string[];
}
