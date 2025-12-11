import * as React from "react"
import { Crown, Loader2, MoreHorizontal, Shield, Trash2, User, UserPlus, Users } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useWorkspaceStore } from "@/stores/workspace"
import { WorkspaceMember, WorkspaceRole } from "@/types/workspace"
import { cn } from "@/lib/utils"

interface ManageMembersDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  workspaceId: string
  workspaceName: string
  userRole: WorkspaceRole
  onAddMember?: () => void
}

const roleIcons: Record<WorkspaceRole, React.ReactNode> = {
  OWNER: <Crown className="h-3 w-3" />,
  ADMIN: <Shield className="h-3 w-3" />,
  MEMBER: <User className="h-3 w-3" />,
  VIEWER: <User className="h-3 w-3" />,
}

const roleColors: Record<WorkspaceRole, string> = {
  OWNER: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  ADMIN: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  MEMBER: "bg-green-500/10 text-green-600 border-green-500/20",
  VIEWER: "bg-gray-500/10 text-gray-600 border-gray-500/20",
}

function getInitials(name: string | null, email: string): string {
  if (name) {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }
  return email.slice(0, 2).toUpperCase()
}

export function ManageMembersDialog({
  open,
  onOpenChange,
  workspaceId,
  workspaceName,
  userRole,
  onAddMember,
}: ManageMembersDialogProps) {
  const { members, fetchMembers, removeMember, updateMemberRole, isLoading } = useWorkspaceStore()
  const [memberToRemove, setMemberToRemove] = React.useState<WorkspaceMember | null>(null)
  const [isRemoving, setIsRemoving] = React.useState(false)

  // Fetch members when dialog opens
  React.useEffect(() => {
    if (open) {
      fetchMembers(workspaceId)
    }
  }, [open, workspaceId, fetchMembers])

  const canManageMembers = userRole === "OWNER" || userRole === "ADMIN"

  const handleRoleChange = async (member: WorkspaceMember, newRole: WorkspaceRole) => {
    try {
      await updateMemberRole(workspaceId, member.userId, newRole)
      toast.success("Role updated", {
        description: `${member.user.name || member.user.email}'s role has been updated to ${newRole.toLowerCase()}.`,
      })
    } catch (error: any) {
      toast.error("Failed to update role", {
        description: error.message || "Please try again.",
      })
    }
  }

  const handleRemoveMember = async () => {
    if (!memberToRemove) return

    setIsRemoving(true)
    try {
      await removeMember(workspaceId, memberToRemove.userId)
      toast.success("Member removed", {
        description: `${memberToRemove.user.name || memberToRemove.user.email} has been removed from the workspace.`,
      })
      setMemberToRemove(null)
    } catch (error: any) {
      toast.error("Failed to remove member", {
        description: error.message || "Please try again.",
      })
    } finally {
      setIsRemoving(false)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Manage Members
            </DialogTitle>
            <DialogDescription>
              {workspaceName} • {members.length} member{members.length !== 1 ? "s" : ""}
            </DialogDescription>
          </DialogHeader>

          {canManageMembers && (
            <Button
              variant="outline"
              className="w-full"
              onClick={onAddMember}
            >
              <UserPlus className="mr-2 h-4 w-4" />
              Invite Member
            </Button>
          )}

          <ScrollArea className="max-h-[400px] pr-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-2">
                {members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center gap-3 p-3 rounded-lg border bg-card"
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={member.user.image || undefined} />
                      <AvatarFallback>
                        {getInitials(member.user.name, member.user.email)}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">
                          {member.user.name || member.user.email}
                        </span>
                        <Badge
                          variant="outline"
                          className={cn("text-[10px] px-1.5 py-0 gap-1", roleColors[member.role])}
                        >
                          {roleIcons[member.role]}
                          {member.role.toLowerCase()}
                        </Badge>
                      </div>
                      {member.user.name && (
                        <div className="text-sm text-muted-foreground truncate">
                          {member.user.email}
                        </div>
                      )}
                    </div>

                    {canManageMembers && member.role !== "OWNER" && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {userRole === "OWNER" && (
                            <>
                              <DropdownMenuItem
                                onClick={() => handleRoleChange(member, "ADMIN")}
                                disabled={member.role === "ADMIN"}
                              >
                                <Shield className="mr-2 h-4 w-4" />
                                Make Admin
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleRoleChange(member, "MEMBER")}
                                disabled={member.role === "MEMBER"}
                              >
                                <User className="mr-2 h-4 w-4" />
                                Make Member
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleRoleChange(member, "VIEWER")}
                                disabled={member.role === "VIEWER"}
                              >
                                <User className="mr-2 h-4 w-4" />
                                Make Viewer
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                            </>
                          )}
                          <DropdownMenuItem
                            onClick={() => setMemberToRemove(member)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Remove
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!memberToRemove} onOpenChange={() => setMemberToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {memberToRemove?.user.name || memberToRemove?.user.email} from this workspace?
              They will lose access to all resources in this workspace.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveMember}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isRemoving}
            >
              {isRemoving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Remove Member
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
