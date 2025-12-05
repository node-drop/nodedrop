import type { JSX } from "react"
import { evaluateExpression } from "./expression-evaluator"

// Shared syntax highlighting function for expression editor
export function renderHighlightedText(
  text: string,
  placeholder?: string,
  evaluationContext?: Record<string, unknown>,
): JSX.Element | JSX.Element[] {
  if (!text) {
    return <span className="text-muted-foreground">{placeholder}</span>
  }

  const parts: JSX.Element[] = []
  let i = 0

  while (i < text.length) {
    if (text[i] === "{" && text[i + 1] === "{") {
      let endIndex = text.indexOf("}}", i + 2)

      if (endIndex !== -1) {
        endIndex += 2
        const content = text.slice(i + 2, endIndex - 2)
        const fullExpression = text.slice(i, endIndex)

        // Evaluate expression to check if it's undefined
        let isUndefined = false
        if (evaluationContext) {
          const result = evaluateExpression(fullExpression, evaluationContext)
          isUndefined = result.success && (result.value === "undefined" || result.type === "undefined")
        }

        const bgColor = isUndefined
          ? "bg-red-100 dark:bg-red-900/30"
          : "bg-green-100 dark:bg-green-900/30"
        
        const textColor = isUndefined
          ? "text-red-600 dark:text-red-400"
          : "text-green-600 dark:text-green-400"

        parts.push(
          <span key={`expr-${i}`} className={`${bgColor} rounded-sm`}>
            <span className={`${textColor} font-semibold`}>{"{{"}</span>
            <span className={textColor}>{content}</span>
            <span className={`${textColor} font-semibold`}>{"}}"}</span>
          </span>,
        )
        i = endIndex
      } else {
        parts.push(
          <span key={`partial-${i}`} className="bg-green-100 dark:bg-green-900/30 rounded-sm">
            <span className="text-orange-600 dark:text-orange-400 font-semibold">{"{{"}</span>
            <span className="text-green-600 dark:text-green-400">{text.slice(i + 2)}</span>
          </span>,
        )
        i = text.length
      }
    } else {
      let nextExpr = text.indexOf("{{", i)
      if (nextExpr === -1) nextExpr = text.length

      const normalText = text.slice(i, nextExpr)
      if (normalText) {
        parts.push(
          <span key={`text-${i}`} className="text-foreground">
            {normalText}
          </span>,
        )
      }
      i = nextExpr
    }
  }

  return parts
}
