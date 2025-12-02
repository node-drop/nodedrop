import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useEnvironmentStore } from '@/stores/environment'
import { useWorkflowStore } from '@/stores/workflow'
import {
    EnvironmentType,
    getEnvironmentColor,
    getEnvironmentIcon,
    getEnvironmentLabel,
} from '@/types/environment'
import {
    AlertCircle,
    ArrowRight,
    Check,
    CheckCircle2,
    Copy,
    FileEdit,
    FlaskConical,
    Loader2,
    Package,
    PlayCircle,
    Rocket,
    Wrench,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

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
    case 'file-edit':
      return <FileEdit className={className} />
    default:
      return <Package className={className} />
  }
}

interface ManualDeploymentDialogProps {
  workflowId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
  defaultSource?: EnvironmentType
  defaultTarget?: EnvironmentType
}

export function ManualDeploymentDialog({
  workflowId,
  open,
  onOpenChange,
  onSuccess,
  defaultSource,
  defaultTarget,
}: ManualDeploymentDialogProps) {
  const { deployToEnvironment, summaries, loadSummaries, isLoading } =
    useEnvironmentStore()
  const { workflow } = useWorkflowStore()

  const [sourceEnvironment, setSourceEnvironment] = useState<
    EnvironmentType | 'CURRENT' | ''
  >(defaultSource || '')
  const [targetEnvironment, setTargetEnvironment] = useState<
    EnvironmentType | ''
  >(defaultTarget || '')
  const [version, setVersion] = useState('')
  const [deploymentNote, setDeploymentNote] = useState('')
  const [copySettings, setCopySettings] = useState(true)
  const [copyVariables, setCopyVariables] = useState(true)
  const [activateAfterDeploy, setActivateAfterDeploy] = useState(false)

  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isDeploying, setIsDeploying] = useState(false)

  useEffect(() => {
    if (workflowId && open) {
      loadSummaries(workflowId)
    }
  }, [workflowId, open, loadSummaries])

  useEffect(() => {
    if (defaultSource) setSourceEnvironment(defaultSource)
    if (defaultTarget) setTargetEnvironment(defaultTarget)
  }, [defaultSource, defaultTarget])

  const handleDeploy = async () => {
    if (!sourceEnvironment || !targetEnvironment) {
      setError('Please select both source and target environments')
      return
    }

    if (sourceEnvironment === targetEnvironment) {
      setError('Source and target environments must be different')
      return
    }

    setError(null)
    setSuccess(false)
    setIsDeploying(true)

    try {
      // If source is "CURRENT", we need to use updateEnvironment instead of deployToEnvironment
      if (sourceEnvironment === 'CURRENT') {
        // Deploy current workflow to target environment
        const { environmentService } = await import('@/services/environment')
        await environmentService.updateEnvironment(workflowId, targetEnvironment as EnvironmentType, {
          version: version || undefined,
          deploymentNote: deploymentNote || undefined,
          copyVariables,
        })
        
        // If activateAfterDeploy is true, activate the environment
        if (activateAfterDeploy) {
          await environmentService.activateEnvironment(workflowId, targetEnvironment as EnvironmentType)
        }
      } else {
        // Normal deployment between two environments
        await deployToEnvironment(workflowId, {
          sourceEnvironment: sourceEnvironment as EnvironmentType,
          targetEnvironment: targetEnvironment as EnvironmentType,
          version: version || undefined,
          deploymentNote: deploymentNote || undefined,
          copyVariables,
          activateAfterDeploy,
        })
      }

      // Reload summaries to get updated node counts and versions
      await loadSummaries(workflowId)

      setSuccess(true)

      // Show success toast
      const sourceLabel = sourceEnvironment === 'CURRENT' ? 'Current Workflow' : getEnvironmentLabel(sourceEnvironment as EnvironmentType)
      toast.success(
        `Deployed to ${getEnvironmentLabel(targetEnvironment as EnvironmentType)} from ${sourceLabel}${version ? ` (v${version})` : ''}`
      )

      setTimeout(() => {
        onOpenChange(false)
        onSuccess?.()
        // Reset form
        setSourceEnvironment(defaultSource || '')
        setTargetEnvironment(defaultTarget || '')
        setVersion('')
        setDeploymentNote('')
        setCopySettings(true)
        setCopyVariables(true)
        setActivateAfterDeploy(false)
        setSuccess(false)
      }, 2000)
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to deploy workflow'
      setError(errorMessage)
      toast.error(`Deployment failed: ${errorMessage}`)
    } finally {
      setIsDeploying(false)
    }
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

  const availableEnvironments = summaries.filter((s) => s.environment)
  const sourceEnv = summaries.find((s) => s.environment === sourceEnvironment)
  const targetEnv = summaries.find((s) => s.environment === targetEnvironment)

  const canDeploy =
    sourceEnvironment &&
    targetEnvironment &&
    sourceEnvironment !== targetEnvironment

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto bg-background">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <Package className="w-5 h-5" />
            <span>Manual Deployment</span>
            {success && (
              <Check className="w-5 h-5 text-green-600 dark:text-green-400" />
            )}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Deploy your workflow from one environment to another with full
            control over settings and variables
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Environment Selection */}
          <div className="grid grid-cols-2 gap-4">
            {/* Source Environment */}
            <div className="space-y-2">
              <Label htmlFor="source">Source Environment</Label>
              <Select
                value={sourceEnvironment}
                onValueChange={(value) =>
                  setSourceEnvironment(value as EnvironmentType | 'CURRENT')
                }
                disabled={isDeploying || isLoading}
              >
                <SelectTrigger
                  id="source"
                  className={
                    sourceEnvironment && sourceEnvironment !== 'CURRENT'
                      ? getEnvironmentBgColor(sourceEnvironment as EnvironmentType)
                      : sourceEnvironment === 'CURRENT'
                      ? 'bg-purple-500/10 border-purple-500/30 text-purple-700 dark:text-purple-400'
                      : ''
                  }
                >
                  <SelectValue placeholder="Select source" />
                </SelectTrigger>
                <SelectContent>
                  {/* Current Workflow Option */}
                  <SelectItem value="CURRENT">
                    <div className="flex items-center gap-2">
                      <FileEdit className="w-4 h-4" />
                      <span className="font-medium">Current Workflow</span>
                      <span className="text-xs text-muted-foreground">
                        (Working changes)
                      </span>
                    </div>
                  </SelectItem>
                  
                  {/* Existing Environments */}
                  {availableEnvironments.map((env) => (
                    <SelectItem key={env.environment} value={env.environment}>
                      <div className="flex items-center gap-2">
                        <EnvironmentIcon
                          iconName={getEnvironmentIcon(env.environment)}
                        />
                        <span>{getEnvironmentLabel(env.environment)}</span>
                        <span className="text-xs text-muted-foreground">
                          v{env.version}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {sourceEnvironment === 'CURRENT' && workflow && (
                <div className="text-xs text-muted-foreground space-y-0.5">
                  <div className="flex items-center gap-1">
                    <FileEdit className="w-3 h-3" />
                    <span>Current working version</span>
                  </div>
                  <div>Nodes: {workflow.nodes.length}</div>
                  {workflow.active && (
                    <div className="text-green-600 dark:text-green-400">
                      ● Active
                    </div>
                  )}
                </div>
              )}
              {sourceEnv && sourceEnvironment !== 'CURRENT' && (
                <div className="text-xs text-muted-foreground space-y-0.5">
                  <div>Version: {sourceEnv.version}</div>
                  <div>Nodes: {sourceEnv.nodeCount}</div>
                  {sourceEnv.active && (
                    <div className="text-green-600 dark:text-green-400">
                      ● Active
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Target Environment */}
            <div className="space-y-2">
              <Label htmlFor="target">Target Environment</Label>
              <Select
                value={targetEnvironment}
                onValueChange={(value) =>
                  setTargetEnvironment(value as EnvironmentType)
                }
                disabled={isDeploying || isLoading}
              >
                <SelectTrigger
                  id="target"
                  className={
                    targetEnvironment
                      ? getEnvironmentBgColor(targetEnvironment as EnvironmentType)
                      : ''
                  }
                >
                  <SelectValue placeholder="Select target" />
                </SelectTrigger>
                <SelectContent>
                  {availableEnvironments.map((env) => (
                    <SelectItem
                      key={env.environment}
                      value={env.environment}
                      disabled={env.environment === sourceEnvironment}
                    >
                      <div className="flex items-center gap-2">
                        <EnvironmentIcon
                          iconName={getEnvironmentIcon(env.environment)}
                        />
                        <span>{getEnvironmentLabel(env.environment)}</span>
                        <span className="text-xs text-muted-foreground">
                          v{env.version}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {targetEnv && (
                <div className="text-xs text-muted-foreground space-y-0.5">
                  <div>Current: v{targetEnv.version}</div>
                  <div>Nodes: {targetEnv.nodeCount}</div>
                  {targetEnv.active && (
                    <div className="text-green-600 dark:text-green-400">
                      ● Active
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Visual Flow */}
          {sourceEnvironment && targetEnvironment && (
            <div className="flex items-center justify-center gap-3 p-4 bg-muted/30 rounded-lg border border-border">
              <div
                className={`flex items-center gap-2 px-3 py-2 rounded-md border ${
                  sourceEnvironment === 'CURRENT'
                    ? 'bg-purple-500/10 border-purple-500/30 text-purple-700 dark:text-purple-400'
                    : getEnvironmentBgColor(sourceEnvironment as EnvironmentType)
                }`}
              >
                <EnvironmentIcon
                  iconName={
                    sourceEnvironment === 'CURRENT'
                      ? 'file-edit'
                      : getEnvironmentIcon(sourceEnvironment as EnvironmentType)
                  }
                  className="w-5 h-5"
                />
                <span className="font-semibold text-sm">
                  {sourceEnvironment === 'CURRENT'
                    ? 'Current Workflow'
                    : getEnvironmentLabel(sourceEnvironment as EnvironmentType)}
                </span>
              </div>

              <ArrowRight className="w-6 h-6 text-muted-foreground" />

              <div
                className={`flex items-center gap-2 px-3 py-2 rounded-md border ${getEnvironmentBgColor(
                  targetEnvironment as EnvironmentType
                )}`}
              >
                <EnvironmentIcon
                  iconName={getEnvironmentIcon(
                    targetEnvironment as EnvironmentType
                  )}
                  className="w-5 h-5"
                />
                <span className="font-semibold text-sm">
                  {getEnvironmentLabel(targetEnvironment as EnvironmentType)}
                </span>
              </div>
            </div>
          )}

          {/* Version */}
          <div className="space-y-2">
            <Label htmlFor="version" className="flex items-center gap-2">
              Version
              <span className="text-xs text-muted-foreground font-normal">
                (optional - auto-increments if empty)
              </span>
            </Label>
            <Input
              id="version"
              placeholder="e.g., 2.0.0"
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              disabled={isDeploying}
            />
            <p className="text-xs text-muted-foreground">
              Leave empty to auto-increment from{' '}
              {sourceEnv ? `v${sourceEnv.version}` : 'current version'}
            </p>
          </div>

          {/* Deployment Note */}
          <div className="space-y-2">
            <Label htmlFor="deploymentNote">Deployment Note</Label>
            <Textarea
              id="deploymentNote"
              placeholder="Describe what's being deployed and why..."
              rows={3}
              value={deploymentNote}
              onChange={(e) => setDeploymentNote(e.target.value)}
              disabled={isDeploying}
            />
          </div>

          {/* Deployment Options */}
          <div className="space-y-4 p-4 bg-muted/30 rounded-lg border border-border">
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              Deployment Options
            </h4>

            <div className="space-y-3">
              {/* Copy Settings */}
              <div className="flex items-start gap-3">
                <Checkbox
                  id="copySettings"
                  checked={copySettings}
                  onCheckedChange={(checked) =>
                    setCopySettings(checked as boolean)
                  }
                  disabled={isDeploying}
                  className="mt-1"
                />
                <div className="flex-1">
                  <label
                    htmlFor="copySettings"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    Copy workflow settings
                  </label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Include all workflow configuration and settings from source
                  </p>
                </div>
                <Copy className="w-4 h-4 text-muted-foreground" />
              </div>

              {/* Copy Variables */}
              <div className="flex items-start gap-3">
                <Checkbox
                  id="copyVariables"
                  checked={copyVariables}
                  onCheckedChange={(checked) =>
                    setCopyVariables(checked as boolean)
                  }
                  disabled={isDeploying}
                  className="mt-1"
                />
                <div className="flex-1">
                  <label
                    htmlFor="copyVariables"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    Copy environment variables
                  </label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Copy all environment-specific variables from source
                  </p>
                </div>
                <Copy className="w-4 h-4 text-muted-foreground" />
              </div>

              {/* Auto-activate */}
              <div className="flex items-start gap-3">
                <Checkbox
                  id="activateAfterDeploy"
                  checked={activateAfterDeploy}
                  onCheckedChange={(checked) =>
                    setActivateAfterDeploy(checked as boolean)
                  }
                  disabled={isDeploying}
                  className="mt-1"
                />
                <div className="flex-1">
                  <label
                    htmlFor="activateAfterDeploy"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    Auto-activate after deployment
                  </label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Automatically activate the workflow in the target
                    environment
                  </p>
                </div>
                <PlayCircle className="w-4 h-4 text-muted-foreground" />
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-700 dark:text-red-300">
                  Deployment Failed
                </p>
                <p className="text-sm text-red-600 dark:text-red-400">
                  {error}
                </p>
              </div>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
              <Check className="w-5 h-5 text-green-600 dark:text-green-400" />
              <div className="flex-1">
                <p className="text-sm font-medium text-green-700 dark:text-green-300">
                  Deployment Successful!
                </p>
                <p className="text-xs text-green-600 dark:text-green-400 mt-0.5">
                  Workflow has been deployed to{' '}
                  {targetEnvironment &&
                    getEnvironmentLabel(targetEnvironment as EnvironmentType)}
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isDeploying}
          >
            Cancel
          </Button>
          <Button
            onClick={handleDeploy}
            disabled={!canDeploy || isDeploying || success}
            className="min-w-[120px]"
          >
            {isDeploying ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Deploying...
              </>
            ) : success ? (
              <>
                <Check className="w-4 h-4 mr-2" />
                Deployed
              </>
            ) : (
              <>
                <Package className="w-4 h-4 mr-2" />
                Deploy Now
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
