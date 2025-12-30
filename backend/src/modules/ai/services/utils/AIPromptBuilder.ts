import { AI_CONNECTION_RULES, AI_GENERATION_CONSTRAINTS } from '@/modules/ai/config/rules';
import { PROMPT_LIMITS } from '@/modules/ai/config/promptLimits';
import { buildMarketplaceSection } from '@/modules/ai/config/marketplaceNodes';
import { encodeChatHistoryToToon, encodeExecutionContextToToon } from './toonEncoder';
import { buildNodeSchemaReference } from '@/modules/ai/config/nodeSchemaBuilder';
import type { ChatMessage, ExecutionContext, Workflow, PromptBuilderOptions } from '@/modules/ai/types/prompt.types';
import { logger } from '@/utils/logger';

export class AIPromptBuilder {
  // Cache for static prompt sections
  private static cachedStaticSections: string | null = null;
  private static cachedAgentPatterns: string | null = null;
  private static cachedSchemaReference: string | null = null;

  /**
   * Invalidate cached prompt sections.
   * Call when rules or schema change.
   */
  static invalidateCache(): void {
    AIPromptBuilder.cachedStaticSections = null;
    AIPromptBuilder.cachedAgentPatterns = null;
    AIPromptBuilder.cachedSchemaReference = null;
  }

  /**
   * Build the core system prompt intro (always included)
   */
  private buildCoreIntro(): string {
    return `You are an expert automation engineer for Node-Drop. Your goal is to help users by either creating/modifying workflows OR providing advice.

### CRITICAL: TOOL SELECTION DECISION
You MUST call exactly ONE tool for each response. Before responding, determine:

**Is the user asking to BUILD/CREATE/MODIFY/FIX the workflow?**
- YES → Use \`build_workflow\`
- NO → Use \`advise_user\`

**Examples requiring build_workflow:**
- "Create a workflow that sends emails"
- "Add a Slack node to my workflow"
- "Connect the HTTP node to the database"
- "Fix the workflow" / "Fix the connections"
- "Build me an AI agent"
- "Make a workflow for..."
- "Add a delay node"

**Examples requiring advise_user:**
- "What does this workflow do?"
- "How does the HTTP node work?"
- "Can you explain webhooks?"
- "Why might this fail?"
- "What's the best approach for..."`;
  }

  /**
   * Build the tools section (always included)
   */
  private buildToolsSection(): string {
    return `### AVAILABLE TOOLS (You MUST use one)

1. **build_workflow** - Creates or modifies workflow structure
   - Use ONLY when user explicitly asks to create/modify/fix workflow
   - Returns a complete workflow JSON with nodes and connections
   
2. **advise_user** - Provides advice, explanations, answers
   - DEFAULT choice for questions and conversations
   - Use when NOT building/modifying workflow
   
3. **get_latest_execution_logs** - Fetches execution logs
   - Use when user asks about errors or failures
   - Call this FIRST, then advise based on results
   
4. **validate_workflow** - Validates workflow before building
   - Use for complex workflows (5+ nodes, AI agents)
   - Call BEFORE build_workflow to catch errors
   
5. **enhance_prompt** - Clarifies vague requests
   - Use when request is too vague to build
   - Keep questions SHORT (max 2-3)`;
  }

  /**
   * Build marketplace nodes section
   */
  private buildMarketplaceNodesSection(): string {
    return `### MARKETPLACE NODES
If the user asks for functionality not covered by the installed nodes, you MAY suggest these common nodes (even if not installed):
${buildMarketplaceSection()}`;
  }

  /**
   * Build workflow component checklist
   */
  private buildComponentChecklist(): string {
    return `### WORKFLOW COMPONENT CHECKLIST
Before building, identify:
1. **TRIGGER**: What starts this? (default: 'manual-trigger')
2. **DATA SOURCES**: APIs, databases, files
3. **PROCESSING**: AI analysis, transforms, conditions
4. **DESTINATIONS**: Where data goes (don't miss these!)
   - Look for: "send to", "write to", "save to", "post to", "export to"
   - If mentioned → MUST include that node

### MISSING NODES
If no dedicated node exists for a service:
- Use 'http-request' node to call the API directly
- For AI agents: use 'http-request-tool' and explain API usage in systemPrompt`;
  }

  /**
   * Build AI agent-specific patterns (lazy-loaded)
   */
  private buildAgentPatternsSection(): string {
    if (AIPromptBuilder.cachedAgentPatterns) {
      return AIPromptBuilder.cachedAgentPatterns;
    }

    AIPromptBuilder.cachedAgentPatterns = `
### AI AGENT WORKFLOW PATTERNS
When building AI agent workflows, follow these patterns:

**Basic AI Agent:**
\`\`\`
trigger ──main──> ai-agent ──main──> next
                    ↑
    model ─modelService─┘
    memory ─memoryService─┘
\`\`\`

**AI Agent with Tools:**
\`\`\`
trigger ──main──> ai-agent ──main──> next
                    ↑
    model ─modelService─┘
    memory ─memoryService─┘
    tool1 ─toolService─┘
    tool2 ─toolService─┘
\`\`\`

**Agent Node Requirements:**
- MUST have exactly one model connected (modelService)
- SHOULD have memory connected (memoryService) for conversation context
- MAY have multiple tools connected (toolService)
- Position: agent at y=0, services at y=150 below

**Service Connection Rules:**
- Model nodes output: modelService → ai-agent.modelService
- Memory nodes output: memoryService → ai-agent.memoryService  
- Tool nodes output: toolService → ai-agent.toolService`;

    return AIPromptBuilder.cachedAgentPatterns;
  }

