
import { Workflow } from '@/types/database';

export interface GenerateWorkflowRequest {
  prompt: string;
  currentWorkflow?: Workflow;
  openAiKey?: string; // Optional: allow user to pass key if not in env
}

export interface GenerateWorkflowResponse {
  workflow: Workflow;
  message: string;
  missingNodeTypes: string[];
}
