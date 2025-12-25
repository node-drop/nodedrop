import { memo, useState, useEffect } from 'react'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { userService, UserPreferences } from '@/services/user'
import { toast } from 'sonner'

/**
 * Auto-Save Settings for Left Sidebar
 * Simplified version that matches the sidebar style
 */
export const AutoSaveSettingsSidebar = memo(function AutoSaveSettingsSidebar() {
  const [preferences, setPreferences] = useState<UserPreferences['autoSave']>({
    enabled: true,
    debounceMs: 5000,
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
          saveOnExecute: userPrefs.autoSave.saveOnExecute ?? true,
        })
      }
    } catch (error) {
      console.error('Failed to load auto-save preferences:', error)
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
      toast.error('Failed to save settings')
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

  const handleSaveOnExecuteChange = (checked: boolean) => {
    const newPrefs = { ...preferences, saveOnExecute: checked }
    setPreferences(newPrefs)
    savePreferences(newPrefs)
  }

  if (isLoading) {
    return (
      <div className="text-xs text-muted-foreground">
        Loading...
      </div>
    )
  }

  return (
    <div className="space-y-2 text-sm">
      {/* Enable Auto-Save */}
      <div className="flex justify-between items-center">
        <span>Enable Auto-Save</span>
        <Switch 
          checked={preferences?.enabled ?? true} 
          onCheckedChange={handleEnabledChange}
          disabled={isSaving}
        />
      </div>

      {/* Save Delay */}
      {preferences?.enabled && (
        <div className="space-y-1.5 pt-2 border-t">
          <Label htmlFor="auto-save-delay" className="text-xs text-muted-foreground">
            Save Delay (seconds)
          </Label>
          <Input
            id="auto-save-delay"
            type="number"
            min={1}
            max={60}
            step={1}
            value={((preferences?.debounceMs ?? 5000) / 1000)}
            onChange={(e) => handleDebounceChange((parseInt(e.target.value) * 1000).toString())}
            onBlur={(e) => handleDebounceChange((parseInt(e.target.value) * 1000).toString())}
            disabled={isSaving}
            className="h-8 text-xs"
          />
        </div>
      )}

      {/* Save Before Execute */}
      {preferences?.enabled && (
        <div className="flex justify-between items-center">
          <span>Save Before Execute</span>
          <Switch 
            checked={preferences?.saveOnExecute ?? true} 
            onCheckedChange={handleSaveOnExecuteChange}
            disabled={isSaving}
          />
        </div>
      )}

      {/* Info */}
      {preferences?.enabled && (
        <div className="pt-2 border-t">
          <p className="text-xs text-muted-foreground leading-relaxed">
            Auto-save only saves to database. Git commits remain manual.
          </p>
        </div>
      )}
    </div>
  )
})
