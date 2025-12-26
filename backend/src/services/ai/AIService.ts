
import OpenAI from 'openai';
import { Workflow } from '../../types/workflow.types';
import { logger } from '../../utils/logger';
import { NodeService } from '../nodes/NodeService';

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

export class AIService {
  private nodeService: NodeService;
  private openai: OpenAI | null = null;

  constructor(nodeService: NodeService) {
    this.nodeService = nodeService;
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
    const nodeContext = await this.buildNodeContext();

    // 3. Build System Prompt
    const systemPrompt = this.buildSystemPrompt(nodeContext);

    // 4. Build User Prompt
    // Optimization: Minify workflow context to save tokens for large workflows
    const contextWorkflow = request.currentWorkflow 
      ? this.minifyWorkflowForAI(request.currentWorkflow) 
      : undefined;
      
    const userPrompt = this.buildUserPrompt(request.prompt, contextWorkflow);

    // DEBUG: Log prompts
    logger.info('--- AI REQUEST START ---');
    logger.info('System Prompt:', { systemPrompt });
    logger.info('User Prompt:', { userPrompt });
    // Log token estimation (rough char count / 4)
    logger.info(`Estimated Prompt Tokens: ~${(systemPrompt.length + userPrompt.length) / 4}`);
      
      try {
      // 5. Call OpenAI
      const completion = await client.chat.completions.create({
        model: 'gpt-4o', // Use a capable model
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7,
      });

      const responseContent = completion.choices[0].message.content;
      logger.info('--- AI RESPONSE RAW ---');
      logger.info(responseContent || 'No content');

      if (!responseContent) {
        throw new Error('No response from AI');
      }

      const parsedResponse = JSON.parse(responseContent);
      logger.info('--- AI RESPONSE PARSED ---', { parsedResponse });
      
      // 6. Validate and Post-process
      // Ensure the response matches our expected structure
      if (!parsedResponse.workflow || !parsedResponse.message) {
         // Fallback if AI didn't follow strict JSON structure despite prompt
         if (parsedResponse.nodes && parsedResponse.connections) {
            // It just returned the workflow directly
            return {
                workflow: parsedResponse,
                message: "Here is your workflow.",
                missingNodeTypes: [],
            };
         }
         throw new Error('Invalid AI response structure');
      }

      // 7. Check for missing nodes
      const missingNodeTypes = await this.detectMissingNodes(parsedResponse.workflow);

      return {
        workflow: parsedResponse.workflow,
        message: parsedResponse.message,
        missingNodeTypes,
      };

    } catch (error) {
      logger.error('AI Workflow generation failed', { error });
      throw error;
    }
  }

  private async buildNodeContext(): Promise<string> {
    const nodeTypes = await this.nodeService.getNodeTypes();
    
    // Simplify schemas to save tokens
    // Simplify schemas to save tokens
    const simplifiedSchemas = nodeTypes.map(node => ({
      id: node.identifier, // Use 'id' instead of 'type' for brevity
      name: node.displayName,
      // desc: node.description, // Remove description to save tokens
      // inputs: node.inputs, // Often just 'main', skip
      // outputs: node.outputs, // Often just 'main', skip
      props: node.properties
        // Filter out hidden/advanced properties to save space. 
        // We only want the core parameters the AI needs to set.
        .filter(p => {
            const prop = p as any;
            return !prop.typeOptions?.password && prop.type !== 'hidden';
        }) 
        .map(p => {
            const minProp: any = {
                n: p.name, // Rename 'name' to 'n'
                t: p.type, // Rename 'type' to 't'
            };
            
            // Only add options if present and small
            if (p.options && p.options.length > 0) {
                // Map [{name: 'GET', value: 'GET'}] -> ['GET']
                minProp.o = p.options.map((o: any) => o.value).slice(0, 5); // Reduced limit further
            }
            
            // Only add default if it exists and is short
            if (p.default !== undefined && String(p.default).length < 20) {
                minProp.d = p.default;
            }
            
            return minProp;
        })
    }));

    return JSON.stringify(simplifiedSchemas);
  }

