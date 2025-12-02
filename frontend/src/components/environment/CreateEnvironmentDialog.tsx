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
    type CreateEnvironmentInput,
} from '@/types/environment'
import { AlertCircle, Check, FlaskConical, Info, Loader2, Package, Rocket, Wrench } from 'lucide-react'
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

interface CreateEnvironmentDialogProps {
  workflowId: string
  environment: EnvironmentType
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function CreateEnvironmentDialog({
  workflowId,
  environment,
  open,
  onOpenChange,
  onSuccess,
}: CreateEnvironmentDialogProps) {
  const { createEnvironment, isLoading } = useEnvironmentStore()
  
  const [formData, setFormData] = useState<Partial<CreateEnvironmentInput>>({
    environment,
    version: '1.0.0',
    deploymentNote: '',
  })

  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleCreate = async () => {
    setError(null)
    setSuccess(false)

    try {
      await createEnvironment(workflowId, formData as CreateEnvironmentInput)
      setSuccess(true)
      setTimeout(() => {
        onOpenChange(false)
        onSuccess?.()
        setFormData({
          environment,
          version: '1.0.0',
          deploymentNote: '',
        })
        setSuccess(false)
      }, 1500)
    } catch (err: any) {
      setError(err.message || 'Failed to create environment')
    }
  }

  const getEnvironmentBgColor = (env: EnvironmentType) => {
    const color = getEnvironmentColor(env)
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
      <DialogContent className="sm:max-w-[500px] bg-background">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <span>Create New Environment</span>
            {success && <Check className="w-5 h-5 text-green-600 dark:text-green-400" />}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Initialize a new environment from the current workflow state
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Environment Display */}
          <div className="flex justify-center">
            <div
              className={`flex items-center gap-3 px-6 py-4 rounded-lg border-2 ${getEnvironmentBgColor(
                environment
              )}`}
            >
              <EnvironmentIcon iconName={getEnvironmentIcon(environment)} className="w-8 h-8" />
              <div>
                <div className="text-sm font-medium opacity-70">Creating</div>
                <div className="text-xl font-bold">{getEnvironmentLabel(environment)}</div>
              </div>
            </div>
          </div>

          {/* Form Fields */}
          <div className="space-y-4">
            {/* Version */}
            <div className="space-y-2">
              <Label htmlFor="version">Initial Version</Label>
              <Input
                id="version"
                placeholder="e.g., 1.0.0"
                value={formData.version}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, version: e.target.value }))
                }
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground">
                Semantic versioning recommended (MAJOR.MINOR.PATCH)
              </p>
            </div>

            {/* Deployment Note */}
            <div className="space-y-2">
              <Label htmlFor="deploymentNote">
                Note <span className="text-xs text-muted-foreground">(optional)</span>
              </Label>
              <Textarea
                id="deploymentNote"
                placeholder="Describe this environment setup..."
                rows={3}
                value={formData.deploymentNote}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, deploymentNote: e.target.value }))
                }
                disabled={isLoading}
              />
            </div>

            {/* Info Box */}
            <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
              <div className="flex gap-2">
                <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-1">Note</p>
                  <p className="text-sm text-blue-600 dark:text-blue-400">
                    This will create a snapshot of your current workflow 
                    (nodes, connections, triggers, and settings) as the initial state for this environment.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-700 dark:text-red-300">Failed to Create Environment</p>
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
              <Check className="w-5 h-5 text-green-600 dark:text-green-400" />
              <p className="text-sm font-medium text-green-700 dark:text-green-300">
                Environment created successfully!
              </p>
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
          <Button onClick={handleCreate} disabled={isLoading || success || !formData.version}>
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : success ? (
              <>
                <Check className="w-4 h-4 mr-2" />
                Created
              </>
            ) : (
              'Create Environment'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
