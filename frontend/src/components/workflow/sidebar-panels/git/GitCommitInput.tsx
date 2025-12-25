/**
 * GitCommitInput Component
 * 
 * Commit message input and commit action component.
 * Provides textarea for commit message with validation, character count,
 * and commit button with loading states.
 * 
 * Requirements: 2.2, 2.3
 */

import { memo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { GitCommit, Loader2, AlertCircle, Save } from 'lucide-react'
import { useGitStore } from '@/stores/git'
import { useWorkflowStore } from '@/stores/workflow'
import { useWorkflowOperations } from '@/hooks/workflow/useWorkflowOperations'
import { toast } from 'sonner'
import type { WorkflowData } from '@/services/git.service'

interface GitCommitInputProps {
  workflowId: string
  stagedChangesCount: number
  hasChanges: boolean
  readOnly?: boolean
}

/**
 * Maximum commit message length
 */
const MAX_MESSAGE_LENGTH = 500

/**
 * Minimum commit message length (after trimming)
 */
const MIN_MESSAGE_LENGTH = 1

export const GitCommitInput = memo(function GitCommitInput({
  workflowId,
  stagedChangesCount,
  hasChanges,
  readOnly = false
}: GitCommitInputProps) {
  const [commitMessage, setCommitMessage] = useState('')
  const [validationError, setValidationError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  
  const { commit, isCommitting, activeEnvironment } = useGitStore()
  const { workflow, isDirty } = useWorkflowStore()
  const { saveWorkflow } = useWorkflowOperations()

  /**
   * Validate commit message
   * Requirements: 2.3
   */
  const validateMessage = (message: string): string | null => {
    const trimmed = message.trim()
    
    if (trimmed.length < MIN_MESSAGE_LENGTH) {
      return 'Commit message cannot be empty'
    }
    
    if (message.length > MAX_MESSAGE_LENGTH) {
      return `Commit message cannot exceed ${MAX_MESSAGE_LENGTH} characters`
    }
    
    return null
  }

  /**
   * Handle commit message change
   */
  const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newMessage = e.target.value
    setCommitMessage(newMessage)
    
    // Clear validation error when user starts typing
    if (validationError) {
      setValidationError(null)
    }
  }

  /**
   * Handle commit action
   * Requirements: 2.2, 2.3
   */
  const handleCommit = async () => {
    // Validate message first
    const error = validateMessage(commitMessage)
    if (error) {
      setValidationError(error)
      return
    }

    // Validate workflow exists
    if (!workflow) {
      toast.error('No workflow loaded', {
        position: 'top-center',
      })
      return
    }

    // Validate workflow has required data
    if (!workflow.nodes || !workflow.connections) {
      toast.error('Workflow data is incomplete', {
        position: 'top-center',
      })
      return
    }

    try {
      // If workflow has unsaved changes, save it first
      if (isDirty) {
        setIsSaving(true)
        try {
          await saveWorkflow()
          toast.success('Workflow saved', {
            position: 'top-center',
          })
        } catch (saveError) {
          toast.error('Failed to save workflow', {
            position: 'top-center',
          })
          return
        } finally {
          setIsSaving(false)
        }
      }

      // Transform workflow to WorkflowData format for Git service
      const workflowData: WorkflowData = {
        id: workflow.id,
        name: workflow.name,
        description: workflow.description,
        category: workflow.category,
        tags: workflow.tags || [],
        nodes: workflow.nodes,
        connections: workflow.connections,
        triggers: [], // Triggers are managed separately in the workflow system
        settings: workflow.settings || {},
      }

      // Create commit
      await commit(workflowId, commitMessage.trim(), workflowData, activeEnvironment || undefined)
      
      // Clear message on success
      setCommitMessage('')
      setValidationError(null)
      
      toast.success('Changes committed successfully', {
        position: 'top-center',
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create commit'
      setValidationError(errorMessage)
      toast.error(errorMessage, {
        position: 'top-center',
      })
    }
  }

  /**
   * Handle Enter key to commit (Ctrl/Cmd + Enter)
   */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && canCommit) {
      e.preventDefault()
      handleCommit()
    }
  }

  // Calculate character count and validation state
  const messageLength = commitMessage.length
  const trimmedLength = commitMessage.trim().length
  const isMessageValid = trimmedLength >= MIN_MESSAGE_LENGTH && messageLength <= MAX_MESSAGE_LENGTH
  const isNearLimit = messageLength > MAX_MESSAGE_LENGTH * 0.9
  
  // Determine if commit button should be enabled
  const isProcessing = isCommitting || isSaving
  const canCommit = 
    hasChanges && // Must have Git changes
    isMessageValid && 
    !isProcessing && 
    !readOnly &&
    workflow !== null

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="commit-message" className="text-xs font-medium">
          Commit Message
        </Label>
        <Textarea
          id="commit-message"
          placeholder="Describe your changes..."
          value={commitMessage}
          onChange={handleMessageChange}
          onKeyDown={handleKeyDown}
          disabled={isCommitting || readOnly || !hasChanges}
          className="text-xs min-h-[80px] resize-none"
          maxLength={MAX_MESSAGE_LENGTH}
          aria-invalid={!!validationError}
          aria-describedby={validationError ? 'commit-message-error' : undefined}
        />
        
        {/* Character count and staged changes info */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {stagedChangesCount > 0 
              ? `${stagedChangesCount} change${stagedChangesCount !== 1 ? 's' : ''} staged`
              : 'No changes staged'}
          </span>
          <span className={isNearLimit ? 'text-orange-600 dark:text-orange-400 font-medium' : ''}>
            {messageLength}/{MAX_MESSAGE_LENGTH}
          </span>
        </div>
      </div>

      {/* Validation error display */}
      {validationError && (
        <Alert variant="destructive" className="py-2">
          <AlertCircle className="h-3 w-3" />
          <AlertDescription id="commit-message-error" className="text-xs">
            {validationError}
          </AlertDescription>
        </Alert>
      )}

      {/* Commit button */}
      <Button
        onClick={handleCommit}
        disabled={!canCommit}
        size="sm"
        className="w-full h-8 text-xs"
        title={
          !hasChanges 
            ? 'No changes to commit' 
            : !isMessageValid 
            ? 'Enter a valid commit message' 
            : isDirty
            ? 'Save and commit changes (Ctrl/Cmd + Enter)'
            : 'Commit changes (Ctrl/Cmd + Enter)'
        }
      >
        {isSaving ? (
          <>
            <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
            Saving...
          </>
        ) : isCommitting ? (
          <>
            <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
            Committing...
          </>
        ) : isDirty ? (
          <>
            <Save className="mr-1.5 h-3 w-3" />
            Save & Commit
          </>
        ) : (
          <>
            <GitCommit className="mr-1.5 h-3 w-3" />
            Commit Changes
          </>
        )}
      </Button>

      {/* Helper text */}
      {!hasChanges && (
        <p className="text-xs text-muted-foreground text-center">
          Make changes to your workflow to enable commits
        </p>
      )}
    </div>
  )
})
