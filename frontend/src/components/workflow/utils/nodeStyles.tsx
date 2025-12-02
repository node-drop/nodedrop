import { NodeExecutionStatus } from '@/types/execution'
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react'
import { ReactNode } from 'react'

interface NodeExecutionState {
  isExecuting: boolean
  hasError: boolean
  hasSuccess: boolean
}

interface NodeVisualState {
  status: NodeExecutionStatus
}

export function getStatusIcon(
  nodeVisualState: NodeVisualState | undefined,
  nodeExecutionState: NodeExecutionState,
  dataStatus?: string
): ReactNode {
  // Prioritize flow execution visual state
  if (nodeVisualState && nodeVisualState.status !== NodeExecutionStatus.IDLE) {
    switch (nodeVisualState.status) {
      case NodeExecutionStatus.QUEUED:
        return <div className="w-3 h-3 rounded-full bg-yellow-400 dark:bg-yellow-500 animate-pulse" />
      case NodeExecutionStatus.RUNNING:
        return <Loader2 className="w-3 h-3 text-blue-500 dark:text-blue-400 animate-spin" />
      case NodeExecutionStatus.COMPLETED:
        return <CheckCircle className="w-3 h-3 text-green-500 dark:text-green-400" />
      case NodeExecutionStatus.FAILED:
        return <AlertCircle className="w-3 h-3 text-red-500 dark:text-red-400" />
      case NodeExecutionStatus.CANCELLED:
        return <div className="w-3 h-3 rounded-full bg-muted-foreground" />
      case NodeExecutionStatus.SKIPPED:
        return <div className="w-3 h-3 rounded-full bg-muted" />
      default:
        return null
    }
  }

  // Fallback to real-time execution state
  if (nodeExecutionState.isExecuting) {
    return <Loader2 className="w-3 h-3 text-blue-500 dark:text-blue-400 animate-spin" />
  }
  if (nodeExecutionState.hasSuccess) {
    return <CheckCircle className="w-3 h-3 text-green-500 dark:text-green-400" />
  }
  if (nodeExecutionState.hasError) {
    return <AlertCircle className="w-3 h-3 text-red-500 dark:text-red-400" />
  }
  
  // Fallback to data.status
  switch (dataStatus) {
    case 'running':
      return <Loader2 className="w-3 h-3 text-blue-500 dark:text-blue-400 animate-spin" />
    case 'success':
      return <CheckCircle className="w-3 h-3 text-green-500 dark:text-green-400" />
    case 'error':
      return <AlertCircle className="w-3 h-3 text-red-500 dark:text-red-400" />
    default:
      return null
  }
}

export function getNodeColor(
  disabled: boolean,
  selected: boolean,
  nodeVisualState: NodeVisualState | undefined,
  nodeExecutionState: NodeExecutionState,
  dataStatus?: string
): string {
  if (disabled) return 'bg-muted border-border text-muted-foreground'
  if (selected) return 'bg-blue-50 dark:bg-blue-950 border-blue-500 dark:border-blue-400'
  
  // Prioritize flow execution visual state
  if (nodeVisualState && nodeVisualState.status !== NodeExecutionStatus.IDLE) {
    switch (nodeVisualState.status) {
      case NodeExecutionStatus.QUEUED:
        return 'bg-yellow-50 dark:bg-yellow-950 border-yellow-300 dark:border-yellow-600'
      case NodeExecutionStatus.RUNNING:
        return 'bg-blue-50 dark:bg-blue-950 border-blue-300 dark:border-blue-600'
      case NodeExecutionStatus.COMPLETED:
        return 'bg-green-50 dark:bg-green-950 border-green-300 dark:border-green-600'
      case NodeExecutionStatus.FAILED:
        return 'bg-red-50 dark:bg-red-950 border-red-300 dark:border-red-600'
      case NodeExecutionStatus.CANCELLED:
        return 'bg-muted border-border'
      case NodeExecutionStatus.SKIPPED:
        return 'bg-muted border-border'
      default:
        return 'bg-card border-border hover:border-muted-foreground'
    }
  }
  
  // Fallback to real-time execution state
  if (nodeExecutionState.isExecuting) {
    return 'bg-blue-50 dark:bg-blue-950 border-blue-300 dark:border-blue-600'
  }
  if (nodeExecutionState.hasSuccess) {
    return 'bg-green-50 dark:bg-green-950 border-green-300 dark:border-green-600'
  }
  if (nodeExecutionState.hasError) {
    return 'bg-red-50 dark:bg-red-950 border-red-300 dark:border-red-600'
  }
  
  // Fallback to data.status
  switch (dataStatus) {
    case 'running':
      return 'bg-blue-50 dark:bg-blue-950 border-blue-300 dark:border-blue-600'
    case 'success':
      return 'bg-green-50 dark:bg-green-950 border-green-300 dark:border-green-600'
    case 'error':
      return 'bg-red-50 dark:bg-red-950 border-red-300 dark:border-red-600'
    default:
      return 'bg-card border-border hover:border-muted-foreground'
  }
}

export function getAnimationClasses(nodeVisualState: NodeVisualState | undefined): string {
  if (nodeVisualState) {
    switch (nodeVisualState.status) {
      case NodeExecutionStatus.QUEUED:
        return 'node-queued node-glow-queued'
      case NodeExecutionStatus.RUNNING:
        return 'node-running node-glow-running'
      case NodeExecutionStatus.COMPLETED:
        return 'node-success node-glow-success'
      case NodeExecutionStatus.FAILED:
        return 'node-error node-glow-error'
      default:
        return ''
    }
  }
  return ''
}
