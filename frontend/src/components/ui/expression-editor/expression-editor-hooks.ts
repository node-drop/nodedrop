import { useState, useCallback, useMemo } from "react"
import type { AutocompleteItem, VariableCategory } from "./types"
import { getCurrentWord, filterAutocomplete, insertAutocompleteItem } from "./expression-editor-shared"

/**
 * Hook for managing expression mode (with "=" prefix)
 */
export const useExpressionMode = (value: string) => {
  const isExpression = value.startsWith("=")
  const displayValue = isExpression ? value.slice(1) : value

  const wrapWithPrefix = useCallback(
    (newValue: string) => {
      return isExpression ? "=" + newValue : newValue
    },
    [isExpression],
  )

  return {
    isExpression,
    displayValue,
    wrapWithPrefix,
  }
}

/**
 * Hook for managing autocomplete state and logic
 */
export const useExpressionAutocomplete = (
  displayValue: string,
  isExpression: boolean,
  mockData: Record<string, unknown>,
  variableCategories: VariableCategory[],
) => {
  const [showAutocomplete, setShowAutocomplete] = useState(false)
  const [autocompleteItems, setAutocompleteItems] = useState<AutocompleteItem[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [cursorPosition, setCursorPosition] = useState(0)

  // Flatten all autocomplete items from categories
  const allAutocompleteItems: AutocompleteItem[] = useMemo(
    () => variableCategories.flatMap((cat) => cat.items),
    [variableCategories],
  )

  /**
   * Updates autocomplete suggestions based on cursor position
   */
  const updateAutocomplete = useCallback(
    (text: string, cursorPos: number) => {
      if (!isExpression) {
        setShowAutocomplete(false)
        return
      }

      const beforeCursor = text.slice(0, cursorPos)
      const afterCursor = text.slice(cursorPos)
      const isInsideExpression =
        beforeCursor.includes("{{") &&
        (afterCursor.includes("}}") || !beforeCursor.slice(beforeCursor.lastIndexOf("{{")).includes("}}"))

      if (isInsideExpression) {
        const { word, context, endsWithDot, partialProperty } = getCurrentWord(text, cursorPos)
        const filtered = filterAutocomplete(
          word,
          context,
          endsWithDot,
          partialProperty,
          mockData,
          variableCategories,
          allAutocompleteItems,
        )
        setAutocompleteItems(filtered)
        setShowAutocomplete(filtered.length > 0)
        setSelectedIndex(0)
      } else {
        setShowAutocomplete(false)
      }
    },
    [isExpression, mockData, variableCategories, allAutocompleteItems],
  )

  /**
   * Selects an autocomplete item and returns the new value
   */
  const selectAutocompleteItem = useCallback(
    (item: AutocompleteItem): { newValue: string; newCursorPosition: number } => {
      const result = insertAutocompleteItem(item, displayValue, cursorPosition)
      setShowAutocomplete(false)
      return result
    },
    [displayValue, cursorPosition],
  )

  /**
   * Handles keyboard navigation in autocomplete
   */
  const handleAutocompleteKeyDown = useCallback(
    (e: React.KeyboardEvent): AutocompleteItem | null => {
      if (!showAutocomplete) return null

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault()
          setSelectedIndex((prev) => Math.min(prev + 1, autocompleteItems.length - 1))
          return null
        case "ArrowUp":
          e.preventDefault()
          setSelectedIndex((prev) => Math.max(prev - 1, 0))
          return null
        case "Enter":
        case "Tab":
          e.preventDefault()
          return autocompleteItems[selectedIndex] || null
        case "Escape":
          setShowAutocomplete(false)
          return null
        case "ArrowLeft":
        case "ArrowRight":
          setShowAutocomplete(false)
          return null
        default:
          return null
      }
    },
    [showAutocomplete, autocompleteItems, selectedIndex],
  )

  return {
    showAutocomplete,
    autocompleteItems,
    selectedIndex,
    cursorPosition,
    setCursorPosition,
    setSelectedIndex,
    updateAutocomplete,
    selectAutocompleteItem,
    handleAutocompleteKeyDown,
    hideAutocomplete: () => setShowAutocomplete(false),
  }
}
