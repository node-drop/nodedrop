
import { NodeService } from '@/services/nodes/NodeService';
import { NODE_CONNECTION_PATTERNS } from '@/modules/ai/config/rules';
import { encodeNodesToToon, encodeWorkflowToToon, shouldUseToon } from './toonEncoder';

export class AIContextBuilder {
  private nodeService: NodeService;

  constructor(nodeService: NodeService) {
    this.nodeService = nodeService;
  }

  // Cache static context to avoid rebuilding on every request
  private static cachedNodeContext: string | null = null;
  private static cachedLightweightIndex: string | null = null;
  
  /**
   * Clears the cached node schemas. Call this when nodes are added/removed/updated.
   */
  static invalidateCache(): void {
    AIContextBuilder.cachedNodeContext = null;
    AIContextBuilder.cachedLightweightIndex = null;
  }
  
  async buildLightweightNodeIndex(): Promise<string> {
    if (AIContextBuilder.cachedLightweightIndex) {
        return AIContextBuilder.cachedLightweightIndex;
    }

    const nodeTypes = await this.nodeService.getNodeTypes();
    const index = nodeTypes.map(node => ({
        id: node.identifier,
        name: node.displayName,
        desc: node.description,
        category: (node as any).category || 'general'
    }));

    AIContextBuilder.cachedLightweightIndex = JSON.stringify(index);
    return AIContextBuilder.cachedLightweightIndex;
  }

  async buildScopedNodeContext(nodeIds: string[]): Promise<string> {
    const nodeTypes = await this.nodeService.getNodeTypes();
    const filteredNodes = nodeTypes.filter(n => nodeIds.includes(n.identifier));
    return this.minifyNodes(filteredNodes);
  }

  async buildNodeContext(): Promise<string> {
    if (AIContextBuilder.cachedNodeContext) {
        return AIContextBuilder.cachedNodeContext;
    }

    const nodeTypes = await this.nodeService.getNodeTypes();
    AIContextBuilder.cachedNodeContext = this.minifyNodes(nodeTypes);
    return AIContextBuilder.cachedNodeContext;
  }

  /**
   * Determine the node's role based on its identifier and outputs
   */
  private getNodeRole(node: any): string | null {
    const id = node.identifier;
    
    // Check if it's a trigger node
    if (NODE_CONNECTION_PATTERNS.triggers.includes(id) || 
        id.includes('trigger') || 
        (node.group && node.group.includes('trigger'))) {
      return 'trigger';
    }
    
    // Check if it's a response node
    if (NODE_CONNECTION_PATTERNS.responses.includes(id) || 
        id.includes('response')) {
      return 'response';
    }
    
    // Check if it's a model service node
    if (NODE_CONNECTION_PATTERNS.agentServices.model.includes(id) ||
        (node.outputs && node.outputs.includes('modelService'))) {
      return 'model-service';
    }
    
    // Check if it's a memory service node
    if (NODE_CONNECTION_PATTERNS.agentServices.memory.includes(id) ||
        (node.outputs && node.outputs.includes('memoryService'))) {
      return 'memory-service';
    }
    
    // Check if it's a tool service node
    if (NODE_CONNECTION_PATTERNS.agentServices.tools.includes(id) ||
        id.endsWith('-tool') ||
        (node.outputs && node.outputs.includes('toolService'))) {
      return 'tool-service';
    }
    
    // Check if it's an agent node
    if (id === 'ai-agent' || (node.group && node.group.includes('agent'))) {
      return 'agent';
    }
    
    return null;
  }

