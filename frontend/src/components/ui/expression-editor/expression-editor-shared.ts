import type { AutocompleteItem, VariableCategory } from "./types"
import { inferTypeFromPath, getPropertiesFromPath } from "./expression-utils"

/**
 * Returns methods/properties for a given data type
 */
export const getMethodsForType = (
  type: "string" | "array" | "number" | "object" | "any",
  categories: VariableCategory[],
): AutocompleteItem[] => {
  const stringMethods = categories.find((c) => c.name === "String Methods")?.items || []
  const arrayMethods = categories.find((c) => c.name === "Array Methods")?.items || []
  const numberMethods = categories.find((c) => c.name === "Number & Math")?.items || []

  switch (type) {
    case "string":
      return stringMethods
    case "array":
      return arrayMethods
    case "number":
      return numberMethods.filter((m) => m.label.startsWith("."))
    case "object":
      return []
    default:
      return [...stringMethods, ...arrayMethods, ...numberMethods.filter((m) => m.label.startsWith("."))]
  }
}

/**
 * Parses the current word/context at cursor position
 */
export const getCurrentWord = (
  text: string,
  position: number,
): { word: string; context: string; endsWithDot: boolean; partialProperty: string } => {
  const beforeCursor = text.slice(0, position)
  const afterLastBrace = beforeCursor.lastIndexOf("{{")
  if (afterLastBrace === -1) return { word: "", context: "", endsWithDot: false, partialProperty: "" }

  const expressionPart = beforeCursor.slice(afterLastBrace + 2).trim()
  const endsWithDot = expressionPart.endsWith(".")
  const tokens = expressionPart.split(/[\s()+\-*/,]/)
  const lastToken = tokens[tokens.length - 1] || ""
  const lastDotIndex = lastToken.lastIndexOf(".")

  if (endsWithDot) {
    const context = lastToken.slice(0, -1)
    return { word: "", context, endsWithDot: true, partialProperty: "" }
  }

  if (lastDotIndex !== -1) {
    const beforeDot = lastToken.slice(0, lastDotIndex)
    const afterDot = lastToken.slice(lastDotIndex + 1)
    return {
      word: lastToken,
      context: beforeDot,
      endsWithDot: false,
      partialProperty: afterDot,
    }
  }

  return { word: lastToken, context: "", endsWithDot: false, partialProperty: "" }
}

/**
 * Filters autocomplete items based on search term and context
 */
export const filterAutocomplete = (
  searchTerm: string,
  context: string,
  endsWithDot: boolean,
  partialProperty: string,
  mockData: Record<string, unknown>,
  variableCategories: VariableCategory[],
  allAutocompleteItems: AutocompleteItem[],
): AutocompleteItem[] => {
  if (endsWithDot && context) {
    const type = inferTypeFromPath(context, mockData)

    if (type === "object") {
      const properties = getPropertiesFromPath(context, mockData)
      if (properties.length > 0) {
        return properties
      }
    }

    const methods = getMethodsForType(type, variableCategories)
    return methods.slice(0, 15)
  }

  if (context && partialProperty) {
    const type = inferTypeFromPath(context, mockData)
    const partialLower = partialProperty.toLowerCase()

    if (type === "object") {
      const properties = getPropertiesFromPath(context, mockData)
      const filtered = properties.filter((item) => item.label.toLowerCase().includes(partialLower))
      if (filtered.length > 0) {
        return filtered.slice(0, 15)
      }
    }

    const methods = getMethodsForType(type, variableCategories)
    const filteredMethods = methods.filter((item) => {
      const methodName = item.label.startsWith(".") ? item.label.slice(1) : item.label
      return methodName.toLowerCase().includes(partialLower)
    })

    if (filteredMethods.length > 0) {
      return filteredMethods.slice(0, 15)
    }

    if (type === "object") {
      const properties = getPropertiesFromPath(context, mockData)
      return properties.slice(0, 15)
    }
  }

  if (searchTerm.startsWith(".")) {
    const term = searchTerm.toLowerCase()
    if (context) {
      const type = inferTypeFromPath(context, mockData)
      const methods = getMethodsForType(type, variableCategories)
      return methods.filter((item) => item.label.toLowerCase().includes(term)).slice(0, 15)
    }
    return allAutocompleteItems
      .filter((item) => item.label.startsWith(".") && item.label.toLowerCase().includes(term))
      .slice(0, 15)
  }

  if (!searchTerm) {
    return allAutocompleteItems
      .filter(
        (item) =>
          item.label.startsWith("$json") ||
          item.label.startsWith("$input") ||
          item.label.startsWith("$now") ||
          item.label.startsWith("$node"),
      )
      .slice(0, 12)
  }

  const term = searchTerm.toLowerCase()
  return allAutocompleteItems.filter((item) => item.label.toLowerCase().includes(term)).slice(0, 12)
}

/**
 * Inserts autocomplete item at cursor position
 */
export const insertAutocompleteItem = (
  item: AutocompleteItem,
  displayValue: string,
  cursorPosition: number,
): { newValue: string; newCursorPosition: number } => {
  const { word, context, endsWithDot, partialProperty } = getCurrentWord(displayValue, cursorPosition)

  let newValue: string
  let newCursorPosition: number

  if (item.label.startsWith(".")) {
    if (endsWithDot) {
      const replaceStart = cursorPosition
      newValue = displayValue.slice(0, replaceStart) + item.insertText.slice(1) + displayValue.slice(replaceStart)
      newCursorPosition = replaceStart + item.insertText.length - 1
    } else if (partialProperty) {
      const replaceStart = cursorPosition - partialProperty.length
      newValue = displayValue.slice(0, replaceStart) + item.insertText.slice(1) + displayValue.slice(cursorPosition)
      newCursorPosition = replaceStart + item.insertText.length - 1
    } else {
      newValue = displayValue.slice(0, cursorPosition) + item.insertText + displayValue.slice(cursorPosition)
      newCursorPosition = cursorPosition + item.insertText.length
    }
  } else if (context && partialProperty) {
    const replaceStart = cursorPosition - partialProperty.length
    newValue = displayValue.slice(0, replaceStart) + item.insertText + displayValue.slice(cursorPosition)
    newCursorPosition = replaceStart + item.insertText.length
  } else if (endsWithDot) {
    newValue = displayValue.slice(0, cursorPosition) + item.insertText + displayValue.slice(cursorPosition)
    newCursorPosition = cursorPosition + item.insertText.length
  } else {
    const replaceStart = cursorPosition - word.length
    newValue = displayValue.slice(0, replaceStart) + item.insertText + displayValue.slice(cursorPosition)
    newCursorPosition = replaceStart + item.insertText.length
  }

  return { newValue, newCursorPosition }
}

/**
 * Formats a value for collapsed display
 */
export const getCollapsedResultDisplay = (value: unknown): string => {
  if (value === null) return "null"
  if (value === undefined) return "undefined"
  if (typeof value === "string") return value.length > 30 ? value.slice(0, 30) + "..." : value
  if (typeof value === "number" || typeof value === "boolean") return String(value)
  if (Array.isArray(value)) return `Array(${value.length})`
  if (typeof value === "object") return `Object{...}`
  return String(value)
}

/**
 * Default mock data for expression evaluation
 */
export const defaultMockData = {
  $json: {},
  $now: new Date().toISOString(),
  $today: new Date().toISOString().split("T")[0],
  $node: {} as Record<string, unknown>,
}
