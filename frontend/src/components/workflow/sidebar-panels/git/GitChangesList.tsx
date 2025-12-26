/**
 * GitChangesList Component
 * 
 * Displays a list of changed files with icons, change types, and actions.
 * Provides stage/unstage and discard functionality for individual changes,
 * as well as bulk "Stage All" and "Unstage All" operations.
 * 
 * Requirements: 2.1
 */

import { memo, useCallback, useState } from 'react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  CheckCircle2,
  FileCode,
  Loader2,
} from 'lucide-react'
import { GitChange, gitService } from '@/services/git.service'
import { cn } from '@/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useWorkflowStore } from '@/stores/workflow'
import { useGitStore } from '@/stores/git'
import { Badge } from '@/components/ui/badge'
import { getEnvironmentLabel, getEnvironmentColor } from '@/types/environment'

interface GitChangesListProps {
  workflowId: string
  changes: GitChange[]
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
  workflowId,
  changes
}: GitChangesListProps) {
  const [viewingChange, setViewingChange] = useState<GitChange | null>(null)
  const [diffData, setDiffData] = useState<{ oldContent: string | null; newContent: string | null } | null>(null)
  const [loadingDiff, setLoadingDiff] = useState(false)
  const workflow = useWorkflowStore((state) => state.workflow)
  const { activeEnvironment } = useGitStore()

  const handleViewChange = useCallback(async (change: GitChange) => {
    setViewingChange(change)
    setLoadingDiff(true)
    setDiffData(null)

    // Convert environment to string format
    const envStr = activeEnvironment === 'DEVELOPMENT' ? 'development' :
                     activeEnvironment === 'STAGING' ? 'staging' :
                     activeEnvironment === 'PRODUCTION' ? 'production' : undefined;

    try {
      const diff = await gitService.getDiff(workflowId, change.path, workflow, envStr)
      setDiffData(diff)
    } catch (error) {
      console.error('Failed to load diff:', error)
    } finally {
      setLoadingDiff(false)
    }
  }, [workflowId, workflow, activeEnvironment])

  const handleCloseDialog = useCallback(() => {
    setViewingChange(null)
    setDiffData(null)
  }, [])

  // Parse JSON safely
  const parseJSON = (content: string | null) => {
    if (!content) return null
    try {
      return JSON.parse(content)
    } catch {
      return null
    }
  }

  // Calculate counts
  const hasChanges = changes.length > 0

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
      {/* Info message */}
      <div className="text-xs text-muted-foreground">
        You have unsaved changes
      </div>

      {/* View changes button */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => handleViewChange(changes[0])}
        className="w-full"
      >
        <FileCode className="mr-2 h-4 w-4" />
        View changes
      </Button>

      {/* Change viewer dialog */}
      <Dialog open={!!viewingChange} onOpenChange={(open) => !open && handleCloseDialog()}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileCode className="w-5 h-5" />
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="font-medium">{viewingChange?.path}</span>
                {viewingChange?.path?.startsWith('workflow-') && viewingChange?.path !== 'README.md' && viewingChange?.path !== 'metadata.json' && activeEnvironment && (
                  <Badge
                    variant="outline"
                    className={`border-${getEnvironmentColor(activeEnvironment)}-500 bg-${getEnvironmentColor(activeEnvironment)}-50 text-${getEnvironmentColor(activeEnvironment)}-700 text-xs`}
                  >
                    {getEnvironmentLabel(activeEnvironment)}
                  </Badge>
                )}
              </div>
            </DialogTitle>
            <DialogDescription>
              {viewingChange?.type === 'added' && 'This file was added to your workflow'}
              {viewingChange?.type === 'modified' && 'This file was modified'}
              {viewingChange?.type === 'deleted' && 'This file was deleted from your workflow'}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="space-y-4 pr-4">
                <div className="bg-muted/30 p-4 rounded-md">
                  <h4 className="text-sm font-medium mb-2">File Information</h4>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Path:</span>
                      <span className="font-mono">{viewingChange?.path}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Status:</span>
                      <span className={cn(
                        'font-medium',
                        viewingChange?.type === 'added' && 'text-green-600 dark:text-green-400',
                        viewingChange?.type === 'modified' && 'text-blue-600 dark:text-blue-400',
                        viewingChange?.type === 'deleted' && 'text-red-600 dark:text-red-400'
                      )}>
                        {getChangeLabel(viewingChange?.type || 'modified')}
                      </span>
                    </div>
                  </div>
                </div>

                {loadingDiff && (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                    <span className="ml-2 text-sm text-muted-foreground">Loading diff...</span>
                  </div>
                )}

                {!loadingDiff && diffData && (
                  <div className="space-y-4">
                    {/* Old Content */}
                    {diffData.oldContent && (
                      <div className="border rounded-md overflow-hidden">
                        <div className="bg-red-500/10 border-b border-red-500/20 px-3 py-2">
                          <h4 className="text-xs font-medium text-red-600 dark:text-red-400">
                            − Previous Version
                          </h4>
                        </div>
                        <ScrollArea className="max-h-[300px]">
                          <pre className="p-3 text-xs font-mono bg-muted/30 overflow-x-auto">
                            {JSON.stringify(parseJSON(diffData.oldContent), null, 2)}
                          </pre>
                        </ScrollArea>
                      </div>
                    )}

                    {/* New Content */}
                    {diffData.newContent && (
                      <div className="border rounded-md overflow-hidden">
                        <div className="bg-green-500/10 border-b border-green-500/20 px-3 py-2">
                          <h4 className="text-xs font-medium text-green-600 dark:text-green-400">
                            + Current Version
                          </h4>
                        </div>
                        <ScrollArea className="max-h-[300px]">
                          <pre className="p-3 text-xs font-mono bg-muted/30 overflow-x-auto">
                            {JSON.stringify(parseJSON(diffData.newContent), null, 2)}
                          </pre>
                        </ScrollArea>
                      </div>
                    )}
                  </div>
                )}

                {!loadingDiff && !diffData && (
                  <div className="bg-muted/30 p-4 rounded-md">
                    <h4 className="text-sm font-medium mb-2">About This File</h4>
                    <div className="text-xs text-muted-foreground space-y-2">
                       {viewingChange?.path === 'workflow.json' && (
                         <>
                           <p>
                             This file contains your complete workflow configuration including:
                           </p>
                           <ul className="list-disc list-inside space-y-1 ml-2">
                             <li>All nodes and their configurations</li>
                             <li>Connections between nodes</li>
                             <li>Node positions on the canvas</li>
                             <li>Workflow settings and metadata</li>
                           </ul>
                           {!activeEnvironment && (
                             <p className="text-xs text-muted-foreground mt-2">
                               Note: When an environment (development/staging/production) is active, changes will be committed to the corresponding environment-specific file instead.
                             </p>
                           )}
                         </>
                       )}
                       {viewingChange?.path === 'workflow-development.json' && (
                         <>
                           <p>
                             This file contains the development environment workflow configuration.
                           </p>
                           <ul className="list-disc list-inside space-y-1 ml-2">
                             <li>All nodes and their configurations</li>
                             <li>Connections between nodes</li>
                             <li>Node positions on the canvas</li>
                             <li>Workflow settings and metadata</li>
                           </ul>
                         </>
                       )}
                       {viewingChange?.path === 'workflow-staging.json' && (
                         <>
                           <p>
                             This file contains the staging environment workflow configuration.
                           </p>
                           <ul className="list-disc list-inside space-y-1 ml-2">
                             <li>All nodes and their configurations</li>
                             <li>Connections between nodes</li>
                             <li>Node positions on the canvas</li>
                             <li>Workflow settings and metadata</li>
                           </ul>
                         </>
                       )}
                       {viewingChange?.path === 'workflow-production.json' && (
                         <>
                           <p>
                             This file contains the production environment workflow configuration.
                           </p>
                           <ul className="list-disc list-inside space-y-1 ml-2">
                             <li>All nodes and their configurations</li>
                             <li>Connections between nodes</li>
                             <li>Node positions on the canvas</li>
                             <li>Workflow settings and metadata</li>
                           </ul>
                         </>
                       )}
                       {viewingChange?.path === 'metadata.json' && (
                         <>
                           <p>
                             This file contains workflow metadata including:
                           </p>
                           <ul className="list-disc list-inside space-y-1 ml-2">
                             <li>Workflow title and description</li>
                             <li>Creation and update timestamps</li>
                             <li>Version information</li>
                           </ul>
                         </>
                       )}
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>

          <div className="flex justify-end pt-4 border-t">
            <Button onClick={handleCloseDialog} variant="outline">
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
})