  private minifyNodes(nodes: any[]): string {
    const simplifiedSchemas = nodes.map(node => {
        const schema: any = {
            id: node.identifier, 
            name: node.displayName,
            in: node.inputs ? (node.inputs as any[]).map((i: any) => typeof i === 'string' ? i : i.name) : ['main'], 
            out: node.outputs ? (node.outputs as any[]).map((o: any) => typeof o === 'string' ? o : o.name) : ['main'],
        };

        // Add node role for connection guidance
        const role = this.getNodeRole(node);
        if (role) {
            schema.role = role;
        }

        // Include service inputs (for ai-agent, model, memory, tool nodes)
        if (node.serviceInputs && node.serviceInputs.length > 0) {
            schema.svc = node.serviceInputs.map((si: any) => ({
                n: si.name,
                t: si.type,
                req: si.required || false
            }));
        }

        // Include inputsConfig for nodes with special service inputs (like ai-agent)
        // This tells the AI which inputs accept service connections
        if (node.inputsConfig) {
            const serviceInputs: any[] = [];
            for (const [inputName, config] of Object.entries(node.inputsConfig)) {
                const cfg = config as any;
                if (cfg.position === 'bottom') {
                    serviceInputs.push({
                        n: inputName,
                        label: cfg.displayName || inputName,
                        req: cfg.required || false,
                        multi: cfg.multiple || false
                    });
                }
            }
            if (serviceInputs.length > 0) {
                schema.svcIn = serviceInputs;
            }
        }

        // Include AI metadata recommendations if available
        if (node.ai?.recommendations) {
            schema.rec = {};
            if (node.ai.recommendations.connectsAfter) {
                schema.rec.after = node.ai.recommendations.connectsAfter;
            }
            if (node.ai.recommendations.connectsBefore) {
                schema.rec.before = node.ai.recommendations.connectsBefore;
            }
            if (node.ai.recommendations.neverConnectTo) {
                schema.rec.never = node.ai.recommendations.neverConnectTo;
            }
            if (node.ai.recommendations.inputs) {
                schema.rec.inputs = node.ai.recommendations.inputs;
            }
        }

        // Include AI rules if available (node-specific connection rules)
        if (node.ai?.rules && node.ai.rules.length > 0) {
            schema.rules = node.ai.rules;
        }

        schema.props = (node.properties || [])
            .filter((p: any) => !p.typeOptions?.password && p.type !== 'hidden') 
            .map((p: any) => {
                const minProp: any = { 
                    n: p.name,
                    t: p.type
                };

                // CRITICAL: Include required flag so AI knows what must be set
                if (p.required) {
                    minProp.req = true;
                }
                
                // Include description for non-obvious parameters (helps AI understand what to set)
                if (p.description && p.description.length < 100) {
                    minProp.desc = p.description;
                }
                
                // Include ALL options for enum-like types (not just 5)
                if (p.options && p.options.length > 0) {
                    // Show all options if 10 or fewer, otherwise show first 10 with indicator
                    if (p.options.length <= 10) {
                        minProp.o = p.options.map((o: any) => o.value);
                    } else {
                        minProp.o = [...p.options.slice(0, 10).map((o: any) => o.value), `...+${p.options.length - 10} more`];
                    }
                }
                
                // Include default value
                if (p.default !== undefined && String(p.default).length < 50) {
                    minProp.d = p.default;
                }

                // Include placeholder/example if available
                if (p.placeholder) {
                    minProp.ex = p.placeholder;
                }
                
                return minProp;
            });

        return schema;
    });

    // Use TOON format if beneficial (uniform structure, multiple nodes)
    if (shouldUseToon(simplifiedSchemas)) {
        return encodeNodesToToon(simplifiedSchemas);
    }

    // Fallback to JSON for non-uniform or small datasets
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
            position: node.position, // Include position for context
            // Omit: icon, color, credentials, disabled, settings, etc.
        };
    });

    // Simplify connections (usually already small, but ensures consistency)
    simplified.connections = simplified.connections.map((c: any) => ({
        source: c.sourceNodeId,
        sourceOutput: c.sourceOutput,
        target: c.targetNodeId,
        targetInput: c.targetInput
    }));

    // Use TOON encoding for token efficiency if workflow has enough nodes
    if (simplified.nodes.length >= 3) {
        return encodeWorkflowToToon(simplified);
    }

    return simplified;
  }
}
