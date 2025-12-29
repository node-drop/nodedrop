/**
 * TOON Encoder Utility
 * 
 * Converts data to TOON format for token efficiency.
 * TOON (Token-Oriented Object Notation) reduces token usage by ~40% for
 * uniform arrays of objects while maintaining LLM comprehension.
 */

import { encode } from '@toon-format/toon';

/**
 * Encode node schemas to TOON format
 * @param nodes Array of node schema objects
 * @returns TOON-formatted string
 */
export function encodeNodesToToon(nodes: any[]): string {
  try {
    const data = { nodes };
    const toonString = encode(data, {
      delimiter: '\t',
    });
    return toonString;
  } catch (error) {
    console.error('TOON encoding failed, falling back to JSON:', error);
    return JSON.stringify(nodes);
  }
}

/**
 * Encode workflow data to TOON format
 * @param workflow Workflow object with nodes and connections
 * @returns TOON-formatted string
 */
export function encodeWorkflowToToon(workflow: any): string {
  if (!workflow) return '';
  
  try {
    // Simplify workflow structure for TOON encoding
    const simplified: any = {};
    
    if (workflow.nodes && workflow.nodes.length > 0) {
      // Extract only essential node fields for uniform structure
      simplified.nodes = workflow.nodes.map((n: any) => ({
        id: n.id,
        type: n.type,
        name: n.name || '',
        params: n.parameters ? JSON.stringify(n.parameters) : '{}',
        x: n.position?.x || 0,
        y: n.position?.y || 0
      }));
    }
    
    if (workflow.connections && workflow.connections.length > 0) {
      simplified.connections = workflow.connections.map((c: any) => ({
        src: c.sourceNodeId || c.source,
        srcOut: c.sourceOutput,
        tgt: c.targetNodeId || c.target,
        tgtIn: c.targetInput
      }));
    }
    
    return encode(simplified, { delimiter: '\t' });
  } catch (error) {
    console.error('TOON workflow encoding failed, falling back to JSON:', error);
    return JSON.stringify(workflow);
  }
}

/**
 * Encode chat history to TOON format
 * @param history Array of chat messages
 * @returns TOON-formatted string
 */
export function encodeChatHistoryToToon(history: { role: string; content: string }[]): string {
  if (!history || history.length === 0) return '';
  
  try {
    const data = {
      messages: history.map(m => ({
        role: m.role,
        content: m.content.length > 500 ? m.content.substring(0, 500) + '...' : m.content
      }))
    };
    return encode(data, { delimiter: '\t' });
  } catch (error) {
    console.error('TOON chat history encoding failed, falling back to text:', error);
    return history.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n');
  }
}

/**
 * Encode execution context to TOON format
 * @param context Execution context object
 * @returns TOON-formatted string
 */
export function encodeExecutionContextToToon(context: any): string {
  if (!context) return '';
  
  try {
    const data: any = {
      status: context.lastRunStatus || 'Unknown'
    };
    
    if (context.errors && context.errors.length > 0) {
      data.errors = context.errors.map((e: any) => ({
        nodeId: e.nodeId,
        error: e.error
      }));
    }
    
    if (context.logs && context.logs.length > 0) {
      data.logs = context.logs.slice(-5);
    }
    
    return encode(data, { delimiter: '\t' });
  } catch (error) {
    console.error('TOON execution context encoding failed:', error);
    return JSON.stringify(context);
  }
}

/**
 * Check if TOON encoding would be beneficial for the given data
 * TOON works best with uniform arrays of objects
 */
export function shouldUseToon(items: any[]): boolean {
  if (!items || items.length < 3) return false;
  
  const firstKeys = Object.keys(items[0] || {}).sort();
  return items.every(item => {
    const keys = Object.keys(item).sort();
    return keys.length === firstKeys.length &&
           keys.every((key, idx) => key === firstKeys[idx]);
  });
}
