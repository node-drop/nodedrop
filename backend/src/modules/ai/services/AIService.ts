import { db } from '@/db/client';
import { userAiSettings } from '@/db/schema/ai_settings';
import { AIContextBuilder } from '@/modules/ai/services/utils/AIContextBuilder';
import { AIPromptBuilder } from '@/modules/ai/services/utils/AIPromptBuilder';
import { setNodeService, setValidationNodeService, ToolContext } from '@/modules/ai/tools/handlers';
import { GenerateWorkflowRequest, GenerateWorkflowResponse } from '@/modules/ai/types';
import { getCredentialService } from '@/services/CredentialService.factory';
import { NodeService } from '@/services/nodes/NodeService';
import { logger } from '@/utils/logger';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createOpenAI } from '@ai-sdk/openai';
import { generateText, streamText } from 'ai';
import { eq } from 'drizzle-orm';

type AIProvider = ReturnType<typeof createOpenAI> | ReturnType<typeof createAnthropic>;

export class AIService {
  private contextBuilder: AIContextBuilder;
  private promptBuilder: AIPromptBuilder;

  constructor(nodeService: NodeService) {
    this.contextBuilder = new AIContextBuilder(nodeService);
    this.promptBuilder = new AIPromptBuilder();
    
    // Set node service for handlers that need it
    setNodeService(nodeService);
    setValidationNodeService(nodeService);
  }