  /**
   * Build static sections (cached)
   */
  private buildStaticSections(): string {
    if (AIPromptBuilder.cachedStaticSections) {
      return AIPromptBuilder.cachedStaticSections;
    }

    const rulesSection = AI_CONNECTION_RULES.map((r, idx) => `${idx + 1}. ${r}`).join('\n');
    const constraintsSection = AI_GENERATION_CONSTRAINTS.map((c) => `- ${c}`).join('\n');

    AIPromptBuilder.cachedStaticSections = `
### WORKFLOW JSON STRUCTURE
\`\`\`json
{
  "nodes": [
    {"id": "unique_id", "type": "node-identifier", "parameters": {...}, "position": {"x": 0, "y": 0}}
  ],
  "connections": [
    {"sourceNodeId": "from_id", "sourceOutput": "main", "targetNodeId": "to_id", "targetInput": "main"}
  ]
}
\`\`\`

### WORKFLOW BUILDING STEPS
1. **Identify trigger** → What starts this? (default: 'manual-trigger')
2. **Check node roles** → Use "role" field for placement
3. **For AI Agents** → Create: trigger → agent + model (required) + memory (recommended) + tools (optional)
4. **Create nodes first** → Then create all connections
5. **Verify connections** → Every non-trigger node needs input
6. **Follow "rec" hints** → If node has recommendations, use them

### ADDITIONAL RULES
${rulesSection}
${constraintsSection}

### ERROR HANDLING
- If user asks about errors, use \`get_latest_execution_logs\` FIRST
- If no logs found, tell user to run workflow again - don't guess the error
- Never hallucinate fixes without seeing actual error logs

### REMEMBER
- You MUST call a tool for every response
- When in doubt between build_workflow and advise_user, choose advise_user
- Keep responses concise and actionable
- Use node "role" and "rec" fields to guide connections`;

    return AIPromptBuilder.cachedStaticSections;
  }

  /**
   * Build schema reference (cached)
   */
  private buildSchemaReference(): string {
    if (AIPromptBuilder.cachedSchemaReference) {
      return AIPromptBuilder.cachedSchemaReference;
    }
    AIPromptBuilder.cachedSchemaReference = buildNodeSchemaReference();
    return AIPromptBuilder.cachedSchemaReference;
  }

