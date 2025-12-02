import { useState } from 'react'
import { ExecuteToolbarButton } from './ExecuteToolbarButton'
import { DisableToggleToolbarButton } from './DisableToggleToolbarButton'

/**
 * Test component to verify toolbar button styling across different themes and backgrounds
 */
export function ToolbarButtonsStyleTest() {
  const [isExecuting, setIsExecuting] = useState(false)
  const [hasError, setHasError] = useState(false)
  const [hasSuccess, setHasSuccess] = useState(false)
  const [isDisabled, setIsDisabled] = useState(false)
  const [theme, setTheme] = useState<'light' | 'dark' | 'high-contrast'>('light')

  const handleExecute = (_nodeId: string) => {
    setIsExecuting(true)
    setHasError(false)
    setHasSuccess(false)

    // Simulate execution
    setTimeout(() => {
      setIsExecuting(false)
      setHasSuccess(true)

      // Clear success after 3 seconds
      setTimeout(() => {
        setHasSuccess(false)
      }, 3000)
    }, 2000)
  }

  const handleError = () => {
    setIsExecuting(false)
    setHasSuccess(false)
    setHasError(true)

    // Clear error after 3 seconds
    setTimeout(() => {
      setHasError(false)
    }, 3000)
  }

  const handleToggleDisabled = (_nodeId: string, disabled: boolean) => {
    setIsDisabled(disabled)
  }

  const applyTheme = (selectedTheme: string) => {
    const root = document.documentElement
    root.classList.remove('light', 'dark', 'high-contrast')
    root.classList.add(selectedTheme)
    setTheme(selectedTheme as 'light' | 'dark' | 'high-contrast')
  }

  const nodeBackgrounds = [
    { name: 'White', color: '#ffffff', textColor: '#000000' },
    { name: 'Light Gray', color: '#f3f4f6', textColor: '#374151' },
    { name: 'Blue', color: '#3b82f6', textColor: '#ffffff' },
    { name: 'Green', color: '#10b981', textColor: '#ffffff' },
    { name: 'Red', color: '#ef4444', textColor: '#ffffff' },
    { name: 'Purple', color: '#8b5cf6', textColor: '#ffffff' },
    { name: 'Dark Gray', color: '#374151', textColor: '#ffffff' },
    { name: 'Black', color: '#000000', textColor: '#ffffff' },
  ]

  return (
    <div className="p-8 space-y-8">
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Toolbar Button Style Test</h1>

        {/* Theme Controls */}
        <div className="flex gap-2">
          <button
            onClick={() => applyTheme('light')}
            className={`px-3 py-1 rounded ${theme === 'light' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
          >
            Light Theme
          </button>
          <button
            onClick={() => applyTheme('dark')}
            className={`px-3 py-1 rounded ${theme === 'dark' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
          >
            Dark Theme
          </button>
          <button
            onClick={() => applyTheme('high-contrast')}
            className={`px-3 py-1 rounded ${theme === 'high-contrast' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
          >
            High Contrast
          </button>
        </div>

        {/* State Controls */}
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => handleExecute('test')}
            className="px-3 py-1 bg-blue-500 text-white rounded"
            disabled={isExecuting}
          >
            {isExecuting ? 'Executing...' : 'Test Execute'}
          </button>
          <button
            onClick={handleError}
            className="px-3 py-1 bg-red-500 text-white rounded"
          >
            Test Error
          </button>
          <button
            onClick={() => {
              setHasError(false)
              setHasSuccess(false)
              setIsExecuting(false)
            }}
            className="px-3 py-1 bg-gray-500 text-white rounded"
          >
            Reset States
          </button>
        </div>
      </div>

      {/* Test against different node backgrounds */}
      <div className="space-y-6">
        <h2 className="text-xl font-semibold">Button Visibility Test</h2>
        <p className="text-sm text-gray-600">
          Testing toolbar buttons against various node background colors to ensure proper contrast and visibility.
        </p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {nodeBackgrounds.map((bg) => (
            <div key={bg.name} className="space-y-2">
              <h3 className="text-sm font-medium">{bg.name}</h3>
              <div
                className="relative p-4 rounded-lg border-2 border-gray-300 min-h-[100px] flex items-center justify-center"
                style={{ backgroundColor: bg.color, color: bg.textColor }}
              >
                <div className="text-sm font-medium mb-2">Sample Node</div>

                {/* Toolbar buttons positioned like they would be in ReactFlow */}
                <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 flex gap-1">
                  <ExecuteToolbarButton
                    nodeId="test"
                    nodeType="Manual Trigger"
                    isExecuting={isExecuting}
                    canExecute={!isDisabled}
                    hasError={hasError}
                    hasSuccess={hasSuccess}
                    onExecute={handleExecute}
                  />
                  <DisableToggleToolbarButton
                    nodeId="test"
                    nodeLabel="Test Node"
                    disabled={isDisabled}
                    onToggle={handleToggleDisabled}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* State demonstration */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Button States</h2>
        <div className="flex gap-8 items-center">
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Execute Button States</h3>
            <div className="flex gap-2 items-center">
              <ExecuteToolbarButton
                nodeId="idle"
                nodeType="Manual Trigger"
                isExecuting={false}
                canExecute={true}
                onExecute={() => { }}
              />
              <span className="text-sm">Idle</span>
            </div>
            <div className="flex gap-2 items-center">
              <ExecuteToolbarButton
                nodeId="executing"
                nodeType="Manual Trigger"
                isExecuting={true}
                canExecute={true}
                onExecute={() => { }}
              />
              <span className="text-sm">Executing</span>
            </div>
            <div className="flex gap-2 items-center">
              <ExecuteToolbarButton
                nodeId="success"
                nodeType="Manual Trigger"
                isExecuting={false}
                canExecute={true}
                hasSuccess={true}
                onExecute={() => { }}
              />
              <span className="text-sm">Success</span>
            </div>
            <div className="flex gap-2 items-center">
              <ExecuteToolbarButton
                nodeId="error"
                nodeType="Manual Trigger"
                isExecuting={false}
                canExecute={true}
                hasError={true}
                onExecute={() => { }}
              />
              <span className="text-sm">Error</span>
            </div>
            <div className="flex gap-2 items-center">
              <ExecuteToolbarButton
                nodeId="disabled"
                nodeType="Manual Trigger"
                isExecuting={false}
                canExecute={false}
                onExecute={() => { }}
              />
              <span className="text-sm">Disabled</span>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-medium">Disable Toggle States</h3>
            <div className="flex gap-2 items-center">
              <DisableToggleToolbarButton
                nodeId="enabled"
                nodeLabel="Test Node"
                disabled={false}
                onToggle={() => { }}
              />
              <span className="text-sm">Enabled</span>
            </div>
            <div className="flex gap-2 items-center">
              <DisableToggleToolbarButton
                nodeId="disabled"
                nodeLabel="Test Node"
                disabled={true}
                onToggle={() => { }}
              />
              <span className="text-sm">Disabled</span>
            </div>
          </div>
        </div>
      </div>

      {/* Accessibility test */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Accessibility Test</h2>
        <p className="text-sm text-gray-600">
          Use Tab to navigate between buttons, Enter/Space to activate them.
        </p>
        <div className="flex gap-4 p-4 border rounded-lg">
          <ExecuteToolbarButton
            nodeId="accessibility-test-1"
            nodeType="Manual Trigger"
            isExecuting={isExecuting}
            canExecute={!isDisabled}
            hasError={hasError}
            hasSuccess={hasSuccess}
            onExecute={handleExecute}
          />
          <DisableToggleToolbarButton
            nodeId="accessibility-test-2"
            nodeLabel="Accessibility Test Node"
            disabled={isDisabled}
            onToggle={handleToggleDisabled}
          />
        </div>
      </div>
    </div>
  )
}
