/**
 * Expression Resolver
 * 
 * Core expression resolution logic for workflow expressions.
 * Handles placeholder resolution like {{$json.field}}, {{$node["Name"].field}}, etc.
 */

import type { ExpressionContext } from "@nodedrop/types";
import vm from 'node:vm';
// createNodeHelperFunctions removed as we now polyfill inside the VM

// Polyfill for DateTime to be injected into the VM
// This ensures DateTime is created INSIDE the sandbox using the sandbox's own Date/Object constructors
// preventing host object leakage.
const DATE_TIME_POLYFILL = `
function formatDate(d, format) {
  return format
    .replace('yyyy', d.getFullYear().toString())
    .replace('MM', (d.getMonth() + 1).toString().padStart(2, '0'))
    .replace('dd', d.getDate().toString().padStart(2, '0'))
    .replace('HH', d.getHours().toString().padStart(2, '0'))
    .replace('mm', d.getMinutes().toString().padStart(2, '0'))
    .replace('ss', d.getSeconds().toString().padStart(2, '0'));
}

function applyDuration(d, duration, subtract = false) {
  const result = new Date(d);
  const multiplier = subtract ? -1 : 1;
  if (duration.days) result.setDate(result.getDate() + duration.days * multiplier);
  if (duration.hours) result.setHours(result.getHours() + duration.hours * multiplier);
  if (duration.minutes) result.setMinutes(result.getMinutes() + duration.minutes * multiplier);
  return result;
}

const DateTime = {
  now: () => {
    const d = new Date();
    return {
      toISO: () => d.toISOString(),
      toISODate: () => d.toISOString().split('T')[0],
      toFormat: (format) => formatDate(d, format),
      plus: (duration) => {
        const newDate = applyDuration(d, duration);
        return {
          toISO: () => newDate.toISOString(),
          toISODate: () => newDate.toISOString().split('T')[0],
        };
      },
      minus: (duration) => {
        const newDate = applyDuration(d, duration, true);
        return {
          toISO: () => newDate.toISOString(),
          toISODate: () => newDate.toISOString().split('T')[0],
        };
      },
    };
  },

  fromISO: (isoString) => {
    const d = new Date(isoString);
    return {
      toISO: () => d.toISOString(),
      toISODate: () => d.toISOString().split('T')[0],
      toFormat: (format) => formatDate(d, format),
    };
  },
};
`;

const CONSOLE_POLYFILL = `
const console = {
  log: () => {},
  warn: () => {},
  error: () => {},
  info: () => {},
  debug: () => {},
};
`;

const HELPER_POLYFILL = `
function isExecuted(nodeName) {
  try {
    return $node[nodeName] !== undefined && $node[nodeName] !== null;
  } catch(e) { return false; }
}

function hasData(nodeName) {
  try {
    const data = $node[nodeName];
    if (data === undefined || data === null) return false;
    if (Array.isArray(data)) return data.length > 0;
    if (typeof data === "object") return Object.keys(data).length > 0;
    return true;
  } catch(e) { return false; }
}

function getNodeData(nodeName, defaultValue = null) {
  try {
    const data = $node[nodeName];
    return (data !== undefined && data !== null) ? data : defaultValue;
  } catch(e) { return defaultValue; }
}

function firstExecuted(nodeNames) {
  if (!Array.isArray(nodeNames)) return null;
  for (const name of nodeNames) {
    if ($node[name] !== undefined && $node[name] !== null) {
      return $node[name];
    }
  }
  return null;
}
`;

/**
 * Resolves a field path in an object, supporting nested paths.
 *
 * @param obj - The object to extract data from
* ... (keeping rest of file until safeEvaluateExpression) ...
 */
export function resolvePath(obj: any, path: string): any {
  if (!obj || typeof obj !== "object") {
    return undefined;
  }

  // Handle array notation: items[0].name -> items.0.name
  const normalizedPath = path.replace(/\[(\d+)\]/g, ".$1");

  return normalizedPath.split(".").reduce((current, key) => {
    if (current === null || current === undefined) {
      return undefined;
    }
    return current[key];
  }, obj);
}

