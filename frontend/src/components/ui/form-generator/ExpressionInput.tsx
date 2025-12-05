"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import { cn } from "@/lib/utils"
import { evaluateExpression } from "@/components/ui/expression-editor/expression-evaluator"
import { ExpressionEditor } from "@/components/ui/expression-editor"
import { Dialog, DialogContent, DialogTitle, VisuallyHidden } from "@/components/ui/dialog"
import { AutocompleteDropdown } from "@/components/ui/expression-editor/autocomplete-dropdown"
import { renderHighlightedText } from "@/components/ui/expression-editor/utils"
import { useExpressionMode, useExpressionAutocomplete } from "@/components/ui/expression-editor/expression-editor-hooks"
import { defaultVariableCategories } from "@/components/ui/expression-editor/default-categories"
import { getCollapsedResultDisplay } from "@/components/ui/expression-editor/expression-editor-shared"
import { Variable } from "lucide-react"
import type { VariableCategory } from "@/components/ui/expression-editor/types"

interface SelectOption {
  label: string
  value: string
}

interface ExpressionInputProps {
  value?: string
  onChange?: (value: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  label?: string
  type?: "text" | "textarea" | "select"
  options?: SelectOption[]
  context?: Record<string, unknown>
  evaluator?: (expression: string, context: Record<string, unknown>) => string
  hideRing?: boolean
  onFocus?: () => void
  onBlur?: () => void
  variableCategories?: VariableCategory[]
  nodeId?: string
}

const defaultMockData = {
  $json: {},
  $now: new Date().toISOString(),
  $today: new Date().toISOString().split("T")[0],
}

export function ExpressionInput({
  value = "",
  onChange,
  placeholder = "Enter a value",
  className,
  disabled,
  label,
  type = "text",
  options = [],
  context = {},
  evaluator,
  hideRing,
  onFocus: onFocusProp,
  onBlur: onBlurProp,
  variableCategories = defaultVariableCategories,
  nodeId,
}: ExpressionInputProps) {
  const [showToggle, setShowToggle] = React.useState(false)
  const [isFocused, setIsFocused] = React.useState(false)
  const [togglePosition, setTogglePosition] = React.useState<"top" | "bottom">("top")
  const [isFullscreen, setIsFullscreen] = React.useState(false)
  const [autocompletePosition, setAutocompletePosition] = React.useState({ top: 0, left: 0 })
  const containerRef = React.useRef<HTMLDivElement>(null)
  const inputRef = React.useRef<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(null)
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)
  const highlightRef = React.useRef<HTMLDivElement>(null)
  const mirrorRef = React.useRef<HTMLDivElement>(null)

  // Use custom hooks for expression mode and autocomplete
  const { isExpression, displayValue, wrapWithPrefix } = useExpressionMode(value)
  const mockData = React.useMemo(() => ({ ...defaultMockData, $json: context }), [context])
  
  const {
    showAutocomplete,
    autocompleteItems,
    selectedIndex,
    setCursorPosition,
    setSelectedIndex,
    updateAutocomplete,
    selectAutocompleteItem,
    handleAutocompleteKeyDown,
  } = useExpressionAutocomplete(displayValue, isExpression, mockData, variableCategories)

  const calculateTogglePosition = React.useCallback(() => {
    if (!containerRef.current || type !== "select") return

    const rect = containerRef.current.getBoundingClientRect()
    const spaceAbove = rect.top
    const toggleHeight = 28

    if (spaceAbove < toggleHeight + 12) {
      setTogglePosition("bottom")
    } else {
      setTogglePosition("top")
    }
  }, [type])

  React.useEffect(() => {
    if (showToggle && type === "select") {
      calculateTogglePosition()
    }
  }, [showToggle, calculateTogglePosition, type])

