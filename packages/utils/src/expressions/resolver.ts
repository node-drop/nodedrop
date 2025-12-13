/**
 * Expression Resolver
 * 
 * Core expression resolution logic for workflow expressions.
 * Handles placeholder resolution like {{$json.field}}, {{$node["Name"].field}}, etc.
 */

import type { ExpressionContext } from "@nodedrop/types";
import { DateTime } from "./datetime";
import { createNodeHelperFunctions } from "./helpers";

/**
 * Resolves a field path in an object, supporting nested paths.
 *
 * @param obj - The object to extract data from
 * @param path - The path to the field (e.g., "user.address.city")
 * @returns The value at the specified path, or undefined if not found
 *
 * @example
 * const obj = { user: { address: { city: "NYC" } } };
 * resolvePath(obj, "user.address.city"); // Returns: "NYC"
 * resolvePath(obj, "user.name"); // Returns: undefined
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
 * Safely evaluate a JavaScript expression with provided context
 * Supports: String/Array/Object methods, Math, JSON, DateTime
 */
export function safeEvaluateExpression(
  expression: string,
  context: ExpressionContext,
  item: any
): any {
  try {
    const nodeData = context.$node || {};
    const helperFunctions = createNodeHelperFunctions(nodeData);

    // Build the evaluation context with all available data
    const evalContext: Record<string, any> = {
      // Data sources
      $json: context.$json ?? item,
      $node: nodeData,
      $vars: context.$vars || {},
      $workflow: context.$workflow || {},
      $execution: context.$execution || {},
      $itemIndex: context.$itemIndex ?? 0,
      // Helper functions (direct access like $isExecuted("Node"))
      ...helperFunctions,
      // Built-in variables
      $now: new Date().toISOString(),
      $today: new Date().toISOString().split('T')[0],
      // Safe globals
      Math,
      JSON,
      Object,
      Array,
      String,
      Number,
      Boolean,
      Date,
      DateTime,
      parseInt,
      parseFloat,
      isNaN,
      isFinite,
      encodeURIComponent,
      decodeURIComponent,
      encodeURI,
      decodeURI,
    };

    // Create a function that evaluates the expression with the context
    const contextKeys = Object.keys(evalContext);
    const contextValues = Object.values(evalContext);
    
    // Wrap expression to return its value
    const wrappedExpression = `"use strict"; return (${expression});`;
    
    // Create and execute the function
    const evaluator = new Function(...contextKeys, wrappedExpression);
    const result = evaluator(...contextValues);
    
    return result;
  } catch (error) {
    // If evaluation fails, return the original expression wrapped
    console.warn(`[safeEvaluateExpression] Failed to evaluate: ${expression}`, error);
    return `{{${expression}}}`;
  }
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

  // Replace placeholders like {{$json.fieldName}}, {{$node["id"].json.field}}, etc.
  return decodedValue.replace(/\{\{((?:[^{}]|\{(?:[^{}]|\{[^{}]*\})*\})*)\}\}/g, (match, path) => {
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
        return typeof result === 'object' ? JSON.stringify(result) : String(result);
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
          return result !== undefined
            ? typeof result === 'object'
              ? JSON.stringify(result)
              : String(result)
            : match;
        }
        return typeof nodeData === 'object' ? JSON.stringify(nodeData) : String(nodeData);
      }
      return match;
    }
    
    // Handle $vars.variableName format
    const varsMatch = trimmedPath.match(/^\$vars\.(.+)$/);
    if (varsMatch) {
      const varName = varsMatch[1];
      if (context?.$vars && varName in context.$vars) {
        return context.$vars[varName];
      }
      return match;
    }
    
    // Handle $workflow.field format
    const workflowMatch = trimmedPath.match(/^\$workflow\.(.+)$/);
    if (workflowMatch) {
      const field = workflowMatch[1];
      if (context?.$workflow && field in context.$workflow) {
        return String((context.$workflow as any)[field]);
      }
      return match;
    }
    
    // Handle $execution.field format
    const executionMatch = trimmedPath.match(/^\$execution\.(.+)$/);
    if (executionMatch) {
      const field = executionMatch[1];
      if (context?.$execution && field in context.$execution) {
        return String((context.$execution as any)[field]);
      }
      return match;
    }
    
    // Handle $json[0].field or json[0].field (array-based access)
    const arrayAccessMatch = trimmedPath.match(/^\$?json\[(\d+)\](?:\.(.+))?$/);
    if (arrayAccessMatch) {
      const inputIndex = parseInt(arrayAccessMatch[1], 10);
      const fieldPath = arrayAccessMatch[2];
      
      const dataSource = context?.$json ?? item;
      
      if (Array.isArray(dataSource)) {
        if (inputIndex >= dataSource.length) {
          return match;
        }
        
        const targetItem = dataSource[inputIndex];
        if (fieldPath) {
          const result = resolvePath(targetItem, fieldPath);
          return result !== undefined ? (typeof result === 'object' ? JSON.stringify(result) : String(result)) : match;
        }
        return typeof targetItem === 'object' ? JSON.stringify(targetItem) : String(targetItem);
      }
      return match;
    }
    
    // Handle $json.field or json.field (standard object access)
    let normalizedPath = trimmedPath;
    if (normalizedPath.startsWith('$json.')) {
      normalizedPath = normalizedPath.substring(6);
    } else if (normalizedPath.startsWith('json.')) {
      normalizedPath = normalizedPath.substring(5);
    } else if (normalizedPath === '$json' || normalizedPath === 'json') {
      const dataSource = context?.$json ?? item;
      return typeof dataSource === 'object' ? JSON.stringify(dataSource) : String(dataSource);
    }
    
    const dataSource = context?.$json ?? item;
    const result = resolvePath(dataSource, normalizedPath);
    
    if (result !== undefined) {
      return typeof result === 'object' ? JSON.stringify(result) : String(result);
    }
    
    return match;
  });
}
