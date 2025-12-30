/**
 * Workflow Validator
 * 
 * Validates and auto-fixes common AI mistakes in generated workflows.
 * Runs after AI generation but before returning to user.
 */

import { logger } from '@/utils/logger';

interface WorkflowNode {
  id: string;
  type: string;
  name?: string;
  parameters?: Record<string, unknown>;
  position?: { x: number; y: number };
}

interface WorkflowConnection {
  sourceNodeId: string;
  sourceOutput: string;
  targetNodeId: string;
  targetInput: string;
}

interface Workflow {
  nodes: WorkflowNode[];
  connections: WorkflowConnection[];
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  fixed: boolean;
  workflow: Workflow;
}

interface NodeParameterRule {
  /** Node type identifier */
  nodeType: string;
  /** Validation function - returns error message or null if valid */
  validate: (params: Record<string, unknown>) => string | null;
  /** Auto-fix function - returns fixed params or null if can't fix */
  fix?: (params: Record<string, unknown>) => Record<string, unknown> | null;
}

/**
 * Parameter validation rules for complex nodes
 */
const PARAMETER_RULES: NodeParameterRule[] = [
  // Switch node rules validation
  {
    nodeType: 'switch',
    validate: (params) => {
      if (params.mode === 'rules') {
        const rules = params.rules as any[];
        if (!rules || rules.length === 0) {
          return 'Switch node in rules mode requires at least one rule';
        }
        
        // Check each rule has proper structure
        for (let i = 0; i < rules.length; i++) {
          const rule = rules[i];
          // Check for condition in various places AI might put it
          const condition = rule?.condition || rule?.conditions || rule?.values?.condition;
          
          if (!condition) {
            return `Switch rule ${i + 1} is missing condition object`;
          }
          
          if (!condition.key) {
            return `Switch rule ${i + 1} is missing 'key' field (the field name to check)`;
          }
          
          if (!condition.expression) {
            return `Switch rule ${i + 1} is missing 'expression' field (the comparison operator)`;
          }
          
          // Check for common AI mistake: using expression syntax in key
          if (typeof condition.key === 'string' && condition.key.startsWith('={{')) {
            return `Switch rule ${i + 1}: 'key' should be a field name, not an expression. Use 'status' not '={{status}}'`;
          }
        }
        
        // Check outputsCount matches rules length
        if (params.outputsCount !== undefined && params.outputsCount !== rules.length) {
          return `Switch outputsCount (${params.outputsCount}) doesn't match number of rules (${rules.length})`;
        }
      }
      return null;
    },
    fix: (params) => {
      const fixed = { ...params };
      
      if (params.mode === 'rules') {
        const rules = params.rules as any[];
        if (rules && rules.length > 0) {
          // Fix rule structure if needed
          fixed.rules = rules.map(rule => {
            // AI mistake: used "conditions" (plural) instead of "condition" (singular)
            if (rule.conditions && !rule.condition) {
              return { condition: rule.conditions };
            }
            // If rule has nested values.condition, flatten it
            if (rule.values?.condition && !rule.condition) {
              return { condition: rule.values.condition };
            }
            // If condition.key has expression syntax, try to extract field name
            if (rule.condition?.key?.startsWith('={{')) {
              const match = rule.condition.key.match(/={{(\w+)}}/);
              if (match) {
                return {
                  condition: {
                    ...rule.condition,
                    key: match[1]
                  }
                };
              }
            }
            return rule;
          });
          
          // Fix outputsCount to match rules
          fixed.outputsCount = (fixed.rules as any[]).length;
        }
      }
      
      return fixed;
    }
  },
  
  // IfElse node validation
  {
    nodeType: 'ifElse',
    validate: (params) => {
      const mode = params.mode || 'simple';
      
      if (mode === 'simple') {
        const condition = params.condition as any;
        if (!condition) {
          return 'IfElse node in simple mode requires a condition';
        }
        if (!condition.key) {
          return "IfElse condition is missing 'key' field";
        }
        if (!condition.expression) {
          return "IfElse condition is missing 'expression' field";
        }
        if (condition.key.startsWith('={{')) {
          return "IfElse 'key' should be a field name, not an expression";
        }
      } else if (mode === 'combine') {
        const conditions = params.conditions as any[];
        if (!conditions || conditions.length === 0) {
          return 'IfElse in combine mode requires at least one condition';
        }
      }
      
      return null;
    },
    fix: (params) => {
      const fixed = { ...params };
      const mode = params.mode || 'simple';
      
      if (mode === 'simple' && params.condition) {
        const condition = params.condition as any;
        // Fix expression syntax in key
        if (condition.key?.startsWith('={{')) {
          const match = condition.key.match(/={{(\w+)}}/);
          if (match) {
            fixed.condition = {
              ...condition,
              key: match[1]
            };
          }
        }
      }
      
      return fixed;
    }
  },
  
  // HTTP Request node validation
  {
    nodeType: 'http-request',
    validate: (params) => {
      if (!params.url) {
        return 'HTTP Request node requires a URL';
      }
      return null;
    }
  },
  
  // AI Agent node validation
  {
    nodeType: 'ai-agent',
    validate: (params) => {
      if (!params.systemPrompt && !params.systemMessage) {
        return 'AI Agent node should have a systemPrompt to define its behavior';
      }
      return null;
    }
  },
  
  // Code node validation
  {
    nodeType: 'code',
    validate: (params) => {
      if (!params.code && !params.jsCode) {
        return 'Code node requires code to execute';
      }
      return null;
    }
  },
  
  // Set node validation
  {
    nodeType: 'set',
    validate: (params) => {
      const values = params.values as any[];
      if (!values || values.length === 0) {
        return 'Set node requires at least one value to set';
      }
      
      // Check structure
      for (let i = 0; i < values.length; i++) {
        const entry = values[i];
        const keyValue = entry?.keyValue || entry?.values?.keyValue;
        
        // Check for wrong structure (name/value instead of keyValue)
        if (entry?.name !== undefined && entry?.value !== undefined && !keyValue) {
          return `Set value ${i + 1}: should use {keyValue: {key, value}} not {name, value}`;
        }
        
        if (!keyValue && !entry?.name) {
          return `Set value ${i + 1} is missing keyValue object`;
        }
      }
      
      return null;
    },
    fix: (params) => {
      const fixed = { ...params };
      const values = params.values as any[];
      
      if (values && values.length > 0) {
        fixed.values = values.map(entry => {
          // Fix: AI used {name, value} instead of {keyValue: {key, value}}
          if (entry?.name !== undefined && entry?.value !== undefined && !entry?.keyValue) {
            return {
              keyValue: {
                key: entry.name,
                value: entry.value
              }
            };
          }
          // Fix: nested values.keyValue
          if (entry?.values?.keyValue && !entry?.keyValue) {
            return { keyValue: entry.values.keyValue };
          }
          return entry;
        });
      }
      
      return fixed;
    }
  }
];

