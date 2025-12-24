/**
 * GitChangesList Component
 * 
 * Displays a list of changed files with icons, change types, and actions.
 * Provides stage/unstage and discard functionality for individual changes,
 * as well as bulk "Stage All" and "Unstage All" operations.
 * 
 * Requirements: 2.1
 */

import { memo, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  FilePlus, 
  FileEdit, 
  FileX, 
  Plus, 
  Minus, 
  X,
  CheckCircle2,
  Circle
} from 'lucide-react'
import { GitChange } from '@/services/git.service'
import { cn } from '@/lib/utils'

interface GitChangesListProps {
  workflowId: string
  changes: GitChange[]
  readOnly?: boolean
}

/**
 * Get icon for change type
 */
const getChangeIcon = (type: GitChange['type']) => {
  switch (type) {
    case 'added':
      return FilePlus
    case 'modified':
      return FileEdit
    case 'deleted':
      return FileX
    default:
      return FileEdit
  }
}

/**
 * Get color class for change type
 */
const getChangeColor = (type: GitChange['type']) => {
  switch (type) {
    case 'added':
      return 'text-green-600 dark:text-green-400'
    case 'modified':
      return 'text-blue-600 dark:text-blue-400'
    case 'deleted':
      return 'text-red-600 dark:text-red-400'
    default:
      return 'text-muted-foreground'
  }
}

/**
 * Get label for change type
 */
const getChangeLabel = (type: GitChange['type']) => {
  switch (type) {
    case 'added':
      return 'Added'
    case 'modified':
      return 'Modified'
    case 'deleted':
      return 'Deleted'
    default:
      return 'Changed'
  }
}

export const GitChangesList = memo(function GitChangesList({
  workflowId: _workflowId,
  changes,
  readOnly = false
}: GitChangesListProps) {
  // TODO: Implement actual stage/unstage/discard operations in future tasks
  // For now, these are placeholder handlers
  
  const handleStageChange = useCallback((path: string) => {
    console.log('Stage change:', path)
    // TODO: Call git service to stage change
    // await gitService.stageChange(workflowId, path)
  }, [])

  const handleUnstageChange = useCallback((path: string) => {
    console.log('Unstage change:', path)
    // TODO: Call git service to unstage change
    // await gitService.unstageChange(workflowId, path)
  }, [])

  const handleDiscardChange = useCallback((path: string) => {
    console.log('Discard change:', path)
    // TODO: Implement discard with confirmation dialog
    // Show confirmation dialog
    // await gitService.discardChange(workflowId, path)
  }, [])

  const handleStageAll = useCallback(() => {
    console.log('Stage all changes')
    // TODO: Call git service to stage all changes
    // await gitService.stageAllChanges(workflowId)
  }, [])

  const handleUnstageAll = useCallback(() => {
    console.log('Unstage all changes')
    // TODO: Call git service to unstage all changes
    // await gitService.unstageAllChanges(workflowId)
  }, [])

  // Calculate counts
  const stagedCount = changes.filter(c => c.staged).length
  const unstagedCount = changes.filter(c => !c.staged).length
  const hasChanges = changes.length > 0
  const hasStagedChanges = stagedCount > 0
  const hasUnstagedChanges = unstagedCount > 0

  // Empty state
  if (!hasChanges) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400 mb-2" />
        <p className="text-xs text-muted-foreground">No changes</p>
        <p className="text-xs text-muted-foreground mt-1">
          Your workflow is up to date
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Bulk actions */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleStageAll}
          disabled={!hasUnstagedChanges || readOnly}
          className="h-7 text-xs flex-1"
          title="Stage all changes"
        >
          <Plus className="mr-1.5 h-3 w-3" />
          Stage All
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleUnstageAll}
          disabled={!hasStagedChanges || readOnly}
          className="h-7 text-xs flex-1"
          title="Unstage all changes"
        >
          <Minus className="mr-1.5 h-3 w-3" />
          Unstage All
        </Button>
      </div>

      {/* Changes list */}
      <ScrollArea className="max-h-[400px]">
        <div className="space-y-1">
          {changes.map((change) => {
            const ChangeIcon = getChangeIcon(change.type)
            const colorClass = getChangeColor(change.type)
            const changeLabel = getChangeLabel(change.type)

            return (
              <div
                key={change.path}
                className={cn(
                  'group flex items-center gap-2 p-2 rounded-md hover:bg-muted/50 transition-colors',
                  change.staged && 'bg-muted/30'
                )}
              >
                {/* Staged indicator */}
                <div className="flex-shrink-0">
                  {change.staged ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                  ) : (
                    <Circle className="w-3.5 h-3.5 text-muted-foreground/50" />
                  )}
                </div>

                {/* Change icon and info */}
                <div className="flex-1 min-w-0 flex items-center gap-2">
                  <ChangeIcon className={cn('w-3.5 h-3.5 flex-shrink-0', colorClass)} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate" title={change.path}>
                      {change.path}
                    </p>
                    <p className={cn('text-xs truncate', colorClass)}>
                      {changeLabel}
                    </p>
                  </div>
                </div>

                {/* Action buttons */}
                {!readOnly && (
                  <div className="flex-shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {change.staged ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleUnstageChange(change.path)}
                        className="h-6 w-6 p-0"
                        title="Unstage change"
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleStageChange(change.path)}
                        className="h-6 w-6 p-0"
                        title="Stage change"
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDiscardChange(change.path)}
                      className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                      title="Discard change"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </ScrollArea>

      {/* Summary */}
      <div className="pt-2 border-t text-xs text-muted-foreground">
        <div className="flex items-center justify-between">
          <span>
            {stagedCount} staged, {unstagedCount} unstaged
          </span>
          <span className="text-muted-foreground/70">
            {changes.length} total
          </span>
        </div>
      </div>
    </div>
  )
})
