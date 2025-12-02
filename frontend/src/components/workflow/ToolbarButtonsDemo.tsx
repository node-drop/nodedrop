import { useState } from 'react'
import { ExecuteToolbarButton } from './ExecuteToolbarButton'
import { DisableToggleToolbarButton } from './DisableToggleToolbarButton'

/**
 * Demo component to showcase the toolbar buttons
 * This can be used for testing and development purposes
 */
export function ToolbarButtonsDemo() {
  const [isExecuting, setIsExecuting] = useState(false)
  const [hasError, setHasError] = useState(false)
  const [isDisabled, setIsDisabled] = useState(false)

  const handleExecute = (nodeId: string) => {
    console.log('Executing node:', nodeId)
    setIsExecuting(true)
    setHasError(false)
    
    // Simulate execution
    setTimeout(() => {
      setIsExecuting(false)
      // Randomly succeed or fail for demo purposes
      if (Math.random() > 0.7) {
        setHasError(true)
      }
    }, 2000)
  }

  const handleToggle = (nodeId: string, disabled: boolean) => {
    console.log('Toggling node:', nodeId, 'disabled:', disabled)
    setIsDisabled(disabled)
  }

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <h1 className="text-2xl font-bold mb-8">Toolbar Buttons Demo</h1>
      
      <div className="space-y-8">
        {/* Execute Button States */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Execute Toolbar Button</h2>
          <div className="flex items-center space-x-4">
            <div className="flex flex-col items-center space-y-2">
              <ExecuteToolbarButton
                nodeId="demo-node-1"
                nodeType="Manual Trigger"
                isExecuting={isExecuting}
                canExecute={true}
                hasError={hasError}
                onExecute={handleExecute}
              />
              <span className="text-xs text-gray-500">Interactive</span>
            </div>
            
            <div className="flex flex-col items-center space-y-2">
              <ExecuteToolbarButton
                nodeId="demo-node-2"
                nodeType="Manual Trigger"
                isExecuting={true}
                canExecute={true}
                onExecute={() => {}}
              />
              <span className="text-xs text-gray-500">Executing</span>
            </div>
            
            <div className="flex flex-col items-center space-y-2">
              <ExecuteToolbarButton
                nodeId="demo-node-3"
                nodeType="HTTP Request"
                isExecuting={false}
                canExecute={false}
                onExecute={() => {}}
              />
              <span className="text-xs text-gray-500">Cannot Execute</span>
            </div>
            
            <div className="flex flex-col items-center space-y-2">
              <ExecuteToolbarButton
                nodeId="demo-node-4"
                nodeType="Manual Trigger"
                isExecuting={false}
                canExecute={true}
                hasError={true}
                onExecute={() => {}}
              />
              <span className="text-xs text-gray-500">Error State</span>
            </div>
          </div>
        </div>

        {/* Disable Toggle Button States */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Disable Toggle Toolbar Button</h2>
          <div className="flex items-center space-x-4">
            <div className="flex flex-col items-center space-y-2">
              <DisableToggleToolbarButton
                nodeId="demo-node-5"
                nodeLabel="Test Node"
                disabled={isDisabled}
                onToggle={handleToggle}
              />
              <span className="text-xs text-gray-500">Interactive</span>
            </div>
            
            <div className="flex flex-col items-center space-y-2">
              <DisableToggleToolbarButton
                nodeId="demo-node-6"
                nodeLabel="Enabled Node"
                disabled={false}
                onToggle={() => {}}
              />
              <span className="text-xs text-gray-500">Enabled</span>
            </div>
            
            <div className="flex flex-col items-center space-y-2">
              <DisableToggleToolbarButton
                nodeId="demo-node-7"
                nodeLabel="Disabled Node"
                disabled={true}
                onToggle={() => {}}
              />
              <span className="text-xs text-gray-500">Disabled</span>
            </div>
          </div>
        </div>

        {/* Combined Example */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Combined Toolbar</h2>
          <div className="flex items-center space-x-2 p-4 border rounded-lg bg-gray-50">
            <ExecuteToolbarButton
              nodeId="demo-combined"
              nodeType="Manual Trigger"
              isExecuting={isExecuting}
              canExecute={!isDisabled}
              hasError={hasError}
              onExecute={handleExecute}
            />
            <DisableToggleToolbarButton
              nodeId="demo-combined"
              nodeLabel="Combined Node"
              disabled={isDisabled}
              onToggle={handleToggle}
            />
            <span className="ml-4 text-sm text-gray-600">
              This simulates how the buttons would appear together in a node toolbar
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
