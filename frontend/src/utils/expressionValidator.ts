/**
 * Expression validation utilities
 */

export interface ValidationError {
  type: "unmatched_braces" | "invalid_variable" | "syntax_error" | "warning";
  message: string;
  position: number;
  length: number;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

/**
 * Validate expression syntax
 */
export function validateExpression(value: string): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  if (!value) {
    return { isValid: true, errors: [], warnings: [] };
  }

  // Check for unmatched {{ and }}
  const braceStack: { type: string; position: number }[] = [];

  for (let i = 0; i < value.length; i++) {
    if (value[i] === "{" && value[i + 1] === "{") {
      braceStack.push({ type: "open", position: i });
      i++; // Skip next character
    } else if (value[i] === "}" && value[i + 1] === "}") {
      if (braceStack.length === 0) {
        errors.push({
          type: "unmatched_braces",
          message: "Closing }} without matching {{",
          position: i,
          length: 2,
        });
      } else {
        braceStack.pop();
      }
      i++; // Skip next character
    }
  }

  // Any remaining open braces are unmatched
  braceStack.forEach((brace) => {
    errors.push({
      type: "unmatched_braces",
      message: "Opening {{ without matching }}",
      position: brace.position,
      length: 2,
    });
  });

  // Check for invalid variable references
  // Match $vars.something or $local.something
  const variablePattern = /(\$(?:vars|local)\.([a-zA-Z_][a-zA-Z0-9_]*))/g;
  let match;

  while ((match = variablePattern.exec(value)) !== null) {
    const varName = match[2];
    // Basic validation - variable names should not be empty
    if (!varName || varName.length === 0) {
      errors.push({
        type: "invalid_variable",
        message: "Variable name cannot be empty",
        position: match.index,
        length: match[0].length,
      });
    }
  }

  // Check for incomplete variable references ($vars or $local without property)
  const incompleteVarPattern = /\$(?:vars|local)(?![.\w])/g;
  while ((match = incompleteVarPattern.exec(value)) !== null) {
    // Only warn if it's inside an expression {{ }}
    const textBefore = value.substring(0, match.index);
    const lastOpenBrace = textBefore.lastIndexOf("{{");
    const lastCloseBrace = textBefore.lastIndexOf("}}");

    if (lastOpenBrace > lastCloseBrace) {
      warnings.push({
        type: "warning",
        message:
          "Incomplete variable reference. Use $vars.propertyName or $local.propertyName",
        position: match.index,
        length: match[0].length,
      });
    }
  }

  // Check for empty expressions {{}}
  const emptyExpressionPattern = /\{\{\s*\}\}/g;
  while ((match = emptyExpressionPattern.exec(value)) !== null) {
    warnings.push({
      type: "warning",
      message: "Empty expression",
      position: match.index,
      length: match[0].length,
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Get all expression blocks from text
 */
export function getExpressionBlocks(
  value: string
): Array<{ start: number; end: number; content: string }> {
  const blocks: Array<{ start: number; end: number; content: string }> = [];
  let i = 0;

  while (i < value.length) {
    if (value[i] === "{" && value[i + 1] === "{") {
      const start = i;
      i += 2;
      let depth = 1;
      let content = "";

      while (i < value.length && depth > 0) {
        if (value[i] === "{" && value[i + 1] === "{") {
          depth++;
          content += "{{";
          i += 2;
        } else if (value[i] === "}" && value[i + 1] === "}") {
          depth--;
          if (depth === 0) {
            blocks.push({ start, end: i + 2, content });
            i += 2;
            break;
          } else {
            content += "}}";
            i += 2;
          }
        } else {
          content += value[i];
          i++;
        }
      }

      // If we exited without closing, it's an unclosed expression
      if (depth > 0) {
        blocks.push({ start, end: value.length, content });
      }
    } else {
      i++;
    }
  }

  return blocks;
}
