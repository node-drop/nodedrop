/**
 * WorkspacePage Component
 * 
 * Dedicated dashboard for managing the current workspace.
 * Shows workspace details, members, usage, and settings.
 */
import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useWorkspace } from "@/contexts/WorkspaceContext"
import { useWorkspaceStore } from "@/stores/workspace"
import {
  Building2,
  Users,
  Settings,
  BarChart3,
  UserPlus,
  Crown,
  Shield,
  User,
  Eye,
  Workflow,
  Key,
  Zap,
  Loader2,
  Calendar,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { WorkspaceRole, WorkspaceMember } from "@/types/workspace"
import { InviteMemberModal, WorkspaceSettingsModal } from "@/components/workspace"
import { useEffect } from "react"
import { format } from "date-fns"

const roleConfig: Record<WorkspaceRole, { icon: React.ElementType; label: string; color: string }> = {
  OWNER: { icon: Crown, label: "Owner", color: "text-amber-600 bg-amber-50 border-amber-200" },
  ADMIN: { icon: Shield, label: "Admin", color: "text-blue-600 bg-blue-50 border-blue-200" },
  MEMBER: { icon: User, label: "Member", color: "text-green-600 bg-green-50 border-green-200" },
  VIEWER: { icon: Eye, label: "Viewer", color: "text-gray-600 bg-gray-50 border-gray-200" },
}

const planConfig: Record<string, { label: string; color: string }> = {
  free: { label: "Free", color: "bg-gray-100 text-gray-700" },
  pro: { label: "Pro", color: "bg-blue-100 text-blue-700" },
  enterprise: { label: "Enterprise", color: "bg-purple-100 text-purple-700" },
}

interface UsageItemProps {
  icon: React.ReactNode
  label: string
  current: number
  max: number
  percentage: number
}

function UsageItem({ icon, label, current, max, percentage }: UsageItemProps) {
  const isUnlimited = max === -1
  const isWarning = !isUnlimited && percentage >= 80
  const isCritical = !isUnlimited && percentage >= 95

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          {icon}
          <span>{label}</span>
        </div>
        <span className={cn(
          "font-medium",
          isCritical && "text-red-600",
          isWarning && !isCritical && "text-amber-600"
        )}>
          {current} / {isUnlimited ? "∞" : max}
        </span>
      </div>
      <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
        <div 
          className={cn(
            "h-full transition-all",
            isCritical ? "bg-red-500" : isWarning ? "bg-amber-500" : "bg-primary"
          )}
          style={{ width: `${Math.min(isUnlimited ? 0 : percentage, 100)}%` }}
        />
      </div>
    </div>
  )
}

function MemberCard({ member }: { member: WorkspaceMember }) {
  const config = roleConfig[member.role]
  const RoleIcon = config.icon

  return (
    <div className="flex items-center justify-between p-4 border rounded-lg">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
          {member.user.image ? (
            <img src={member.user.image} alt={member.user.name || ""} className="h-10 w-10 rounded-full" />
          ) : (
            <span className="text-sm font-medium">
              {(member.user.name || member.user.email).charAt(0).toUpperCase()}
            </span>
          )}
        </div>
        <div>
          <p className="font-medium">{member.user.name || "Unnamed"}</p>
          <p className="text-sm text-muted-foreground">{member.user.email}</p>
        </div>
      </div>
      <Badge variant="outline" className={cn("gap-1", config.color)}>
        <RoleIcon className="h-3 w-3" />
        {config.label}
      </Badge>
    </div>
  )
}

