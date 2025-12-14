import * as React from "react"
import { Check, ChevronsUpDown, Plus, Building2, Crown, Users } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { useWorkspace } from "@/contexts/WorkspaceContext"
import { WorkspaceRole } from "@/types/workspace"

interface WorkspaceSwitcherProps {
  className?: string
  onWorkspaceChange?: (workspaceId: string | null) => void
  onCreateWorkspace?: () => void
}

const roleColors: Record<WorkspaceRole, string> = {
  OWNER: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  ADMIN: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  MEMBER: "bg-green-500/10 text-green-600 border-green-500/20",
  VIEWER: "bg-gray-500/10 text-gray-600 border-gray-500/20",
}

const planBadges: Record<string, { label: string; className: string }> = {
  free: { label: "Free", className: "bg-gray-100 text-gray-600" },
  pro: { label: "Pro", className: "bg-blue-100 text-blue-600" },
  enterprise: { label: "Enterprise", className: "bg-purple-100 text-purple-600" },
}

export function WorkspaceSwitcher({ 
  className, 
  onWorkspaceChange, 
  onCreateWorkspace 
}: WorkspaceSwitcherProps) {
  const [open, setOpen] = React.useState(false)
  const { workspaces, currentWorkspaceId, currentWorkspace, setCurrentWorkspace } = useWorkspace()

  const handleWorkspaceSelect = (workspaceId: string) => {
    setCurrentWorkspace(workspaceId)
    setOpen(false)
    onWorkspaceChange?.(workspaceId)
  }

  const handleCreateWorkspace = () => {
    setOpen(false)
    onCreateWorkspace?.()
  }

  // Separate workspaces by ownership
  const ownedWorkspaces = workspaces.filter(w => w.userRole === "OWNER")
  const memberWorkspaces = workspaces.filter(w => w.userRole !== "OWNER")

  const displayName = currentWorkspace?.name || "Select Workspace"
  const planInfo = currentWorkspace ? planBadges[currentWorkspace.plan] : null

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label="Select a workspace"
          className={cn(
            "w-full justify-between bg-sidebar-accent/50 hover:bg-sidebar-accent border-sidebar-border",
            className
          )}
        >
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Building2 className="h-4 w-4 shrink-0 text-sidebar-foreground/70" />
            <span className="truncate text-sm font-medium">
              {displayName}
            </span>
            {planInfo && (
              <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", planInfo.className)}>
                {planInfo.label}
              </Badge>
            )}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search workspaces..." />
          <CommandList>
            <CommandEmpty>No workspace found.</CommandEmpty>

            {/* Workspaces You Own */}
            {ownedWorkspaces.length > 0 && (
              <CommandGroup heading="Your Workspaces">
                {ownedWorkspaces.map((workspace) => (
                  <CommandItem
                    key={workspace.id}
                    onSelect={() => handleWorkspaceSelect(workspace.id)}
                    className="cursor-pointer"
                  >
                    <Crown className="mr-2 h-4 w-4 text-amber-500" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{workspace.name}</span>
                        <Badge 
                          variant="outline" 
                          className={cn("text-[10px] px-1.5 py-0", planBadges[workspace.plan]?.className)}
                        >
                          {planBadges[workspace.plan]?.label}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {workspace._count?.members || 1} members • {workspace._count?.workflows || 0} workflows
                      </div>
                    </div>
                    {currentWorkspaceId === workspace.id && (
                      <Check className="ml-2 h-4 w-4 shrink-0" />
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {/* Workspaces You're In */}
            {memberWorkspaces.length > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup heading="Shared With You">
                  {memberWorkspaces.map((workspace) => (
                    <CommandItem
                      key={workspace.id}
                      onSelect={() => handleWorkspaceSelect(workspace.id)}
                      className="cursor-pointer"
                    >
                      <Users className="mr-2 h-4 w-4 text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium truncate">{workspace.name}</span>
                          <Badge 
                            variant="outline" 
                            className={cn("text-[10px] px-1.5 py-0", roleColors[workspace.userRole!])}
                          >
                            {workspace.userRole?.toLowerCase()}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {workspace._count?.workflows || 0} workflows
                        </div>
                      </div>
                      {currentWorkspaceId === workspace.id && (
                        <Check className="ml-2 h-4 w-4 shrink-0" />
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}

            {/* Create New Workspace */}
            <CommandSeparator />
            <CommandGroup>
              <CommandItem
                onSelect={handleCreateWorkspace}
                className="cursor-pointer"
              >
                <Plus className="mr-2 h-4 w-4" />
                <span className="font-medium">Create New Workspace</span>
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
