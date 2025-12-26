/**
 * GitConflictResolutionDialog Component
 * 
 * Dialog for resolving Git merge conflicts. Displays conflicting files,
 * shows diff view, and provides options to accept ours/theirs or manually edit.
 * 
 * Requirements: 3.4, 7.3
 */

import { memo, useState, useCallback, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  AlertCircle,
  CheckCircle2,
  FileText,
  GitMerge,
  Loader2,
  ChevronRight,
  Edit3,
} from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Conflict file information
 */
export interface ConflictFile {
  path: string
  ours: string
  theirs: string
  base?: string
  resolved: boolean
  resolution?: string
}

/**
 * Conflict resolution strategy
 */
export type ResolutionStrategy = 'ours' | 'theirs' | 'manual'

/**
 * Props for GitConflictResolutionDialog
 */
export interface GitConflictResolutionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  conflicts: ConflictFile[]
  onResolve: (resolutions: Map<string, string>) => Promise<void>
  onCancel: () => void
  isResolving?: boolean
}

/**
 * GitConflictResolutionDialog Component
 */
export const GitConflictResolutionDialog = memo(function GitConflictResolutionDialog({
  open,
  onOpenChange,
  conflicts,
  onResolve,
  onCancel,
  isResolving = false,
}: GitConflictResolutionDialogProps) {
  // State for selected file and resolutions
  const [selectedFileIndex, setSelectedFileIndex] = useState(0)
  const [resolutions, setResolutions] = useState<Map<string, string>>(new Map())
  const [editMode, setEditMode] = useState<Map<string, boolean>>(new Map())

  // Get current file
  const currentFile = conflicts[selectedFileIndex]

  // Calculate resolution progress
  const resolvedCount = useMemo(() => {
    return conflicts.filter(
      (file) => resolutions.has(file.path) || file.resolved
    ).length
  }, [conflicts, resolutions])

  const totalCount = conflicts.length
  const allResolved = resolvedCount === totalCount

  /**
   * Handle resolution strategy selection
   */
  const handleSelectStrategy = useCallback(
    (strategy: ResolutionStrategy) => {
      if (!currentFile) return

      const newResolutions = new Map(resolutions)

      if (strategy === 'ours') {
        newResolutions.set(currentFile.path, currentFile.ours)
        setEditMode(new Map(editMode).set(currentFile.path, false))
      } else if (strategy === 'theirs') {
        newResolutions.set(currentFile.path, currentFile.theirs)
        setEditMode(new Map(editMode).set(currentFile.path, false))
      } else if (strategy === 'manual') {
        // Start with ours as base for manual editing
        if (!newResolutions.has(currentFile.path)) {
          newResolutions.set(currentFile.path, currentFile.ours)
        }
        setEditMode(new Map(editMode).set(currentFile.path, true))
      }

      setResolutions(newResolutions)
    },
    [currentFile, resolutions, editMode]
  )

  /**
   * Handle manual edit change
   */
  const handleManualEdit = useCallback(
    (value: string) => {
      if (!currentFile) return

      const newResolutions = new Map(resolutions)
      newResolutions.set(currentFile.path, value)
      setResolutions(newResolutions)
    },
    [currentFile, resolutions]
  )

  /**
   * Handle mark as resolved
   */
  const handleMarkResolved = useCallback(() => {
    if (!currentFile || !resolutions.has(currentFile.path)) return

    // Move to next unresolved file or stay on current
    const nextUnresolvedIndex = conflicts.findIndex(
      (file, index) =>
        index > selectedFileIndex &&
        !resolutions.has(file.path) &&
        !file.resolved
    )

    if (nextUnresolvedIndex !== -1) {
      setSelectedFileIndex(nextUnresolvedIndex)
    } else if (selectedFileIndex < conflicts.length - 1) {
      setSelectedFileIndex(selectedFileIndex + 1)
    }
  }, [currentFile, resolutions, conflicts, selectedFileIndex])

  /**
   * Handle resolve all conflicts
   */
  const handleResolveAll = useCallback(async () => {
    try {
      await onResolve(resolutions)
    } catch (error) {
      console.error('Failed to resolve conflicts:', error)
    }
  }, [resolutions, onResolve])

  /**
   * Handle cancel
   */
  const handleCancel = useCallback(() => {
    setResolutions(new Map())
    setEditMode(new Map())
    setSelectedFileIndex(0)
    onCancel()
  }, [onCancel])

  // Get resolution for current file
  const currentResolution = currentFile ? resolutions.get(currentFile.path) : undefined
  const isCurrentFileResolved =
    currentFile && (resolutions.has(currentFile.path) || currentFile.resolved)
  const isInEditMode = currentFile && editMode.get(currentFile.path)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle className="flex items-center gap-2">
            <GitMerge className="w-5 h-5" />
            Resolve Merge Conflicts
          </DialogTitle>
          <DialogDescription>
            Resolve conflicts in {totalCount} file{totalCount !== 1 ? 's' : ''}.
            Choose to accept your changes, their changes, or manually edit.
          </DialogDescription>
        </DialogHeader>

        {/* Progress indicator */}
        <div className="px-6 pb-4">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-muted-foreground">
              Progress: {resolvedCount} of {totalCount} resolved
            </span>
            <span className="font-medium">
              {Math.round((resolvedCount / totalCount) * 100)}%
            </span>
          </div>
          <div className="w-full bg-secondary rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${(resolvedCount / totalCount) * 100}%` }}
            />
          </div>
        </div>

        <Separator />

        {/* Main content area */}
        <div className="flex-1 flex min-h-0">
          {/* File list sidebar */}
          <div className="w-64 border-r flex flex-col">
            <div className="p-3 border-b">
              <h3 className="text-sm font-semibold">Conflicting Files</h3>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-2 space-y-1">
                {conflicts.map((file, index) => {
                  const isResolved = resolutions.has(file.path) || file.resolved
                  const isSelected = index === selectedFileIndex

                  return (
                    <button
                      key={file.path}
                      onClick={() => setSelectedFileIndex(index)}
                      className={cn(
                        'w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors',
                        isSelected
                          ? 'bg-accent text-accent-foreground'
                          : 'hover:bg-accent/50',
                        isResolved && 'opacity-60'
                      )}
                    >
                      {isResolved ? (
                        <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-orange-600 dark:text-orange-400 flex-shrink-0" />
                      )}
                      <span className="flex-1 truncate text-left">{file.path}</span>
                      {isSelected && <ChevronRight className="w-4 h-4 flex-shrink-0" />}
                    </button>
                  )
                })}
              </div>
            </ScrollArea>
          </div>

          {/* Conflict resolution area */}
          <div className="flex-1 flex flex-col min-w-0">
            {currentFile ? (
              <>
                {/* File header */}
                <div className="p-4 border-b">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium text-sm">{currentFile.path}</span>
                    </div>
                    {isCurrentFileResolved && (
                      <Badge variant="outline" className="text-green-600 dark:text-green-400">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Resolved
                      </Badge>
                    )}
                  </div>

                  {/* Resolution strategy buttons */}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSelectStrategy('ours')}
                      disabled={isResolving}
                      className="flex-1"
                    >
                      Accept Ours
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSelectStrategy('theirs')}
                      disabled={isResolving}
                      className="flex-1"
                    >
                      Accept Theirs
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSelectStrategy('manual')}
                      disabled={isResolving}
                      className="flex-1"
                    >
                      <Edit3 className="w-3 h-3 mr-1.5" />
                      Manual Edit
                    </Button>
                  </div>
                </div>

                {/* Content area */}
                <ScrollArea className="flex-1">
                  <div className="p-4 space-y-4">
                    {isInEditMode ? (
                      /* Manual edit mode */
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-sm font-medium">
                            Manual Resolution
                          </label>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleMarkResolved}
                            disabled={!currentResolution || isResolving}
                          >
                            <CheckCircle2 className="w-3 h-3 mr-1.5" />
                            Mark as Resolved
                          </Button>
                        </div>
                        <Textarea
                          value={currentResolution || ''}
                          onChange={(e) => handleManualEdit(e.target.value)}
                          className="font-mono text-xs min-h-[400px]"
                          placeholder="Edit the resolved content here..."
                          disabled={isResolving}
                        />
                        <p className="text-xs text-muted-foreground">
                          Edit the content above to manually resolve the conflict.
                        </p>
                      </div>
                    ) : (
                      /* Diff view mode */
                      <>
                        {/* Ours section */}
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-semibold">Your Changes (Ours)</h4>
                            <Badge variant="secondary" className="text-xs">
                              Current
                            </Badge>
                          </div>
                          <div className="border rounded-md bg-muted/30">
                            <pre className="p-3 text-xs font-mono overflow-x-auto whitespace-pre-wrap break-words">
                              {currentFile.ours}
                            </pre>
                          </div>
                        </div>

                        <Separator />

                        {/* Theirs section */}
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-semibold">Their Changes (Theirs)</h4>
                            <Badge variant="secondary" className="text-xs">
                              Incoming
                            </Badge>
                          </div>
                          <div className="border rounded-md bg-muted/30">
                            <pre className="p-3 text-xs font-mono overflow-x-auto whitespace-pre-wrap break-words">
                              {currentFile.theirs}
                            </pre>
                          </div>
                        </div>

                        {/* Show current resolution if selected */}
                        {currentResolution && !isInEditMode && (
                          <>
                            <Separator />
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <h4 className="text-sm font-semibold">Selected Resolution</h4>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={handleMarkResolved}
                                  disabled={isResolving}
                                >
                                  <CheckCircle2 className="w-3 h-3 mr-1.5" />
                                  Mark as Resolved
                                </Button>
                              </div>
                              <div className="border rounded-md bg-green-50 dark:bg-green-950/20">
                                <pre className="p-3 text-xs font-mono overflow-x-auto whitespace-pre-wrap break-words">
                                  {currentResolution}
                                </pre>
                              </div>
                            </div>
                          </>
                        )}
                      </>
                    )}
                  </div>
                </ScrollArea>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                <div className="text-center space-y-2">
                  <FileText className="w-12 h-12 mx-auto opacity-50" />
                  <p className="text-sm">No conflicts to resolve</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <Separator />

        {/* Footer */}
        <DialogFooter className="px-6 py-4">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              {!allResolved && (
                <Alert className="py-2 px-3">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    {totalCount - resolvedCount} file{totalCount - resolvedCount !== 1 ? 's' : ''}{' '}
                    still need resolution
                  </AlertDescription>
                </Alert>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={isResolving}
              >
                Cancel
              </Button>
              <Button
                onClick={handleResolveAll}
                disabled={!allResolved || isResolving}
              >
                {isResolving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Resolving...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Resolve All Conflicts
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
})
