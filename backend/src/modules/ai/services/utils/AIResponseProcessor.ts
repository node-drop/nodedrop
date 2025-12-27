
import { GenerateWorkflowResponse } from '@/modules/ai/types';
import { NodeService } from '@/services/nodes/NodeService';
import { Workflow } from '@/types/database';
import { logger } from '@/utils/logger';

export class AIResponseProcessor {
  private nodeService: NodeService;

  constructor(nodeService: NodeService) {
    this.nodeService = nodeService;
  }

  async processToolCalls(toolCalls: any[], currentWorkflow: Workflow, fallbackMessage?: string): Promise<GenerateWorkflowResponse> {
    if (toolCalls && toolCalls.length > 0) {
        // Handle Tool Calls
        const firstToolCall = toolCalls[0] as any;
        const funcName = firstToolCall.function.name;
        const args = JSON.parse(firstToolCall.function.arguments);

        logger.info(`AI invoked tool: ${funcName}`, { args });

        if (funcName === 'build_workflow') {
            // Standard Workflow Building
            const workflow = args.workflow;
            
            // Post-process workflow to ensure defaults
            if (workflow.nodes) {
                workflow.nodes = workflow.nodes.map((n: any) => ({
                    ...n,
                    parameters: n.parameters || {}, // Ensure parameters object exists
                    disabled: n.disabled ?? false,  // Ensure disabled flag exists
                    // Preserve other fields
                }));
            }

            // Post-process connections
            if (workflow.connections) {
                workflow.connections = workflow.connections.map((c: any) => {
                    // Map AI-friendly short keys to DB keys if needed
                    const sourceNodeId = c.sourceNodeId || c.source;
                    const targetNodeId = c.targetNodeId || c.target;
                    
                    return {
                        ...c,
                        sourceNodeId,
                        targetNodeId,
                        id: c.id || `c_${sourceNodeId}_${targetNodeId}_${Math.random().toString(36).substr(2, 5)}`,
                        sourceOutput: c.sourceOutput || "main",
                        targetInput: c.targetInput || "main"
                    };
                });
            }

            // --- CRITICAL POSITION FIX ---
            // Merge AI nodes with existing workflow to PRESERVE positions
            if (currentWorkflow && currentWorkflow.nodes && workflow.nodes) {
                const existingNodesMap = new Map(currentWorkflow.nodes.map(n => [n.id, n]));
                
                workflow.nodes = workflow.nodes.map((n: any) => {
                    const existingNode = existingNodesMap.get(n.id);
                    let position = n.position;

                    // 1. If node exists, FORCE preservation of its position 
                    // (unless AI was explicitly told to layout, but usually we want stability)
                    if (existingNode && existingNode.position) {
                        position = existingNode.position;
                    } 
                    // 2. If new node and no position, provide a default to avoid overlap/stacking at 0,0
                    // Ideally we'd find a smart spot, but for now a safe default or AI's position is better than null
                    else if (!position) {
                         // Default to center-ish if nothing else
                         position = { x: 100, y: 100 };
                    }

                    return {
                        ...n,
                        position
                    };
                });
            }

            const msg = args.message;
            const missingNodeTypes = await this.detectMissingNodes(workflow);

            return {
                workflow: workflow,
                message: msg,
                missingNodeTypes
            };

        } else if (funcName === 'advise_user') {
            // Advice Only - Return null workflow to signal no change was made
            return {
                workflow: null as any, // Null signals to frontend: do NOT show workflow widget
                message: args.message + (args.suggestions ? `\n\nTips:\n${args.suggestions.map((s: string) => `- ${s}`).join('\n')}` : ''),
                missingNodeTypes: []
            };
        }
    }

    // Fallback if no tool calls or unknown tool
    return {
        workflow: currentWorkflow || { nodes: [], connections: [] } as Workflow,
        message: fallbackMessage || "I couldn't process your request at this time.",
        missingNodeTypes: []
    };
  }

  private async detectMissingNodes(workflow: Workflow): Promise<string[]> {
    if (!workflow.nodes) return [];
    
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
}
