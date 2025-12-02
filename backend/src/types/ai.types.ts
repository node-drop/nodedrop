// AI Node Type Definitions

export interface AIMessage {
  role: "system" | "user" | "assistant";
  content: string;
  timestamp?: number;
}

export interface AIUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCost?: number;
}

export interface AIResponse {
  content: string;
  usage: AIUsage;
  model: string;
  finishReason?: string;
}

export interface ConversationMemory {
  sessionId: string;
  messages: AIMessage[];
  createdAt: number;
  updatedAt: number;
}

export interface OpenAIModels {
  "gpt-4o": string;
  "gpt-4o-mini": string;
  "gpt-4-turbo": string;
  "gpt-4": string;
  "gpt-3.5-turbo": string;
}

export interface AnthropicModels {
  "claude-3-5-sonnet-20241022": string;
  "claude-3-5-haiku-20241022": string;
  "claude-3-opus-20240229": string;
  "claude-3-sonnet-20240229": string;
  "claude-3-haiku-20240307": string;
}

export const OPENAI_MODELS: Record<
  keyof OpenAIModels,
  {
    name: string;
    contextWindow: number;
    costPer1kInput: number;
    costPer1kOutput: number;
  }
> = {
  "gpt-4o": {
    name: "GPT-4o",
    contextWindow: 128000,
    costPer1kInput: 0.0025,
    costPer1kOutput: 0.01,
  },
  "gpt-4o-mini": {
    name: "GPT-4o Mini",
    contextWindow: 128000,
    costPer1kInput: 0.00015,
    costPer1kOutput: 0.0006,
  },
  "gpt-4-turbo": {
    name: "GPT-4 Turbo",
    contextWindow: 128000,
    costPer1kInput: 0.01,
    costPer1kOutput: 0.03,
  },
  "gpt-4": {
    name: "GPT-4",
    contextWindow: 8192,
    costPer1kInput: 0.03,
    costPer1kOutput: 0.06,
  },
  "gpt-3.5-turbo": {
    name: "GPT-3.5 Turbo",
    contextWindow: 16385,
    costPer1kInput: 0.0005,
    costPer1kOutput: 0.0015,
  },
};

export const ANTHROPIC_MODELS: Record<
  keyof AnthropicModels,
  {
    name: string;
    contextWindow: number;
    costPer1kInput: number;
    costPer1kOutput: number;
  }
> = {
  "claude-3-5-sonnet-20241022": {
    name: "Claude 3.5 Sonnet",
    contextWindow: 200000,
    costPer1kInput: 0.003,
    costPer1kOutput: 0.015,
  },
  "claude-3-5-haiku-20241022": {
    name: "Claude 3.5 Haiku",
    contextWindow: 200000,
    costPer1kInput: 0.0008,
    costPer1kOutput: 0.004,
  },
  "claude-3-opus-20240229": {
    name: "Claude 3 Opus",
    contextWindow: 200000,
    costPer1kInput: 0.015,
    costPer1kOutput: 0.075,
  },
  "claude-3-sonnet-20240229": {
    name: "Claude 3 Sonnet",
    contextWindow: 200000,
    costPer1kInput: 0.003,
    costPer1kOutput: 0.015,
  },
  "claude-3-haiku-20240307": {
    name: "Claude 3 Haiku",
    contextWindow: 200000,
    costPer1kInput: 0.00025,
    costPer1kOutput: 0.00125,
  },
};
