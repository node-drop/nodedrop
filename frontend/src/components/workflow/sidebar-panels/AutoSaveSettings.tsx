import { memo, useState, useEffect } from 'react'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Save, Clock, Bell, Play } from 'lucide-react'
import { userService, UserPreferences } from '@/services/user'
import { toast } from 'sonner'

interface AutoSaveSettingsProps {
  readOnly?: boolean
}

export const AutoSaveSettings = memo(function AutoSaveSettings({
  readOnly = false
}: AutoSaveSettingsProps) {
  const [preferences, setPreferences] = useState<UserPreferences['autoSave']>({
    enabled: true,
    debounceMs: 5000,
    notifyOnSave: false,
    saveOnExecute: true,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  // Load preferences on mount
  useEffect(() => {
    loadPreferences()
  }, [])

  const loadPreferences = async () => {
    try {
      setIsLoading(true)
      const userPrefs = await userService.getPreferences()
      if (userPrefs.autoSave) {
        setPreferences({
          enabled: userPrefs.autoSave.enabled ?? true,
          debounceMs: userPrefs.autoSave.debounceMs ?? 5000,
          notifyOnSave: userPrefs.autoSave.notifyOnSave ?? false,
          saveOnExecute: userPrefs.autoSave.saveOnExecute ?? true,
        })
      }
    } catch (error) {
      console.error('Failed to load auto-save preferences:', error)
      toast.error('Failed to load auto-save settings')
    } finally {
      setIsLoading(false)
    }
  }

  const savePreferences = async (newPrefs: UserPreferences['autoSave']) => {
    try {
      setIsSaving(true)
      await userService.patchPreferences({
        autoSave: newPrefs
      })
      toast.success('Auto-save settings updated')
    } catch (error) {
      console.error('Failed to save auto-save preferences:', error)
      toast.error('Failed to save auto-save settings')
    } finally {
      setIsSaving(false)
    }
  }

  const handleEnabledChange = (checked: boolean) => {
    const newPrefs = { ...preferences, enabled: checked }
    setPreferences(newPrefs)
    savePreferences(newPrefs)
  }

  const handleDebounceChange = (value: string) => {
    const numValue = parseInt(value, 10)
    if (!isNaN(numValue) && numValue >= 1000 && numValue <= 60000) {
      const newPrefs = { ...preferences, debounceMs: numValue }
      setPreferences(newPrefs)
      savePreferences(newPrefs)
    }
  }

  const handleNotifyChange = (checked: boolean) => {
    const newPrefs = { ...preferences, notifyOnSave: checked }
    setPreferences(newPrefs)
    savePreferences(newPrefs)
  }

  const handleSaveOnExecuteChange = (checked: boolean) => {
    const newPrefs = { ...preferences, saveOnExecute: checked }
    setPreferences(newPrefs)
    savePreferences(newPrefs)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4 text-sm text-muted-foreground">
        Loading settings...
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h4 className="text-xs font-semibold flex items-center gap-2">
          <Save className="w-3.5 h-3.5" />
          Auto-Save Settings
        </h4>
        <p className="text-xs text-muted-foreground">
          Configure automatic workflow saving behavior
        </p>
      </div>

      {/* Enable Auto-Save */}
      <div className="space-y-3 p-3 border rounded-lg bg-muted/30">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1 flex-1">
            <Label htmlFor="auto-save-enabled" className="flex items-center gap-2 text-xs font-medium cursor-pointer">
              <Save className="w-3.5 h-3.5" />
              Enable Auto-Save
            </Label>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Automatically save workflow changes after a period of inactivity
            </p>
          </div>
          <Switch
            id="auto-save-enabled"
            checked={preferences.enabled}
            onCheckedChange={handleEnabledChange}
            disabled={readOnly || isSaving}
            className="flex-shrink-0"
          />
        </div>
      </div>

      {/* Debounce Delay */}
      {preferences.enabled && (
        <div className="space-y-2">
          <Label htmlFor="auto-save-delay" className="flex items-center gap-2 text-xs font-medium">
            <Clock className="w-3.5 h-3.5" />
            Save Delay (milliseconds)
          </Label>
          <p className="text-xs text-muted-foreground leading-relaxed mb-2">
            Time to wait after last change before auto-saving (1000-60000ms)
          </p>
          <Input
            id="auto-save-delay"
            type="number"
            min={1000}
            max={60000}
            step={1000}
            value={preferences.debounceMs}
            onChange={(e) => handleDebounceChange(e.target.value)}
            onBlur={(e) => handleDebounceChange(e.target.value)}
            disabled={readOnly || isSaving}
            className="text-xs"
          />
          <p className="text-xs text-muted-foreground italic">
            Current: {(preferences.debounceMs! / 1000).toFixed(1)} seconds
          </p>
        </div>
      )}

      {/* Notify on Save */}
      {preferences.enabled && (
        <div className="space-y-3 p-3 border rounded-lg bg-muted/30">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1 flex-1">
              <Label htmlFor="auto-save-notify" className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                <Bell className="w-3.5 h-3.5" />
                Show Save Notifications
              </Label>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Display a toast notification when auto-save completes
              </p>
            </div>
            <Switch
              id="auto-save-notify"
              checked={preferences.notifyOnSave}
              onCheckedChange={handleNotifyChange}
              disabled={readOnly || isSaving}
              className="flex-shrink-0"
            />
          </div>
        </div>
      )}

      {/* Save on Execute */}
      {preferences.enabled && (
        <div className="space-y-3 p-3 border rounded-lg bg-muted/30">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1 flex-1">
              <Label htmlFor="auto-save-execute" className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                <Play className="w-3.5 h-3.5" />
                Save Before Execution
              </Label>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Automatically save workflow before executing it
              </p>
            </div>
            <Switch
              id="auto-save-execute"
              checked={preferences.saveOnExecute}
              onCheckedChange={handleSaveOnExecuteChange}
              disabled={readOnly || isSaving}
              className="flex-shrink-0"
            />
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className="p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <p className="text-xs text-blue-900 dark:text-blue-100 leading-relaxed">
          <strong>Note:</strong> Auto-save only saves to the database. Git commits remain manual for better version control.
        </p>
      </div>
    </div>
  )
})
