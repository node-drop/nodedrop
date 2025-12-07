"use client"

import type React from "react"

import { useState, useRef, useCallback, useEffect } from "react"
import { ExpressionInput } from "./expression-input"
import { AutocompleteDropdown } from "./autocomplete-dropdown"
import { ResultPreview } from "./result-preview"
import { VariableSelector } from "./variable-selector"
import { evaluateExpression } from "./expression-evaluator"
import type { AutocompleteItem, ExpressionEditorProps } from "./types"
import { defaultVariableCategories } from "./default-categories"
import { useExpressionMode, useExpressionAutocomplete } from "./expression-editor-hooks"

export function ExpressionEditor({
  initialValue = "{{ $json.name.toUpperCase() }}",
  placeholder = "Enter expression...",
  mockData: providedMockData,
  variableCategories = defaultVariableCategories,
  onChange,
  onResultChange,
  title: _title = "Edit Expression",
  showVariableSelector = true,
  showResultPreview = true,
  className = "",
  nodeId: _nodeId,
}: ExpressionEditorProps = {}) {
  const mockData = providedMockData || {}
  
  // Use custom hooks
  const { isExpression: isExpressionMode, displayValue, wrapWithPrefix } = useExpressionMode(initialValue || "")
  const {
    showAutocomplete,
    autocompleteItems,
    selectedIndex,
    setCursorPosition,
    setSelectedIndex,
    updateAutocomplete,
    selectAutocompleteItem,
    handleAutocompleteKeyDown,
  } = useExpressionAutocomplete(displayValue, isExpressionMode, mockData, variableCategories)
  
  const [dropdownPosition, setDropdownPosition] = useState({ top: 40, left: 12 })
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const editorRef = useRef<HTMLDivElement>(null)

  // Evaluate the expression only in expression mode
  const result = isExpressionMode 
    ? evaluateExpression(displayValue, mockData)
    : { success: true, value: displayValue, type: "string" }

  useEffect(() => {
    onResultChange?.(result)
  }, [result, onResultChange])

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }, [])

  const handleExpressionChange = useCallback(
    (value: string, position?: number) => {
      if (position !== undefined) {
        setCursorPosition(position)
      }
      
      // Emit with proper "=" handling
      onChange?.(wrapWithPrefix(value))

      const cursorPos = position !== undefined ? position : 0
      
      // Update autocomplete
      updateAutocomplete(value, cursorPos)
    },
    [onChange, wrapWithPrefix, setCursorPosition, updateAutocomplete],
  )

  const handleCursorPositionChange = useCallback((position: { top: number; left: number }) => {
    setDropdownPosition(position)
  }, [])

  const handleAutocompleteSelect = useCallback(
    (item: AutocompleteItem) => {
      const { newValue, newCursorPosition } = selectAutocompleteItem(item)
      onChange?.(wrapWithPrefix(newValue))

      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus()
          inputRef.current.setSelectionRange(newCursorPosition, newCursorPosition)
        }
      }, 0)
    },
    [selectAutocompleteItem, onChange, wrapWithPrefix],
  )

  const handleVariableSelect = useCallback(
    (item: AutocompleteItem) => {
      const insertText = `{{ ${item.insertText} }}`

      if (inputRef.current) {
        const start = inputRef.current.selectionStart || 0
        const end = inputRef.current.selectionEnd || 0
        const newExpression = displayValue.slice(0, start) + insertText + displayValue.slice(end)
        onChange?.(wrapWithPrefix(newExpression))

        setTimeout(() => {
          inputRef.current?.focus()
          const newPosition = start + insertText.length
          inputRef.current?.setSelectionRange(newPosition, newPosition)
        }, 0)
      } else {
        const newExpression = displayValue + insertText
        onChange?.(wrapWithPrefix(newExpression))
      }
    },
    [displayValue, onChange, wrapWithPrefix],
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const selectedItem = handleAutocompleteKeyDown(e)
      if (selectedItem) {
        handleAutocompleteSelect(selectedItem)
      }
    },
    [handleAutocompleteKeyDown, handleAutocompleteSelect],
  )

  return (
    <div className={`flex h-full ${className}`}>
      {/* Variable Selector Sidebar */}
      {showVariableSelector && <VariableSelector categories={variableCategories} onSelect={handleVariableSelect} />}

      {/* Main Editor */}
      <div className="flex-1 flex flex-col">
        {/* Expression Type Toggle */}
        <div className="bg-muted px-4 py-2 border-b">
          <div className="flex items-center gap-1 bg-background rounded-md p-0.5 w-fit">
            <button
              onClick={() => onChange?.(displayValue)}
              className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                !isExpressionMode ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Fixed
            </button>
            <button
              onClick={() => onChange?.("=" + displayValue)}
              className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                isExpressionMode ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Expression
            </button>
          </div>
        </div>

        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Editor Area */}
          <div ref={editorRef} className="relative flex-1 bg-background pointer-events-auto">
            <ExpressionInput
              ref={inputRef}
              value={displayValue}
              onChange={handleExpressionChange}
              onKeyDown={handleKeyDown}
              onCursorPositionChange={handleCursorPositionChange}
              placeholder={placeholder}
              evaluationContext={mockData}
            />

            {showAutocomplete && (
              <AutocompleteDropdown
                items={autocompleteItems}
                selectedIndex={selectedIndex}
                onSelect={handleAutocompleteSelect}
                onHover={setSelectedIndex}
                position={dropdownPosition}
              />
            )}
          </div>

          {/* Result Preview */}
          {showResultPreview && <ResultPreview result={result} />}
        </div>
      </div>
    </div>
  )
}

export { MiniExpressionEditor } from "./mini-expression-editor"
export { inferTypeFromPath, getPropertiesFromPath } from "./expression-utils"
export type { ExpressionEditorProps, AutocompleteItem, VariableCategory } from "./types"