export function WorkspacePage() {
  const { currentWorkspace, usage, isLoading, refreshUsage } = useWorkspace()
  const { members, fetchMembers } = useWorkspaceStore()
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [activeTab, setActiveTab] = useState("overview")

  useEffect(() => {
    if (currentWorkspace?.id) {
      fetchMembers(currentWorkspace.id)
      refreshUsage()
    }
  }, [currentWorkspace?.id, fetchMembers, refreshUsage])

  if (isLoading || !currentWorkspace) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="text-muted-foreground">Loading workspace...</span>
        </div>
      </div>
    )
  }

  const userRole = currentWorkspace.userRole
  const canManage = userRole === "OWNER" || userRole === "ADMIN"
  const plan = planConfig[currentWorkspace.plan] || planConfig.free

  return (
    <div className="flex flex-1 flex-col h-full overflow-auto">
      <div className="max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-lg bg-primary/10 flex items-center justify-center">
              <Building2 className="h-7 w-7 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold">{currentWorkspace.name}</h1>
                <Badge className={plan.color}>{plan.label}</Badge>
                {userRole && (
                  <Badge variant="outline" className={roleConfig[userRole].color}>
                    {roleConfig[userRole].label}
                  </Badge>
                )}
              </div>
              <p className="text-muted-foreground mt-1">
                {currentWorkspace.description || "No description"}
              </p>
            </div>
          </div>
          {canManage && (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowInviteModal(true)}>
                <UserPlus className="h-4 w-4 mr-2" />
                Invite
              </Button>
              <Button variant="outline" onClick={() => setShowSettingsModal(true)}>
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
            </div>
          )}
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="overview" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="members" className="gap-2">
              <Users className="h-4 w-4" />
              Members ({members.length})
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Usage Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Usage</CardTitle>
                  <CardDescription>Current resource usage for this workspace</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {usage ? (
                    <>
                      <UsageItem
                        icon={<Workflow className="h-4 w-4" />}
                        label="Workflows"
                        current={usage.workflowCount}
                        max={usage.limits.maxWorkflows}
                        percentage={usage.percentages.workflows}
                      />
                      <UsageItem
                        icon={<Key className="h-4 w-4" />}
                        label="Credentials"
                        current={usage.credentialCount}
                        max={usage.limits.maxCredentials}
                        percentage={usage.percentages.credentials}
                      />
                      <UsageItem
                        icon={<Users className="h-4 w-4" />}
                        label="Members"
                        current={usage.memberCount}
                        max={usage.limits.maxMembers}
                        percentage={usage.percentages.members}
                      />
                      <UsageItem
                        icon={<Zap className="h-4 w-4" />}
                        label="Executions (this month)"
                        current={usage.executionsThisMonth}
                        max={usage.limits.maxExecutionsPerMonth}
                        percentage={usage.percentages.executions}
                      />
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">Loading usage data...</p>
                  )}
                </CardContent>
              </Card>

              {/* Workspace Info Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Workspace Info</CardTitle>
                  <CardDescription>Details about this workspace</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Slug</span>
                    <code className="text-sm bg-muted px-2 py-1 rounded">{currentWorkspace.slug}</code>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Plan</span>
                    <Badge className={plan.color}>{plan.label}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Owner</span>
                    <span className="text-sm">{currentWorkspace.owner?.email || "Unknown"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Created</span>
                    <span className="text-sm flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(currentWorkspace.createdAt), "MMM d, yyyy")}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Your Role</span>
                    {userRole && (
                      <Badge variant="outline" className={roleConfig[userRole].color}>
                        {roleConfig[userRole].label}
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Stats */}
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                      <Workflow className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{usage?.workflowCount || 0}</p>
                      <p className="text-sm text-muted-foreground">Workflows</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
                      <Users className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{members.length}</p>
                      <p className="text-sm text-muted-foreground">Members</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center">
                      <Key className="h-5 w-5 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{usage?.credentialCount || 0}</p>
                      <p className="text-sm text-muted-foreground">Credentials</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
                      <Zap className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{usage?.executionsThisMonth || 0}</p>
                      <p className="text-sm text-muted-foreground">Executions</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Members Tab */}
          <TabsContent value="members" className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Team Members</CardTitle>
                  <CardDescription>People with access to this workspace</CardDescription>
                </div>
                {canManage && (
                  <Button onClick={() => setShowInviteModal(true)}>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Invite Member
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {members.length > 0 ? (
                    members.map((member) => (
                      <MemberCard key={member.id} member={member} />
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No members found
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Modals */}
      <InviteMemberModal
        open={showInviteModal}
        onOpenChange={setShowInviteModal}
        workspaceId={currentWorkspace.id}
        workspaceName={currentWorkspace.name}
        onSuccess={() => {
          fetchMembers(currentWorkspace.id)
        }}
      />
      <WorkspaceSettingsModal
        open={showSettingsModal}
        onOpenChange={setShowSettingsModal}
        workspace={currentWorkspace}
      />
    </div>
  )
}
