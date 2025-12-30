/**
 * Prompt Limits Configuration
 * 
 * Configurable limits for prompt building to control token usage.
 */

export const PROMPT_LIMITS = {
  /** Max characters for individual chat messages before truncation */
  chatMessageMaxLength: 500,
  
  /** Number of execution logs to keep in context */
  executionLogsToKeep: 5,
  
  /** Minimum chat history length to trigger TOON encoding */
  minChatHistoryForToon: 3,
  
  /** Max characters for error messages */
  errorMessageMaxLength: 300,
} as const;

export type PromptLimits = typeof PROMPT_LIMITS;
