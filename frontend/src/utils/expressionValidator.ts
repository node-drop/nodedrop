/**
 * Expression validation utilities
 * 
 * This module re-exports expression validation from @nodedrop/utils for backward compatibility.
 * New code should import directly from @nodedrop/utils.
 * 
 * @deprecated Import from @nodedrop/utils instead
 */

export {
  type ExpressionValidationError as ValidationError,
  type ExpressionValidationResult as ValidationResult,
  validateExpression,
  getExpressionBlocks,
} from "@nodedrop/utils";