  private buildSystemPrompt(nodeContext: string): string {
    return `
You are an expert automation engineer for Node-Drop. Your goal is to create or modify automation workflows based on user requests.

### AVAILABLE NODES
The following nodes are installed and available for use. You MUST primarily use these nodes.
${nodeContext}

### MARKETPLACE NODES
If the user asks for functionality not covered by the installed nodes, you MAY suggest these common nodes (even if not installed):
- slack: Send messages to Slack
- discord: Post to Discord
- email: Send emails via SMTP
- openai: Use GPT models
- github: Interact with GitHub API
- google-sheets: Read/Write Google Sheets
- cron: Schedule workflows
- webhook: Trigger via HTTP

### OUTPUT FORMAT
You must respond with a JSON object containing two fields:
1. "message": A defined string explaining what you did (e.g., "I created a workflow that monitors RSS and posts to Slack.").
2. "workflow": A valid Node-Drop workflow JSON object.

### WORKFLOW JSON STRUCTURE
{
  "nodes": [
    {
      "id": "node_1",
      "type": "node-identifier", 
      "name": "Display Name",
      "parameters": { "paramName": "value" },
      "position": { "x": 0, "y": 0 }
    }
  ],
  "connections": [
    {
      "id": "e1",
      "sourceNodeId": "node_1",
      "sourceOutput": "main",
      "targetNodeId": "node_2",
      "targetInput": "main"
    }
  ]
}

### SCHEMA KEY
- id: Node Identifier (use this in "type")
- props: List of parameters
  - n: Name (use this in "parameters" key)
  - t: Type (string, number, boolean, options, etc.)
  - o: Allowed Options (values only)
  - d: Default Value

### RULES
1. **Valid IDs**: Use unique IDs for nodes (e.g., "trigger_1", "action_2").
2. **Connectivity**: Ensure nodes are connected logically. Triggers come first.
3. **Parameters**: Fill in "parameters" using the 'n' (name) key from the schema.
4. **Layout**: Space out nodes in the "position" field so they don't overlap (x+=300 for each step).
5. **Structure**: Do NOT nest properties in a "data" object. "name", "parameters", "type", and "position" must be top-level keys.
6. **No Hallucinations**: Do not invent node types that are not in the provided list or the marketplace list.
`;
  }

  private buildUserPrompt(prompt: string, currentWorkflow?: any): string {
    let content = `User Request: "${prompt}"\n`;
    
    if (currentWorkflow) {
      content += `\nCURRENT WORKFLOW JSON:\n${JSON.stringify(currentWorkflow)}\n\nINSTRUCTION: Modify the above workflow to satisfy the user request. Preserve existing nodes unless they strictly conflict with the request. Return the FULL updated workflow JSON.`;
    } else {
      content += `\nINSTRUCTION: Create a BRAND NEW workflow from scratch.`;
    }
    
    return content;
  }

  private async detectMissingNodes(workflow: Workflow): Promise<string[]> {
    const usedTypes = new Set(workflow.nodes.map(n => n.type));
    const installed = await this.nodeService.getNodeTypes();
    const installedTypes = new Set(installed.map(n => n.identifier));
    
    const missing: string[] = [];
    for (const type of usedTypes) {
      if (!installedTypes.has(type)) {
        missing.push(type);
      }
    }
    return missing;
  }

  private minifyWorkflowForAI(workflow: any): any {
    if (!workflow || !workflow.nodes) return workflow;

    // Deep clone to avoid mutating original
    const simplified = JSON.parse(JSON.stringify(workflow));

    // Remove heavy UI/irrelevant properties from nodes
    simplified.nodes = simplified.nodes.map((node: any) => {
      // Keep only essential logic fields
      const { id, type, name, parameters } = node;
      
      // Truncate large parameters (prevent huge JSON/code blocks from consuming all tokens)
      const truncatedParams = { ...parameters };
      if (truncatedParams) {
        Object.keys(truncatedParams).forEach(key => {
          const val = truncatedParams[key];
          if (typeof val === 'string' && val.length > 500) {
            truncatedParams[key] = val.substring(0, 500) + '...[TRUNCATED_FOR_AI]';
          }
        });
      }

      return {
        id,
        type,
        name,
        parameters: truncatedParams,
        // Omit: position, icon, color, credentials, disabled, settings, etc.
      };
    });

    // Simplify connections (usually already small, but ensures consistency)
    simplified.connections = simplified.connections.map((conn: any) => ({
        id: conn.id,
        sourceNodeId: conn.sourceNodeId,
        sourceOutput: conn.sourceOutput,
        targetNodeId: conn.targetNodeId,
        targetInput: conn.targetInput
    }));

    return simplified;
  }
}