  const calculateCursorPosition = React.useCallback((cursorIndex: number) => {
    const textarea = textareaRef.current
    if (!textarea || !mirrorRef.current) return

    const mirror = mirrorRef.current
    const textBeforeCursor = displayValue.slice(0, cursorIndex)

    mirror.textContent = textBeforeCursor

    const span = document.createElement("span")
    span.textContent = "|"
    mirror.appendChild(span)
    const spanRect = span.getBoundingClientRect()
    mirror.removeChild(span)

    // Get textarea position in viewport
    const textareaRect = textarea.getBoundingClientRect()

    const lines = textBeforeCursor.split("\n")
    const currentLineIndex = lines.length - 1

    const lineHeight = 24
    const paddingTop = 8
    
    // Calculate absolute position in viewport
    const top = textareaRect.top + paddingTop + currentLineIndex * lineHeight + lineHeight
    const left = Math.min(spanRect.left, window.innerWidth - 320)

    setAutocompletePosition({ top, left: Math.max(left, 40) })
  }, [displayValue])

  const adjustTextareaHeight = React.useCallback(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = "38px"
      const scrollHeight = textarea.scrollHeight
      const maxHeight = 200
      if (scrollHeight > 38) {
        textarea.style.height = `${Math.min(scrollHeight, maxHeight)}px`
      }
    }
  }, [])

  React.useEffect(() => {
    if (isExpression) {
      adjustTextareaHeight()
    }
  }, [isExpression, displayValue, adjustTextareaHeight])

  const evaluatedResult = React.useMemo(() => {
    if (!isExpression || !displayValue) return null

    if (evaluator) {
      try {
        const result = evaluator(displayValue, context)
        return { value: result }
      } catch (e) {
        return { error: `Error: ${e instanceof Error ? e.message : "Invalid expression"}` }
      }
    }

    // Use the expression evaluator
    const result = evaluateExpression(displayValue, mockData)
    
    if (result.success) {
      if (result.value === "undefined" || result.type === "undefined") {
        return { error: "⚠ Undefined - field does not exist" }
      }
      return { value: getCollapsedResultDisplay(result.value) }
    } else {
      return { error: `Error: ${result.error}` }
    }
  }, [isExpression, displayValue, mockData, evaluator, context])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const newValue = e.target.value
    onChange?.(wrapWithPrefix(newValue))
    
    // Update autocomplete for textarea
    if (isExpression && textareaRef.current) {
      const cursorPos = textareaRef.current.selectionStart || 0
      setCursorPosition(cursorPos)
      updateAutocomplete(newValue, cursorPos)
      calculateCursorPosition(cursorPos)
    }
  }

  const handleFocus = () => {
    setShowToggle(true)
    setIsFocused(true)
    onFocusProp?.()
  }

  const handleBlur = () => {
    setShowToggle(false)
    setIsFocused(false)
    onBlurProp?.()
  }

  const toggleMode = () => {
    if (isExpression) {
      onChange?.(displayValue)
    } else {
      onChange?.("=" + displayValue)
      setIsFocused(true)
      setShowToggle(true)
    }
  }

  const handleAutocompleteSelect = (item: any) => {
    const { newValue, newCursorPosition } = selectAutocompleteItem(item)
    onChange?.(wrapWithPrefix(newValue))

    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus()
        textareaRef.current.setSelectionRange(newCursorPosition, newCursorPosition)
      }
    }, 0)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const selectedItem = handleAutocompleteKeyDown(e)
    if (selectedItem) {
      handleAutocompleteSelect(selectedItem)
    }
  }

  const handleClick = (e: React.MouseEvent<HTMLTextAreaElement>) => {
    const cursorPos = e.currentTarget.selectionStart || 0
    setCursorPosition(cursorPos)
    calculateCursorPosition(cursorPos)
  }

  const handleKeyUp = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const cursorPos = e.currentTarget.selectionStart || 0
    calculateCursorPosition(cursorPos)
  }

  const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    if (highlightRef.current) {
      highlightRef.current.scrollTop = e.currentTarget.scrollTop
      highlightRef.current.scrollLeft = e.currentTarget.scrollLeft
    }
  }

  React.useEffect(() => {
    if (isExpression && isFocused && textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [isExpression, isFocused])

  const InlineToggleButton = () => (
    <button
      type="button"
      onMouseDown={(e) => {
        e.preventDefault()
        toggleMode()
      }}
      disabled={disabled}
      className={cn(
        "flex items-center justify-center w-6 h-6 rounded text-xs font-bold",
        "transition-all duration-150",
        showToggle ? "opacity-100" : "opacity-0",
        isExpression
          ? "bg-[#ff6d5a] text-white hover:bg-[#e55c4a]"
          : "bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80",
      )}
      title={isExpression ? "Switch to Fixed" : "Switch to Expression"}
    >
      fx
    </button>
  )

  const FloatingToggleButton = () => (
    <button
      type="button"
      onMouseDown={(e) => {
        e.preventDefault()
        toggleMode()
      }}
      disabled={disabled}
      className={cn(
        "absolute right-0 flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium z-20",
        "transition-all duration-200 ease-out",
        togglePosition === "top" ? "-top-7" : "-bottom-7",
        showToggle ? "opacity-100" : "opacity-0 pointer-events-none",
        showToggle && togglePosition === "top" && "translate-y-0",
        showToggle && togglePosition === "bottom" && "translate-y-0",
        !showToggle && togglePosition === "top" && "-translate-y-1",
        !showToggle && togglePosition === "bottom" && "translate-y-1",
        isExpression
          ? "border-[#ff6d5a] bg-[#ff6d5a] text-white hover:bg-[#e55c4a]"
          : "border-border bg-background text-muted-foreground hover:text-foreground hover:bg-muted",
      )}
    >
      <span className="font-bold">fx</span>
      <span>{isExpression ? "Expression" : "Fixed"}</span>
    </button>
  )

  const renderInput = () => {
    if (isExpression) {
      return (
        <div className="relative">
          <div
            className={cn(
              "rounded-md border transition-all duration-200 ease-out overflow-hidden",
              "border-input bg-background",
              isFocused && !hideRing && "ring-2 ring-ring ring-offset-1",
              className,
            )}
          >
            <div className="relative">
              {/* Background for prefix area */}
              <div className="absolute left-0 top-0 bottom-0 w-9 bg-muted/50 rounded-l-md border-r border-border z-[5]" />
              
              <div className="absolute left-2 top-3 flex items-center justify-center w-5 h-5 z-10">
                <Variable className="w-4 h-4 text-primary" />
              </div>

              {/* Mirror for cursor position calculation */}
              <div
                ref={mirrorRef}
                className={cn(
                  "absolute inset-0 px-3 py-2 pl-10 pr-9 text-sm font-mono",
                  "pointer-events-none overflow-hidden opacity-0 whitespace-pre-wrap break-words"
                )}
                aria-hidden="true"
              />
              
              {/* Syntax highlighting overlay */}
              <div
                ref={highlightRef}
                className={cn(
                  "absolute inset-0 px-3 py-2 pl-10 pr-9 text-sm font-mono",
                  "pointer-events-none overflow-hidden whitespace-pre-wrap break-words"
                )}
                aria-hidden="true"
              >
                {renderHighlightedText(displayValue, "$json.field or expression", mockData)}
              </div>

              {/* Actual textarea */}
              <textarea
                ref={textareaRef}
                value={displayValue}
                onChange={(e) => {
                  handleChange(e)
                  adjustTextareaHeight()
                }}
                onKeyDown={handleKeyDown}
                onKeyUp={handleKeyUp}
                onClick={handleClick}
                onFocus={handleFocus}
                onBlur={handleBlur}
                onScroll={handleScroll}
                disabled={disabled}
                placeholder=""
                className={cn(
                  "relative flex w-full px-3 py-2 pl-10 text-sm",
                  "placeholder:text-muted-foreground/50",
                  "focus-visible:outline-none",
                  "disabled:cursor-not-allowed disabled:opacity-50",
                  "transition-all duration-200 ease-out",
                  "bg-transparent font-mono text-transparent caret-foreground",
                  "resize-none overflow-hidden",
                  "pr-9",
                  "border-0",
                  "z-10"
                )}
              />
              
              <div className="absolute right-1.5 top-2 z-20">
                <InlineToggleButton />
              </div>
            </div>
            {isFocused && (
              <div className="border-t border-input/50 bg-muted/30 px-3 py-2">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-0.5">Result</div>
                    <div className="text-sm text-foreground font-medium truncate">
                      {evaluatedResult ? (
                        evaluatedResult.error ? (
                          <span className="text-destructive">{evaluatedResult.error}</span>
                        ) : (
                          <span className="text-foreground">{evaluatedResult.value}</span>
                        )
                      ) : (
                        <span className="text-muted-foreground italic">Empty</span>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault()
                      setIsFullscreen(true)
                    }}
                    className="ml-2 p-1 text-muted-foreground hover:text-foreground transition-colors"
                    title="Open in full editor"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="w-3 h-3"
                    >
                      <polyline points="15 3 21 3 21 9" />
                      <polyline points="9 21 3 21 3 15" />
                      <line x1="21" y1="3" x2="14" y2="10" />
                      <line x1="3" y1="21" x2="10" y2="14" />
                    </svg>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Autocomplete dropdown - rendered via portal to escape overflow containers */}
          {showAutocomplete && typeof document !== 'undefined' && createPortal(
            <div className="fixed z-[9999]" style={{ top: autocompletePosition.top, left: autocompletePosition.left }}>
              <AutocompleteDropdown
                items={autocompleteItems}
                selectedIndex={selectedIndex}
                onSelect={handleAutocompleteSelect}
                onHover={setSelectedIndex}
                position={{ top: 0, left: 0 }}
              />
            </div>,
            document.body
          )}
        </div>
      )
    }

    const baseStyles = cn(
      "flex w-full rounded-md border px-3 py-2 text-sm",
      "placeholder:text-muted-foreground",
      !hideRing &&
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-ring",
      hideRing && "focus-visible:outline-none",
      "disabled:cursor-not-allowed disabled:opacity-50",
      "transition-all duration-200 ease-out",
      "border-input bg-background font-sans text-foreground",
    )

    if (type === "textarea") {
      return (
        <div className="relative">
          <textarea
            ref={inputRef as React.RefObject<HTMLTextAreaElement>}
            value={value}
            onChange={handleChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            disabled={disabled}
            placeholder={placeholder}
            rows={4}
            className={cn(baseStyles, "resize-none pr-9", className)}
          />
          <div className="absolute right-1.5 top-1.5">
            <InlineToggleButton />
          </div>
        </div>
      )
    }

    if (type === "select") {
      return (
        <select
          ref={inputRef as React.RefObject<HTMLSelectElement>}
          value={value}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          disabled={disabled}
          className={cn(baseStyles, className)}
        >
          <option value="">{placeholder || "Select an option..."}</option>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      )
    }

    return (
      <div className="relative">
        <input
          ref={inputRef as React.RefObject<HTMLInputElement>}
          type="text"
          value={value}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          disabled={disabled}
          placeholder={placeholder}
          className={cn(baseStyles, "pr-9", className)}
        />
        <div className="absolute right-1.5 top-1/2 -translate-y-1/2">
          <InlineToggleButton />
        </div>
      </div>
    )
  }

  // Fullscreen editor modal using Dialog component for proper layering
  const fullscreenEditor = (
    <Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
      <DialogContent className="max-w-5xl w-[95vw] h-[90vh] p-0 gap-0 flex flex-col overflow-hidden">
        <VisuallyHidden>
          <DialogTitle>Expression Editor</DialogTitle>
        </VisuallyHidden>
        <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/50 shrink-0">
          <span className="text-sm font-semibold text-foreground">Expression Editor</span>
        </div>
        <div className="flex-1 overflow-hidden">
          <ExpressionEditor
            initialValue={value}
            mockData={mockData}
            variableCategories={variableCategories}
            onChange={(newValue) => onChange?.(newValue)}
            placeholder={placeholder}
            nodeId={nodeId}
          />
        </div>
      </DialogContent>
    </Dialog>
  )

  return (
    <>
      {fullscreenEditor}
      <div className="w-full space-y-1.5">
        {label && <label className="text-sm font-medium text-foreground">{label}</label>}
        <div
          ref={containerRef}
          className="relative"
          onMouseEnter={() => setShowToggle(true)}
          onMouseLeave={() => !isFocused && setShowToggle(false)}
        >
          {type === "select" && <FloatingToggleButton />}

          <div className="relative">{renderInput()}</div>
        </div>
      </div>
    </>
  )
}
