
import { db } from '@/db/client';
import { userAiSettings } from '@/db/schema/ai_settings';
import { AI_TOOLS } from '@/modules/ai/config/tools';
import { AIContextBuilder } from '@/modules/ai/services/utils/AIContextBuilder';
import { AIPromptBuilder } from '@/modules/ai/services/utils/AIPromptBuilder';
import { setNodeService, setValidationNodeService, ToolContext } from '@/modules/ai/tools/handlers';
import { toolRegistry } from '@/modules/ai/tools/registry';
import { GenerateWorkflowRequest, GenerateWorkflowResponse } from '@/modules/ai/types';
import { getCredentialService } from '@/services/CredentialService.factory';
import { NodeService } from '@/services/nodes/NodeService';
import { logger } from '@/utils/logger';
import { eq } from 'drizzle-orm';
import OpenAI from 'openai';

// Register all handlers on module load
import { adviseUserHandler, buildWorkflowHandler, enhancePromptHandler, getExecutionLogsHandler, validateWorkflowHandler } from '@/modules/ai/tools/handlers';
toolRegistry.register(buildWorkflowHandler);
toolRegistry.register(adviseUserHandler);
toolRegistry.register(getExecutionLogsHandler);
toolRegistry.register(validateWorkflowHandler);
toolRegistry.register(enhancePromptHandler);

export class AIService {
  private nodeService: NodeService;
  private openai: OpenAI | null = null;
  private contextBuilder: AIContextBuilder;
  private promptBuilder: AIPromptBuilder;

  constructor(nodeService: NodeService) {
    this.nodeService = nodeService;
    this.contextBuilder = new AIContextBuilder(nodeService);
    this.promptBuilder = new AIPromptBuilder();
    
    // Inject nodeService into handlers that need it
    setNodeService(nodeService);
    setValidationNodeService(nodeService);
    
    this.initializeOpenAI();
  }

