
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
    // 1. Initialize client
    let client = this.openai;
    if (request.openAiKey) {
      client = new OpenAI({ apiKey: request.openAiKey });
    }

    if (!client) {
      throw new Error('OpenAI API key not configured. Please set OPENAI_API_KEY env var or provide it in the request.');
    }

    try {
      // --- STEP 1: Smart Node Selection (Embedding-based or LLM fallback) ---
      const embeddingService = (await import('./NodeEmbeddingService')).NodeEmbeddingService.getInstance();
      
      let selectedNodeIds: string[];
      
      if (embeddingService.isEnabled()) {
        // Use fast embedding-based similarity search
        selectedNodeIds = await embeddingService.findSimilarNodes(request.prompt, 10);
        logger.info(`Embedding-based selection: ${selectedNodeIds.join(', ')}`);
        
        // If no results from embeddings, fall back to LLM selection
        if (selectedNodeIds.length === 0) {
          logger.warn('No embeddings found, falling back to LLM selection');
          const lightweightIndex = await this.contextBuilder.buildLightweightNodeIndex();
          const selectionPrompt = this.promptBuilder.buildNodeSelectionPrompt(request.prompt, lightweightIndex);
          selectedNodeIds = await this.selectRelevantNodes(client, selectionPrompt);
        }
      } else {
        // Fallback: Use LLM-based selection (for when embeddings are not configured)
        const lightweightIndex = await this.contextBuilder.buildLightweightNodeIndex();
        const selectionPrompt = this.promptBuilder.buildNodeSelectionPrompt(request.prompt, lightweightIndex);
        selectedNodeIds = await this.selectRelevantNodes(client, selectionPrompt);
        logger.info(`LLM-based selection: ${selectedNodeIds.join(', ')}`);
      }

      // --- STEP 2: Build Scoped Context ---
      const nodeContext = await this.contextBuilder.buildScopedNodeContext(selectedNodeIds);

      // --- STEP 3: Generate Workflow ---
      const systemPrompt = this.promptBuilder.buildSystemPrompt(nodeContext);
      
      const contextWorkflow = request.currentWorkflow 
        ? this.contextBuilder.minifyWorkflowForAI(request.currentWorkflow) 
        : undefined;
        
      const userPrompt = this.promptBuilder.buildUserPrompt(request.prompt, contextWorkflow, request.chatHistory);

      logger.info('--- AI REQUEST START ---');
      logger.info(`Estimated Prompt Tokens: ~${(systemPrompt.length + userPrompt.length) / 4}`);
        
      // Call OpenAI with Retry
      const completion = await this.retryOperation(async () => {
        return await client!.chat.completions.create({
          model: 'gpt-4o',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          tools: AI_TOOLS,
          tool_choice: 'auto',
          temperature: 0.7,
        });
      });

      const message = completion.choices[0].message;
      const toolCalls = message.tool_calls;

      logger.info('--- AI RESPONSE RAW ---', { content: message.content, toolCalls });

      return await this.responseProcessor.processToolCalls(
        toolCalls || [], 
        request.currentWorkflow as any,
        message.content || undefined
      );

    } catch (error) {
      logger.error('AI Workflow generation failed', { error });
      throw error;
    }
  }

  private async selectRelevantNodes(client: OpenAI, prompt: string): Promise<string[]> {
    try {
        const response = await client.chat.completions.create({
            model: 'gpt-4o', // Use a cheaper model if possible, but 4o is fast
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.1, // Low temp for deterministic output
        });

        const text = response.choices[0].message.content || "[]";
        // Attempt to parse JSON
        const match = text.match(/\[.*\]/s);
        if (match) {
            return JSON.parse(match[0]);
        }
        return [];
    } catch (e) {
        logger.warn("Failed to select nodes, falling back to full context", { error: e });
        // Fallback: Return all node IDs (conceptually, or let context builder handle empty list if we want full fallback)
        // For now, let's return a safe list or re-throw. 
        // Better strategy: If selection fails, maybe we just proceed with a default set? 
        // Let's rely on the context builder to handle specific IDs.
        // If empty, user might get a generic workflow.
        return [];
    }
  }

  private async retryOperation<T>(operation: () => Promise<T>, retries = 3, delay = 1000): Promise<T> {
    let lastError: any;
    
    for (let i = 0; i < retries; i++) {
        try {
            return await operation();
        } catch (error) {
            lastError = error;
            logger.warn(`AI Operation failed (attempt ${i + 1}/${retries})`, { error });
            if (i < retries - 1) {
                await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i))); // Exponential backoff
            }
        }
    }
    throw lastError;
  }
}
