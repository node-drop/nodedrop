import { Alert, AlertDescription } from '@/components/ui/alert'
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
import { Textarea } from '@/components/ui/textarea'
import { environmentService } from '@/services/environment'
import { useEnvironmentStore } from '@/stores/environment'
import { EnvironmentType, getEnvironmentLabel } from '@/types/environment'
import { AlertCircle, Loader2, RefreshCw } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

interface UpdateEnvironmentDialogProps {
  workflowId: string
  environment: EnvironmentType
  currentVersion: string
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export function UpdateEnvironmentDialog({
  workflowId,
  environment,
  currentVersion,
  isOpen,
  onClose,
  onSuccess,
}: UpdateEnvironmentDialogProps) {
  const [isUpdating, setIsUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [version, setVersion] = useState('')
  const [deploymentNote, setDeploymentNote] = useState('')
  const [copyVariables, setCopyVariables] = useState(false)
  const { loadSummaries } = useEnvironmentStore()

  const handleUpdate = async () => {
    try {
      setIsUpdating(true)
      setError(null)

      await environmentService.updateEnvironment(workflowId, environment, {
        version: version || undefined,
        deploymentNote: deploymentNote || undefined,
        copyVariables,
      })

      // Reload summaries
      await loadSummaries(workflowId)

      // Show success message
      toast.success(
        version 
          ? `${getEnvironmentLabel(environment)} updated successfully - Version ${version} deployed`
          : `${getEnvironmentLabel(environment)} updated successfully`
      )

      // Call success callback
      onSuccess?.()

      // Reset form and close
      setVersion('')
      setDeploymentNote('')
      setCopyVariables(false)
      onClose()
    } catch (err: any) {
      console.error('Failed to update environment:', err)
      const errorMessage = err.response?.data?.error || err.message || 'Failed to update environment'
      setError(errorMessage)
      toast.error(`Failed to update ${getEnvironmentLabel(environment)}: ${errorMessage}`)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleClose = () => {
    if (!isUpdating) {
      setVersion('')
      setDeploymentNote('')
      setCopyVariables(false)
      setError(null)
      onClose()
    }
  }

  const getNextVersion = () => {
    const parts = currentVersion.split('.')
    if (parts.length === 3) {
      const [major, minor, patch] = parts.map(Number)
      return `${major}.${minor}.${patch + 1}`
    }
    return currentVersion
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5" />
            Update {getEnvironmentLabel(environment)}
          </DialogTitle>
          <DialogDescription>
            Sync this environment with your current workflow changes
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Current Version Info */}
          <div className="p-3 bg-muted rounded-lg">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Current version:</span>
              <span className="font-mono font-medium">{currentVersion}</span>
            </div>
          </div>

          {/* Version Input */}
          <div className="space-y-2">
            <Label htmlFor="version">
              New Version <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="version"
              placeholder={`Auto: ${getNextVersion()}`}
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              disabled={isUpdating}
            />
            <p className="text-xs text-muted-foreground">
              Leave empty to auto-increment version
            </p>
          </div>

          {/* Copy Variables Checkbox */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="copyVariables"
              checked={copyVariables}
              onCheckedChange={(checked) => setCopyVariables(checked as boolean)}
              disabled={isUpdating}
            />
            <Label
              htmlFor="copyVariables"
              className="text-sm font-normal cursor-pointer"
            >
              Copy workflow variables to environment
            </Label>
          </div>

          {/* Deployment Note */}
          <div className="space-y-2">
            <Label htmlFor="deploymentNote">
              Deployment Note <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              id="deploymentNote"
              placeholder="e.g., Added new webhook trigger, fixed validation bug..."
              value={deploymentNote}
              onChange={(e) => setDeploymentNote(e.target.value)}
              disabled={isUpdating}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isUpdating}>
            Cancel
          </Button>
          <Button onClick={handleUpdate} disabled={isUpdating}>
            {isUpdating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Updating...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Update Environment
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
