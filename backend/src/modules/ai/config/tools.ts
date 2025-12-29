import { tool } from 'ai';
import { z } from 'zod';
import {
  adviseUserHandler,
  buildWorkflowHandler,
  enhancePromptHandler,
  getExecutionLogsHandler,
  validateWorkflowHandler
} from '../tools/handlers';
import { ToolContext } from '../tools/handlers/types';

/**
 * Modern Tool Definitions using Vercel AI SDK v6
 * 
 * IMPORTANT: Use `inputSchema` (not `parameters`) with Zod schemas
 * The execute function returns data that gets passed to onStepFinish
 */



export const createTools = (context: ToolContext) => ({
  build_workflow: tool({
    description: `ONLY use when user EXPLICITLY requests to CREATE, BUILD, ADD, MODIFY, FIX, or CHANGE workflow structure.
    
Examples that REQUIRE this tool:
- "Create a workflow that sends emails"
- "Add a Slack node"
- "Connect the HTTP node to the database"
- "Fix the workflow connections"
- "Build me an AI agent"

DO NOT use for questions, explanations, or advice - use advise_user instead.`,
    inputSchema: z.object({
      message: z.string().describe("A brief description of what changes were made to the workflow."),
      workflow: z.object({
        nodes: z.array(z.object({
          id: z.string(),
          type: z.string(),
          name: z.string(),
          parameters: z.record(z.string(), z.any()).optional().describe("Key-value pairs of node configuration parameters"),
          disabled: z.boolean().optional(),
          position: z.object({
            x: z.number(),
            y: z.number()
          })
        })),
        connections: z.array(z.object({
          id: z.string().optional(),
          sourceNodeId: z.string(),
          sourceOutput: z.string(),
          targetNodeId: z.string(),
          targetInput: z.string()
        }))
      })
    }),
    execute: async ({ message, workflow }) => {
      const handlerResult = await buildWorkflowHandler.execute({ message, workflow }, context);
      // Ensure we return a plain object - cast to access properties
      const result = handlerResult as any;
      return {
        workflow: result.workflow,
        message: result.message,
        missingNodeTypes: result.missingNodeTypes || []
      };
    }
  }),

  advise_user: tool({
    description: `DEFAULT tool for ALL conversations and questions. Use this for:
- Answering questions ("What does this do?", "How does X work?")
- Explaining concepts or workflows
- Providing debugging tips WITHOUT changing workflow structure
- General advice and recommendations
- ANY request where user is NOT explicitly asking to build/modify/create nodes

When in doubt, use this tool instead of build_workflow.`,
    inputSchema: z.object({
      message: z.string().describe("The advice, answer, or explanation to display to the user."),
      suggestions: z.array(z.string()).optional().describe("Optional short bullet points of suggested next steps or actions.")
    }),
    execute: async ({ message, suggestions }) => {
      const handlerResult = await adviseUserHandler.execute({ message, suggestions }, context);
      const result = handlerResult as any;
      return {
        workflow: result.workflow || null,
        message: result.message,
        missingNodeTypes: result.missingNodeTypes || []
      };
    }
  }),

  get_latest_execution_logs: tool({
    description: `Fetches execution logs and errors from the most recent workflow run.
    
Use when:
- User mentions a failure, bug, or error
- User asks "why did it fail?" or "what went wrong?"
- You need to diagnose an execution problem

This tool returns logs to help you understand what happened, then you can advise the user.`,
    inputSchema: z.object({
      count: z.number().optional().describe("Number of log entries to fetch (default: 10)")
    }),
    execute: async ({ count }) => {
      const handlerResult = await getExecutionLogsHandler.execute({ count }, context);
      const result = handlerResult as any;
      // Return the data property for non-final tools
      return result.data || result;
    }
  }),

  validate_workflow: tool({
    description: `Validates a workflow for errors BEFORE finalizing with build_workflow.
    
Use when:
- Creating complex workflows (5+ nodes)
- Building AI agent workflows with model/memory connections
- You want to catch connection errors or missing parameters

Returns validation errors so you can fix them before calling build_workflow.`,
    inputSchema: z.object({
      workflow: z.object({
        nodes: z.array(z.object({
          id: z.string(),
          type: z.string(),
          parameters: z.record(z.string(), z.any()).optional()
        })),
        connections: z.array(z.object({
          sourceNodeId: z.string(),
          targetNodeId: z.string()
        }))
      }).describe("The workflow structure to validate")
    }),
    execute: async ({ workflow }) => {
      const handlerResult = await validateWorkflowHandler.execute({ workflow }, context);
      const result = handlerResult as any;
      // Return the data property for non-final tools
      return result.data || result;
    }
  }),

  enhance_prompt: tool({
    description: `Use when user's request is VAGUE or AMBIGUOUS and needs clarification.
    
Use BEFORE build_workflow when request lacks:
- Specific API endpoints or services
- Data fields or formats
- Trigger conditions
- Output destinations

Keep responses SHORT - max 2-3 clarifying questions.`,
    inputSchema: z.object({
      enhanced_prompt: z.string().describe("A more specific, actionable version of user's original request (under 20 words)."),
      assumptions: z.array(z.string()).describe("List of assumptions made while enhancing prompt."),
      questions: z.array(z.string()).describe("MAX 2-3 clarifying questions to ask user."),
      confidence: z.number().describe("Confidence score 0-1 that enhanced prompt matches user intent.")
    }),
    execute: async ({ enhanced_prompt, assumptions, questions, confidence }) => {
      const handlerResult = await enhancePromptHandler.execute({ enhanced_prompt, assumptions, questions, confidence }, context);
      const result = handlerResult as any;
      return {
        workflow: result.workflow || null,
        message: result.message,
        missingNodeTypes: result.missingNodeTypes || []
      };
    }
  })
});
