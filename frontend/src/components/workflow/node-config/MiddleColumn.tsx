import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tabs, TabsContent } from '@/components/ui/tabs'
import { useNodeConfigDialogStore, useWorkflowStore } from '@/stores'
import { NodeType, WorkflowNode } from '@/types'
import { NodeValidator } from '@/utils/nodeValidation'
import { isNodeExecutable } from '@/utils/nodeTypeUtils'
import {
  MoreVertical,
  Play,
  Settings,
  ToggleLeft,
  ToggleRight,
  Trash2,
  Database,
  FileText,
} from 'lucide-react'
import { NodeHeader } from '@/components/workflow/shared/NodeHeader'
import { ConfigTab } from './tabs/ConfigTab'
import { DocsTab } from './tabs/DocsTab'
import { ResponseTab } from './tabs/ResponseTab'
import { SettingsTab } from './tabs/SettingsTab'
import { TestTab } from './tabs/TestTab'

interface MiddleColumnProps {
  node: WorkflowNode
  nodeType: NodeType
  onDelete: () => void
  onExecute: () => void
  readOnly?: boolean
}

export function MiddleColumn({ node, nodeType, onDelete, onExecute, readOnly = false }: MiddleColumnProps) {
  const {
    nodeName,
    isDisabled,
    isExecuting,
    validationErrors,
    activeTab,
    updateNodeName,
    updateDisabled,
    setActiveTab,
  } = useNodeConfigDialogStore()

  const {
    getNodeExecutionResult,
    executionState
  } = useWorkflowStore()

  const nodeExecutionResult = getNodeExecutionResult(node.id)

  // Actions dropdown for the header - includes tab navigation and node actions
  const headerActions = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <MoreVertical className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {/* Tab navigation items */}
        <DropdownMenuItem
          onClick={() => setActiveTab('config')}
          className={`flex items-center space-x-2 ${activeTab === 'config' ? 'bg-accent' : ''}`}
        >
          <Settings className="w-4 h-4" />
          <span>Config</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setActiveTab('settings')}
          className={`flex items-center space-x-2 ${activeTab === 'settings' ? 'bg-accent' : ''}`}
        >
          <Settings className="w-4 h-4" />
          <span>Settings</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setActiveTab('test')}
          className={`flex items-center space-x-2 ${activeTab === 'test' ? 'bg-accent' : ''}`}
        >
          <Play className="w-4 h-4" />
          <span>Test</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setActiveTab('response')}
          className={`flex items-center space-x-2 ${activeTab === 'response' ? 'bg-accent' : ''}`}
        >
          <Database className="w-4 h-4" />
          <span>Response</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setActiveTab('docs')}
          className={`flex items-center space-x-2 ${activeTab === 'docs' ? 'bg-accent' : ''}`}
        >
          <FileText className="w-4 h-4" />
          <span>Docs</span>
        </DropdownMenuItem>
        
        {!readOnly && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => updateDisabled(!isDisabled)}
              className="flex items-center space-x-2"
            >
              {isDisabled ? (
                <ToggleRight className="w-4 h-4" />
              ) : (
                <ToggleLeft className="w-4 h-4" />
              )}
              <span>{isDisabled ? 'Enable Node' : 'Disable Node'}</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={onDelete}
              className="flex items-center space-x-2 text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete Node</span>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )

  return (
    <div className="flex w-full h-full flex-col">
      <NodeHeader
        nodeType={nodeType}
        nodeName={nodeName}
        onNameChange={updateNodeName}
        onExecute={isNodeExecutable(nodeType) ? onExecute : undefined}
        isExecuting={isExecuting}
        executionDisabled={executionState.status === 'running' || validationErrors.length > 0}
        executionStatus={nodeExecutionResult?.status as 'success' | 'error' | 'running' | 'pending' | 'skipped' | null}
        nameError={NodeValidator.getFieldError(validationErrors, 'name')}
        readOnly={readOnly}
        actions={headerActions}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <div className="flex-1 overflow-hidden">
          <TabsContent value="config" className="h-full mt-0">
            <ConfigTab node={node} nodeType={nodeType} readOnly={readOnly} />
          </TabsContent>

          <TabsContent value="settings" className="h-full mt-0">
            <SettingsTab node={node} nodeType={nodeType} readOnly={readOnly} />
          </TabsContent>

          <TabsContent value="test" className="h-full mt-0">
            <TestTab node={node} nodeType={nodeType} />
          </TabsContent>

          <TabsContent value="response" className="h-full mt-0">
            <ResponseTab node={node} />
          </TabsContent>

          <TabsContent value="docs" className="h-full mt-0">
            <DocsTab nodeType={nodeType} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}
