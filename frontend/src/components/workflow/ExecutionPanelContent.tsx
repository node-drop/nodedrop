import { useWorkflowStore } from '@/stores/workflow'
import { ExecutionFlowStatus, ExecutionState, NodeExecutionResult, WorkflowExecutionResult } from '@/types'
import { filterExistingNodeResults, filterExistingNodeResultsMap } from '@/utils/executionResultsFilter'
import type { ExecutionLogEntry } from '@nodedrop/types'
import { TabType } from './ExecutionPanelTabs'
import { LogsTabContent } from './tabs/LogsTabContent'
import { ProgressTabContent } from './tabs/ProgressTabContent'
import { ResultsTabContent } from './tabs/ResultsTabContent'
import { TimelineTabContent } from './tabs/TimelineTabContent'

interface ExecutionPanelContentProps {
  activeTab: TabType
  executionState: ExecutionState
  lastExecutionResult: WorkflowExecutionResult | null
  executionLogs: ExecutionLogEntry[]
  realTimeResults: Map<string, NodeExecutionResult>
  flowExecutionStatus?: ExecutionFlowStatus | null
  onClearLogs?: () => void
}

export function ExecutionPanelContent({
  activeTab,
  executionState,
  lastExecutionResult,
  executionLogs,
  realTimeResults,
  flowExecutionStatus,
  onClearLogs
}: ExecutionPanelContentProps) {
  const { workflow } = useWorkflowStore()
  
  // Get current and final results for display, filtering out deleted nodes
  const filteredRealTimeResults = filterExistingNodeResultsMap(realTimeResults, workflow?.nodes)
  const currentResults = Array.from(filteredRealTimeResults.values())
  const finalResults = filterExistingNodeResults(lastExecutionResult?.nodeResults || [], workflow?.nodes)
  const displayResults = executionState.status === 'running' ? currentResults : finalResults

  return (
    <div className="flex-1 min-h-0 relative">
      {activeTab === 'progress' && (
        <ProgressTabContent executionState={executionState} />
      )}
      
      {activeTab === 'timeline' && (
        <TimelineTabContent 
          flowExecutionStatus={flowExecutionStatus}
          realTimeResults={filteredRealTimeResults}
        />
      )}
      
      {activeTab === 'logs' && (
        <LogsTabContent 
          logs={executionLogs}
          isActive={activeTab === 'logs'}
          onClearLogs={onClearLogs}
        />
      )}
      
      {activeTab === 'results' && (
        <ResultsTabContent displayResults={displayResults} />
      )}
    </div>
  )
}
