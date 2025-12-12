import type { VariableCategoryItem as BaseVariableCategoryItem } from '@nodedrop/types';

/**
 * Extended autocomplete item for expression editor
 * Extends the base VariableCategoryItem with additional UI-specific types
 */
export interface AutocompleteItem extends Omit<BaseVariableCategoryItem, 'type'> {
  type: "variable" | "method" | "property" | "object" | "array" | "function"
}

/**
 * Variable category for expression editor autocomplete
 * Uses the extended AutocompleteItem for richer UI suggestions
 */
export interface VariableCategory {
  name: string
  icon: string
  items: AutocompleteItem[]
}

export interface ExpressionResult {
  success: boolean
  value: string
  type: string
  error?: string
}

export interface ExpressionEditorProps {
  /** Initial expression value */
  initialValue?: string
  /** Placeholder text when empty */
  placeholder?: string
  /** Mock data for expression evaluation */
  mockData?: Record<string, unknown>
  /** Variable categories for autocomplete sidebar */
  variableCategories?: VariableCategory[]
  /** Called when expression changes */
  onChange?: (expression: string) => void
  /** Called when result changes */
  onResultChange?: (result: ExpressionResult) => void
  /** Title displayed in header */
  title?: string
  /** Whether to show the variable selector sidebar */
  showVariableSelector?: boolean
  /** Whether to show the result preview */
  showResultPreview?: boolean
  /** Custom class name for the container */
  className?: string
  /** Node ID for building mock data from workflow */
  nodeId?: string
}
