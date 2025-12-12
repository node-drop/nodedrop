/**
 * Types for toolbar button components
 */

import type { NodeExecutionError, ExecutionCapability } from '@nodedrop/types';

// Re-export for convenience
export type { NodeExecutionError };

// Re-export ExecutionCapability as NodeExecutionCapability for backward compatibility
export type NodeExecutionCapability = ExecutionCapability;

export interface ToolbarButtonBaseProps {
  nodeId: string
  className?: string
}

export interface ExecuteToolbarButtonProps extends ToolbarButtonBaseProps {
  nodeType: string
  isExecuting: boolean
  canExecute: boolean
  hasError?: boolean
  hasSuccess?: boolean
  executionError?: NodeExecutionError
  onExecute: (nodeId: string) => void
  onRetry?: (nodeId: string) => void
}

export interface DisableToggleToolbarButtonProps extends ToolbarButtonBaseProps {
  nodeLabel: string
  disabled: boolean
  onToggle: (nodeId: string, disabled: boolean) => void
}

/**
 * Metadata about a node type for execution control and UI display
 * This extends the core node properties with frontend-specific metadata
 */
export interface NodeTypeMetadata {
  type: string
  group: string[]
  executionCapability: ExecutionCapability
  canExecuteIndividually: boolean
  canBeDisabled: boolean
}
