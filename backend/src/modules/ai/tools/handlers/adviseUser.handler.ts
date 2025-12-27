/**
 * Advise User Tool Handler
 * 
 * Handles the advise_user tool call from AI.
 * Returns advice without modifying the workflow.
 */

import { GenerateWorkflowResponse } from '@/modules/ai/types';
import { logger } from '@/utils/logger';
import { ToolContext, ToolHandler } from './types';

export const adviseUserHandler: ToolHandler = {
  name: 'advise_user',
  isFinal: true,

  async execute(args: any, context: ToolContext): Promise<GenerateWorkflowResponse> {
    const message = args.message;
    const suggestions = args.suggestions;

    let fullMessage = message;
    if (suggestions && suggestions.length > 0) {
      fullMessage += `\n\nTips:\n${suggestions.map((s: string) => `- ${s}`).join('\n')}`;
    }

    logger.info('advise_user handler executed');

    return {
      workflow: null as any, // Null signals to frontend: do NOT show workflow widget
      message: fullMessage,
      missingNodeTypes: []
    };
  }
};
