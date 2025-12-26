
import { AI_TOOLS } from '@/modules/ai/config/tools';
import { AIContextBuilder } from '@/modules/ai/services/utils/AIContextBuilder';
import { AIPromptBuilder } from '@/modules/ai/services/utils/AIPromptBuilder';
import { AIResponseProcessor } from '@/modules/ai/services/utils/AIResponseProcessor';
import { GenerateWorkflowRequest, GenerateWorkflowResponse } from '@/modules/ai/types';
import { NodeService } from '@/services/nodes/NodeService';
import { logger } from '@/utils/logger';
import OpenAI from 'openai';

export class AIService {
  private nodeService: NodeService;
  private openai: OpenAI | null = null;
  private contextBuilder: AIContextBuilder;
  private promptBuilder: AIPromptBuilder;
  private responseProcessor: AIResponseProcessor;

  constructor(nodeService: NodeService) {
    this.nodeService = nodeService;
    this.contextBuilder = new AIContextBuilder(nodeService);
    this.promptBuilder = new AIPromptBuilder();
    this.responseProcessor = new AIResponseProcessor(nodeService);
    this.initializeOpenAI();
  }

  private initializeOpenAI() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (apiKey) {
      this.openai = new OpenAI({ apiKey });
    }
  }

  public async generateWorkflow(
    request: GenerateWorkflowRequest
  ): Promise<GenerateWorkflowResponse> {
    // 1. Initialize client (or use provided key)
    let client = this.openai;
    if (request.openAiKey) {
      client = new OpenAI({ apiKey: request.openAiKey });
    }

    if (!client) {
      throw new Error('OpenAI API key not configured. Please set OPENAI_API_KEY env var or provide it in the request.');
    }

    // 2. Build Context (Node Schemas)
    const nodeContext = await this.contextBuilder.buildNodeContext();

    // 3. Build System Prompt
    const systemPrompt = this.promptBuilder.buildSystemPrompt(nodeContext);

    // 4. Build User Prompt
    const contextWorkflow = request.currentWorkflow 
      ? this.contextBuilder.minifyWorkflowForAI(request.currentWorkflow) 
      : undefined;
      
    const userPrompt = this.promptBuilder.buildUserPrompt(request.prompt, contextWorkflow);

    logger.info('--- AI REQUEST START ---');
    logger.info(`Estimated Prompt Tokens: ~${(systemPrompt.length + userPrompt.length) / 4}`);
      
    try {
      // 5. Call OpenAI with Tools
      const completion = await client.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        tools: AI_TOOLS,
        tool_choice: 'auto', // Let AI decide between building, advising, or asking clarity
        temperature: 0.7,
      });

      const message = completion.choices[0].message;
      const toolCalls = message.tool_calls;

      logger.info('--- AI RESPONSE RAW ---', { content: message.content, toolCalls });

      // 6. Process Response via Helper
      return await this.responseProcessor.processToolCalls(
        toolCalls || [], 
        request.currentWorkflow as any, // Cast to any/Workflow as needed by processor
        message.content || undefined
      );

    } catch (error) {
      logger.error('AI Workflow generation failed', { error });
      throw error;
    }
  }
}
