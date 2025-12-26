/**
 * GitSourceControlTab Component
 * 
 * Source control tab for Git operations. Displays changes, commit input,
 * and action buttons for push/pull/sync operations.
 * 
 * Requirements: 2.1, 2.2, 2.5, 3.1, 3.2, 3.5, 7.1
 */

import { memo, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  GitCommit,
  Upload,
  Download,
  RefreshCw,
  ArrowUpDown,
  Loader2,
  AlertCircle,
  CheckCircle2,
  MoreHorizontal,
  Layers,
} from 'lucide-react'
import { useGitStore } from '@/stores/git'
import { useWorkflowStore } from '@/stores/workflow'
import { useEnvironmentStore } from '@/stores/environment'
import { toast } from 'sonner'
import { gitService } from '@/services/git.service'
import { GitChangesList } from './GitChangesList'
import { GitCommitInput } from './GitCommitInput'
import { GitConflictResolutionDialog } from './GitConflictResolutionDialog'
import { getEnvironmentLabel, getEnvironmentColor } from '@/types/environment'

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
    activeEnvironment,
    setActiveEnvironment,
  } = useGitStore()

  // Get current workflow data for change detection
  const { workflow, setWorkflow } = useWorkflowStore()

  // Get environment state
  const { selectedEnvironment } = useEnvironmentStore()

  // State for conflict resolution dialog
  const [showConflictDialog, setShowConflictDialog] = useState(false)

  // Load status on mount and when workflowId or workflow changes
  useEffect(() => {
    if (workflowId) {
      refreshStatus(workflowId, workflow, selectedEnvironment || undefined).catch((error) => {
        console.error('Failed to load Git status:', error)
      })
      
      // Set active environment in git store if not already set
      if (selectedEnvironment && activeEnvironment !== selectedEnvironment) {
        setActiveEnvironment(selectedEnvironment)
      }
    }
  }, [workflowId, workflow, refreshStatus, selectedEnvironment, activeEnvironment, setActiveEnvironment])

  // Show notifications for operation results
  useEffect(() => {
    if (lastPushResult) {
      if (lastPushResult.success) {
        toast.success(`Pushed ${lastPushResult.pushed} commit${lastPushResult.pushed !== 1 ? 's' : ''} to remote`, {
          position: 'top-center',
        })
      } else if (lastPushResult.error) {
        toast.error(lastPushResult.error, {
          position: 'top-center',
        })
      }
    }
  }, [lastPushResult])

  useEffect(() => {
    if (lastPullResult) {
      if (lastPullResult.success) {
        if (lastPullResult.conflicts) {
          toast.error(`${lastPullResult.conflictFiles?.length || 0} file(s) have conflicts that need resolution`, {
            position: 'top-center',
          })
          // Open conflict resolution dialog
          setShowConflictDialog(true)
        } else {
          const commitCount = lastPullResult.commits.length
          if (commitCount > 0) {
            // Reload workflow from Git
            gitService.getWorkflowFromGit(workflowId)
              .then((gitWorkflow) => {
                // Merge Git data with existing workflow metadata to preserve database fields
                const mergedWorkflow = {
                  ...workflow, // Keep existing metadata (userId, workspaceId, etc.)
                  ...gitWorkflow, // Override with Git data (nodes, connections, etc.)
                  metadata: {
                    ...workflow?.metadata, // Keep existing metadata
                    ...gitWorkflow.metadata, // Merge Git metadata
                  },
                }
                setWorkflow(mergedWorkflow as any)
                toast.success(`Pulled ${commitCount} commit${commitCount !== 1 ? 's' : ''} and reloaded workflow`, {
                  position: 'top-center',
                })
              })
              .catch((error) => {
                toast.error(`Pulled ${commitCount} commit${commitCount !== 1 ? 's' : ''}. Please reload the workflow manually to see changes.`, {
                  position: 'top-center',
                  duration: 8000,
                })
                console.error('Failed to reload workflow from Git:', error)
              })
          } else {
            toast.success('Already up to date', {
              position: 'top-center',
            })
          }
        }
      } else if (lastPullResult.error) {
        toast.error(lastPullResult.error, {
          position: 'top-center',
        })
      }
    }
  }, [lastPullResult, workflowId, setWorkflow])

  // Handle refresh
  const handleRefresh = async () => {
    try {
      clearErrors()
      await refreshStatus(workflowId, workflow, activeEnvironment || undefined)
      toast.success('Git status updated successfully', {
        position: 'top-center',
      })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to refresh status', {
        position: 'top-center',
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
      const envStr = activeEnvironment === 'DEVELOPMENT' ? 'development' :
                       activeEnvironment === 'STAGING' ? 'staging' :
                       activeEnvironment === 'PRODUCTION' ? 'production' : undefined;
      await pull(workflowId, envStr ? { environment: envStr } : undefined)
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
      toast.success('Successfully synchronized with remote repository', {
        position: 'top-center',
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
      toast.success('All conflicts have been resolved successfully', {
        position: 'top-center',
      })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to resolve conflicts', {
        position: 'top-center',
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
    <div className="absolute inset-0 flex flex-col overflow-hidden">
      {/* Status header */}
      <div className="flex-shrink-0 p-3 border-b space-y-3">
        {/* Environment indicator */}
        {activeEnvironment && (
          <div className="flex items-center gap-2 text-xs">
            <Layers className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-muted-foreground">Active Environment:</span>
            <Badge
              variant="outline"
              className={`border-${getEnvironmentColor(activeEnvironment)}-500 bg-${getEnvironmentColor(activeEnvironment)}-50 text-${getEnvironmentColor(activeEnvironment)}-700`}
            >
              {getEnvironmentLabel(activeEnvironment)}
            </Badge>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex items-center justify-end gap-1">
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
          {!readOnly && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2"
                  disabled={isOperating}
                  title="More actions"
                >
                  <MoreHorizontal className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem
                  onClick={handlePush}
                  disabled={!canPush}
                  className="text-xs"
                >
                  {isPushing ? (
                    <>
                      <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                      Pushing...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-3 w-3" />
                      Push
                    </>
                  )}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handlePull}
                  disabled={!canPull}
                  className="text-xs"
                >
                  {isPulling ? (
                    <>
                      <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                      Pulling...
                    </>
                  ) : (
                    <>
                      <Download className="mr-2 h-3 w-3" />
                      Pull
                    </>
                  )}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleSync}
                  disabled={!canSync}
                  className="text-xs"
                >
                  {isPulling || isPushing ? (
                    <>
                      <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                      Syncing...
                    </>
                  ) : (
                    <>
                      <ArrowUpDown className="mr-2 h-3 w-3" />
                      Sync
                    </>
                  )}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Sync status */}
        {status && (
          <div className="space-y-2">
            {hasUnpushedCommits && (
              <>
                <div className="flex items-center gap-2 text-xs">
                  <div className="flex items-center gap-1 text-orange-600 dark:text-orange-400">
                    <AlertCircle className="w-3 h-3" />
                    <span>{status.unpushedCommits} unpushed commit{status.unpushedCommits !== 1 ? 's' : ''}</span>
                  </div>
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
                
                {/* Full width push button when there are unpushed commits */}
                <Button
                  variant="default"
                  size="sm"
                  onClick={handlePush}
                  disabled={!canPush}
                  className="w-full h-8 text-xs"
                  title="Push commits to remote"
                >
                  {isPushing ? (
                    <>
                      <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                      Pushing...
                    </>
                  ) : (
                  <>
                    <Upload className="mr-1.5 h-3 w-3" />
                    Push {status.unpushedCommits} commit{status.unpushedCommits !== 1 ? 's' : ''}
                  </>
                )}
              </Button>
              </>
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

      {/* Environment info alert */}
      {activeEnvironment && (
        <Alert className="py-2 bg-muted border-muted">
          <Layers className="h-4 w-4 text-muted-foreground" />
          <AlertDescription className="text-xs">
            Committing changes to <strong>workflow-{activeEnvironment.toLowerCase()}.json</strong>
          </AlertDescription>
        </Alert>
      )}
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
      <div className="flex-1 min-h-0 overflow-auto">
        <div className="p-3 space-y-4">
          {/* Loading state */}
          {isLoadingStatus && !status && (
            <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              Loading status...
            </div>
          )}

          {/* Changes list */}
          {status && hasChanges && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <GitCommit className="w-4 h-4 text-muted-foreground" />
                <h4 className="text-xs font-semibold">Changes</h4>
              </div>
              <GitChangesList
                workflowId={workflowId}
                changes={status.changes}
              />
            </div>
          )}

          {/* Up to date state */}
          {status && !hasChanges && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400 mb-2" />
              <p className="text-sm font-medium text-green-600 dark:text-green-400">Up to date</p>
              <p className="text-xs text-muted-foreground mt-1">
                Your workflow is up to date
              </p>
            </div>
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
      </div>

      {/* Commit footer */}
      {status && hasChanges && (
        <div className="flex-shrink-0 border-t p-3">
          <GitCommitInput
            workflowId={workflowId}
            stagedChangesCount={stagedCount}
            hasChanges={hasChanges}
            readOnly={readOnly}
          />
        </div>
      )}

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
