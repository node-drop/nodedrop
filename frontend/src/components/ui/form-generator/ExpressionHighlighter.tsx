import { cn } from '@/lib/utils'

interface ExpressionHighlighterProps {
  value: string
  className?: string
}

/**
 * Highlights expression syntax in the format {{...}}
 * This component parses the input and applies syntax highlighting to:
 * - Expression delimiters: {{ }}
 * - Variable names: json, $item, $node, etc.
 * - Properties: .fieldName, .property
 * - Functions: toUpperCase(), split(), etc.
 * - Array accessors: [0], [index]
 */
export function ExpressionHighlighter({ value, className }: ExpressionHighlighterProps) {
  if (!value) return null

  // Parse and highlight expressions
  const highlightExpression = (text: string) => {
    const parts: React.ReactNode[] = []
    let lastIndex = 0
    
    // Regex to match {{...}} expressions
    const expressionRegex = /\{\{([^}]+)\}\}/g
    let match

    while ((match = expressionRegex.exec(text)) !== null) {
      // Add text before the expression
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index))
      }

      // Highlight the expression content
      const expressionContent = match[1]
      parts.push(
        <span key={match.index} className="inline-flex items-center bg-blue-100 dark:bg-blue-900/30 px-1 rounded">
          <span className="text-orange-600 dark:text-orange-400 font-bold">{'{{'}</span>
          {highlightExpressionContent(expressionContent)}
          <span className="text-orange-600 dark:text-orange-400 font-bold">{'}}'}</span>
        </span>
      )

      lastIndex = match.index + match[0].length
    }

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex))
    }

    return parts
  }

  // Highlight the content inside {{ }}
  const highlightExpressionContent = (content: string) => {
    const parts: React.ReactNode[] = []
    
    // Split by dots and brackets while keeping delimiters
    const tokens = content.split(/(\.|[[\]]|\(|\)|,|\s+)/)
    
    tokens.forEach((token, index) => {
      if (!token) return

      // Check token type and apply appropriate styling
      if (token === '.' || token === '[' || token === ']' || token === '(' || token === ')' || token === ',') {
        // Operators and delimiters
        parts.push(
          <span key={index} className="text-gray-600 dark:text-gray-300">
            {token}
          </span>
        )
      } else if (/^\d+$/.test(token)) {
        // Numbers
        parts.push(
          <span key={index} className="text-purple-700 dark:text-purple-300 font-medium">
            {token}
          </span>
        )
      } else if (token.startsWith('$')) {
        // Special variables ($item, $node, $workflow, etc.)
        parts.push(
          <span key={index} className="text-blue-700 dark:text-blue-300 font-semibold">
            {token}
          </span>
        )
      } else if (token === 'json') {
        // json keyword
        parts.push(
          <span key={index} className="text-emerald-700 dark:text-emerald-300 font-semibold">
            {token}
          </span>
        )
      } else if (/^[a-zA-Z_]\w*$/.test(token)) {
        // Properties and function names
        parts.push(
          <span key={index} className="text-cyan-700 dark:text-cyan-300 font-medium">
            {token}
          </span>
        )
      } else if (token.match(/^['"].*['"]$/)) {
        // Strings
        parts.push(
          <span key={index} className="text-green-700 dark:text-green-300">
            {token}
          </span>
        )
      } else if (token.trim()) {
        // Other content
        parts.push(<span key={index} className="text-gray-900 dark:text-gray-100">{token}</span>)
      } else {
        // Whitespace
        parts.push(<span key={index}>{token}</span>)
      }
    })

    return parts
  }

  return (
    <div className={cn('font-mono text-sm', className)}>
      {highlightExpression(value)}
    </div>
  )
}
