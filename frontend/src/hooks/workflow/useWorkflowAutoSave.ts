import { useEffect, useRef, useState, useCallback } from 'react';
import { useWorkflowStore } from '@/stores';
import { userService } from '@/services/user';
import { workflowService } from '@/services';
import { useAuthStore, useNodeTypes } from '@/stores';
import { extractTriggersFromNodes } from '@nodedrop/utils';

interface AutoSaveOptions {
  enabled?: boolean;
  debounceMs?: number;
  saveOnExecute?: boolean;
}

interface AutoSaveStatus {
  status: 'idle' | 'saving' | 'saved' | 'error';
  lastSaved: Date | null;
  error: string | null;
}

/**
 * Hook for automatic workflow saving
 * 
 * Features:
 * - Debounced auto-save after changes
 * - User-configurable settings from preferences
 * - Visual status feedback
 * - Error handling
 * 
 * @param options - Optional override for auto-save settings
 * @returns Auto-save status and control functions
 */
export function useWorkflowAutoSave(options?: AutoSaveOptions) {
  const { workflow, isDirty, isTitleDirty, saveTitle, setWorkflow, setDirty, workflowTitle } = useWorkflowStore();
  const { user } = useAuthStore();
  const { activeNodeTypes } = useNodeTypes();
  
  const [preferences, setPreferences] = useState<AutoSaveOptions>({
    enabled: options?.enabled ?? true,
    debounceMs: options?.debounceMs ?? 5000,
    saveOnExecute: options?.saveOnExecute ?? true,
  });
  
  const [status, setStatus] = useState<AutoSaveStatus>({
    status: 'idle',
    lastSaved: null,
    error: null,
  });

  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const lastWorkflowStateRef = useRef<string>('');
  const isLoadingPrefsRef = useRef<boolean>(false);

  // Silent save function (no toast notifications)
  const saveWorkflowSilently = useCallback(async () => {
    if (!workflow || !user) return false;

    try {
      // Save title changes first if needed
      if (isTitleDirty) {
        saveTitle();
      }

      // Build workflow data
      const triggers = extractTriggersFromNodes(workflow.nodes, activeNodeTypes);
      const workflowData = {
        name: workflowTitle || workflow.name,
        description: workflow.description,
        nodes: workflow.nodes,
        connections: workflow.connections,
        triggers: triggers,
        settings: workflow.settings,
        active: workflow.active,
        category: workflow.category || undefined,
        tags: workflow.tags,
        teamId: workflow.teamId !== undefined && workflow.teamId !== null ? workflow.teamId : undefined,
      };

      const isNewWorkflow = workflow.id === 'new' || !workflow.id;
      
      // Save workflow (create or update)
      const savedWorkflow = isNewWorkflow
        ? await workflowService.createWorkflow(workflowData)
        : await workflowService.updateWorkflow(workflow.id, workflowData);

      setWorkflow(savedWorkflow);
      setDirty(false);

      // Update URL for new workflows
      if (isNewWorkflow) {
        window.history.replaceState(
          null,
          '',
          `/workflows/${savedWorkflow.id}/edit`
        );
      }

      return true;
    } catch (error: any) {
      console.error('[AutoSave] Failed to save workflow:', error);
      throw error;
    }
  }, [workflow, user, isTitleDirty, saveTitle, workflowTitle, activeNodeTypes, setWorkflow, setDirty]);

  // Load user preferences on mount
  useEffect(() => {
    if (isLoadingPrefsRef.current) return;
    
    isLoadingPrefsRef.current = true;
    console.log('[AutoSave] Loading preferences...');
    userService.getPreferences()
      .then((prefs) => {
        console.log('[AutoSave] Preferences loaded:', prefs.autoSave);
        if (prefs.autoSave) {
          setPreferences({
            enabled: prefs.autoSave.enabled ?? true,
            debounceMs: prefs.autoSave.debounceMs ?? 5000,
            saveOnExecute: prefs.autoSave.saveOnExecute ?? true,
          });
        }
      })
      .catch((error) => {
        console.error('[AutoSave] Failed to load preferences:', error);
      })
      .finally(() => {
        isLoadingPrefsRef.current = false;
      });
  }, []);

  // Auto-save logic
  useEffect(() => {
    console.log('[AutoSave] Effect triggered:', {
      enabled: preferences.enabled,
      hasWorkflow: !!workflow,
      workflowId: workflow?.id,
      isDirty,
      isTitleDirty,
      debounceMs: preferences.debounceMs,
    });

    // Don't auto-save if disabled or no workflow
    if (!preferences.enabled) {
      console.log('[AutoSave] Disabled - skipping');
      return;
    }

    if (!workflow) {
      console.log('[AutoSave] No workflow - skipping');
      return;
    }

    if (workflow.id === 'new') {
      console.log('[AutoSave] New workflow - skipping');
      return;
    }

    // Don't auto-save if nothing changed
    const hasChanges = isDirty || isTitleDirty;
    if (!hasChanges) {
      console.log('[AutoSave] No changes detected - skipping');
      return;
    }

    // Check if workflow state actually changed (avoid unnecessary saves)
    const currentState = JSON.stringify({
      nodes: workflow.nodes,
      connections: workflow.connections,
      name: workflow.name,
      description: workflow.description,
      settings: workflow.settings,
    });

    if (currentState === lastWorkflowStateRef.current) {
      console.log('[AutoSave] State unchanged (same as last save) - skipping');
      return;
    }

    console.log('[AutoSave] ✅ Changes detected, starting debounce timer...', {
      debounceMs: preferences.debounceMs,
      isDirty,
      isTitleDirty,
    });

    // Clear existing timeout
    if (timeoutRef.current) {
      console.log('[AutoSave] Clearing previous timeout');
      clearTimeout(timeoutRef.current);
    }

    // Set status to idle (waiting for debounce)
    setStatus((prev) => ({ ...prev, status: 'idle' }));

    // Set new timeout for auto-save
    timeoutRef.current = setTimeout(async () => {
      console.log('[AutoSave] ⏰ Debounce complete, saving now...');
      try {
        setStatus((prev) => ({ ...prev, status: 'saving', error: null }));

        // Use silent save (no toast notifications)
        const success = await saveWorkflowSilently();
        console.log('[AutoSave] Save result:', success);

        if (success) {
          lastWorkflowStateRef.current = currentState;
          setStatus({
            status: 'saved',
            lastSaved: new Date(),
            error: null,
          });

          console.log('[AutoSave] ✅ Save successful');

          // Reset to idle after 3 seconds
          setTimeout(() => {
            setStatus((prev) => ({ ...prev, status: 'idle' }));
          }, 3000);
        } else {
          throw new Error('Save failed');
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Auto-save failed';
        console.error('[AutoSave] ❌ Error:', errorMessage);
        setStatus({
          status: 'error',
          lastSaved: null,
          error: errorMessage,
        });
      }
    }, preferences.debounceMs);

    return () => {
      if (timeoutRef.current) {
        console.log('[AutoSave] Cleanup: clearing timeout');
        clearTimeout(timeoutRef.current);
      }
    };
  }, [
    workflow,
    isDirty,
    isTitleDirty,
    preferences.enabled,
    preferences.debounceMs,
    saveWorkflowSilently,
  ]);

  // Manual save function
  const triggerSave = async () => {
    if (!workflow || workflow.id === 'new') {
      return false;
    }

    try {
      setStatus((prev) => ({ ...prev, status: 'saving', error: null }));
      // Use silent save for programmatic triggers
      const success = await saveWorkflowSilently();

      if (success) {
        const currentState = JSON.stringify({
          nodes: workflow.nodes,
          connections: workflow.connections,
          name: workflow.name,
          description: workflow.description,
          settings: workflow.settings,
        });
        lastWorkflowStateRef.current = currentState;

        setStatus({
          status: 'saved',
          lastSaved: new Date(),
          error: null,
        });

        return true;
      }

      return false;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Save failed';
      setStatus({
        status: 'error',
        lastSaved: null,
        error: errorMessage,
      });
      return false;
    }
  };

  return {
    status,
    preferences,
    triggerSave,
  };
}
