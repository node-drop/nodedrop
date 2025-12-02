import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { createField, RepeatingField, RepeatingFieldItem } from '@/components/ui/form-generator'
import { useState } from 'react'

/**
 * Example showing how to use the RepeatingField component
 * Perfect for scenarios like:
 * - Switch node outputs
 * - HTTP headers
 * - API parameters
 * - Form fields
 * - Routing rules
 */
export function RepeatingFieldExample() {
  // Example 1: Switch Node Outputs
  const [switchOutputs, setSwitchOutputs] = useState<RepeatingFieldItem[]>([
    {
      id: 'output_1',
      values: {
        outputName: 'Output 1',
        condition: 'equals',
        value: 'active',
      },
    },
  ])

  // Example 2: HTTP Headers
  const [httpHeaders, setHttpHeaders] = useState<RepeatingFieldItem[]>([])

  // Example 3: API Parameters
  const [apiParams, setApiParams] = useState<RepeatingFieldItem[]>([])

  // Example 4: Routing Rules
  const [routingRules, setRoutingRules] = useState<RepeatingFieldItem[]>([])

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Repeating Field Component Examples</h1>
        <p className="text-muted-foreground">
          Dynamic add/remove form sections with drag & drop reordering
        </p>
      </div>

      {/* Example 1: Switch Node Outputs */}
      <Card>
        <CardHeader>
          <CardTitle>Example 1: Switch Node Outputs</CardTitle>
          <CardDescription>
            Users can add multiple outputs with conditions (like nodeDrop's Switch node)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RepeatingField
            displayName="Output"
            fields={[
              createField({
                name: 'outputName',
                displayName: 'Output Name',
                type: 'string',
                required: true,
                placeholder: 'e.g., Active Users',
              }),
              createField({
                name: 'condition',
                displayName: 'Condition',
                type: 'options',
                required: true,
                options: [
                  { name: 'Equals', value: 'equals' },
                  { name: 'Not Equals', value: 'notEquals' },
                  { name: 'Contains', value: 'contains' },
                  { name: 'Greater Than', value: 'greaterThan' },
                  { name: 'Less Than', value: 'lessThan' },
                ],
              }),
              createField({
                name: 'value',
                displayName: 'Value',
                type: 'string',
                required: true,
                placeholder: 'Value to compare',
              }),
            ]}
            value={switchOutputs}
            onChange={setSwitchOutputs}
            minItems={1}
            maxItems={10}
            addButtonText="Add Output"
            itemHeaderRenderer={(item, index) => (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">
                  {item.values.outputName || `Output ${index + 1}`}
                </span>
                {item.values.condition && item.values.value && (
                  <span className="text-xs text-muted-foreground">
                    ({item.values.condition} "{item.values.value}")
                  </span>
                )}
              </div>
            )}
          />

          <div className="mt-4 p-3 bg-muted rounded-md">
            <p className="text-xs font-medium mb-2">Current Value:</p>
            <pre className="text-xs overflow-auto">
              {JSON.stringify(switchOutputs, null, 2)}
            </pre>
          </div>
        </CardContent>
      </Card>

      {/* Example 2: HTTP Headers */}
      <Card>
        <CardHeader>
          <CardTitle>Example 2: HTTP Headers</CardTitle>
          <CardDescription>
            Key-value pairs for HTTP request headers
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RepeatingField
            displayName="Header"
            fields={[
              createField({
                name: 'key',
                displayName: 'Header Name',
                type: 'string',
                required: true,
                placeholder: 'e.g., Content-Type',
              }),
              createField({
                name: 'value',
                displayName: 'Header Value',
                type: 'string',
                required: true,
                placeholder: 'e.g., application/json',
              }),
            ]}
            value={httpHeaders}
            onChange={setHttpHeaders}
            minItems={0}
            addButtonText="Add Header"
            defaultItemValues={{ key: '', value: '' }}
            showItemNumbers={false}
            itemHeaderRenderer={(item) => (
              <div className="flex items-center gap-2">
                <span className="text-sm font-mono">
                  {item.values.key || '<empty>'}
                </span>
                <span className="text-xs text-muted-foreground">:</span>
                <span className="text-sm font-mono text-muted-foreground">
                  {item.values.value || '<empty>'}
                </span>
              </div>
            )}
          />

          <div className="mt-4 p-3 bg-muted rounded-md">
            <p className="text-xs font-medium mb-2">Current Value:</p>
            <pre className="text-xs overflow-auto">
              {JSON.stringify(httpHeaders, null, 2)}
            </pre>
          </div>
        </CardContent>
      </Card>

      {/* Example 3: API Parameters */}
      <Card>
        <CardHeader>
          <CardTitle>Example 3: API Query Parameters</CardTitle>
          <CardDescription>
            Dynamic query parameters with type selection
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RepeatingField
            displayName="Parameter"
            fields={[
              createField({
                name: 'name',
                displayName: 'Parameter Name',
                type: 'string',
                required: true,
                placeholder: 'e.g., userId',
              }),
              createField({
                name: 'type',
                displayName: 'Type',
                type: 'options',
                required: true,
                options: [
                  { name: 'String', value: 'string' },
                  { name: 'Number', value: 'number' },
                  { name: 'Boolean', value: 'boolean' },
                ],
              }),
              createField({
                name: 'value',
                displayName: 'Value',
                type: 'string',
                required: true,
                placeholder: 'Parameter value',
              }),
              createField({
                name: 'required',
                displayName: 'Required',
                type: 'boolean',
                default: false,
              }),
            ]}
            value={apiParams}
            onChange={setApiParams}
            addButtonText="Add Parameter"
            collapsedByDefault={false}
          />

          <div className="mt-4 p-3 bg-muted rounded-md">
            <p className="text-xs font-medium mb-2">Current Value:</p>
            <pre className="text-xs overflow-auto">
              {JSON.stringify(apiParams, null, 2)}
            </pre>
          </div>
        </CardContent>
      </Card>

      {/* Example 4: Routing Rules */}
      <Card>
        <CardHeader>
          <CardTitle>Example 4: Routing Rules</CardTitle>
          <CardDescription>
            Complex routing with multiple conditions (collapsed by default)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RepeatingField
            displayName="Route"
            fields={[
              createField({
                name: 'routeName',
                displayName: 'Route Name',
                type: 'string',
                required: true,
              }),
              createField({
                name: 'path',
                displayName: 'Path',
                type: 'string',
                required: true,
                placeholder: '/api/users',
              }),
              createField({
                name: 'method',
                displayName: 'HTTP Method',
                type: 'options',
                required: true,
                options: [
                  { name: 'GET', value: 'GET' },
                  { name: 'POST', value: 'POST' },
                  { name: 'PUT', value: 'PUT' },
                  { name: 'DELETE', value: 'DELETE' },
                  { name: 'PATCH', value: 'PATCH' },
                ],
              }),
              createField({
                name: 'description',
                displayName: 'Description',
                type: 'string',
                placeholder: 'Optional description',
              }),
              createField({
                name: 'requireAuth',
                displayName: 'Require Authentication',
                type: 'boolean',
                default: true,
              }),
            ]}
            value={routingRules}
            onChange={setRoutingRules}
            addButtonText="Add Route"
            collapsedByDefault={true}
            maxItems={20}
            itemHeaderRenderer={(item, index) => (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">
                  {item.values.routeName || `Route ${index + 1}`}
                </span>
                {item.values.method && item.values.path && (
                  <span className="text-xs font-mono text-muted-foreground">
                    {item.values.method} {item.values.path}
                  </span>
                )}
              </div>
            )}
          />

          <div className="mt-4 p-3 bg-muted rounded-md">
            <p className="text-xs font-medium mb-2">Current Value:</p>
            <pre className="text-xs overflow-auto max-h-40">
              {JSON.stringify(routingRules, null, 2)}
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
