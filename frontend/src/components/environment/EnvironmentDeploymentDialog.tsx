import { Button } from '@/components/ui/button'
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
import { Textarea } from '@/components/ui/textarea'
import { useEnvironmentStore } from '@/stores/environment'
import {
    EnvironmentType,
    getEnvironmentColor,
    getEnvironmentIcon,
    getEnvironmentLabel,
    type DeployEnvironmentInput,
} from '@/types/environment'
import { AlertCircle, ArrowRight, Check, FlaskConical, Loader2, Package, Rocket, Wrench } from 'lucide-react'
import { useState } from 'react'

const EnvironmentIcon = ({ iconName, className = "w-4 h-4" }: { iconName: string, className?: string }) => {
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

interface EnvironmentDeploymentDialogProps {
  workflowId: string
  sourceEnvironment: EnvironmentType
  targetEnvironment: EnvironmentType
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function EnvironmentDeploymentDialog({
  workflowId,
  sourceEnvironment,
  targetEnvironment,
  open,
  onOpenChange,
  onSuccess,
}: EnvironmentDeploymentDialogProps) {
  const { deployToEnvironment, isLoading } = useEnvironmentStore()
  
  const [formData, setFormData] = useState<Partial<DeployEnvironmentInput>>({
    sourceEnvironment,
    targetEnvironment,
    version: '',
    deploymentNote: '',
    copyVariables: true,
    activateAfterDeploy: false,
  })

  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleDeploy = async () => {
    setError(null)
    setSuccess(false)

    try {
      await deployToEnvironment(workflowId, formData as DeployEnvironmentInput)
      setSuccess(true)
      setTimeout(() => {
        onOpenChange(false)
        onSuccess?.()
        setFormData({
          sourceEnvironment,
          targetEnvironment,
          version: '',
          deploymentNote: '',
          copyVariables: true,
          activateAfterDeploy: false,
        })
        setSuccess(false)
      }, 1500)
    } catch (err: any) {
      setError(err.message || 'Failed to deploy to environment')
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] bg-background">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <span>Deploy Workflow</span>
            {success && <Check className="w-5 h-5 text-green-600 dark:text-green-400" />}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Deploy your workflow from one environment to another
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Environment Flow */}
          <div className="flex items-center justify-center gap-4">
            <div
              className={`flex items-center gap-2 px-4 py-3 rounded-lg border-2 ${getEnvironmentBgColor(
                sourceEnvironment
              )}`}
            >
              <EnvironmentIcon iconName={getEnvironmentIcon(sourceEnvironment)} className="w-6 h-6" />
              <div>
                <div className="text-xs font-medium opacity-70">From</div>
                <div className="font-semibold">{getEnvironmentLabel(sourceEnvironment)}</div>
              </div>
            </div>

            <ArrowRight className="w-6 h-6 text-muted-foreground" />

            <div
              className={`flex items-center gap-2 px-4 py-3 rounded-lg border-2 ${getEnvironmentBgColor(
                targetEnvironment
              )}`}
            >
              <EnvironmentIcon iconName={getEnvironmentIcon(targetEnvironment)} className="w-6 h-6" />
              <div>
                <div className="text-xs font-medium opacity-70">To</div>
                <div className="font-semibold">{getEnvironmentLabel(targetEnvironment)}</div>
              </div>
            </div>
          </div>

          {/* Deployment Options */}
          <div className="space-y-4">
            {/* Version */}
            <div className="space-y-2">
              <Label htmlFor="version">
                Version <span className="text-xs text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="version"
                placeholder="e.g., 1.2.0"
                value={formData.version}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, version: e.target.value }))
                }
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground">
                Leave empty to auto-increment from current version
              </p>
            </div>

            {/* Deployment Note */}
            <div className="space-y-2">
              <Label htmlFor="deploymentNote">
                Deployment Note <span className="text-xs text-muted-foreground">(optional)</span>
              </Label>
              <Textarea
                id="deploymentNote"
                placeholder="Describe what's being deployed..."
                rows={3}
                value={formData.deploymentNote}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, deploymentNote: e.target.value }))
                }
                disabled={isLoading}
              />
            </div>

            {/* Options */}
            <div className="space-y-3 pt-2">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={formData.copyVariables}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, copyVariables: e.target.checked }))
                  }
                  disabled={isLoading}
                  className="w-4 h-4 rounded border-border"
                />
                <span className="text-sm font-medium group-hover:text-foreground">Copy environment variables</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={formData.activateAfterDeploy}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      activateAfterDeploy: e.target.checked,
                    }))
                  }
                  disabled={isLoading}
                  className="w-4 h-4 rounded border-border"
                />
                <span className="text-sm font-medium group-hover:text-foreground">Activate after deployment</span>
              </label>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-700 dark:text-red-300">Deployment Failed</p>
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
              <Check className="w-5 h-5 text-green-600 dark:text-green-400" />
              <p className="text-sm font-medium text-green-700 dark:text-green-300">Deployment successful!</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button onClick={handleDeploy} disabled={isLoading || success}>
            {isLoading ? (
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
              'Deploy Now'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
