import * as React from "react"
import { Building2, Crown, MoreHorizontal, Plus, Settings, Users, Search, RefreshCw, Eye } from "lucide-react"
import { useWorkspace } from "@/contexts/WorkspaceContext"
import { useSidebarContext } from "@/contexts"
import { useWorkspaceStore, WorkspaceLimitInfo } from "@/stores/workspace"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Workspace, WorkspaceRole } from "@/types/workspace"
import { cn } from "@/lib/utils"

interface WorkspacesListProps {
  onWorkspaceSelect?: (workspace: Workspace) => void
  onCreateWorkspace?: () => void
  onWorkspaceSettings?: (workspace: Workspace) => void
  onManageMembers?: (workspace: Workspace) => void
}

const planBadges: Record<string, { label: string; className: string }> = {
  free: { label: "Free", className: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400" },
  pro: { label: "Pro", className: "bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400" },
  enterprise: { label: "Enterprise", className: "bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-400" },
}

export function WorkspacesList({
  onWorkspaceSelect,
  onCreateWorkspace,
  onWorkspaceSettings,
  onManageMembers,
}: WorkspacesListProps) {
  const [searchQuery, setSearchQuery] = React.useState("")
  const [isRefreshing, setIsRefreshing] = React.useState(false)
  const [limitInfo, setLimitInfo] = React.useState<WorkspaceLimitInfo | null>(null)
  const { workspaces, currentWorkspaceId, setCurrentWorkspace, isLoading, refreshWorkspaces } = useWorkspace()
  const { checkCanCreateWorkspace } = useWorkspaceStore()
  const { setHeaderSlot } = useSidebarContext()

  // Check workspace limit on mount
  React.useEffect(() => {
    checkCanCreateWorkspace().then(setLimitInfo)
  }, [checkCanCreateWorkspace, workspaces.length])

  const handleRefresh = React.useCallback(async () => {
    setIsRefreshing(true)
    try {
      await refreshWorkspaces()
    } finally {
      setIsRefreshing(false)
    }
  }, [refreshWorkspaces])

  const handleSelect = (workspace: Workspace) => {
    setCurrentWorkspace(workspace.id)
    onWorkspaceSelect?.(workspace)
  }

  const handleCreateWorkspace = React.useCallback(() => {
    onCreateWorkspace?.()
  }, [onCreateWorkspace])

  const filteredWorkspaces = workspaces.filter(w =>
    w.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const getRoleIcon = (role: WorkspaceRole) => {
    switch (role) {
      case "OWNER":
        return <Crown className="h-3 w-3 text-yellow-500" />
      case "ADMIN":
        return <Settings className="h-3 w-3 text-blue-500" />
      case "MEMBER":
        return <Users className="h-3 w-3 text-green-500" />
      case "VIEWER":
        return <Eye className="h-3 w-3 text-gray-500" />
    }
  }

  const canCreateMore = limitInfo?.allowed ?? true
  const limitTooltip = limitInfo && !limitInfo.allowed 
    ? limitInfo.reason 
    : limitInfo && limitInfo.maxAllowed !== -1
      ? `${limitInfo.currentCount} of ${limitInfo.maxAllowed} workspaces used`
      : undefined

  // Set header slot with count, refresh, and search
  React.useEffect(() => {
    setHeaderSlot(
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="text-xs text-muted-foreground">
            {limitInfo && limitInfo.maxAllowed !== -1 
              ? `${limitInfo.currentCount}/${limitInfo.maxAllowed} workspaces`
              : `${workspaces.length} workspace${workspaces.length !== 1 ? 's' : ''}`
            }
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={handleRefresh}
              disabled={isRefreshing}
              title="Refresh workspaces"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 gap-1 px-2"
                    onClick={handleCreateWorkspace}
                    disabled={!canCreateMore}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span className="text-xs">New</span>
                  </Button>
                </span>
              </TooltipTrigger>
              {limitTooltip && (
                <TooltipContent>
                  <p>{limitTooltip}</p>
                </TooltipContent>
              )}
            </Tooltip>
          </div>
        </div>
        <div className="relative">
          <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search workspaces..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 pl-8 text-sm"
          />
        </div>
      </div>
    )
    return () => setHeaderSlot(null)
  }, [workspaces.length, searchQuery, isRefreshing, setHeaderSlot, handleCreateWorkspace, handleRefresh, canCreateMore, limitInfo, limitTooltip])

  if (isLoading) {
    return (
      <div className="p-4">
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="border rounded-lg p-3">
              <div className="animate-pulse">
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-muted rounded w-1/2 mb-1"></div>
                <div className="h-3 bg-muted rounded w-1/4"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (filteredWorkspaces.length === 0) {
    return (
      <div className="p-4">
        <div className="text-center text-muted-foreground">
          <Building2 className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
          <p className="text-sm">
            {searchQuery ? 'No workspaces match your search' : 'No workspaces found'}
          </p>
          {!searchQuery && (
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={onCreateWorkspace}
            >
              Create Your First Workspace
            </Button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="p-0">
      <div className="space-y-0">
        {filteredWorkspaces.map((workspace) => {
          const isSelected = currentWorkspaceId === workspace.id
          const isOwner = workspace.userRole === "OWNER"
          const isAdmin = workspace.userRole === "ADMIN"
          const canManage = isOwner || isAdmin
          const planInfo = planBadges[workspace.plan]

          return (
            <div
              key={workspace.id}
              className={cn(
                "border-b last:border-b-0 cursor-pointer group transition-colors",
                isSelected
                  ? "bg-sidebar-accent text-sidebar-accent-foreground border-l-2 border-l-primary"
                  : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
              onClick={() => handleSelect(workspace)}
            >
              <div className="p-3 overflow-hidden">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-1.5 min-w-0 flex-1 overflow-hidden">
                    {isOwner ? (
                      <Crown className="h-3.5 w-3.5 shrink-0 text-yellow-500" />
                    ) : (
                      <Building2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    )}
                    <h4 className="text-sm font-medium truncate min-w-0 flex-1">
                      {workspace.name}
                    </h4>
                    {planInfo && (
                      <Badge variant="outline" className={cn("text-[10px] px-1 py-0 shrink-0 ml-1", planInfo.className)}>
                        {planInfo.label}
                      </Badge>
                    )}
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreHorizontal className="h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation()
                          onManageMembers?.(workspace)
                        }}
                      >
                        <Users className="h-3.5 w-3.5 mr-2" />
                        Members
                      </DropdownMenuItem>
                      {canManage && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation()
                              onWorkspaceSettings?.(workspace)
                            }}
                          >
                            <Settings className="h-3.5 w-3.5 mr-2" />
                            Settings
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-3">
                    {workspace.userRole && (
                      <div className="flex items-center gap-1">
                        {getRoleIcon(workspace.userRole)}
                        <span>{workspace.userRole.charAt(0) + workspace.userRole.slice(1).toLowerCase()}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      <span>{workspace._count?.members || 1}</span>
                    </div>
                  </div>
                  <span>{workspace._count?.workflows || 0} workflows</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
