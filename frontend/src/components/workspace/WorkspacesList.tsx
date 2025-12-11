import { Building2, Crown, MoreHorizontal, Plus, Settings, Users } from "lucide-react"
import { useWorkspace } from "@/contexts/WorkspaceContext"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Workspace, WorkspaceRole } from "@/types/workspace"
import { cn } from "@/lib/utils"

interface WorkspacesListProps {
  onWorkspaceSelect?: (workspace: Workspace) => void
  onCreateWorkspace?: () => void
  onWorkspaceSettings?: (workspace: Workspace) => void
  onManageMembers?: (workspace: Workspace) => void
}

const roleColors: Record<WorkspaceRole, string> = {
  OWNER: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  ADMIN: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  MEMBER: "bg-green-500/10 text-green-600 border-green-500/20",
  VIEWER: "bg-gray-500/10 text-gray-600 border-gray-500/20",
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
  const { workspaces, currentWorkspaceId, setCurrentWorkspace, isLoading } = useWorkspace()

  const handleSelect = (workspace: Workspace) => {
    setCurrentWorkspace(workspace.id)
    onWorkspaceSelect?.(workspace)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-pulse text-muted-foreground">Loading workspaces...</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b">
        <Button
          variant="outline"
          className="w-full justify-start"
          onClick={onCreateWorkspace}
        >
          <Plus className="mr-2 h-4 w-4" />
          Create Workspace
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {workspaces.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Building2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No workspaces yet</p>
              <p className="text-xs mt-1">Create your first workspace to get started</p>
            </div>
          ) : (
            workspaces.map((workspace) => {
              const isSelected = currentWorkspaceId === workspace.id
              const isOwner = workspace.userRole === "OWNER"
              const planInfo = planBadges[workspace.plan]

              return (
                <div
                  key={workspace.id}
                  className={cn(
                    "group flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors",
                    isSelected
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "hover:bg-sidebar-accent/50"
                  )}
                  onClick={() => handleSelect(workspace)}
                >
                  <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-primary/10 text-primary shrink-0">
                    {isOwner ? (
                      <Crown className="h-5 w-5" />
                    ) : (
                      <Building2 className="h-5 w-5" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{workspace.name}</span>
                      {planInfo && (
                        <Badge
                          variant="outline"
                          className={cn("text-[10px] px-1.5 py-0 shrink-0", planInfo.className)}
                        >
                          {planInfo.label}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Badge
                        variant="outline"
                        className={cn("text-[10px] px-1.5 py-0", roleColors[workspace.userRole!])}
                      >
                        {workspace.userRole?.toLowerCase()}
                      </Badge>
                      <span>•</span>
                      <span>{workspace._count?.members || 1} members</span>
                      <span>•</span>
                      <span>{workspace._count?.workflows || 0} workflows</span>
                    </div>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation()
                          onManageMembers?.(workspace)
                        }}
                      >
                        <Users className="mr-2 h-4 w-4" />
                        Manage Members
                      </DropdownMenuItem>
                      {(isOwner || workspace.userRole === "ADMIN") && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation()
                              onWorkspaceSettings?.(workspace)
                            }}
                          >
                            <Settings className="mr-2 h-4 w-4" />
                            Settings
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )
            })
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
