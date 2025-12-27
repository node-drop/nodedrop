/**
 * Build Workflow Tool Handler
 * 
 * Handles the build_workflow tool call from AI.
 * Processes workflow JSON and prepares it for application.
 */

import { GenerateWorkflowResponse } from '@/modules/ai/types';
import { NodeService } from '@/services/nodes/NodeService';
import { Workflow } from '@/types/database';
import { logger } from '@/utils/logger';
import { ToolContext, ToolHandler } from './types';

// We need nodeService for detecting missing nodes
let nodeServiceInstance: NodeService | null = null;

export function setNodeService(ns: NodeService): void {
  nodeServiceInstance = ns;
}

async function detectMissingNodes(workflow: Workflow): Promise<string[]> {
  if (!workflow.nodes || !nodeServiceInstance) return [];
  
  const usedTypes = new Set(workflow.nodes.map(n => n.type));
  const installed = await nodeServiceInstance.getNodeTypes();
  const installedTypes = new Set(installed.map(n => n.identifier));
  
  const missing: string[] = [];
  for (const type of usedTypes) {
    if (!installedTypes.has(type)) {
      missing.push(type);
    }
  }
  return missing;
}

export const buildWorkflowHandler: ToolHandler = {
  name: 'build_workflow',
  isFinal: true,

  async execute(args: any, context: ToolContext): Promise<GenerateWorkflowResponse> {
    const workflow = args.workflow;
    const currentWorkflow = context.currentWorkflow;
    
    // Post-process workflow to ensure defaults
    if (workflow.nodes) {
      workflow.nodes = workflow.nodes.map((n: any) => ({
        ...n,
        parameters: n.parameters || {},
        disabled: n.disabled ?? false,
      }));
    }

    // Post-process connections
    if (workflow.connections) {
      workflow.connections = workflow.connections.map((c: any) => {
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

        if (existingNode && existingNode.position) {
          position = existingNode.position;
        } else if (!position) {
          position = { x: 100, y: 100 };
        }

        return { ...n, position };
      });
    }

    const msg = args.message;
    const missingNodeTypes = await detectMissingNodes(workflow);

    logger.info('build_workflow handler executed', { nodeCount: workflow.nodes?.length });

    return {
      workflow: workflow,
      message: msg,
      missingNodeTypes
    };
  }
};
