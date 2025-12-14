import { useWorkspace } from "@/contexts/WorkspaceContext"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Workflow, Key, Users, Zap } from "lucide-react"
import { cn } from "@/lib/utils"

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
      {!isUnlimited && (
        <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
          <div 
            className={cn(
              "h-full transition-all",
              isCritical ? "bg-red-500" : isWarning ? "bg-amber-500" : "bg-primary"
            )}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
      )}
    </div>
  )
}

export function WorkspaceUsageCard() {
  const { currentWorkspace, usage } = useWorkspace()

  if (!currentWorkspace || !usage) {
    return null
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Usage</CardTitle>
        <CardDescription>
          Current usage for {currentWorkspace.name}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
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
      </CardContent>
    </Card>
  )
}
