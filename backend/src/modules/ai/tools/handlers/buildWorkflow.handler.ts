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

    // --- SMART NODE POSITIONING ---
    // Merge AI nodes with existing workflow to PRESERVE positions and intelligently place new nodes
    if (workflow.nodes) {
      const existingNodesMap = currentWorkflow?.nodes 
        ? new Map(currentWorkflow.nodes.map(n => [n.id, n])) 
        : new Map();
      
      // Calculate base positions from existing nodes
      const existingPositions = currentWorkflow?.nodes?.map(n => n.position).filter(Boolean) || [];
      const maxX = existingPositions.length > 0 
        ? Math.max(...existingPositions.map(p => p?.x || 0)) 
        : 0;
      const avgY = existingPositions.length > 0 
        ? existingPositions.reduce((sum, p) => sum + (p?.y || 0), 0) / existingPositions.length 
        : 200;
      
      // Service node types that should be positioned below their parent
      const SERVICE_NODE_TYPES = [
        'openai-model', 'anthropic-model', 'google-model',
        'buffer-memory', 'window-memory',
      ];
      const isServiceNode = (type: string) => 
        SERVICE_NODE_TYPES.includes(type) || type.endsWith('-tool');
      
      let newNodeOffset = 0;
      let serviceNodeOffset = 0;
      
      workflow.nodes = workflow.nodes.map((n: any) => {
        const existingNode = existingNodesMap.get(n.id);
        
        // 1. Preserve existing node positions
        if (existingNode?.position) {
          return { ...n, position: existingNode.position };
        }
        
        // 2. Use AI-provided position if valid
        if (n.position?.x !== undefined && n.position?.y !== undefined) {
          return n;
        }
        
        // 3. Calculate smart position for new nodes
        let position: { x: number, y: number };
        
        if (isServiceNode(n.type)) {
          // Service nodes go below, spread horizontally
          position = { 
            x: maxX + 150 + (serviceNodeOffset * 200), 
            y: avgY + 200 
          };
          serviceNodeOffset++;
        } else {
          // Regular nodes go to the right
          position = { 
            x: maxX + 300 + (newNodeOffset * 300), 
            y: avgY 
          };
          newNodeOffset++;
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
