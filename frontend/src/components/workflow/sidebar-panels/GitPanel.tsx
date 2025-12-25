/**
 * GitPanel Component
 * 
 * Main Git panel component that renders in the RightSidebar when the Git tab is active.
 * Handles connection status check and renders appropriate sub-components based on connection state.
 * 
 * Requirements: 1.1, 1.4, 1.5
 */

import { memo, useEffect, useState } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { GitBranch, GitCommit, GitPullRequest, ChevronDown, ArrowLeft, Layers } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useGitStore } from '@/stores/git'
import {
  GitConnectionSection,
  GitSourceControlTab,
  GitHistoryTab,
  GitBranchesTab,
} from './git'
import { getEnvironmentLabel, getEnvironmentColor } from '@/types/environment'

interface GitPanelProps {
  workflowId?: string
  readOnly?: boolean
}

export const GitPanel = memo(function GitPanel({
  workflowId,
  readOnly = false
}: GitPanelProps) {
  const {
    isConnected,
    repositoryInfo,
    currentBranch,
    branches,
    getRepositoryInfo,
    switchBranch,
    isSwitchingBranch,
    activeEnvironment,
  } = useGitStore()

  // Local state for active sub-tab
  const [activeTab, setActiveTab] = useState<'source-control' | 'history' | 'branches'>('source-control')
  const [showConnectionSettings, setShowConnectionSettings] = useState(false)

  // Check connection status on mount and when workflowId changes
  useEffect(() => {
    if (workflowId) {
      getRepositoryInfo(workflowId)
    }
  }, [workflowId, getRepositoryInfo])

  // Handle branch switch from dropdown
  const handleBranchSwitch = async (branchName: string) => {
    if (!workflowId || branchName === currentBranch) return
    
    try {
      await switchBranch(workflowId, branchName)
    } catch (error) {
      console.error('Failed to switch branch:', error)
    }
  }

  // If no workflow ID, show message
  if (!workflowId) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-muted-foreground p-4">
        <div className="text-center space-y-2">
          <GitBranch className="w-8 h-8 mx-auto opacity-50" />
          <p>No workflow loaded</p>
          <p className="text-xs">Open a workflow to use Git version control</p>
        </div>
      </div>
    )
  }

  // If not connected, show connection section
  if (!isConnected) {
    return (
      <ScrollArea className="h-full">
        <div className="p-4">
          <GitConnectionSection
            workflowId={workflowId}
            connected={false}
            repositoryInfo={repositoryInfo || undefined}
            readOnly={readOnly}
          />
        </div>
      </ScrollArea>
    )
  }

  // Connected state - show Git sub-tabs with branch selector
  return (
    <div className="flex flex-col h-full relative">
       {/* Branch selector header */}
      <div className="flex-shrink-0 border-b p-3 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <GitBranch className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <span className="text-xs font-medium text-muted-foreground">Branch</span>
          </div>
          
          {/* Environment indicator */}
          {activeEnvironment && (
            <Badge
              variant="outline"
              className={`border-${getEnvironmentColor(activeEnvironment)}-500 bg-${getEnvironmentColor(activeEnvironment)}-50 text-${getEnvironmentColor(activeEnvironment)}-700 text-xs`}
            >
              <Layers className="w-3 h-3 mr-1" />
              {getEnvironmentLabel(activeEnvironment)}
            </Badge>
          )}
        </div>

        {/* Repository info with environment */}
        <div className="space-y-2">
          {repositoryInfo && (
            <div className="text-xs text-muted-foreground truncate">
              {repositoryInfo.repositoryUrl}
            </div>
          )}
          {activeEnvironment && (
            <div className="text-xs text-muted-foreground">
              <span className="font-medium">Target file:</span> workflow-{getEnvironmentLabel(activeEnvironment).toLowerCase()}.json
            </div>
          )}
        </div>

          {/* Branch dropdown and connection settings */}
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs font-mono"
                  disabled={isSwitchingBranch || readOnly}
                >
                  {currentBranch || 'main'}
                  <ChevronDown className="ml-1 h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {branches.length > 0 ? (
                  branches.map((branch) => (
                    <DropdownMenuItem
                      key={branch.name}
                      onClick={() => handleBranchSwitch(branch.name)}
                      disabled={branch.current}
                      className="text-xs font-mono"
                    >
                      <GitBranch className="mr-2 h-3 w-3" />
                      {branch.name}
                      {branch.current && (
                        <span className="ml-auto text-xs text-muted-foreground">current</span>
                      )}
                    </DropdownMenuItem>
                  ))
                ) : (
                  <DropdownMenuItem disabled className="text-xs">
                    No branches available
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            
            {/* Connection Settings Button */}
            {!readOnly && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2"
                onClick={() => setShowConnectionSettings(true)}
                title="Connection Settings"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="3" />
                  <path d="M12 1v6m0 6v6" />
                  <path d="m4.93 4.93 4.24 4.24m5.66 5.66 4.24 4.24" />
                  <path d="M1 12h6m6 0h6" />
                  <path d="m4.93 19.07 4.24-4.24m5.66-5.66 4.24-4.24" />
                </svg>
              </Button>
            )}
          </div>
        </div>

      {/* Connection Settings Slide-in Panel */}
      {showConnectionSettings && (
        <div className="absolute inset-0 bg-background z-10 flex flex-col">
          <div className="flex-shrink-0 border-b p-3 flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowConnectionSettings(false)}
              className="h-7 w-7 p-0 flex-shrink-0"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h3 className="text-sm font-semibold">Connection Settings</h3>
          </div>
          <div className="flex-1 min-h-0 overflow-auto">
            <div className="p-4">
              <GitConnectionSection
                workflowId={workflowId}
                connected={true}
                repositoryInfo={repositoryInfo || undefined}
                readOnly={readOnly}
              />
            </div>
          </div>
        </div>
      )}

      {/* Git sub-tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="flex-1 flex flex-col min-h-0">
        <div className="flex-shrink-0 border-b px-3">
          <TabsList className="h-9 bg-transparent p-0 gap-2 w-full justify-start">
            <TabsTrigger
              value="source-control"
              className="h-8 px-3 text-xs data-[state=active]:bg-muted rounded-md"
            >
              <GitCommit className="h-3 w-3 mr-1.5" />
              Source Control
            </TabsTrigger>
            <TabsTrigger
              value="history"
              className="h-8 px-3 text-xs data-[state=active]:bg-muted rounded-md"
            >
              <GitPullRequest className="h-3 w-3 mr-1.5" />
              History
            </TabsTrigger>
            <TabsTrigger
              value="branches"
              className="h-8 px-3 text-xs data-[state=active]:bg-muted rounded-md"
            >
              <GitBranch className="h-3 w-3 mr-1.5" />
              Branches
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Tab content - must be flex-1 with min-h-0 for proper scrolling */}
        <div className="flex-1 min-h-0">
          <TabsContent value="source-control" className="flex-1 min-h-0 mt-0 relative h-full">
            <GitSourceControlTab
              workflowId={workflowId}
              readOnly={readOnly}
            />
          </TabsContent>

          <TabsContent value="history" className="flex-1 min-h-0 mt-0 relative h-full">
            <GitHistoryTab
              workflowId={workflowId}
              readOnly={readOnly}
            />
          </TabsContent>

          <TabsContent value="branches" className="flex-1 min-h-0 mt-0 relative h-full">
            <GitBranchesTab
              workflowId={workflowId}
              readOnly={readOnly}
            />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
})
