
import { ExecuteToolbarButton } from './ExecuteToolbarButton'
import { DisableToggleToolbarButton } from './DisableToggleToolbarButton'

/**
 * Demo component to showcase toolbar button styling
 * This can be used for manual testing and visual verification
 */
export function ToolbarButtonsStyleDemo() {
  return (
    <div className="p-8 space-y-8 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Toolbar Button Style Demo</h1>
        
        {/* Theme Test Section */}
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold text-gray-800">Theme Compatibility Test</h2>
          
          {/* Light Theme */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="text-lg font-medium mb-4">Light Theme</h3>
            <div className="flex gap-4 items-center">
              <ExecuteToolbarButton
                nodeId="light-idle"
                nodeType="Manual Trigger"
                isExecuting={false}
                canExecute={true}
                onExecute={() => console.log('Execute clicked')}
              />
              <ExecuteToolbarButton
                nodeId="light-executing"
                nodeType="Manual Trigger"
                isExecuting={true}
                canExecute={true}
                onExecute={() => console.log('Execute clicked')}
              />
              <ExecuteToolbarButton
                nodeId="light-success"
                nodeType="Manual Trigger"
                isExecuting={false}
                canExecute={true}
                hasSuccess={true}
                onExecute={() => console.log('Execute clicked')}
              />
              <ExecuteToolbarButton
                nodeId="light-error"
                nodeType="Manual Trigger"
                isExecuting={false}
                canExecute={true}
                hasError={true}
                onExecute={() => console.log('Execute clicked')}
              />
              <ExecuteToolbarButton
                nodeId="light-disabled"
                nodeType="Manual Trigger"
                isExecuting={false}
                canExecute={false}
                onExecute={() => console.log('Execute clicked')}
              />
              <DisableToggleToolbarButton
                nodeId="light-enabled"
                nodeLabel="Test Node"
                disabled={false}
                onToggle={() => console.log('Toggle clicked')}
              />
              <DisableToggleToolbarButton
                nodeId="light-disabled"
                nodeLabel="Test Node"
                disabled={true}
                onToggle={() => console.log('Toggle clicked')}
              />
            </div>
            <div className="text-sm text-gray-600 mt-2">
              States: Idle, Executing, Success, Error, Disabled, Enable Toggle, Disable Toggle
            </div>
          </div>

          {/* Dark Background Test */}
          <div className="bg-gray-800 p-6 rounded-lg shadow-sm">
            <h3 className="text-lg font-medium mb-4 text-white">Dark Background</h3>
            <div className="flex gap-4 items-center">
              <ExecuteToolbarButton
                nodeId="dark-idle"
                nodeType="Manual Trigger"
                isExecuting={false}
                canExecute={true}
                onExecute={() => console.log('Execute clicked')}
              />
              <ExecuteToolbarButton
                nodeId="dark-executing"
                nodeType="Manual Trigger"
                isExecuting={true}
                canExecute={true}
                onExecute={() => console.log('Execute clicked')}
              />
              <ExecuteToolbarButton
                nodeId="dark-success"
                nodeType="Manual Trigger"
                isExecuting={false}
                canExecute={true}
                hasSuccess={true}
                onExecute={() => console.log('Execute clicked')}
              />
              <ExecuteToolbarButton
                nodeId="dark-error"
                nodeType="Manual Trigger"
                isExecuting={false}
                canExecute={true}
                hasError={true}
                onExecute={() => console.log('Execute clicked')}
              />
              <DisableToggleToolbarButton
                nodeId="dark-enabled"
                nodeLabel="Test Node"
                disabled={false}
                onToggle={() => console.log('Toggle clicked')}
              />
              <DisableToggleToolbarButton
                nodeId="dark-disabled"
                nodeLabel="Test Node"
                disabled={true}
                onToggle={() => console.log('Toggle clicked')}
              />
            </div>
          </div>

          {/* Colored Backgrounds Test */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { name: 'Blue', bg: 'bg-blue-500', text: 'text-white' },
              { name: 'Green', bg: 'bg-green-500', text: 'text-white' },
              { name: 'Red', bg: 'bg-red-500', text: 'text-white' },
              { name: 'Purple', bg: 'bg-purple-500', text: 'text-white' },
            ].map((color) => (
              <div key={color.name} className={`${color.bg} p-4 rounded-lg`}>
                <h4 className={`text-sm font-medium mb-2 ${color.text}`}>{color.name} Background</h4>
                <div className="flex gap-2 items-center justify-center">
                  <ExecuteToolbarButton
                    nodeId={`${color.name.toLowerCase()}-test`}
                    nodeType="Manual Trigger"
                    isExecuting={false}
                    canExecute={true}
                    onExecute={() => console.log('Execute clicked')}
                  />
                  <DisableToggleToolbarButton
                    nodeId={`${color.name.toLowerCase()}-toggle`}
                    nodeLabel="Test Node"
                    disabled={false}
                    onToggle={() => console.log('Toggle clicked')}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Hover Effects Test */}
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold text-gray-800">Hover Effects Test</h2>
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <p className="text-sm text-gray-600 mb-4">
              Hover over the buttons to test hover effects. They should scale up and show enhanced shadows.
            </p>
            <div className="flex gap-4 items-center">
              <ExecuteToolbarButton
                nodeId="hover-test-1"
                nodeType="Manual Trigger"
                isExecuting={false}
                canExecute={true}
                onExecute={() => console.log('Execute clicked')}
              />
              <ExecuteToolbarButton
                nodeId="hover-test-2"
                nodeType="Manual Trigger"
                isExecuting={false}
                canExecute={true}
                hasSuccess={true}
                onExecute={() => console.log('Execute clicked')}
              />
              <ExecuteToolbarButton
                nodeId="hover-test-3"
                nodeType="Manual Trigger"
                isExecuting={false}
                canExecute={true}
                hasError={true}
                onExecute={() => console.log('Execute clicked')}
              />
              <DisableToggleToolbarButton
                nodeId="hover-test-4"
                nodeLabel="Test Node"
                disabled={false}
                onToggle={() => console.log('Toggle clicked')}
              />
            </div>
          </div>
        </section>

        {/* Accessibility Test */}
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold text-gray-800">Accessibility Test</h2>
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <p className="text-sm text-gray-600 mb-4">
              Use Tab to navigate between buttons, Enter/Space to activate them. Check tooltips on hover.
            </p>
            <div className="flex gap-4 items-center">
              <ExecuteToolbarButton
                nodeId="a11y-test-1"
                nodeType="Manual Trigger"
                isExecuting={false}
                canExecute={true}
                onExecute={() => console.log('Execute clicked')}
              />
              <ExecuteToolbarButton
                nodeId="a11y-test-2"
                nodeType="Manual Trigger"
                isExecuting={true}
                canExecute={true}
                onExecute={() => console.log('Execute clicked')}
              />
              <ExecuteToolbarButton
                nodeId="a11y-test-3"
                nodeType="Manual Trigger"
                isExecuting={false}
                canExecute={false}
                onExecute={() => console.log('Execute clicked')}
              />
              <DisableToggleToolbarButton
                nodeId="a11y-test-4"
                nodeLabel="Accessibility Test Node"
                disabled={false}
                onToggle={() => console.log('Toggle clicked')}
              />
              <DisableToggleToolbarButton
                nodeId="a11y-test-5"
                nodeLabel="Accessibility Test Node"
                disabled={true}
                onToggle={() => console.log('Toggle clicked')}
              />
            </div>
          </div>
        </section>

        {/* Size and Positioning Test */}
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold text-gray-800">Size and Positioning Test</h2>
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <p className="text-sm text-gray-600 mb-4">
              Testing consistent sizing and alignment of buttons.
            </p>
            <div className="space-y-4">
              <div className="flex gap-1 items-center">
                <span className="text-sm text-gray-500 w-20">Tight:</span>
                <ExecuteToolbarButton
                  nodeId="size-test-1"
                  nodeType="Manual Trigger"
                  isExecuting={false}
                  canExecute={true}
                  onExecute={() => console.log('Execute clicked')}
                />
                <DisableToggleToolbarButton
                  nodeId="size-test-2"
                  nodeLabel="Test Node"
                  disabled={false}
                  onToggle={() => console.log('Toggle clicked')}
                />
              </div>
              <div className="flex gap-2 items-center">
                <span className="text-sm text-gray-500 w-20">Normal:</span>
                <ExecuteToolbarButton
                  nodeId="size-test-3"
                  nodeType="Manual Trigger"
                  isExecuting={false}
                  canExecute={true}
                  onExecute={() => console.log('Execute clicked')}
                />
                <DisableToggleToolbarButton
                  nodeId="size-test-4"
                  nodeLabel="Test Node"
                  disabled={false}
                  onToggle={() => console.log('Toggle clicked')}
                />
              </div>
              <div className="flex gap-4 items-center">
                <span className="text-sm text-gray-500 w-20">Spaced:</span>
                <ExecuteToolbarButton
                  nodeId="size-test-5"
                  nodeType="Manual Trigger"
                  isExecuting={false}
                  canExecute={true}
                  onExecute={() => console.log('Execute clicked')}
                />
                <DisableToggleToolbarButton
                  nodeId="size-test-6"
                  nodeLabel="Test Node"
                  disabled={false}
                  onToggle={() => console.log('Toggle clicked')}
                />
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
