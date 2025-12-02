interface ExpressionBackgroundHighlightProps {
  value: string
  className?: string
}

/**
 * Simple background highlighter for expressions
 * Only adds green background behind {{...}} patterns
 */
export function ExpressionBackgroundHighlight({ value, className }: ExpressionBackgroundHighlightProps) {
  if (!value) return null

  // Parse and add background to expressions
  const highlightExpression = (text: string) => {
    const parts: React.ReactNode[] = []
    let lastIndex = 0
    
    // Regex to match {{...}} expressions
    const expressionRegex = /\{\{([^}]+)\}\}/g
    let match

    while ((match = expressionRegex.exec(text)) !== null) {
      // Add text before the expression (no background)
      if (match.index > lastIndex) {
        parts.push(
          <span key={`text-${lastIndex}`} className="text-transparent select-none">
            {text.substring(lastIndex, match.index)}
          </span>
        )
      }

      // Add the expression with green background
      const fullExpression = match[0] // Includes {{ }}
      parts.push(
        <span 
          key={`expr-${match.index}`} 
          className="bg-green-100 dark:bg-green-900/30 rounded px-0.5 text-transparent select-none"
        >
          {fullExpression}
        </span>
      )

      lastIndex = match.index + match[0].length
    }

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(
        <span key={`text-${lastIndex}`} className="text-transparent select-none">
          {text.substring(lastIndex)}
        </span>
      )
    }

    return parts
  }

  return (
    <div className={className} style={{ 
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      padding: '0.5rem 0.75rem',
      pointerEvents: 'none',
      overflow: 'hidden',
      whiteSpace: 'pre-wrap',
      wordWrap: 'break-word'
    }}>
      {highlightExpression(value)}
    </div>
  )
}
