import { useWorkflowStore } from '@/stores/workflow'
import { ExecutionFlowStatus, ExecutionLogEntry, ExecutionState, NodeExecutionResult, WorkflowExecutionResult } from '@/types'
import { filterExistingNodeResults, filterExistingNodeResultsMap } from '@/utils/executionResultsFilter'
import { useState } from 'react'
import { ExecutionPanelContent } from './ExecutionPanelContent'
import { ExecutionPanelHeader } from './ExecutionPanelHeader'
import { ExecutionPanelTabs, TabType } from './ExecutionPanelTabs'

interface ExecutionPanelProps {
  executionState: ExecutionState
  lastExecutionResult: WorkflowExecutionResult | null
  executionLogs: ExecutionLogEntry[]
  realTimeResults: Map<string, NodeExecutionResult>
  flowExecutionStatus?: ExecutionFlowStatus | null
  isExpanded?: boolean
  onToggle?: () => void
  onClose?: () => void
  onClearLogs?: () => void
}

export function ExecutionPanel({
  executionState,
  lastExecutionResult,
  executionLogs,
  realTimeResults,
  flowExecutionStatus,
  isExpanded = true,
  onToggle,
  onClose,
  onClearLogs
}: ExecutionPanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>('progress')
  const { workflow } = useWorkflowStore()

  // Get display data for tabs, filtering out deleted nodes
  const filteredRealTimeResults = filterExistingNodeResultsMap(realTimeResults, workflow?.nodes)
  const currentResults = Array.from(filteredRealTimeResults.values())
  const finalResults = filterExistingNodeResults(lastExecutionResult?.nodeResults || [], workflow?.nodes)
  const displayResults = executionState.status === 'running' ? currentResults : finalResults

  const handleToggle = () => {
    if (onToggle) {
      onToggle()
    } else if (onClose) {
      onClose()
    }
  }

  return (
    <div className="h-full bg-background flex flex-col border-l border-border">
      <ExecutionPanelHeader
        executionState={executionState}
        isExpanded={isExpanded}
        onToggle={handleToggle}
      />

        <div className="flex-1 flex flex-col">
          <ExecutionPanelTabs
            activeTab={activeTab}
            onTabChange={setActiveTab}
            logsCount={executionLogs.length}
            resultsCount={displayResults.length}
          />

          <ExecutionPanelContent
            activeTab={activeTab}
            executionState={executionState}
            lastExecutionResult={lastExecutionResult}
            executionLogs={executionLogs}
            realTimeResults={realTimeResults}
            flowExecutionStatus={flowExecutionStatus}
            onClearLogs={onClearLogs}
          />
        </div>
    </div>
  )
}