export class WorkflowValidator {
  
  /**
   * Validate a workflow and optionally auto-fix common issues
   */
  validate(workflow: Workflow, autoFix = true): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    let fixed = false;
    let fixedWorkflow = { ...workflow, nodes: [...workflow.nodes] };
    
    // Validate each node
    for (let i = 0; i < fixedWorkflow.nodes.length; i++) {
      const node = fixedWorkflow.nodes[i];
      const rule = PARAMETER_RULES.find(r => r.nodeType === node.type);
      
      if (rule && node.parameters) {
        const error = rule.validate(node.parameters);
        
        if (error) {
          // Try to auto-fix if enabled
          if (autoFix && rule.fix) {
            const fixedParams = rule.fix(node.parameters);
            if (fixedParams) {
              // Re-validate after fix
              const revalidateError = rule.validate(fixedParams);
              if (!revalidateError) {
                fixedWorkflow.nodes[i] = {
                  ...node,
                  parameters: fixedParams
                };
                fixed = true;
                warnings.push(`Auto-fixed ${node.type} node "${node.id}": ${error}`);
                logger.info(`[WorkflowValidator] Auto-fixed ${node.type} node`, { 
                  nodeId: node.id, 
                  error,
                  originalParams: node.parameters,
                  fixedParams 
                });
                continue;
              }
            }
          }
          
          errors.push(`Node "${node.id}" (${node.type}): ${error}`);
        }
      }
      
      // Generic validations
      if (!node.type) {
        errors.push(`Node "${node.id}" is missing type`);
      }
    }
    
    // Validate connections
    const nodeIds = new Set(fixedWorkflow.nodes.map(n => n.id));
    for (const conn of workflow.connections) {
      if (!nodeIds.has(conn.sourceNodeId)) {
        errors.push(`Connection references non-existent source node: ${conn.sourceNodeId}`);
      }
      if (!nodeIds.has(conn.targetNodeId)) {
        errors.push(`Connection references non-existent target node: ${conn.targetNodeId}`);
      }
    }
    
    // Check for orphan nodes (non-trigger nodes with no incoming connections)
    const nodesWithIncoming = new Set(workflow.connections.map(c => c.targetNodeId));
    for (const node of fixedWorkflow.nodes) {
      const isTrigger = node.type.includes('trigger') || 
                        node.type === 'webhook' || 
                        node.type === 'cron' ||
                        node.type === 'chat';
      const isServiceNode = node.type.includes('-model') || 
                            node.type.includes('-memory') ||
                            node.type.endsWith('-tool');
      
      if (!isTrigger && !isServiceNode && !nodesWithIncoming.has(node.id)) {
        warnings.push(`Node "${node.id}" (${node.type}) has no incoming connections`);
      }
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings,
      fixed,
      workflow: fixedWorkflow
    };
  }
  
  /**
   * Add a custom validation rule
   */
  static addRule(rule: NodeParameterRule): void {
    PARAMETER_RULES.push(rule);
  }
}
