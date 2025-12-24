/**
 * GitSourceControlTab Component
 * 
 * Source control tab for Git operations. Displays changes, commit input,
 * and action buttons for push/pull/sync operations.
 * 
 * Requirements: 2.1, 2.2, 2.5, 3.1, 3.2, 3.5, 7.1
 */

import { memo, useEffect, useState } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  GitCommit, 
  Upload, 
  Download, 
  RefreshCw, 
  ArrowUpDown,
  Loader2,
  AlertCircle,
  CheckCircle2,
  FileText
} from 'lucide-react'
import { useGitStore } from '@/stores/git'
import { useGlobalToast } from '@/hooks/useToast'
import { GitChangesList } from './GitChangesList'
import { GitCommitInput } from './GitCommitInput'
import { GitConflictResolutionDialog } from './GitConflictResolutionDialog'

interface GitSourceControlTabProps {
  workflowId: string
  readOnly?: boolean
}

export const GitSourceControlTab = memo(function GitSourceControlTab({
  workflowId,
  readOnly = false
}: GitSourceControlTabProps) {
  const {
    status,
    isLoadingStatus,
    statusError,
    isPushing,
    isPulling,
    isCommitting,
    operationError,
    lastPushResult,
    lastPullResult,
    conflicts,
    hasConflicts,
    isResolvingConflicts,
    refreshStatus,
    push,
    pull,
    sync,
    resolveConflicts,
    clearConflicts,
    clearErrors,
  } = useGitStore()

  const { showSuccess, showError, showWarning } = useGlobalToast()

  // State for conflict resolution dialog
  const [showConflictDialog, setShowConflictDialog] = useState(false)

  // Load status on mount and when workflowId changes
  useEffect(() => {
    if (workflowId) {
      refreshStatus(workflowId).catch((error) => {
        console.error('Failed to load Git status:', error)
      })
    }
  }, [workflowId, refreshStatus])

  // Show notifications for operation results
  useEffect(() => {
    if (lastPushResult) {
      if (lastPushResult.success) {
        showSuccess('Push Successful', {
          message: `Pushed ${lastPushResult.pushed} commit${lastPushResult.pushed !== 1 ? 's' : ''} to remote`,
        })
      } else if (lastPushResult.error) {
        showError('Push Failed', {
          message: lastPushResult.error,
        })
      }
    }
  }, [lastPushResult, showSuccess, showError])

  useEffect(() => {
    if (lastPullResult) {
      if (lastPullResult.success) {
        if (lastPullResult.conflicts) {
          showWarning('Pull Completed with Conflicts', {
            message: `${lastPullResult.conflictFiles?.length || 0} file(s) have conflicts that need resolution`,
          })
          // Open conflict resolution dialog
          setShowConflictDialog(true)
        } else {
          showSuccess('Pull Successful', {
            message: `Pulled ${lastPullResult.commits.length} commit${lastPullResult.commits.length !== 1 ? 's' : ''} from remote`,
          })
        }
      } else if (lastPullResult.error) {
        showError('Pull Failed', {
          message: lastPullResult.error,
        })
      }
    }
  }, [lastPullResult, showSuccess, showError, showWarning])

  // Handle refresh
  const handleRefresh = async () => {
    try {
      clearErrors()
      await refreshStatus(workflowId)
      showSuccess('Status Refreshed', {
        message: 'Git status updated successfully',
      })
    } catch (error) {
      showError('Refresh Failed', {
        message: error instanceof Error ? error.message : 'Failed to refresh status',
      })
    }
  }

  // Handle push
  const handlePush = async () => {
    try {
      clearErrors()
      await push(workflowId)
    } catch (error) {
      // Error notification handled by useEffect
      console.error('Push failed:', error)
    }
  }

  // Handle pull
  const handlePull = async () => {
    try {
      clearErrors()
      await pull(workflowId)
    } catch (error) {
      // Error notification handled by useEffect
      console.error('Pull failed:', error)
    }
  }

  // Handle sync (pull then push)
  const handleSync = async () => {
    try {
      clearErrors()
      await sync(workflowId)
      showSuccess('Sync Successful', {
        message: 'Successfully synchronized with remote repository',
      })
    } catch (error) {
      // Individual operation errors handled by useEffect
      console.error('Sync failed:', error)
    }
  }

  // Handle conflict resolution
  const handleResolveConflicts = async (resolutions: Map<string, string>) => {
    try {
      await resolveConflicts(workflowId, resolutions)
      setShowConflictDialog(false)
      showSuccess('Conflicts Resolved', {
        message: 'All conflicts have been resolved successfully',
      })
    } catch (error) {
      showError('Resolution Failed', {
        message: error instanceof Error ? error.message : 'Failed to resolve conflicts',
      })
      throw error
    }
  }

  // Handle cancel conflict resolution
  const handleCancelConflictResolution = () => {
    setShowConflictDialog(false)
    clearConflicts()
  }

  // Calculate changes count
  const changesCount = status?.changes.length || 0
  const stagedCount = status?.changes.filter(c => c.staged).length || 0
  const hasChanges = changesCount > 0
  const hasUnpushedCommits = (status?.unpushedCommits || 0) > 0

  // Determine if operations are disabled
  const isOperating = isPushing || isPulling || isCommitting
  const canPush = hasUnpushedCommits && !isOperating && !readOnly
  const canPull = !isOperating && !readOnly
  const canSync = !isOperating && !readOnly
  const canRefresh = !isLoadingStatus && !isOperating

  return (
    <div className="flex flex-col h-full">
      {/* Status header */}
      <div className="flex-shrink-0 p-3 border-b space-y-3">
        {/* Changes summary */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs font-medium">
              {hasChanges ? (
                <>
                  {changesCount} change{changesCount !== 1 ? 's' : ''}
                  {stagedCount > 0 && (
                    <span className="text-muted-foreground ml-1">
                      ({stagedCount} staged)
                    </span>
                  )}
                </>
              ) : (
                'No changes'
              )}
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2"
            onClick={handleRefresh}
            disabled={!canRefresh}
            title="Refresh status"
          >
            <RefreshCw className={`h-3 w-3 ${isLoadingStatus ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {/* Sync status */}
        {status && (
          <div className="flex items-center gap-2 text-xs">
            {hasUnpushedCommits ? (
              <div className="flex items-center gap-1 text-orange-600 dark:text-orange-400">
                <AlertCircle className="w-3 h-3" />
                <span>{status.unpushedCommits} unpushed commit{status.unpushedCommits !== 1 ? 's' : ''}</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                <CheckCircle2 className="w-3 h-3" />
                <span>Up to date</span>
              </div>
            )}
            {status.ahead > 0 && (
              <span className="text-muted-foreground">
                ↑{status.ahead}
              </span>
            )}
            {status.behind > 0 && (
              <span className="text-muted-foreground">
                ↓{status.behind}
              </span>
            )}
          </div>
        )}

        {/* Conflicts alert */}
        {hasConflicts && (
          <Alert variant="destructive" className="py-2">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs flex items-center justify-between">
              <span>{conflicts.length} file{conflicts.length !== 1 ? 's' : ''} with conflicts</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={() => setShowConflictDialog(true)}
              >
                Resolve
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Action buttons */}
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePush}
            disabled={!canPush}
            className="h-8 text-xs"
          >
            {isPushing ? (
              <>
                <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                Pushing...
              </>
            ) : (
              <>
                <Upload className="mr-1.5 h-3 w-3" />
                Push
              </>
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handlePull}
            disabled={!canPull}
            className="h-8 text-xs"
          >
            {isPulling ? (
              <>
                <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                Pulling...
              </>
            ) : (
              <>
                <Download className="mr-1.5 h-3 w-3" />
                Pull
              </>
            )}
          </Button>
        </div>
        <Button
          variant="default"
          size="sm"
          onClick={handleSync}
          disabled={!canSync}
          className="w-full h-8 text-xs"
        >
          {isPulling || isPushing ? (
            <>
              <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
              Syncing...
            </>
          ) : (
            <>
              <ArrowUpDown className="mr-1.5 h-3 w-3" />
              Sync
            </>
          )}
        </Button>
      </div>

      {/* Error display */}
      {(statusError || operationError) && (
        <div className="flex-shrink-0 p-3">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              {statusError || operationError}
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Scrollable content area */}
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-4">
          {/* Loading state */}
          {isLoadingStatus && !status && (
            <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              Loading status...
            </div>
          )}

          {/* Changes list */}
          {status && (
            <>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <GitCommit className="w-4 h-4 text-muted-foreground" />
                  <h4 className="text-xs font-semibold">Changes</h4>
                </div>
                <GitChangesList
                  workflowId={workflowId}
                  changes={status.changes}
                  readOnly={readOnly}
                />
              </div>

              <Separator />

              {/* Commit input */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <GitCommit className="w-4 h-4 text-muted-foreground" />
                  <h4 className="text-xs font-semibold">Commit</h4>
                </div>
                <GitCommitInput
                  workflowId={workflowId}
                  stagedChangesCount={stagedCount}
                  hasChanges={hasChanges}
                  readOnly={readOnly}
                />
              </div>
            </>
          )}

          {/* Empty state */}
          {!isLoadingStatus && !status && !statusError && (
            <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
              <div className="text-center space-y-2">
                <GitCommit className="w-8 h-8 mx-auto opacity-50" />
                <p>No Git status available</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefresh}
                  className="mt-2"
                >
                  <RefreshCw className="mr-2 h-3 w-3" />
                  Refresh
                </Button>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Conflict Resolution Dialog */}
      {hasConflicts && (
        <GitConflictResolutionDialog
          open={showConflictDialog}
          onOpenChange={setShowConflictDialog}
          conflicts={conflicts}
          onResolve={handleResolveConflicts}
          onCancel={handleCancelConflictResolution}
          isResolving={isResolvingConflicts}
        />
      )}
    </div>
  )
})