  /**
   * Estimate token count for debugging
   */
  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }


  /**
   * Build the complete system prompt
   * @param nodeContext - TOON or JSON encoded node schemas
   * @param options - Optional configuration for prompt building
   */
  buildSystemPrompt(nodeContext: string, options: PromptBuilderOptions = {}): string {
    const sections = [
      this.buildCoreIntro(),
      this.buildToolsSection(),
      `### AVAILABLE NODES
The following nodes are installed and available for use.

**Format Note:** Node data is provided in TOON (Token-Oriented Object Notation) format for efficiency. TOON uses:
- Indentation for nested objects (like YAML)
- Tabular format for arrays: \`nodes[N]{field1,field2,...}:\` followed by tab-separated values
- Example: \`nodes[3]{id,name,role}:\` then each row is \`id\tname\trole\`

**Workflow data** may also be TOON-encoded when provided. The format is the same - look for \`nodes[N]{...}:\` and \`connections[N]{...}:\` headers.

${nodeContext}`,
      this.buildMarketplaceNodesSection(),
      this.buildComponentChecklist(),
      `### NODE DATA SCHEMA KEY
- id: Node Identifier (use in "type")
- name: Display name
- role: Node's role (trigger, response, model-service, memory-service, tool-service, agent)
- in/out: Input/output handles (default: ["main"])
- svcIn: Service inputs for ai-agent (n=name, req=required, multi=multiple allowed)
- rec: Connection recommendations (after, before, never, inputs)
- rules: Node-specific rules (follow these!)
- example: JSON example of "parameters" - USE THIS EXACT STRUCTURE
- props: Parameters (n=name, t=type, req=required, o=options, d=default, ex=example)`,
      this.buildSchemaReference(),
    ];

    // Conditionally include agent patterns
    if (options.includeAgentPatterns) {
      sections.push(this.buildAgentPatternsSection());
    }

    sections.push(this.buildStaticSections());

    const prompt = sections.join('\n\n');

    // Debug logging
    if (options.debug || process.env.NODE_ENV === 'development') {
      const tokens = this.estimateTokens(prompt);
      logger.debug(`[AIPromptBuilder] System prompt: ~${tokens} tokens (${prompt.length} chars)`);
    }

    return prompt;
  }

  buildNodeSelectionPrompt(userPrompt: string, nodeIndex: string): string {
    return `
You are an expert automation architect. Your task is to identify ALL nodes required to fulfill the user's request completely.

### AVAILABLE NODES
${nodeIndex}

### USER REQUEST
"${userPrompt}"

### ANALYSIS STEPS
1. **Identify the TRIGGER**: What starts this workflow? (manual, schedule, webhook, chat, etc.)
2. **Identify DATA SOURCES**: Where does data come FROM? (APIs, databases, files)
3. **Identify PROCESSING**: What transformations or AI analysis is needed?
4. **Identify DESTINATIONS**: Where does data GO TO? 
   - CRITICAL: Look for "send to", "write to", "save to", "export to", "append to", "store in", "push to", "post to"
   - If user mentions Google Sheets, Slack, email, database, etc. as a destination, INCLUDE that node!

### INSTRUCTIONS
1. Analyze the COMPLETE request - don't miss any mentioned services.
2. Select 5-12 nodes that cover ALL aspects of the request.
3. ALWAYS include destination nodes if the user mentions sending/writing/saving data somewhere.
4. Return a JSON array of node IDs ONLY.
   Example: ["manual-trigger", "http-request", "ai-agent", "openai-model", "google-sheets"]
5. Do not include any explanations. Just the JSON array.

### COMMON PATTERNS
- "get data from X and send to Y" → include both X source node AND Y destination node
- "AI agent with tools" → include ai-agent, model, memory, and tool nodes
- "send to Google Sheets" → MUST include "google-sheets"
- "post to Slack" → MUST include "slack"
`;
  }

  /**
   * Validate workflow structure
   */
  private validateWorkflow(workflow: unknown): workflow is Workflow {
    if (!workflow || typeof workflow !== 'object') return false;
    const wf = workflow as Record<string, unknown>;
    if (wf.nodes !== undefined && !Array.isArray(wf.nodes)) return false;
    if (wf.connections !== undefined && !Array.isArray(wf.connections)) return false;
    return true;
  }

  /**
   * Validate chat history structure
   */
  private validateChatHistory(history: unknown): history is ChatMessage[] {
    if (!Array.isArray(history)) return false;
    return history.every(msg => 
      typeof msg === 'object' && 
      msg !== null &&
      typeof (msg as ChatMessage).role === 'string' &&
      typeof (msg as ChatMessage).content === 'string'
    );
  }

  buildUserPrompt(
    prompt: string, 
    currentWorkflow?: unknown, 
    chatHistory?: { role: string, content: string }[], 
    executionContext?: unknown
  ): string {
    // Validate inputs
    if (currentWorkflow !== undefined && !this.validateWorkflow(currentWorkflow)) {
      logger.warn('[AIPromptBuilder] Invalid workflow structure provided, ignoring');
      currentWorkflow = undefined;
    }

    if (chatHistory !== undefined && !this.validateChatHistory(chatHistory)) {
      logger.warn('[AIPromptBuilder] Invalid chat history structure provided, ignoring');
      chatHistory = undefined;
    }

    let content = "";

    // Add Chat History if available - use TOON for 3+ messages
    if (chatHistory && chatHistory.length > 0) {
      content += `### CONVERSATION HISTORY\n`;
      if (chatHistory.length >= PROMPT_LIMITS.minChatHistoryForToon) {
        content += encodeChatHistoryToToon(chatHistory);
      } else {
        chatHistory.forEach(msg => {
          content += `${msg.role.toUpperCase()}: ${msg.content}\n`;
        });
      }
      content += `\n`;
    }

    if (executionContext) {
       content += this.buildExecutionContext(executionContext as ExecutionContext);
    }

    content += `### CURRENT REQUEST\nUser Request: "${prompt}"\n`;
    
    if (currentWorkflow) {
      // currentWorkflow may already be TOON-encoded string from minifyWorkflowForAI
      const workflowStr = typeof currentWorkflow === 'string' 
        ? currentWorkflow 
        : JSON.stringify(currentWorkflow);
      content += `\nCURRENT WORKFLOW:\n${workflowStr}\n\nINSTRUCTION: Modify the above workflow to satisfy the user request. Preserve existing nodes unless they strictly conflict with the request. Return the FULL updated workflow JSON.`;
    } else {
      content += `\nINSTRUCTION: Create a BRAND NEW workflow from scratch.`;
    }
    
    return content;
  }

  buildExecutionContext(context?: ExecutionContext): string {
    if (!context) return "";
    
    // Use TOON encoding if there are errors or logs
    const hasErrors = context.errors && context.errors.length > 0;
    const hasLogs = context.logs && context.logs.length > 0;
    
    if (hasErrors || hasLogs) {
      return `### LAST EXECUTION CONTEXT\n${encodeExecutionContextToToon(context)}\n\n`;
    }
    
    // Simple text for minimal context
    let text = `### LAST EXECUTION CONTEXT\n`;
    text += `Status: ${context.lastRunStatus || 'Unknown'}\n`;
    
    if (context.lastRunStatus === 'error') {
      text += `(No specific error logs found. You can use 'get_latest_execution_logs' to investigate deeply.)\n`;
    }
    
    text += `\n`;
    return text;
  }
}
