
import { AI_CONNECTION_RULES, AI_GENERATION_CONSTRAINTS } from '@/modules/ai/config/rules';

export class AIPromptBuilder {
  
  buildSystemPrompt(nodeContext: string): string {
    const rulesSection = AI_CONNECTION_RULES.map((r, i) => `${i + 1}. ${r}`).join('\n');
    const constraintsSection = AI_GENERATION_CONSTRAINTS.map((c, i) => `- ${c}`).join('\n');

    return `
You are an expert automation engineer for Node-Drop. Your goal is to help users by either creating/modifying workflows OR providing advice.

### AVAILABLE TOOLS
You have access to the following tools:
1. **build_workflow**: Use this when the user explicitly asks to create, modify, fix, or add to a workflow.
2. **advise_user**: Use this when the user asks a general question, needs debugging help without structural changes, or simply wants an explanation.

### AVAILABLE NODES
The following nodes are installed and available for use.
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

### SCHEMA KEY
- id: Node Identifier (use this in "type")
- name: Display name
- in: available input handles (default: ["main"])
- out: available output handles (default: ["main"])
- props: List of parameters
  - n: Name (use this in "parameters" key)
  - t: Type (string, number, boolean, options, json, etc.)
  - req: If true, this parameter is REQUIRED and MUST be set
  - desc: Description explaining what the parameter does
  - o: Allowed Options (use one of these exact values)
  - d: Default Value (use if user doesn't specify)
  - ex: Example/placeholder value

### PARAMETER RULES
1. **Always set required parameters** (req: true). Workflows will fail if these are missing.
2. For 'options' type, use ONLY values from 'o' array. Do not invent values.
3. Use 'd' (default) or 'ex' (example) as reference for expected format.
4. If a parameter seems needed based on user intent but has no default, make a reasonable choice and explain it.

### BEST PRACTICES & LOGIC RULES
${rulesSection}

### ADDITIONAL CONSTRAINTS
${constraintsSection}

### FORMATTING RULES
1. **Valid IDs**: Use unique IDs for nodes (e.g., "trigger_1", "action_2").
2. **Connectivity**: Ensure nodes are connected logically. Triggers come first.
3. **Parameters**: Fill in "parameters" using the 'n' (name) key from the schema.
4. **Layout**: Space out nodes in the "position" field so they don't overlap (x+=300 for each step).
5. **No Hallucinations**: Do not invent node types that are not in the provided list or the marketplace list.

### ERROR HANDLING & LOGS
1. **Always Check Logs First**: If the user asks about an error, failure, or "what happened", you MUST use the \`get_latest_execution_logs\` tool before suggesting anything.
2. **No Logs = No Fix**: If \`get_latest_execution_logs\` returns "not_found" or empty logs, DO NOT attempt to "fix" the workflow by regenerating it. You cannot fix what you cannot see.
3. **Be Honest**: If no logs are found, simply tell the user: "I couldn't find any execution logs for this workflow. Please run the workflow again so I can analyze the error."
4. **Do Not Hallucinate Fixes**: Never guess the error. If you don't have the logs, you don't know the error.
`;
  }

  buildNodeSelectionPrompt(userPrompt: string, nodeIndex: string): string {
    return `
You are an expert automation architect. Your task is to identify which nodes are required to fulfill the user's request.

### AVAILABLE NODES
${nodeIndex}

### USER REQUEST
"${userPrompt}"

### INSTRUCTIONS
1. Analyze the request.
2. Select 3-8 nodes that are most relevant.
3. Return a JSON array of node IDs ONLY.
   Example: ["http-request", "slack", "schedule"]
4. Do not include any explanations. Just the JSON array.
`;
  }

  buildUserPrompt(prompt: string, currentWorkflow?: any, chatHistory?: { role: string, content: string }[], executionContext?: any): string {
    let content = "";

    // Add Chat History if available
    if (chatHistory && chatHistory.length > 0) {
      content += `### CONVERSATION HISTORY\n`;
      chatHistory.forEach(msg => {
        content += `${msg.role.toUpperCase()}: ${msg.content}\n`;
      });
      content += `\n`;
    }

    if (executionContext) {
       content += this.buildExecutionContext(executionContext);
    }

    content += `### CURRENT REQUEST\nUser Request: "${prompt}"\n`;
    
    if (currentWorkflow) {
      content += `\nCURRENT WORKFLOW JSON:\n${JSON.stringify(currentWorkflow)}\n\nINSTRUCTION: Modify the above workflow to satisfy the user request. Preserve existing nodes unless they strictly conflict with the request. Return the FULL updated workflow JSON.`;
    } else {
      content += `\nINSTRUCTION: Create a BRAND NEW workflow from scratch.`;
    }
    
    return content;
  }

  buildExecutionContext(context?: any): string {
      if (!context) return "";
      
      let text = `### LAST EXECUTION CONTEXT\n`;
      text += `Status: ${context.lastRunStatus || 'Unknown'}\n`;
      
      if (context.errors && context.errors.length > 0) {
          text += `Errors:\n${context.errors.map((e: any) => `- Node ${e.nodeId}: ${e.error}`).join('\n')}\n`;
      }
      
      if (context.logs && context.logs.length > 0) {
          text += `Recent Logs:\n${context.logs.slice(-5).join('\n')}\n`;
      } 
      else if (context.lastRunStatus === 'error' && (!context.errors || context.errors.length === 0)) {
          text += `(No specific error logs found. You can use 'get_latest_execution_logs' to investigate deeply.)\n`;
      }
      
      text += `\n`;
      return text;
  }
}