  public async generateWorkflow(
    request: GenerateWorkflowRequest,
    onProgress?: (event: 'status' | 'node-selection' | 'planning' | 'tool-use' | 'thinking', data: any) => void
  ): Promise<GenerateWorkflowResponse> {
    
    // Collect events for persistence
    const collectedEvents: { type: 'status' | 'node-selection' | 'planning' | 'tool-use' | 'thinking', message: string, nodes?: string[], tool?: string }[] = [];
    const startTime = Date.now();
    
    const emit = (type: 'status' | 'node-selection' | 'planning' | 'tool-use' | 'thinking', message: string, details?: any) => {
        // Collect non-status events for history
        if (type !== 'status') {
            collectedEvents.push({ type, message, ...details });
        }
        if (onProgress) {
            onProgress(type, { message, ...details });
        }
    };

    emit('status', 'Initializing AI agent...');

    let provider: 'openai' | 'anthropic' = (request.provider as any) || 'openai';
    let apiKey = process.env.OPENAI_API_KEY;
    let model = request.model || 'gpt-4o';

    if (provider === 'anthropic' && (!request.model || request.model === 'gpt-4o')) {
      model = 'claude-sonnet-4-20250514';
    }

    if (request.userId) {
       try {
         const settings = await db.query.userAiSettings.findFirst({
           where: eq(userAiSettings.userId, request.userId)
         });

         if (settings) {
            if (settings.provider) provider = settings.provider as 'openai' | 'anthropic';
            if (settings.model) model = settings.model;

            if (settings.credentialId) {
               const credentialService = getCredentialService();
               const cred = await credentialService.getCredential(settings.credentialId, request.userId);
               if (cred && cred.data && cred.data.apiKey) {
                  apiKey = cred.data.apiKey;
               }
            }
         }
       } catch (err) {
         logger.warn('Failed to fetch user AI settings, falling back to defaults', { error: err });
       }
    }

    if (!apiKey) {
      const envVar = provider === 'anthropic' ? 'ANTHROPIC_API_KEY' : 'OPENAI_API_KEY';
      throw new Error(`${provider} API key not configured. Please set ${envVar} env var or provide it in settings.`);
    }

    const aiProvider = this.getProvider(provider, apiKey);

    try {
      emit('status', 'Analyzing request to identify relevant nodes...');
      
      const embeddingService = (await import('./NodeEmbeddingService')).NodeEmbeddingService.getInstance();
      
      let selectedNodeIds: string[] = [];
      
      if (embeddingService.isEnabled()) {
        // Use similarity threshold of 0.6 to filter out irrelevant nodes
        // Lower threshold = stricter matching (only highly relevant nodes)
        selectedNodeIds = await embeddingService.findSimilarNodes(request.prompt, 10, 0.6);
        logger.info(`Embedding-based selection: ${selectedNodeIds.join(', ')}`);
        
        if (selectedNodeIds.length === 0) {
          emit('status', 'No indexed nodes found, falling back to general knowledge...');
          logger.warn('No embeddings found, falling back to LLM selection');
          const lightweightIndex = await this.contextBuilder.buildLightweightNodeIndex();
          const selectionPrompt = this.promptBuilder.buildNodeSelectionPrompt(request.prompt, lightweightIndex);
          selectedNodeIds = await this.selectRelevantNodes(aiProvider, selectionPrompt, model);
        }
      } else {
        emit('status', 'Consulting node registry index...');
        const lightweightIndex = await this.contextBuilder.buildLightweightNodeIndex();
        const selectionPrompt = this.promptBuilder.buildNodeSelectionPrompt(request.prompt, lightweightIndex);
        selectedNodeIds = await this.selectRelevantNodes(aiProvider, selectionPrompt, model);
        logger.info(`LLM-based selection: ${selectedNodeIds.join(', ')}`);
      }
      
      emit('node-selection', 'Selected potential nodes', { nodes: selectedNodeIds });

      emit('status', `Loading context for ${selectedNodeIds.length} nodes...`);
      const nodeContext = await this.contextBuilder.buildScopedNodeContext(selectedNodeIds);

      emit('status', 'Planning workflow logic...');
      const systemPrompt = this.promptBuilder.buildSystemPrompt(nodeContext);
      
      const contextWorkflow = request.currentWorkflow 
        ? this.contextBuilder.minifyWorkflowForAI(request.currentWorkflow) 
        : undefined;
        
      const userPrompt = this.promptBuilder.buildUserPrompt(
          request.prompt, 
          contextWorkflow, 
          request.chatHistory,
          request.executionContext
      );

      logger.info('--- AI REQUEST START ---');
      
      const messages: any[] = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ];

      const toolContext: ToolContext = {
        request,
        currentWorkflow: request.currentWorkflow,
        db
      };

      const { createTools } = await import('@/modules/ai/config/tools');
      const tools = createTools(toolContext);

      // Store tool results as they complete
      const collectedToolResults: any[] = [];
      
      // Store token usage
      let tokenUsage: { promptTokens: number; completionTokens: number; totalTokens: number } | undefined;

      logger.info(`AI Execution [${provider}]`);
      emit('status', 'Generating workflow...');

      // Import stopWhen helper from AI SDK
      const { stepCountIs } = await import('ai');

      // streamText returns a StreamTextResult
      const result = streamText({
        model: aiProvider(model),
        messages,
        tools,
        stopWhen: stepCountIs(5),  // Allow up to 5 tool calls in sequence
        temperature: 0.7,
        onChunk: ({ chunk }) => {
          if (chunk.type === 'text-delta') {
            emit('thinking', chunk.text, { partial: true });
          }
        },
        onStepFinish: (step) => {
          logger.debug('Step finished', { 
            hasToolResults: !!step.toolResults?.length,
            hasToolCalls: !!step.toolCalls?.length,
            finishReason: step.finishReason
          });
          
          // Collect tool results - in AI SDK v6, result is in `output`
          if (step.toolResults && step.toolResults.length > 0) {
            for (const toolResult of step.toolResults) {
              const output = (toolResult as any).output;
              
              logger.info(`Tool executed: ${toolResult.toolName}`, { 
                hasOutput: !!output,
                outputKeys: output ? Object.keys(output) : []
              });
              
              collectedToolResults.push({
                toolName: toolResult.toolName,
                result: output,
                args: (toolResult as any).args
              });
            }
          }
          
          // Log tool calls for progress tracking
          if (step.toolCalls && step.toolCalls.length > 0) {
            for (const toolCall of step.toolCalls) {
              logger.info(`AI calling tool: ${toolCall.toolName}`);
              emit('tool-use', `Executing ${toolCall.toolName}...`, { tool: toolCall.toolName });
            }
          }
        }
      });

      // Consume the stream and get final results
      const text = await result.text;
      const steps = await result.steps;
      const totalUsage = await result.totalUsage;

      // Extract token usage from totalUsage (accumulated across all steps)
      if (totalUsage) {
        tokenUsage = {
          promptTokens: totalUsage.inputTokens || 0,
          completionTokens: totalUsage.outputTokens || 0,
          totalTokens: totalUsage.totalTokens || ((totalUsage.inputTokens || 0) + (totalUsage.outputTokens || 0))
        };
      }

      logger.info('--- AI EXECUTION FINISHED ---', { 
        textLength: text?.length || 0, 
        stepsCount: steps?.length || 0, 
        collectedResults: collectedToolResults.length,
        tokenUsage
      });

      // Log collected results summary
      logger.info('Collected tool results', { 
        count: collectedToolResults.length, 
        tools: collectedToolResults.map(r => ({
          name: r.toolName,
          hasWorkflow: !!r.result?.workflow,
          hasMessage: !!r.result?.message
        }))
      });

      // Consolidate thinking events - merge all partial thinking chunks into one event
      const consolidatedEvents = collectedEvents.reduce((acc, event) => {
        if (event.type === 'thinking') {
          const lastEvent = acc[acc.length - 1];
          if (lastEvent?.type === 'thinking') {
            // Append to existing thinking event
            lastEvent.message += event.message;
          } else {
            // Start new thinking event
            acc.push({ ...event });
          }
        } else {
          acc.push(event);
        }
        return acc;
      }, [] as typeof collectedEvents);

      // Find the LAST final tool result (build_workflow, advise_user, or enhance_prompt)
      const finalTools = ['build_workflow', 'advise_user', 'enhance_prompt'];
      const finalToolResult = [...collectedToolResults]
        .reverse()
        .find(r => finalTools.includes(r.toolName));

      if (finalToolResult?.result) {
        const resultData = finalToolResult.result;
        logger.info('Final tool result found', { 
          toolName: finalToolResult.toolName, 
          hasWorkflow: !!resultData?.workflow,
          hasMessage: !!resultData?.message
        });
        
        if (finalToolResult.toolName === 'build_workflow' && resultData.workflow) {
           emit('status', 'Workflow generated successfully!');
           return {
             workflow: resultData.workflow,
             message: resultData.message || 'Workflow updated.',
             missingNodeTypes: resultData.missingNodeTypes || [],
             thinkingEvents: consolidatedEvents,
             thinkingDuration: Math.floor((Date.now() - startTime) / 1000),
             tokenUsage
           };
        }
        
        // For advise_user or enhance_prompt
        return {
          workflow: request.currentWorkflow || null,
          message: resultData.message || resultData.enhanced_prompt || text || 'No response generated.',
          missingNodeTypes: resultData.missingNodeTypes || [],
          thinkingEvents: consolidatedEvents,
          thinkingDuration: Math.floor((Date.now() - startTime) / 1000),
          tokenUsage
        };
      }

      // Fallback: check steps directly if onStepFinish didn't capture results
      logger.warn('No final tool result in collected results, checking steps directly');
      
      if (steps && steps.length > 0) {
        for (const step of [...steps].reverse()) {
          if (step.toolResults && step.toolResults.length > 0) {
            for (const tr of step.toolResults) {
              const output = (tr as any).output;
              if (finalTools.includes(tr.toolName) && output) {
                logger.info('Found tool result in steps fallback', { toolName: tr.toolName });
                if (tr.toolName === 'build_workflow' && output.workflow) {
                  emit('status', 'Workflow generated successfully!');
                  return {
                    workflow: output.workflow,
                    message: output.message || 'Workflow updated.',
                    missingNodeTypes: output.missingNodeTypes || [],
                    thinkingEvents: consolidatedEvents,
                    thinkingDuration: Math.floor((Date.now() - startTime) / 1000),
                    tokenUsage
                  };
                }
                return {
                  workflow: request.currentWorkflow || null,
                  message: output.message || output.enhanced_prompt || text || 'No response generated.',
                  missingNodeTypes: output.missingNodeTypes || [],
                  thinkingEvents: consolidatedEvents,
                  thinkingDuration: Math.floor((Date.now() - startTime) / 1000),
                  tokenUsage
                };
              }
            }
          }
        }
      }

      // Final fallback: return text response
      emit('status', 'Finalizing response...');
      return {
        workflow: request.currentWorkflow || null,
        message: text || "I couldn't process your request. Please try again.",
        missingNodeTypes: [],
        thinkingEvents: consolidatedEvents,
        thinkingDuration: Math.floor((Date.now() - startTime) / 1000),
        tokenUsage
      };

    } catch (error) {
      logger.error('AI Workflow generation failed', { error });
      throw error;
    }
  }

  private getProvider(provider: 'openai' | 'anthropic', apiKey: string): AIProvider {
    if (provider === 'anthropic') {
      return createAnthropic({ apiKey });
    }
    return createOpenAI({ apiKey });
  }

  private async selectRelevantNodes(provider: AIProvider, prompt: string, model: string): Promise<string[]> {
    try {
      const { text } = await generateText({
        model: provider(model),
        prompt,
        temperature: 0.1,
      });

      const match = text.match(/\[.*\]/s);
      if (match) {
        return JSON.parse(match[0]);
      }
      return [];
    } catch (e) {
      logger.warn("Failed to select nodes, falling back to full context", { error: e });
      return [];
    }
  }
}
