import { CustomFieldProps } from '@/components/ui/form-generator/types'
import { TriggerSelector, WorkflowSelector } from '@/components/workflow/nodes/WorkflowTrigger'

// Adapter for WorkflowSelector
export function WorkflowSelectorAdapter({ value, onChange, error, disabled }: CustomFieldProps) {
  return (
    <WorkflowSelector
      value={value}
      onChange={onChange}
      disabled={disabled}
      error={error}
    />
  )
}

// Adapter for TriggerSelector
export function TriggerSelectorAdapter({ value, onChange, error, disabled, allValues }: CustomFieldProps) {
  const workflowId = allValues?.workflowId
  
  return (
    <TriggerSelector
      workflowId={workflowId}
      value={value}
      onChange={onChange}
      disabled={disabled}
      error={error}
    />
  )
}

// Component registry for WorkflowTrigger node
export const WorkflowTriggerComponents = {
  WorkflowSelector: WorkflowSelectorAdapter,
  TriggerSelector: TriggerSelectorAdapter,
}