/**
 * Validate expression for dangerous patterns
 * SECURITY: Blocks constructor chains, process access, require(), eval(), etc.
 */
function validateExpression(expression: string): void {
  // Check expression length
  if (expression.length > 10000) {
    throw new Error('Expression exceeds maximum length of 10,000 characters');
  }

  // Block obvious exploit patterns
  const dangerousPatterns = [
    { pattern: /constructor\s*\.\s*constructor/i, name: 'constructor chain' },
    { pattern: /this\s*\.\s*constructor/i, name: 'this.constructor' },
    { pattern: /\bprocess\b/i, name: 'process access' },
    { pattern: /\brequire\s*\(/i, name: 'require()' },
    { pattern: /\bimport\s*\(/i, name: 'dynamic import' },
    { pattern: /\beval\s*\(/i, name: 'eval()' },
    { pattern: /\bFunction\s*\(/i, name: 'Function constructor' },
    { pattern: /__proto__/i, name: '__proto__' },
    { pattern: /\.prototype\b/i, name: 'prototype access' },
    { pattern: /\bglobalThis\b/i, name: 'globalThis' },
    { pattern: /\bglobal\b/i, name: 'global object' },
    { pattern: /\bBun\b/i, name: 'Bun global' },
  ];

  for (const { pattern, name } of dangerousPatterns) {
    if (pattern.test(expression)) {
      console.warn(`[Security] Blocked expression with forbidden pattern: ${name}`);
      throw new Error(`Expression contains forbidden pattern: ${name}`);
    }
  }
}

/**
 * Safely evaluate a JavaScript expression with provided context
 * 
 * SECURITY: Uses VM sandboxing with validation to prevent code injection
 * 
 * IMPORTANT: While we use VM sandboxing, constructor chain exploits can still
 * potentially access the parent context. The validation layer provides defense-in-depth
 * by blocking known exploit patterns before execution.
 * 
 * For maximum security in production:
 * 1. Validation blocks known exploit patterns
 * 2. VM provides context isolation
 * 3. Timeout prevents DoS
 * 4. Consider running in separate process for critical deployments
 */
export function safeEvaluateExpression(
  expression: string,
  context: ExpressionContext,
  item: any
): any {
  try {
    // Validate expression first - defense in depth
    validateExpression(expression);

    // Serialize context data to JSON strings
    // This allows us to pass data into the VM without passing Host Objects
    // Host Objects (like checks for .constructor) are the primary vector for sandbox escapes
    const _jsonStr = JSON.stringify(context.$json ?? item ?? {});
    const _nodeStr = JSON.stringify(context.$node ?? {});
    const _varsStr = JSON.stringify(context.$vars ?? {});
    const _workflowStr = JSON.stringify(context.$workflow ?? {});
    const _executionStr = JSON.stringify(context.$execution ?? {});
    const _itemIndex = context.$itemIndex ?? 0;

    // Secure Sandbox
    // We only pass primitive strings and numbers. No objects that link back to the host.
    const sandbox = {
      _jsonStr,
      _nodeStr,
      _varsStr,
      _workflowStr,
      _executionStr,
      _itemIndex,
    };

    // Wrap expression to:
    // 1. Parse the JSON strings back into objects inside the VM
    // 2. Define helper functions ($isExecuted etc) inside the VM
    // 3. Define DateTime polyfill
    // 4. Execute the user expression
    const wrappedExpression = `
      "use strict";
      
      // Rehydrate data from JSON strings
      // This ensures all objects are natives of this VM context, not wrappers around host objects
      const $json = JSON.parse(_jsonStr);
      const $node = JSON.parse(_nodeStr);
      const $vars = JSON.parse(_varsStr);
      const $workflow = JSON.parse(_workflowStr);
      const $execution = JSON.parse(_executionStr);
      const $itemIndex = _itemIndex;
      
      // Polyfills
      ${CONSOLE_POLYFILL}
      ${DATE_TIME_POLYFILL}
      ${HELPER_POLYFILL}
      
      // Built-in variables that depend on instantiated classes
      const $now = new Date().toISOString();
      const $today = new Date().toISOString().split('T')[0];

      // Execute User Expression
      (${expression})
    `;
    
    // Execute in isolated VM context with timeout
    const result = vm.runInNewContext(wrappedExpression, sandbox, {
      timeout: 5000, 
      displayErrors: true,
      breakOnSigint: true,
    });
    
    return result;
  } catch (error) {
    // Log security-relevant errors (optional, keep minimal to avoid noise)
    if (error instanceof Error) {
       if (error.message.includes('forbidden pattern')) {
          // Swallow or log if critical
       }
    }
    
    // If evaluation fails, return the original expression wrapped
    return `{{${expression}}}`;
  }
}


/**
 * Evaluates the content of an expression path (inside {{ }}).
 * Returns the raw resolved value, or undefined if not resolved.
 */
function evaluateExpressionPath(path: string, item: any, context?: ExpressionContext): { value: any, resolved: boolean } {
  const trimmedPath = path.trim();
  
  // Check if this is a complex expression
  const isComplexExpression = 
    trimmedPath.includes('(') ||
    trimmedPath.includes('+') ||
    trimmedPath.includes('-') ||
    trimmedPath.includes('*') ||
    trimmedPath.includes('/') ||
    trimmedPath.includes('?') ||
    trimmedPath.includes('Math.') ||
    trimmedPath.includes('JSON.') ||
    trimmedPath.includes('Object.') ||
    trimmedPath.includes('Array.') ||
    trimmedPath.includes('DateTime.') ||
    trimmedPath === '$now' ||
    trimmedPath === '$today';
  
  // For complex expressions, use the safe evaluator
  if (isComplexExpression) {
    const result = safeEvaluateExpression(trimmedPath, context || {}, item);
    if (result !== undefined && result !== null && !String(result).startsWith('{{')) {
      // Check if result is a DateTime object (has toISO method)
      if (typeof result === 'object' && result !== null && typeof result.toISO === 'function') {
        return { value: result.toISO(), resolved: true };
      }
      return { value: result, resolved: true };
    }
  }
  
  // Handle $node["Node Name"].field format
  const nodeRefMatch = trimmedPath.match(/^\$node\[["']([^"']+)["']\](?:\.json)?(?:\.(.+))?$/);
  if (nodeRefMatch) {
    const nodeIdOrName = nodeRefMatch[1];
    const fieldPath = nodeRefMatch[2];

    if (context?.$node && context.$node[nodeIdOrName]) {
      const nodeData = context.$node[nodeIdOrName];
      if (fieldPath) {
        const result = resolvePath(nodeData, fieldPath);
        return result !== undefined ? { value: result, resolved: true } : { value: undefined, resolved: false };
      }
      return { value: nodeData, resolved: true };
    }
    return { value: undefined, resolved: false };
  }
  
  // Handle $vars.variableName format
  const varsMatch = trimmedPath.match(/^\$vars\.(.+)$/);
  if (varsMatch) {
    const varName = varsMatch[1];
    if (context?.$vars && varName in context.$vars) {
      return { value: context.$vars[varName], resolved: true };
    }
    return { value: undefined, resolved: false };
  }
  
  // Handle $workflow.field format
  const workflowMatch = trimmedPath.match(/^\$workflow\.(.+)$/);
  if (workflowMatch) {
    const field = workflowMatch[1];
    if (context?.$workflow && field in context.$workflow) {
      return { value: (context.$workflow as any)[field], resolved: true };
    }
    return { value: undefined, resolved: false };
  }
  
  // Handle $execution.field format
  const executionMatch = trimmedPath.match(/^\$execution\.(.+)$/);
  if (executionMatch) {
    const field = executionMatch[1];
    if (context?.$execution && field in context.$execution) {
      return { value: (context.$execution as any)[field], resolved: true };
    }
    return { value: undefined, resolved: false };
  }
  
  // Handle $json[0].field or json[0].field (array-based access)
  const arrayAccessMatch = trimmedPath.match(/^\$?json\[(\d+)\](?:\.(.+))?$/);
  if (arrayAccessMatch) {
    const inputIndex = parseInt(arrayAccessMatch[1], 10);
    const fieldPath = arrayAccessMatch[2];
    
    const dataSource = context?.$json ?? item;
    
    if (Array.isArray(dataSource)) {
      if (inputIndex >= dataSource.length) {
        return { value: undefined, resolved: false };
      }
      
      const targetItem = dataSource[inputIndex];
      if (fieldPath) {
        const result = resolvePath(targetItem, fieldPath);
        return result !== undefined ? { value: result, resolved: true } : { value: undefined, resolved: false };
      }
      return { value: targetItem, resolved: true };
    }
    return { value: undefined, resolved: false };
  }
  
  // Handle $json.field or json.field (standard object access)
  let normalizedPath = trimmedPath;
  if (normalizedPath.startsWith('$json.')) {
    normalizedPath = normalizedPath.substring(6);
  } else if (normalizedPath.startsWith('json.')) {
    normalizedPath = normalizedPath.substring(5);
  } else if (normalizedPath === '$json' || normalizedPath === 'json') {
    const dataSource = context?.$json ?? item;
    return { value: dataSource, resolved: true };
  }
  
  const dataSource = context?.$json ?? item;
  const result = resolvePath(dataSource, normalizedPath);
  
  if (result !== undefined) {
    return { value: result, resolved: true };
  }
  
  return { value: undefined, resolved: false };
}

/**
 * Resolves placeholder expressions in a value string using data from an item or context.
 *
 * Supports multiple expression formats:
 * - {{$json.fieldName}} or {{json.fieldName}} - Access immediate input data
 * - {{$json[0].fieldName}} - Array-based access for multiple inputs
 * - {{$node["Node Name"].fieldName}} - Access specific node's output by name
 * - {{$node["nodeId"].fieldName}} - Access specific node's output by ID
 * - {{$vars.variableName}} - Access workflow variables
 * - {{$workflow.name}} - Access workflow metadata
 *
 * @param value - The value string that may contain placeholders
 * @param item - The data item (for backward compatibility) or ExpressionContext
 * @param context - Optional full expression context with $node, $vars, etc.
 * @returns The resolved value with placeholders replaced by actual data
 *
 * @example
 * // Simple field access
 * resolveValue("Hello {{$json.name}}", { name: "John" }); // "Hello John"
 *
 * // Node reference by name
 * resolveValue("{{$node[\"HTTP Request\"].posts}}", null, { $node: { "HTTP Request": { posts: [...] } } });
 */
export function resolveValue(value: string | any, item: any, context?: ExpressionContext): any {
  // If value is not a string, return as-is
  if (typeof value !== "string") {
    return value;
  }

  // Decode URL-encoded values first
  let decodedValue = value;
  try {
    if (value.includes('%')) {
      decodedValue = decodeURIComponent(value);
    }
  } catch {
    decodedValue = value;
  }

  // Optimize for single expression case: return the raw object instead of stringifying
  // Pattern: ^{{ content }}$
  const singleMatch = decodedValue.match(/^\{\{((?:[^{}]|\{(?:[^{}]|\{[^{}]*\})*\})*)\}\}$/);
  if (singleMatch) {
    const path = singleMatch[1];
    const { value: result, resolved } = evaluateExpressionPath(path, item, context);
    if (resolved) {
      return result;
    }
    // If not resolved, fall through to replace which will leave it as is (or partially resolve if we want that behavior)
    // Actually if it's not resolved, we usually leave it alone.
    // But let's let the standard replace logic handle it to be consistent with existing behavior
  }

  // Replace placeholders like {{$json.fieldName}}, {{$node["id"].json.field}}, etc.
  return decodedValue.replace(/\{\{((?:[^{}]|\{(?:[^{}]|\{[^{}]*\})*\})*)\}\}/g, (match, path) => {
    const { value: result, resolved } = evaluateExpressionPath(path, item, context);
    
    if (resolved) {
      return typeof result === 'object' ? JSON.stringify(result) : String(result);
    }
    
    return match;
  });
}
