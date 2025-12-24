/**
 * GitHistoryTab Component
 * 
 * Displays commit history with timeline view, commit details, and actions
 * for reverting to commits or creating branches from commits.
 * 
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5
 */

import { memo, useEffect, useState, useCallback } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  GitCommit as GitCommitIcon,
  Clock,
  User,
  Hash,
  GitBranch,
  RotateCcw,
  Loader2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { useGitStore } from '@/stores/git'
import { useGlobalToast } from '@/hooks/useToast'
import { GitCommit } from '@/services/git.service'
import { cn } from '@/lib/utils'

interface GitHistoryTabProps {
  workflowId: string
  readOnly?: boolean
}

const COMMITS_PER_PAGE = 20

export const GitHistoryTab = memo(function GitHistoryTab({
  workflowId,
  readOnly = false,
}: GitHistoryTabProps) {
  const {
    commits,
    isLoadingCommits,
    commitsError,
    selectedCommit,
    operationError,
    loadCommitHistory,
    selectCommit,
    revertToCommit,
    createBranchFromCommit,
    clearErrors,
  } = useGitStore()

  const { showSuccess, showError } = useGlobalToast()

  // Pagination state
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)

  // Dialog states
  const [revertDialogOpen, setRevertDialogOpen] = useState(false)
  const [branchDialogOpen, setBranchDialogOpen] = useState(false)
  const [branchName, setBranchName] = useState('')
  const [isReverting, setIsReverting] = useState(false)
  const [isCreatingBranch, setIsCreatingBranch] = useState(false)

  // Load initial commits
  useEffect(() => {
    if (workflowId) {
      loadCommitHistory(workflowId, COMMITS_PER_PAGE, 0)
        .then(() => {
          setPage(0)
        })
        .catch((error) => {
          console.error('Failed to load commit history:', error)
        })
    }
  }, [workflowId, loadCommitHistory])

  // Load more commits (pagination)
  const loadMore = useCallback(async () => {
    if (isLoadingCommits || !hasMore) return

    try {
      const nextPage = page + 1
      const offset = nextPage * COMMITS_PER_PAGE
      const currentCommitCount = commits.length
      
      await loadCommitHistory(workflowId, COMMITS_PER_PAGE, offset)

      // Check if we got fewer commits than requested (means we reached the end)
      // Note: The store will append new commits to the existing list
      const newCommitCount = commits.length
      if (newCommitCount - currentCommitCount < COMMITS_PER_PAGE) {
        setHasMore(false)
      }
      setPage(nextPage)
    } catch (error) {
      console.error('Failed to load more commits:', error)
      showError('Load Failed', {
        message: 'Failed to load more commits',
      })
    }
  }, [workflowId, page, isLoadingCommits, hasMore, commits.length, loadCommitHistory, showError])

  // Handle commit selection
  const handleSelectCommit = useCallback(
    (commit: GitCommit) => {
      if (selectedCommit?.hash === commit.hash) {
        selectCommit(null) // Deselect if clicking the same commit
      } else {
        selectCommit(commit)
      }
    },
    [selectedCommit, selectCommit]
  )

  // Handle revert to commit
  const handleRevertClick = useCallback(() => {
    if (!selectedCommit) return
    setRevertDialogOpen(true)
  }, [selectedCommit])

  const handleRevertConfirm = useCallback(async () => {
    if (!selectedCommit) return

    setIsReverting(true)
    clearErrors()

    try {
      await revertToCommit(workflowId, selectedCommit.hash)
      showSuccess('Revert Successful', {
        message: `Workflow reverted to commit ${selectedCommit.hash.substring(0, 7)}`,
      })
      setRevertDialogOpen(false)
      selectCommit(null)
    } catch (error) {
      showError('Revert Failed', {
        message: error instanceof Error ? error.message : 'Failed to revert to commit',
      })
    } finally {
      setIsReverting(false)
    }
  }, [selectedCommit, workflowId, revertToCommit, selectCommit, clearErrors, showSuccess, showError])

  // Handle create branch from commit
  const handleCreateBranchClick = useCallback(() => {
    if (!selectedCommit) return
    setBranchName('')
    setBranchDialogOpen(true)
  }, [selectedCommit])

  const handleCreateBranchConfirm = useCallback(async () => {
    if (!selectedCommit || !branchName.trim()) return

    setIsCreatingBranch(true)
    clearErrors()

    try {
      await createBranchFromCommit(workflowId, selectedCommit.hash, branchName.trim())
      showSuccess('Branch Created', {
        message: `Branch "${branchName}" created from commit ${selectedCommit.hash.substring(0, 7)}`,
      })
      setBranchDialogOpen(false)
      setBranchName('')
      selectCommit(null)
    } catch (error) {
      showError('Branch Creation Failed', {
        message: error instanceof Error ? error.message : 'Failed to create branch',
      })
    } finally {
      setIsCreatingBranch(false)
    }
  }, [
    selectedCommit,
    branchName,
    workflowId,
    createBranchFromCommit,
    selectCommit,
    clearErrors,
    showSuccess,
    showError,
  ])

  // Format date for display
  const formatDate = (date: Date) => {
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'just now'
    if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`
    if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    })
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 p-3 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs font-medium">
              {commits.length > 0 ? `${commits.length} commit${commits.length !== 1 ? 's' : ''}` : 'No commits'}
            </span>
          </div>
        </div>
      </div>

      {/* Error display */}
      {(commitsError || operationError) && (
        <div className="flex-shrink-0 p-3">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              {commitsError || operationError}
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Commit list */}
      <ScrollArea className="flex-1">
        <div className="p-3">
          {/* Loading state */}
          {isLoadingCommits && commits.length === 0 && (
            <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              Loading commits...
            </div>
          )}

          {/* Commit timeline */}
          {commits.length > 0 && (
            <div className="space-y-0">
              {commits.map((commit, index) => (
                <div key={commit.hash} className="relative">
                  {/* Timeline line */}
                  {index < commits.length - 1 && (
                    <div className="absolute left-[11px] top-6 bottom-0 w-[2px] bg-border" />
                  )}

                  {/* Commit item */}
                  <div
                    className={cn(
                      'relative pl-8 pb-4 cursor-pointer transition-colors',
                      'hover:bg-accent/50 rounded-md -ml-2 pl-10 pr-2 py-2',
                      selectedCommit?.hash === commit.hash && 'bg-accent'
                    )}
                    onClick={() => handleSelectCommit(commit)}
                  >
                    {/* Timeline dot */}
                    <div
                      className={cn(
                        'absolute left-2 top-2 w-[18px] h-[18px] rounded-full border-2 bg-background',
                        selectedCommit?.hash === commit.hash
                          ? 'border-primary bg-primary'
                          : 'border-border'
                      )}
                    >
                      <GitCommitIcon
                        className={cn(
                          'w-3 h-3 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
                          selectedCommit?.hash === commit.hash ? 'text-primary-foreground' : 'text-muted-foreground'
                        )}
                      />
                    </div>

                    {/* Commit info */}
                    <div className="space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium leading-tight line-clamp-2">{commit.message}</p>
                        {selectedCommit?.hash === commit.hash ? (
                          <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          <span>{commit.author}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Hash className="w-3 h-3" />
                          <span className="font-mono">{commit.hash.substring(0, 7)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{formatDate(commit.timestamp)}</span>
                        </div>
                      </div>

                      {/* Expanded details */}
                      {selectedCommit?.hash === commit.hash && (
                        <div className="mt-3 pt-3 border-t space-y-2">
                          <div className="space-y-1 text-xs">
                            <div className="flex items-start gap-2">
                              <span className="text-muted-foreground font-medium min-w-[60px]">Hash:</span>
                              <span className="font-mono break-all">{commit.hash}</span>
                            </div>
                            <div className="flex items-start gap-2">
                              <span className="text-muted-foreground font-medium min-w-[60px]">Author:</span>
                              <span>{commit.author}</span>
                            </div>
                            <div className="flex items-start gap-2">
                              <span className="text-muted-foreground font-medium min-w-[60px]">Date:</span>
                              <span>
                                {commit.timestamp.toLocaleString('en-US', {
                                  dateStyle: 'medium',
                                  timeStyle: 'short',
                                })}
                              </span>
                            </div>
                            {commit.parents.length > 0 && (
                              <div className="flex items-start gap-2">
                                <span className="text-muted-foreground font-medium min-w-[60px]">Parent:</span>
                                <span className="font-mono">{commit.parents[0].substring(0, 7)}</span>
                              </div>
                            )}
                          </div>

                          {/* Action buttons */}
                          {!readOnly && (
                            <div className="flex gap-2 pt-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleRevertClick()
                                }}
                                className="h-7 text-xs"
                              >
                                <RotateCcw className="mr-1.5 h-3 w-3" />
                                Revert to this commit
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleCreateBranchClick()
                                }}
                                className="h-7 text-xs"
                              >
                                <GitBranch className="mr-1.5 h-3 w-3" />
                                Create branch
                              </Button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {/* Load more button */}
              {hasMore && (
                <div className="pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={loadMore}
                    disabled={isLoadingCommits}
                    className="w-full h-8 text-xs"
                  >
                    {isLoadingCommits ? (
                      <>
                        <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      'Load more'
                    )}
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Empty state */}
          {!isLoadingCommits && commits.length === 0 && !commitsError && (
            <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
              <div className="text-center space-y-2">
                <GitCommitIcon className="w-8 h-8 mx-auto opacity-50" />
                <p>No commits yet</p>
                <p className="text-xs">Make your first commit to see history</p>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Revert confirmation dialog */}
      <Dialog open={revertDialogOpen} onOpenChange={setRevertDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revert to Commit</DialogTitle>
            <DialogDescription>
              Are you sure you want to revert the workflow to this commit? This will restore the workflow
              configuration to the state at commit{' '}
              <span className="font-mono">{selectedCommit?.hash.substring(0, 7)}</span>.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                This action will create a new commit with the reverted state. Your current changes will be preserved
                in the commit history.
              </AlertDescription>
            </Alert>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRevertDialogOpen(false)} disabled={isReverting}>
              Cancel
            </Button>
            <Button onClick={handleRevertConfirm} disabled={isReverting}>
              {isReverting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Reverting...
                </>
              ) : (
                <>
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Revert
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create branch dialog */}
      <Dialog open={branchDialogOpen} onOpenChange={setBranchDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Branch from Commit</DialogTitle>
            <DialogDescription>
              Create a new branch starting from commit{' '}
              <span className="font-mono">{selectedCommit?.hash.substring(0, 7)}</span>.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="branch-name">Branch Name</Label>
              <Input
                id="branch-name"
                placeholder="feature/my-branch"
                value={branchName}
                onChange={(e) => setBranchName(e.target.value)}
                disabled={isCreatingBranch}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setBranchDialogOpen(false)}
              disabled={isCreatingBranch}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateBranchConfirm}
              disabled={isCreatingBranch || !branchName.trim()}
            >
              {isCreatingBranch ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <GitBranch className="mr-2 h-4 w-4" />
                  Create Branch
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
})
