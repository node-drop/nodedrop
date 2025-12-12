// Import and re-export shared types from @nodedrop/types
import type { 
  VariableCategoryItem,
  VariableCategory,
  ExpressionResult,
} from '@nodedrop/types';

export type { VariableCategory, ExpressionResult };
export type AutocompleteItem = VariableCategoryItem;

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
