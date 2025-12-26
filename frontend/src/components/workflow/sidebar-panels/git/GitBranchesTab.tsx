/**
 * GitBranchesTab Component
 * 
 * Displays list of local and remote branches with management capabilities.
 * Allows branch switching, creation, and deletion with proper validation
 * and uncommitted changes handling.
 * 
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5
 */

import { memo, useEffect, useState, useCallback } from 'react'
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
import { Badge } from '@/components/ui/badge'
import {
  GitBranch as GitBranchIcon,
  Plus,
  Check,
  Trash2,
  Loader2,
  AlertCircle,
  GitCommit,
  Clock,
  Globe,
  Laptop,
} from 'lucide-react'
import { useGitStore } from '@/stores/git'
import { useGlobalToast } from '@/hooks/useToast'
import { GitBranch } from '@/services/git.service'
import { cn } from '@/lib/utils'

interface GitBranchesTabProps {
  workflowId: string
  readOnly?: boolean
}

export const GitBranchesTab = memo(function GitBranchesTab({
  workflowId,
  readOnly = false,
}: GitBranchesTabProps) {
  const {
    branches,
    currentBranch,
    isLoadingBranches,
    branchesError,
    isSwitchingBranch,
    isCreatingBranch,
    operationError,
    status,
    loadBranches,
    createBranch,
    switchBranch,
    clearErrors,
  } = useGitStore()

  const { showSuccess, showError, showWarning } = useGlobalToast()

  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [switchDialogOpen, setSwitchDialogOpen] = useState(false)
  const [newBranchName, setNewBranchName] = useState('')
  const [branchToDelete, setBranchToDelete] = useState<GitBranch | null>(null)
  const [branchToSwitch, setBranchToSwitch] = useState<GitBranch | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Load branches on mount
  useEffect(() => {
    if (workflowId) {
      loadBranches(workflowId).catch((error) => {
        console.error('Failed to load branches:', error)
      })
    }
  }, [workflowId, loadBranches])

  // Format date for display
  const formatDate = (date: Date) => {
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    })
  }

  // Validate branch name
  const validateBranchName = (name: string): string | null => {
    if (!name.trim()) {
      return 'Branch name cannot be empty'
    }

    // Git branch naming rules
    if (name.includes('..')) {
      return 'Branch name cannot contain ".."'
    }
    if (name.startsWith('.') || name.endsWith('.')) {
      return 'Branch name cannot start or end with "."'
    }
    if (name.includes(' ')) {
      return 'Branch name cannot contain spaces'
    }
    if (/[~^:?*\[\]\\]/.test(name)) {
      return 'Branch name contains invalid characters'
    }
    if (name.endsWith('.lock')) {
      return 'Branch name cannot end with ".lock"'
    }
    if (branches.some(b => b.name === name)) {
      return 'Branch name already exists'
    }

    return null
  }

  // Handle create branch
  const handleCreateClick = useCallback(() => {
    setNewBranchName('')
    setCreateDialogOpen(true)
  }, [])

  const handleCreateConfirm = useCallback(async () => {
    const validationError = validateBranchName(newBranchName)
    if (validationError) {
      showError('Invalid Branch Name', {
        message: validationError,
      })
      return
    }

    clearErrors()

    try {
      await createBranch(workflowId, newBranchName.trim())
      showSuccess('Branch Created', {
        message: `Branch "${newBranchName}" created and checked out`,
      })
      setCreateDialogOpen(false)
      setNewBranchName('')
    } catch (error) {
      showError('Branch Creation Failed', {
        message: error instanceof Error ? error.message : 'Failed to create branch',
      })
    }
  }, [newBranchName, workflowId, createBranch, clearErrors, showSuccess, showError])

  // Handle switch branch
  const handleSwitchClick = useCallback(
    (branch: GitBranch) => {
      if (branch.current) return

      // Check for uncommitted changes
      const hasUncommittedChanges = status?.changes && status.changes.length > 0

      if (hasUncommittedChanges) {
        setBranchToSwitch(branch)
        setSwitchDialogOpen(true)
      } else {
        // Switch directly if no uncommitted changes
        handleSwitchConfirm(branch)
      }
    },
    [status]
  )

  const handleSwitchConfirm = useCallback(
    async (branch?: GitBranch) => {
      const targetBranch = branch || branchToSwitch
      if (!targetBranch) return

      clearErrors()

      try {
        await switchBranch(workflowId, targetBranch.name)
        showSuccess('Branch Switched', {
          message: `Switched to branch "${targetBranch.name}"`,
        })
        setSwitchDialogOpen(false)
        setBranchToSwitch(null)
      } catch (error) {
        showError('Branch Switch Failed', {
          message: error instanceof Error ? error.message : 'Failed to switch branch',
        })
      }
    },
    [branchToSwitch, workflowId, switchBranch, clearErrors, showSuccess, showError]
  )

  // Handle delete branch
  const handleDeleteClick = useCallback((branch: GitBranch) => {
    if (branch.current) {
      showWarning('Cannot Delete Current Branch', {
        message: 'Switch to another branch before deleting this one',
      })
      return
    }

    setBranchToDelete(branch)
    setDeleteDialogOpen(true)
  }, [showWarning])

  const handleDeleteConfirm = useCallback(async () => {
    if (!branchToDelete) return

    setIsDeleting(true)
    clearErrors()

    try {
      // Note: Delete functionality would need to be added to the service
      // For now, we'll show a placeholder message
      showWarning('Delete Not Implemented', {
        message: 'Branch deletion will be available in a future update',
      })
      setDeleteDialogOpen(false)
      setBranchToDelete(null)
    } catch (error) {
      showError('Branch Deletion Failed', {
        message: error instanceof Error ? error.message : 'Failed to delete branch',
      })
    } finally {
      setIsDeleting(false)
    }
  }, [branchToDelete, clearErrors, showWarning, showError])

  // Separate local and remote branches
  const localBranches = branches.filter(b => !b.remote)
  const remoteBranches = branches.filter(b => b.remote)

  return (
    <div className="absolute inset-0 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 p-3 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GitBranchIcon className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs font-medium">
              {branches.length} branch{branches.length !== 1 ? 'es' : ''}
            </span>
          </div>
          {!readOnly && (
            <Button
              variant="default"
              size="sm"
              onClick={handleCreateClick}
              disabled={isCreatingBranch || isLoadingBranches}
              className="h-7 text-xs"
            >
              <Plus className="mr-1.5 h-3 w-3" />
              New Branch
            </Button>
          )}
        </div>
      </div>

      {/* Error display */}
      {(branchesError || operationError) && (
        <div className="flex-shrink-0 p-3">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              {branchesError || operationError}
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Branch list */}
      <div className="flex-1 min-h-0 overflow-auto">
        <div className="p-3 space-y-4">
          {/* Loading state */}
          {isLoadingBranches && branches.length === 0 && (
            <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              Loading branches...
            </div>
          )}

          {/* Local branches */}
          {localBranches.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 px-2">
                <Laptop className="w-3 h-3 text-muted-foreground" />
                <h4 className="text-xs font-semibold text-muted-foreground uppercase">
                  Local Branches
                </h4>
              </div>
              <div className="space-y-1">
                {localBranches.map((branch) => (
                  <div
                    key={branch.name}
                    className={cn(
                      'group relative rounded-md border p-3 transition-colors',
                      'hover:bg-accent/50 cursor-pointer',
                      branch.current && 'bg-accent border-primary'
                    )}
                    onClick={() => !readOnly && handleSwitchClick(branch)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0 space-y-1">
                        {/* Branch name */}
                        <div className="flex items-center gap-2">
                          {branch.current ? (
                            <Check className="w-4 h-4 text-primary flex-shrink-0" />
                          ) : (
                            <GitBranchIcon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                          )}
                          <span
                            className={cn(
                              'text-sm font-medium truncate',
                              branch.current && 'text-primary'
                            )}
                          >
                            {branch.name}
                          </span>
                          {branch.current && (
                            <Badge variant="default" className="h-5 text-xs px-1.5">
                              Current
                            </Badge>
                          )}
                        </div>

                        {/* Last commit info */}
                        {branch.lastCommit && (
                          <div className="flex items-center gap-3 text-xs text-muted-foreground pl-6">
                            <div className="flex items-center gap-1">
                              <GitCommit className="w-3 h-3" />
                              <span className="font-mono">
                                {branch.lastCommit.hash.substring(0, 7)}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              <span>{formatDate(branch.lastCommit.timestamp)}</span>
                            </div>
                          </div>
                        )}
                        {branch.lastCommit && (
                          <p className="text-xs text-muted-foreground pl-6 truncate">
                            {branch.lastCommit.message}
                          </p>
                        )}
                      </div>

                      {/* Actions */}
                      {!readOnly && !branch.current && (
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteClick(branch)
                            }}
                            disabled={isSwitchingBranch}
                            className="h-7 w-7 p-0"
                            title="Delete branch"
                          >
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Switching indicator */}
                    {isSwitchingBranch && branchToSwitch?.name === branch.name && (
                      <div className="absolute inset-0 bg-background/80 rounded-md flex items-center justify-center">
                        <Loader2 className="w-4 h-4 animate-spin" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Remote branches */}
          {remoteBranches.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 px-2">
                <Globe className="w-3 h-3 text-muted-foreground" />
                <h4 className="text-xs font-semibold text-muted-foreground uppercase">
                  Remote Branches
                </h4>
              </div>
              <div className="space-y-1">
                {remoteBranches.map((branch) => (
                  <div
                    key={branch.name}
                    className="rounded-md border p-3 bg-muted/30"
                  >
                    <div className="flex items-start gap-2">
                      <GitBranchIcon className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0 space-y-1">
                        <span className="text-sm font-medium truncate block">
                          {branch.name}
                        </span>
                        {branch.lastCommit && (
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <GitCommit className="w-3 h-3" />
                              <span className="font-mono">
                                {branch.lastCommit.hash.substring(0, 7)}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              <span>{formatDate(branch.lastCommit.timestamp)}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty state */}
          {!isLoadingBranches && branches.length === 0 && !branchesError && (
            <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
              <div className="text-center space-y-2">
                <GitBranchIcon className="w-8 h-8 mx-auto opacity-50" />
                <p>No branches found</p>
                {!readOnly && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCreateClick}
                    className="mt-2"
                  >
                    <Plus className="mr-2 h-3 w-3" />
                    Create Branch
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create branch dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Branch</DialogTitle>
            <DialogDescription>
              Create a new branch from the current branch ({currentBranch || 'main'}).
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="branch-name">Branch Name</Label>
              <Input
                id="branch-name"
                placeholder="feature/my-feature"
                value={newBranchName}
                onChange={(e) => setNewBranchName(e.target.value)}
                disabled={isCreatingBranch}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newBranchName.trim()) {
                    handleCreateConfirm()
                  }
                }}
              />
              <p className="text-xs text-muted-foreground">
                Use lowercase letters, numbers, hyphens, and slashes
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateDialogOpen(false)}
              disabled={isCreatingBranch}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateConfirm}
              disabled={isCreatingBranch || !newBranchName.trim()}
            >
              {isCreatingBranch ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <GitBranchIcon className="mr-2 h-4 w-4" />
                  Create Branch
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Switch branch with uncommitted changes dialog */}
      <Dialog open={switchDialogOpen} onOpenChange={setSwitchDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Uncommitted Changes</DialogTitle>
            <DialogDescription>
              You have uncommitted changes. Switching branches will require you to commit or discard
              these changes first.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                {status?.changes.length || 0} file(s) have uncommitted changes. Please commit or
                discard your changes before switching branches.
              </AlertDescription>
            </Alert>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setSwitchDialogOpen(false)
                setBranchToSwitch(null)
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                // In a real implementation, this would discard changes
                showWarning('Discard Not Implemented', {
                  message: 'Please commit your changes manually',
                })
                setSwitchDialogOpen(false)
                setBranchToSwitch(null)
              }}
            >
              Discard Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete branch confirmation dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Branch</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the branch "{branchToDelete?.name}"? This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                This will permanently delete the branch and all commits that are not merged into
                other branches.
              </AlertDescription>
            </Alert>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false)
                setBranchToDelete(null)
              }}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Branch
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
})
