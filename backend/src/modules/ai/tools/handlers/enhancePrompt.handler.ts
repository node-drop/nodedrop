/**
 * Enhance Prompt Tool Handler
 * 
 * Clarifies vague user requests before building workflows.
 * Returns enhanced prompt with assumptions and questions.
 */

import { GenerateWorkflowResponse } from '@/modules/ai/types';
import { logger } from '@/utils/logger';
import { ToolContext, ToolHandler } from './types';

export const enhancePromptHandler: ToolHandler = {
  name: 'enhance_prompt',
  isFinal: true, // This ends the loop and returns to user for confirmation

  async execute(args: any, context: ToolContext): Promise<GenerateWorkflowResponse> {
    const { enhanced_prompt, assumptions, questions, confidence } = args;
    
    logger.info('enhance_prompt handler executed', { 
      confidence, 
      assumptionCount: assumptions?.length,
      questionCount: questions?.length 
    });

    // Build a SHORT, user-friendly response message
    let message = '';
    
    if (confidence >= 0.8) {
      // High confidence - just confirm and go
      message = `Got it: **${enhanced_prompt}**\n\n`;
      message += `Say "yes" to build, or tell me what to change.`;
    } else {
      // Low confidence - quick questions
      message = `I understood: **${enhanced_prompt}**\n\n`;
      
      if (questions && questions.length > 0) {
        // Only show first 3 questions max
        const shortQuestions = questions.slice(0, 3);
        shortQuestions.forEach((q: string) => {
          message += `• ${q}\n`;
        });
      }
    }

    return {
      workflow: context.currentWorkflow || null,
      message: message,
      missingNodeTypes: []
    };
  }
};
