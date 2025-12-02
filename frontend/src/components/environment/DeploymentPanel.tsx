import { Button } from '@/components/ui/button'
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card'
import { useEnvironmentStore } from '@/stores/environment'
import {
    EnvironmentType,
    getEnvironmentColor,
    getEnvironmentIcon,
    getEnvironmentLabel,
} from '@/types/environment'
import {
    ArrowRight,
    Clock,
    FlaskConical,
    GitBranch,
    Package,
    PlayCircle,
    Rocket,
    Wrench,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { ManualDeploymentDialog } from './ManualDeploymentDialog'

const EnvironmentIcon = ({
  iconName,
  className = 'w-4 h-4',
}: {
  iconName: string
  className?: string
}) => {
  switch (iconName) {
    case 'wrench':
      return <Wrench className={className} />
    case 'flask-conical':
      return <FlaskConical className={className} />
    case 'rocket':
      return <Rocket className={className} />
    default:
      return <Package className={className} />
  }
}

interface DeploymentPanelProps {
  workflowId: string
}

export function DeploymentPanel({ workflowId }: DeploymentPanelProps) {
  const { summaries, loadSummaries } = useEnvironmentStore()
  const [showDeployDialog, setShowDeployDialog] = useState(false)
  const [deploymentPair, setDeploymentPair] = useState<{
    source?: EnvironmentType
    target?: EnvironmentType
  }>({})

  useEffect(() => {
    if (workflowId) {
      loadSummaries(workflowId)
    }
  }, [workflowId, loadSummaries])

  const handleDeploy = (
    source?: EnvironmentType,
    target?: EnvironmentType
  ) => {
    setDeploymentPair({ source, target })
    setShowDeployDialog(true)
  }

  const getEnvironmentBgColor = (environment: EnvironmentType) => {
    const color = getEnvironmentColor(environment)
    switch (color) {
      case 'blue':
        return 'bg-blue-500/10 border-blue-500/30 text-blue-700 dark:text-blue-400'
      case 'yellow':
        return 'bg-yellow-500/10 border-yellow-500/30 text-yellow-700 dark:text-yellow-400'
      case 'green':
        return 'bg-green-500/10 border-green-500/30 text-green-700 dark:text-green-400'
      default:
        return 'bg-muted border-border text-foreground'
    }
  }

  const formatDate = (date?: Date | string) => {
    if (!date) return 'Never'
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // Quick deploy routes
  const deploymentRoutes = [
    {
      source: EnvironmentType.DEVELOPMENT,
      target: EnvironmentType.STAGING,
      label: 'Dev → Staging',
      description: 'Deploy to testing environment',
    },
    {
      source: EnvironmentType.STAGING,
      target: EnvironmentType.PRODUCTION,
      label: 'Staging → Prod',
      description: 'Release to production',
    },
    {
      source: EnvironmentType.DEVELOPMENT,
      target: EnvironmentType.PRODUCTION,
      label: 'Dev → Prod',
      description: 'Direct production deploy',
    },
  ]

  // Filter routes based on available environments
  const availableRoutes = deploymentRoutes.filter(
    (route) =>
      summaries.some((s) => s.environment === route.source) &&
      summaries.some((s) => s.environment === route.target)
  )

  return (
    <>
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <GitBranch className="w-5 h-5" />
            Manual Deployment
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Deploy workflows between environments with full control
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Environment Status */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {summaries.map((summary) => (
              <div
                key={summary.environment}
                className={`p-4 rounded-lg border-2 ${getEnvironmentBgColor(
                  summary.environment
                )}`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <EnvironmentIcon
                    iconName={getEnvironmentIcon(summary.environment)}
                    className="w-5 h-5"
                  />
                  <span className="font-semibold text-sm">
                    {getEnvironmentLabel(summary.environment)}
                  </span>
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Version:</span>
                    <span className="font-medium">v{summary.version}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Nodes:</span>
                    <span className="font-medium">{summary.nodeCount}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Status:</span>
                    <span
                      className={`font-medium ${
                        summary.active
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-muted-foreground'
                      }`}
                    >
                      {summary.active ? '● Active' : '○ Inactive'}
                    </span>
                  </div>
                  {summary.lastDeployment && (
                    <div className="flex items-center gap-1 mt-2 pt-2 border-t border-border/50">
                      <Clock className="w-3 h-3" />
                      <span className="text-muted-foreground text-xs">
                        {formatDate(summary.lastDeployment.deployedAt)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Quick Deploy Actions */}
          {availableRoutes.length > 0 && (
            <>
              <div className="border-t border-border pt-4">
                <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Rocket className="w-4 h-4" />
                  Quick Deploy Routes
                </h4>
                <div className="grid grid-cols-1 gap-2">
                  {availableRoutes.map((route) => {
                    const sourceEnv = summaries.find(
                      (s) => s.environment === route.source
                    )
                    const targetEnv = summaries.find(
                      (s) => s.environment === route.target
                    )

                    return (
                      <button
                        key={`${route.source}-${route.target}`}
                        onClick={() =>
                          handleDeploy(route.source, route.target)
                        }
                        className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors text-left group"
                      >
                        <div className="flex items-center gap-2 flex-1">
                          <div
                            className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium ${getEnvironmentBgColor(
                              route.source
                            )}`}
                          >
                            <EnvironmentIcon
                              iconName={getEnvironmentIcon(route.source)}
                              className="w-3.5 h-3.5"
                            />
                            <span>
                              {getEnvironmentLabel(route.source)}{' '}
                              <span className="text-muted-foreground">
                                v{sourceEnv?.version}
                              </span>
                            </span>
                          </div>

                          <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />

                          <div
                            className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium ${getEnvironmentBgColor(
                              route.target
                            )}`}
                          >
                            <EnvironmentIcon
                              iconName={getEnvironmentIcon(route.target)}
                              className="w-3.5 h-3.5"
                            />
                            <span>
                              {getEnvironmentLabel(route.target)}{' '}
                              <span className="text-muted-foreground">
                                v{targetEnv?.version}
                              </span>
                            </span>
                          </div>
                        </div>

                        <div className="text-xs text-muted-foreground hidden md:block">
                          {route.description}
                        </div>

                        <PlayCircle className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                      </button>
                    )
                  })}
                </div>
              </div>
            </>
          )}

          {/* Manual Deploy Button */}
          <div className="pt-2">
            <Button
              onClick={() => handleDeploy()}
              variant="outline"
              className="w-full"
            >
              <Package className="w-4 h-4 mr-2" />
              Custom Deployment
            </Button>
          </div>

          {/* Info Box */}
          <div className="p-3 bg-blue-500/5 border border-blue-500/20 rounded-lg">
            <p className="text-xs text-muted-foreground">
              <strong className="text-foreground">Deployment Options:</strong>{' '}
              Choose to copy settings and variables from the source environment.
              Enable auto-activate to make the workflow live immediately after
              deployment.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Manual Deployment Dialog */}
      <ManualDeploymentDialog
        workflowId={workflowId}
        open={showDeployDialog}
        onOpenChange={setShowDeployDialog}
        defaultSource={deploymentPair.source}
        defaultTarget={deploymentPair.target}
        onSuccess={() => {
          loadSummaries(workflowId)
        }}
      />
    </>
  )
}
