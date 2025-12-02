import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import * as React from "react"

export interface JsonEditorProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  value?: string
  onValueChange?: (value: string) => void
  error?: string
  label?: string
  description?: string
  required?: boolean
}

const JsonEditor = React.forwardRef<HTMLTextAreaElement, JsonEditorProps>(
  ({ className, value, onValueChange, error, label, description, required, onChange, ...props }, ref) => {
    const [internalValue, setInternalValue] = React.useState(value || "")
    const [validationError, setValidationError] = React.useState<string>("")

    React.useEffect(() => {
      if (value !== undefined) {
        setInternalValue(value)
      }
    }, [value])

    const validateJson = (jsonString: string) => {
      if (!jsonString.trim()) {
        setValidationError("")
        return true
      }

      try {
        JSON.parse(jsonString)
        setValidationError("")
        return true
      } catch (err) {
        const error = err as Error
        setValidationError(`Invalid JSON: ${error.message}`)
        return false
      }
    }

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value
      setInternalValue(newValue)
      validateJson(newValue)
      onValueChange?.(newValue)
      onChange?.(e)
    }

    const formatJson = () => {
      try {
        const parsed = JSON.parse(internalValue)
        const formatted = JSON.stringify(parsed, null, 2)
        setInternalValue(formatted)
        setValidationError("")
        onValueChange?.(formatted)
      } catch (error) {
        // If JSON is invalid, don't format
      }
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // Format JSON on Ctrl+Shift+F (or Cmd+Shift+F on Mac)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'F') {
        e.preventDefault()
        formatJson()
      }

      // Auto-indent on Enter
      if (e.key === 'Enter') {
        const textarea = e.currentTarget
        const start = textarea.selectionStart
        const lineStart = internalValue.lastIndexOf('\n', start - 1) + 1
        const lineText = internalValue.slice(lineStart, start)
        const indent = lineText.match(/^\s*/)?.[0] || ''
        
        // Add extra indent if line ends with { or [
        const extraIndent = lineText.trim().endsWith('{') || lineText.trim().endsWith('[') ? '  ' : ''
        
        e.preventDefault()
        const newValue = 
          internalValue.slice(0, start) + 
          '\n' + indent + extraIndent + 
          internalValue.slice(start)
        
        setInternalValue(newValue)
        onValueChange?.(newValue)
        
        // Set cursor position after the new indent
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = start + 1 + indent.length + extraIndent.length
        }, 0)
      }

      // Auto-complete brackets
      if (e.key === '{') {
        const textarea = e.currentTarget
        const start = textarea.selectionStart
        e.preventDefault()
        const newValue = 
          internalValue.slice(0, start) + 
          '{}' + 
          internalValue.slice(start)
        
        setInternalValue(newValue)
        onValueChange?.(newValue)
        
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = start + 1
        }, 0)
      }

      if (e.key === '[') {
        const textarea = e.currentTarget
        const start = textarea.selectionStart
        e.preventDefault()
        const newValue = 
          internalValue.slice(0, start) + 
          '[]' + 
          internalValue.slice(start)
        
        setInternalValue(newValue)
        onValueChange?.(newValue)
        
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = start + 1
        }, 0)
      }
    }

    const displayError = error || validationError
    const fieldId = React.useId()

    return (
      <div className="flex flex-col h-full space-y-2">
        {label && (
          <Label 
            htmlFor={fieldId}
            className={cn(
              "flex items-center gap-1",
              displayError && "text-destructive"
            )}
          >
            {label}
            {required && <span className="text-destructive">*</span>}
          </Label>
        )}
        
        {description && (
          <p className="text-sm text-muted-foreground">
            {description}
          </p>
        )}

        <div className={cn(
          "relative flex-1 flex min-h-0 border  overflow-hidden",
          displayError && "border-destructive"
        )}>
          {/* Line Numbers */}
          <div className="flex-shrink-0 select-none bg-muted/30 border-r px-2 py-2 text-xs font-mono text-muted-foreground leading-6">
            {internalValue.split('\n').map((_, index) => (
              <div key={index + 1} className="text-right min-w-[2rem]">
                {index + 1}
              </div>
            ))}
          </div>
          
          {/* Text Area */}
          <div className="flex-1 relative">
            <Textarea
              id={fieldId}
              className={cn(
                "font-mono text-sm leading-6 resize-none h-full min-h-0 w-full border-0",
                "focus:ring-2 focus:ring-ring focus:ring-offset-0 focus:border-0",
                "transition-colors pl-3 rounded-none",
                displayError && "focus:ring-destructive",
                className
              )}
              ref={ref}
              value={internalValue}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              spellCheck={false}
              aria-invalid={!!displayError}
              aria-describedby={displayError ? `${fieldId}-error` : undefined}
              style={{
                outline: 'none',
                boxShadow: 'none',
              }}
              {...props}
            />
            <div className="absolute top-2 right-2 text-xs text-muted-foreground bg-background/80 px-1 rounded">
              Ctrl+Shift+F to format
            </div>
          </div>
        </div>

        {displayError && (
          <p 
            id={`${fieldId}-error`}
            className="text-sm font-medium text-destructive"
          >
            {displayError}
          </p>
        )}
      </div>
    )
  }
)
JsonEditor.displayName = "JsonEditor"

export { JsonEditor }

