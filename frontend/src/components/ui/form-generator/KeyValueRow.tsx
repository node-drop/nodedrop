import { cn } from '@/lib/utils'
import { useState } from 'react'
import { WorkflowExpressionField } from './WorkflowExpressionField'

export interface KeyValueRowValue {
  key: string
  value: string
}

export interface KeyValueRowProps {
  value: KeyValueRowValue
  onChange: (value: KeyValueRowValue) => void
  onBlur?: () => void
  disabled?: boolean
  error?: string
  nodeId?: string
  keyPlaceholder?: string
  valuePlaceholder?: string
  showRing?: boolean
}

export function KeyValueRow({
  value = { key: '', value: '' },
  onChange,
  onBlur,
  disabled = false,
  error,
  nodeId,
  keyPlaceholder = 'Key',
  valuePlaceholder = 'Value',
  showRing = true,
}: KeyValueRowProps) {
  const [focusedField, setFocusedField] = useState<string | null>(null)

  const handleKeyChange = (newKey: string) => {
    onChange({ ...value, key: newKey })
  }

  const handleValueChange = (newValue: string) => {
    onChange({ ...value, value: newValue })
  }

  const handleFocus = (field: 'key' | 'value') => {
    setFocusedField(field)
  }

  const handleBlur = () => {
    setFocusedField(null)
    if (onBlur) {
      onBlur()
    }
  }

  const keyIsExpression = value.key?.startsWith('=')
  const valueIsExpression = value.value?.startsWith('=')
  const keyIsFocused = focusedField === 'key'
  const valueIsFocused = focusedField === 'value'
  const showPairRing = (keyIsFocused && !keyIsExpression) || (valueIsFocused && !valueIsExpression)

  return (
    <div className="space-y-2">
      <div className="relative">
        <div
          className={cn(
            'flex flex-col rounded-md border border-input divide-y divide-input transition-shadow overflow-hidden',
            showPairRing && 'ring-2 ring-ring ring-offset-2 ring-offset-background',
            error && 'ring-destructive'
          )}
        >
          {/* Key Field */}
          <div className="relative" style={{ zIndex: keyIsFocused && keyIsExpression ? 200 : 2 }}>
            <WorkflowExpressionField
              value={value.key || ''}
              onChange={handleKeyChange}
              onFocus={() => handleFocus('key')}
              onBlur={handleBlur}
              placeholder={keyPlaceholder}
              nodeId={nodeId}
              className="text-sm rounded-none border-0"
              hideRing={!keyIsExpression}
            />
          </div>

          {/* Value Field */}
          <div className="relative" style={{ zIndex: valueIsFocused && valueIsExpression ? 200 : 1 }}>
            <WorkflowExpressionField
              value={value.value || ''}
              onChange={handleValueChange}
              onFocus={() => handleFocus('value')}
              onBlur={handleBlur}
              placeholder={valuePlaceholder}
              nodeId={nodeId}
              className="text-sm rounded-none border-0"
              hideRing={!valueIsExpression}
            />
          </div>
        </div>
      </div>
      {error && (
        <p className="text-sm font-medium text-destructive">{error}</p>
      )}
    </div>
  )
}
