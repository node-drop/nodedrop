
import { NodeService } from '@/services/nodes/NodeService';

export class AIContextBuilder {
  private nodeService: NodeService;

  constructor(nodeService: NodeService) {
    this.nodeService = nodeService;
  }

  async buildNodeContext(): Promise<string> {
    const nodeTypes = await this.nodeService.getNodeTypes();
    
    // Simplify schemas to save tokens
    const simplifiedSchemas = nodeTypes.map(node => ({
        id: node.identifier, // Use 'id' instead of 'type' for brevity
        name: node.displayName,
        // desc: node.description, // Remove description to save tokens
        in: node.inputs ? (node.inputs as any[]).map((i: any) => typeof i === 'string' ? i : i.name) : ['main'], 
        out: node.outputs ? (node.outputs as any[]).map((o: any) => typeof o === 'string' ? o : o.name) : ['main'],
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

  minifyWorkflowForAI(workflow: any): any {
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
    simplified.connections = simplified.connections.map((c: any) => ({
        source: c.sourceNodeId,
        sourceOutput: c.sourceOutput,
        target: c.targetNodeId,
        targetInput: c.targetInput
    }));

    return simplified;
  }
}
