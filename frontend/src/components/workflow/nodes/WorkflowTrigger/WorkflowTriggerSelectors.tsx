import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { workflowService } from '@/services/workflow'
import { TriggerOption, WorkflowOption } from '@/types/workflow'
import { RefreshCw } from 'lucide-react'
import { useEffect, useState } from 'react'

interface WorkflowSelectorProps {
  value?: string
  onChange: (value: string) => void
  disabled?: boolean
  error?: string
}

export function WorkflowSelector({ value, onChange, disabled, error }: WorkflowSelectorProps) {
  const [workflows, setWorkflows] = useState<WorkflowOption[]>([])
  const [loading, setLoading] = useState(false)

  const loadWorkflows = async () => {
    setLoading(true)
    try {
      const response = await workflowService.getWorkflowsForTrigger()
      setWorkflows(response.data || [])
    } catch (error) {
      console.error('Failed to load workflows:', error)
      setWorkflows([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadWorkflows()
  }, [])

  return (
    <div className="space-y-2">
      <div className="flex items-center space-x-2">
        <Select
          value={value || ''}
          onValueChange={onChange}
          disabled={disabled || loading}
        >
          <SelectTrigger className={error ? 'border-destructive' : ''}>
            <SelectValue placeholder="Select a workflow to trigger" />
          </SelectTrigger>
          <SelectContent>
            {workflows.map((workflow) => (
              <SelectItem key={workflow.id} value={workflow.id}>
                <div>
                  <div className="font-medium">{workflow.name}</div>
                  {workflow.description && (
                    <div className="text-xs text-muted-foreground">
                      {workflow.description}
                    </div>
                  )}
                  <div className="text-xs text-muted-foreground">
                    {workflow.triggers.length} trigger{workflow.triggers.length !== 1 ? 's' : ''} available
                  </div>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="sm"
          onClick={loadWorkflows}
          disabled={loading}
          className="shrink-0"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>
      {workflows.length === 0 && !loading && (
        <p className="text-xs text-muted-foreground">
          No workflows with active triggers found. Create a workflow with triggers first.
        </p>
      )}
    </div>
  )
}

interface TriggerSelectorProps {
  workflowId?: string
  value?: string
  onChange: (value: string) => void
  disabled?: boolean
  error?: string
}

export function TriggerSelector({ workflowId, value, onChange, disabled, error }: TriggerSelectorProps) {
  const [triggers, setTriggers] = useState<TriggerOption[]>([])
  const [loading, setLoading] = useState(false)

  const loadTriggers = async () => {
    if (!workflowId) {
      setTriggers([])
      return
    }

    setLoading(true)
    try {
      const response = await workflowService.getWorkflowTriggers(workflowId)
      setTriggers(response.data || [])
    } catch (error) {
      console.error('Failed to load triggers:', error)
      setTriggers([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTriggers()
  }, [workflowId])

  // Clear value if workflow changes and triggers have been loaded
  useEffect(() => {
    // Only clear if we have loaded triggers and the value is not in the list
    if (value && triggers.length > 0 && !triggers.find(t => t.id === value)) {
      onChange('')
    }
  }, [triggers, value, onChange])

  if (!workflowId) {
    return (
      <Select disabled>
        <SelectTrigger>
          <SelectValue placeholder="Select a workflow first" />
        </SelectTrigger>
      </Select>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center space-x-2">
        <Select
          value={value || ''}
          onValueChange={onChange}
          disabled={disabled || loading}
        >
          <SelectTrigger className={error ? 'border-destructive' : ''}>
            <SelectValue placeholder="Select a trigger" />
          </SelectTrigger>
          <SelectContent>
            {triggers.map((trigger) => (
              <SelectItem key={trigger.id} value={trigger.id}>
                <div>
                  <div className="font-medium">
                    {trigger.type.charAt(0).toUpperCase() + trigger.type.slice(1)} Trigger
                  </div>
                  {trigger.description && (
                    <div className="text-xs text-muted-foreground">
                      {trigger.description}
                    </div>
                  )}
                  <div className="text-xs text-muted-foreground">
                    Node: {trigger.nodeId}
                  </div>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="sm"
          onClick={loadTriggers}
          disabled={loading || !workflowId}
          className="shrink-0"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>
      {triggers.length === 0 && !loading && workflowId && (
        <p className="text-xs text-muted-foreground">
          No active triggers found for this workflow.
        </p>
      )}
    </div>
  )
}
