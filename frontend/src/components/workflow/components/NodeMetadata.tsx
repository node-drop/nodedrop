import { NodeExecutionStatus } from '@/types/execution'
import { memo, useMemo } from 'react'

interface NodeMetadataProps {
  label?: string // Made optional since label is now shown inside the node
  nodeVisualState?: {
    status: NodeExecutionStatus
    progress?: number
    executionTime?: number
  }
}

export const NodeMetadata = memo(function NodeMetadata({ nodeVisualState }: NodeMetadataProps) {
  // Memoize condition checks to prevent recalculation
  const isRunning = useMemo(() => 
    nodeVisualState?.status === NodeExecutionStatus.RUNNING,
    [nodeVisualState?.status]
  )
  
  const isCompleted = useMemo(() => 
    nodeVisualState?.status === NodeExecutionStatus.COMPLETED,
    [nodeVisualState?.status]
  )
  
  const hasProgress = useMemo(() => 
    !!(nodeVisualState?.progress && nodeVisualState.progress > 0),
    [nodeVisualState?.progress]
  )
  
  const hasExecutionTime = useMemo(() => 
    !!nodeVisualState?.executionTime,
    [nodeVisualState?.executionTime]
  )

  const executionSeconds = useMemo(() => 
    nodeVisualState?.executionTime ? Math.round(nodeVisualState.executionTime / 1000) : 0,
    [nodeVisualState?.executionTime]
  )

  return (
    <>
      {/* Progress bar for running nodes */}
      {isRunning && hasProgress && (
        <div className="mt-2 w-full max-w-[120px] mx-auto">
          <div className="w-full bg-muted rounded-full h-1">
            <div 
              className="bg-blue-500 dark:bg-blue-400 h-1 rounded-full transition-all duration-300"
              style={{ width: `${nodeVisualState!.progress}%` }}
            />
          </div>
          <div className="text-xs text-muted-foreground mt-1 text-center">
            {nodeVisualState!.progress}%
            {hasExecutionTime && (
              <span className="ml-2">
                {executionSeconds}s
              </span>
            )}
          </div>
        </div>
      )}

      {/* Execution time display for completed nodes */}
      {isCompleted && hasExecutionTime && (
        <div className="mt-1 text-xs text-muted-foreground text-center">
          {executionSeconds}s
        </div>
      )}
    </>
  )
})
