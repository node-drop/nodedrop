import type { VariableCategory } from '@/components/ui/expression-editor'
import { defaultVariableCategories } from '@/components/ui/expression-editor/default-categories'
import { ExpressionInput } from '@/components/ui/form-generator/ExpressionInput'
import { variableService } from '@/services/variable.service'
import { useWorkflowStore } from '@/stores'
import type { Variable } from '@/types/variable'
import {
  DEFAULT_MOCK_DATA,
  buildWorkflowInfoCategory,
  createFallbackCategory,
  formatValuePreview,
  mergeNodeOutputItems,
} from '@/utils/nodeDataUtils'
import { buildMockDataFromWorkflow } from '@/utils/workflowDataUtils'
import { useEffect, useMemo, useState } from 'react'

interface WorkflowExpressionFieldProps {
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  onFocus?: () => void
  placeholder?: string
  error?: string
  nodeId?: string
  customVariableCategories?: VariableCategory[]
  className?: string
  hideRing?: boolean
}

/**
 * WorkflowExpressionField - A wrapper around ExpressionInput that handles workflow-specific logic
 * Automatically builds mock data and variable categories from connected workflow nodes
 */
export function WorkflowExpressionField({
  value,
  onChange,
  onBlur,
  onFocus,
  placeholder,
  error,
  nodeId,
  customVariableCategories,
  className,
  hideRing,
}: WorkflowExpressionFieldProps) {
  const [variables, setVariables] = useState<Variable[]>([])
  const [mockData, setMockData] = useState<Record<string, unknown>>(DEFAULT_MOCK_DATA)

  // Call hooks at top level
  const workflowStore = useWorkflowStore()
  const workflow = workflowStore.workflow
  const executionId = workflowStore.executionState?.executionId

  // Fetch variables and build mock data on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const fetchedVariables = await variableService.getVariables()
        setVariables(fetchedVariables)
        
        // Convert variables to object
        const varsObject: Record<string, string> = {}
        fetchedVariables.forEach((variable) => {
          varsObject[variable.key] = variable.value
        })
        
        // Build mock data with workflow data
        const data = await buildMockDataFromWorkflow(
          nodeId,
          workflow || undefined,
          executionId,
          (sourceNodeId) => workflowStore.getNodeExecutionResult(sourceNodeId),
          varsObject
        )
        setMockData(data)
      } catch (error) {
        console.error('Error fetching data:', error)
      }
    }
    fetchData()
  }, [nodeId, workflow, executionId, workflowStore])

  // Memoize variable items to avoid recalculation
  const variableItems = useMemo(() => {
    if (variables.length === 0) return []
    return variables.map((variable) => ({
      label: `$vars.${variable.key}`,
      type: 'property' as const,
      description: variable.description || `Value: ${variable.value.substring(0, 50)}${variable.value.length > 50 ? '...' : ''}`,
      insertText: `$vars.${variable.key}`,
    }))
  }, [variables])

  // Memoize connected node categories - using $node["Node Name"].field format (clean, user-friendly)
  // Backend supports both with and without .json, so we use the cleaner format
  const connectedNodeCategories = useMemo(() => {
    const categories: VariableCategory[] = []

    if (!nodeId || !workflow) return categories

    try {
      const inputConnections = workflow.connections.filter(
        (conn) => conn.targetNodeId === nodeId
      )

      inputConnections.forEach((connection) => {
        const sourceNodeId = connection.sourceNodeId
        const sourceNode = workflow.nodes.find((n) => n.id === sourceNodeId)
        if (!sourceNode) return

        const nodeName = sourceNode.name
        const categoryName = `${nodeName}` // Display name for UI
        // Use clean format without .json (backend supports both)
        const nodeBasePath = `$node["${nodeName}"]`

        const sourceNodeResult = workflowStore.getNodeExecutionResult(sourceNodeId)

        if (!sourceNodeResult?.data) {
          categories.push(createFallbackCategory(
            categoryName,
            nodeBasePath,
            'Node not executed yet - run the workflow to see available fields'
          ))
          return
        }

        let sourceData: any[] = []
        if (sourceNodeResult.data.main && Array.isArray(sourceNodeResult.data.main)) {
          sourceData = sourceNodeResult.data.main
        }

        if (sourceData.length === 0) {
          categories.push(createFallbackCategory(
            categoryName,
            nodeBasePath,
            'No data available - check node execution'
          ))
          return
        }

        // Use shared utility to merge all items from sourceData
        // This handles merge nodes that output multiple items with different properties
        const mergedItem = mergeNodeOutputItems(sourceData)
        
        if (Object.keys(mergedItem).length === 0) {
          categories.push(createFallbackCategory(
            categoryName,
            nodeBasePath,
            'Data structure not available'
          ))
          return
        }

        const items = Object.entries(mergedItem).map(([key, val]) => {
          const fullPath = `${nodeBasePath}.${key}`

          return {
            label: key,
            type: 'property' as const,
            description: formatValuePreview(val),
            insertText: fullPath,
          }
        })

        if (items.length > 0) {
          categories.push({
            name: categoryName,
            icon: 'input',
            items,
          })
        }
      })
    } catch (error) {
      console.error('Error building variable categories:', error)
    }

    return categories
  }, [nodeId, workflow, workflowStore])

  // Build variable categories with memoization
  const variableCategories = useMemo(() => {
    const categories: VariableCategory[] = []

    // Add workflow info category with actual values
    const workflowData = mockData.$workflow as Record<string, unknown> | undefined
    const executionData = mockData.$execution as Record<string, unknown> | undefined

    // Use shared utility to build workflow info category
    categories.push(buildWorkflowInfoCategory(workflowData, executionData))

    // Add variables category
    if (variableItems.length > 0) {
      categories.push({
        name: 'Variables',
        icon: 'variable',
        items: variableItems,
      })
    }

    // Add connected node categories
    categories.push(...connectedNodeCategories)

    // Add custom categories if provided
    if (customVariableCategories && customVariableCategories.length > 0) {
      categories.push(...customVariableCategories)
    }

    // Add default categories
    categories.push(...defaultVariableCategories)

    return categories
  }, [mockData, variableItems, connectedNodeCategories, customVariableCategories])

  return (
    <>
      <ExpressionInput
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        onFocus={onFocus}
        placeholder={placeholder}
        mockData={mockData}
        variableCategories={variableCategories}
        nodeId={nodeId}
        className={className}
        hideRing={hideRing}
      />
      {error && (
        <p className="text-sm text-destructive mt-1.5">{error}</p>
      )}
    </>
  )
}