  private initializeOpenAI() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (apiKey) {
      this.openai = new OpenAI({ apiKey });
    }
  }

  public async generateWorkflow(
    request: GenerateWorkflowRequest,
    onProgress?: (event: 'status' | 'node-selection' | 'planning' | 'tool-use' | 'thinking', data: any) => void
  ): Promise<GenerateWorkflowResponse> {
    
    // Helper to emit progress safely
    const emit = (type: 'status' | 'node-selection' | 'planning' | 'tool-use' | 'thinking', message: string, details?: any) => {
        if (onProgress) {
            onProgress(type, { message, ...details });
        }
    };

    emit('status', 'Initializing AI agent...');

    // 1. Determine Configuration (Key & Model)
    let apiKey = request.openAiKey || process.env.OPENAI_API_KEY;
    let model = request.model || 'gpt-4o';
    let baseURL: string | undefined;

    // If userId present, check settings table
    if (request.userId) {
       try {
         const settings = await db.query.userAiSettings.findFirst({
           where: eq(userAiSettings.userId, request.userId)
         });

         if (settings) {
            if (settings.model) model = settings.model;

            if (settings.credentialId) {
               const credentialService = getCredentialService();
               const cred = await credentialService.getCredential(settings.credentialId, request.userId);
               
               if (cred && cred.data) {
                  // Standard API Key
                  if (cred.data.apiKey) {
                     apiKey = cred.data.apiKey;
                  }
                  
                  // Custom Base URL (for Ollama/LocalAI)
                  if (cred.data.baseUrl) {
                      baseURL = cred.data.baseUrl;
                  }
               }
            }
            
            // Special handling for Ollama/Local providers
            if (settings.provider === 'ollama') {
                if (!apiKey) apiKey = 'ollama'; // Dummy key required for client init
                if (!baseURL) baseURL = 'http://localhost:11434/v1'; // Default Ollama URL
            }
         }
       } catch (err) {
         logger.warn('Failed to fetch user AI settings, falling back to defaults', { error: err });
       }
    }

    if (!apiKey) {
      throw new Error('OpenAI API key not configured. Please set OPENAI_API_KEY env var or provide it in settings.');
    }

    const client = new OpenAI({ 
        apiKey,
        baseURL 
    });


    try {
      // --- STEP 1: Smart Node Selection (Embedding-based or LLM fallback) ---
      emit('status', 'Analyzing request to identify relevant nodes...');
      
      const embeddingService = (await import('./NodeEmbeddingService')).NodeEmbeddingService.getInstance();
      
      let selectedNodeIds: string[];
      
      if (embeddingService.isEnabled()) {
        selectedNodeIds = await embeddingService.findSimilarNodes(request.prompt, 10);
        logger.info(`Embedding-based selection: ${selectedNodeIds.join(', ')}`);
        
        if (selectedNodeIds.length === 0) {
          emit('status', 'No indexed nodes found, falling back to general knowledge...');
          logger.warn('No embeddings found, falling back to LLM selection');
          const lightweightIndex = await this.contextBuilder.buildLightweightNodeIndex();
          const selectionPrompt = this.promptBuilder.buildNodeSelectionPrompt(request.prompt, lightweightIndex);
          selectedNodeIds = await this.selectRelevantNodes(client, selectionPrompt, model);
        }
      } else {
        emit('status', 'Consulting node registry index...');
        const lightweightIndex = await this.contextBuilder.buildLightweightNodeIndex();
        const selectionPrompt = this.promptBuilder.buildNodeSelectionPrompt(request.prompt, lightweightIndex);
        selectedNodeIds = await this.selectRelevantNodes(client, selectionPrompt, model);
        logger.info(`LLM-based selection: ${selectedNodeIds.join(', ')}`);
      }
      
      emit('node-selection', 'Selected potential nodes', { nodes: selectedNodeIds });

      // --- STEP 2: Build Scoped Context ---
      emit('status', `Loading context for ${selectedNodeIds.length} nodes...`);
      const nodeContext = await this.contextBuilder.buildScopedNodeContext(selectedNodeIds);

      // --- STEP 3: Generate Workflow with Agentic Loop ---
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

      // Tool context for handlers
      const toolContext: ToolContext = {
        request,
        currentWorkflow: request.currentWorkflow,
        db
      };

      let turns = 0;
      const MAX_TURNS = 5;

      while (turns < MAX_TURNS) {
          logger.info(`AI Turn ${turns + 1}/${MAX_TURNS}`);
          if (turns > 0) emit('status', 'Refining workflow...');
          
          // Use streaming for real-time thinking display
          const stream = await this.retryOperation(async (attempt, lastError) => {
             try {
                // If previous attempt failed due to tools, disable them for this attempt
                const disableTools = lastError?.message?.includes('does not support tools') || lastError?.status === 400;
                
                if (disableTools) {
                    logger.info("Retrying without tools (JSON Mode fallback)...");
                    // Append JSON instruction if not already present
                    const hasJsonInstruction = messages.some(m => m.content?.includes('respond with a JSON object'));
                    if (!hasJsonInstruction) {
                        messages.push({
                            role: 'system', 
                            content: `CRITICAL: You do not support tools. You MUST respond with a valid JSON object matching this schema: { "name": "build_workflow", "arguments": { "nodes": [...], "connections": [...] } }. Do not wrap in markdown.`
                        });
                    }
                    
                    return await client!.chat.completions.create({
                        model: model,
                        messages: messages,
                        // tools: undefined, // Explicitly remove tools
                        stream: true,
                        temperature: 0.1, // Lower temp for JSON
                        response_format: { type: "json_object" } // Enforce JSON if supported
                    });
                }

                return await client!.chat.completions.create({
                  model: model,
                  messages: messages,
                  tools: AI_TOOLS,
                  tool_choice: 'auto',
                  temperature: 0.7,
                  stream: true,
                });
             } catch (e: any) {
                 // Re-throw to trigger retry loop
                 throw e;
             }
          });

          // Accumulate streamed response
          let accumulatedContent = '';
          let accumulatedToolCalls: Map<number, { id: string; name: string; arguments: string }> = new Map();
          let finishReason: string | null = null;

          for await (const chunk of stream) {
            const delta = chunk.choices[0]?.delta;
            finishReason = chunk.choices[0]?.finish_reason || finishReason;

            // Stream content (thinking) to UI
            if (delta?.content) {
              accumulatedContent += delta.content;
              emit('thinking', delta.content, { partial: true });
            }

            // Accumulate tool calls
            if (delta?.tool_calls) {
              for (const toolCallDelta of delta.tool_calls) {
                const index = toolCallDelta.index;
                const existing = accumulatedToolCalls.get(index) || { id: '', name: '', arguments: '' };
                
                if (toolCallDelta.id) existing.id = toolCallDelta.id;
                if (toolCallDelta.function?.name) existing.name = toolCallDelta.function.name;
                if (toolCallDelta.function?.arguments) existing.arguments += toolCallDelta.function.arguments;
                
                accumulatedToolCalls.set(index, existing);
              }
            }
          }

          // Build the complete message from accumulated stream
          const toolCallsArray = Array.from(accumulatedToolCalls.values())
            .filter(tc => tc.id && tc.name)
            .map(tc => ({
              id: tc.id,
              type: 'function' as const,
              function: { name: tc.name, arguments: tc.arguments }
            }));

          const message: any = {
            role: 'assistant',
            content: accumulatedContent || null,
          };
          
          if (toolCallsArray.length > 0) {
            message.tool_calls = toolCallsArray;
          }

          messages.push(message);
          
          const toolCalls = message.tool_calls;

          if (!toolCalls || toolCalls.length === 0) {
             // CHECK FOR JSON FALLBACK: If content contains JSON that looks like a tool call
             const content = message.content || "";
             if (content.trim().startsWith('{') && content.includes('"nodes"')) {
                 try {
                     const json = JSON.parse(content);
                     // Simulate a tool call structure
                     const simulatedToolCall = {
                         id: 'call_fallback_' + Date.now(),
                         type: 'function',
                         function: {
                             name: json.name || 'build_workflow', // Default to build_workflow
                             arguments: JSON.stringify(json.arguments || json)
                         }
                     };
                     
                     // Inject into processing array
                     message.tool_calls = [simulatedToolCall];
                     // Recursively process (continue loop logic below)
                 } catch (e) {
                     logger.warn("Failed to parse fallback JSON", e as unknown as Record<string, any>);
                 }
             }
          }

          const finalToolCalls = message.tool_calls || [];

          if (finalToolCalls.length === 0) {
             // No tools called - treat as fallback advice
             emit('status', 'Finalizing response...');
             return {
                workflow: null as any,
                message: message.content || "I couldn't process your request.",
                missingNodeTypes: []
             };
          }

          logger.info('--- AI TOOL CALLS ---', { count: finalToolCalls.length });

          const functionTools = finalToolCalls.filter((t: any) => t.type === 'function');
          
          // Process each tool call using the registry
          for (const tool of functionTools) {
              const toolName = tool.function.name;
              const handler = toolRegistry.get(toolName);

              if (!handler) {
                  logger.warn(`Unknown tool called: ${toolName}`);
                  continue;
              }

              const args = JSON.parse(tool.function.arguments);
              logger.info(`Executing tool: ${toolName}`, { args: Object.keys(args) });
              emit('tool-use', `Executing ${toolName}...`, { tool: toolName });

              const result = await handler.execute(args, toolContext);

              // If handler is final, return the result directly
              if (handler.isFinal) {
                  emit('status', 'Workflow generated successfully!');
                  return result as GenerateWorkflowResponse;
              }

              // Otherwise, add tool result to messages and continue loop
              messages.push({
                  role: 'tool',
                  tool_call_id: tool.id,
                  name: toolName,
                  content: JSON.stringify((result as any).data || result)
              });
          }

          turns++;
      }
      
      // Max turns reached
      emit('status', 'Timeout: exceeded maximum thinking steps.');
      return {
          workflow: request.currentWorkflow || { nodes: [], connections: [] } as any,
          message: "I needed to perform too many steps and timed out. Please try a more specific request.",
          missingNodeTypes: []
      };

    } catch (error) {
      logger.error('AI Workflow generation failed', { error });
      throw error;
    }
  }

  private async selectRelevantNodes(client: OpenAI, prompt: string, model: string): Promise<string[]> {
    try {
        const response = await client.chat.completions.create({
            model: model,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.1,
        });

        const text = response.choices[0].message.content || "[]";
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

    private async retryOperation<T>(operation: (attempt: number, lastError?: any) => Promise<T>, retries = 3, delay = 1000): Promise<T> {
    let lastError: any;
    
    for (let i = 0; i < retries; i++) {
        try {
            return await operation(i, lastError);
        } catch (error) {
            lastError = error;
            logger.warn(`AI Operation failed (attempt ${i + 1}/${retries})`, { error });
            if (i < retries - 1) {
                await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
            }
        }
    }
    throw lastError;
  }
}
