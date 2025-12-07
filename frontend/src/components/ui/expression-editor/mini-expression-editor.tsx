"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { ChevronsUpDown, FunctionSquare, Variable } from "lucide-react"
import { cn } from "@/lib/utils"
import { evaluateExpression } from "./expression-evaluator"
import { ExpressionEditor } from "./index"
import { AutocompleteDropdown } from "./autocomplete-dropdown"
import { Dialog, DialogContent, DialogTitle, VisuallyHidden } from "@/components/ui/dialog"
import { renderHighlightedText } from "./utils"
import type { VariableCategory, AutocompleteItem } from "./types"
import { defaultVariableCategories } from "./default-categories"
import { useExpressionMode, useExpressionAutocomplete } from "./expression-editor-hooks"
import { getCollapsedResultDisplay, defaultMockData } from "./expression-editor-shared"

interface SelectOption {
  label: string
  value: string
}

interface MiniExpressionEditorProps {
  value?: string
  onChange?: (value: string) => void
  onBlur?: () => void
  placeholder?: string
  mockData?: Record<string, unknown>
  variableCategories?: VariableCategory[]
  label?: string
  error?: string
  className?: string
  fieldType?: "input" | "select"
  options?: SelectOption[]
  nodeId?: string
}

export function MiniExpressionEditor({
  value = "",
  onChange,
  onBlur,
  placeholder = "Enter value or {{ expression }}",
  mockData: providedMockData,
  variableCategories = defaultVariableCategories,
  error,
  className,
  fieldType = "input",
  options = [],
  nodeId,
}: MiniExpressionEditorProps) {
  const mockData = providedMockData || defaultMockData
  
  // Use custom hooks
  const { isExpression, displayValue, wrapWithPrefix } = useExpressionMode(value)
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
  
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [result, setResult] = useState<any | null>(null)
  const [showSelectDropdown, setShowSelectDropdown] = useState(false)
  const [isFocused, setIsFocused] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  
  const inputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const selectRef = useRef<HTMLButtonElement>(null)
  const highlightRef = useRef<HTMLDivElement>(null)

  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = "38px"
      const scrollHeight = textarea.scrollHeight
      const maxHeight = 200
      if (scrollHeight > 38) {
        textarea.style.height = `${Math.min(scrollHeight, maxHeight)}px`
      }
      // Sync highlight overlay height
      if (highlightRef.current) {
        highlightRef.current.style.height = textarea.style.height
      }
    }
  }, [])

  const getSelectedLabel = useCallback(() => {
    const option = options.find((opt) => opt.value === displayValue)
    return option?.label || displayValue || placeholder
  }, [displayValue, options, placeholder])

  useEffect(() => {
    if (isExpression) {
      const evalResult = evaluateExpression(displayValue, mockData)
      setResult(evalResult)
    } else {
      setResult(null)
    }
  }, [displayValue, isExpression, mockData])

  useEffect(() => {
    if (isExpression) {
      adjustTextareaHeight()
    }
  }, [isExpression, displayValue, adjustTextareaHeight])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const newValue = e.target.value
    
    // Emit the value with proper "=" handling
    onChange?.(wrapWithPrefix(newValue))
    
    const textarea = textareaRef.current
    const cursorPos = textarea?.selectionStart || 0
    setCursorPosition(cursorPos)
    
    // Update autocomplete
    updateAutocomplete(newValue, cursorPos)
  }

  const handleFocus = () => {
    setIsFocused(true)
  }

  const handleBlur = () => {
    setTimeout(() => {
      setIsFocused(false)
      onBlur?.()
    }, 150)
  }

  const handleAutocompleteSelect = (item: AutocompleteItem) => {
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

  const handleSelectOption = (option: SelectOption) => {
    onChange?.(option.value)
    setShowSelectDropdown(false)
  }

  const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    if (highlightRef.current) {
      highlightRef.current.scrollTop = e.currentTarget.scrollTop
      highlightRef.current.scrollLeft = e.currentTarget.scrollLeft
    }
  }

  // Fullscreen editor modal using Dialog component for proper layering
  const fullscreenEditor = isFullscreen ? (
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
  ) : null

  const toggleMode = () => {
    if (isExpression) {
      // Switch to fixed mode - remove "=" prefix
      onChange?.(displayValue)
    } else {
      // Switch to expression mode - add "=" prefix
      onChange?.("=" + displayValue)
      setIsFocused(true)
    }
  }

  // Focus textarea when switching to expression mode
  useEffect(() => {
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
      className={cn(
        "flex items-center justify-center w-6 h-6 rounded-md",
        "transition-colors",
        isHovered || isFocused ? "opacity-100" : "opacity-0",
        isExpression
          ? "bg-primary text-primary-foreground hover:bg-primary/90"
          : "hover:bg-accent hover:text-accent-foreground",
      )}
      title={isExpression ? "Switch to Fixed" : "Switch to Expression"}
    >
      <FunctionSquare className="w-3.5 h-3.5" />
    </button>
  )

  return (
    <>
      {fullscreenEditor}
      <div 
        className={cn("w-full relative", className)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div
          className={cn(
            "relative rounded-md border border-input bg-transparent shadow-sm transition-colors",
            isFocused && "outline-none ring-1 ring-ring",
            error && "border-destructive",
          )}
        >
        {!isExpression ? (
          // Fixed mode - simple input or select
          <div className="relative">
            {fieldType === "select" ? (
              <>
                <button
                  ref={selectRef}
                  type="button"
                  onClick={() => setShowSelectDropdown(!showSelectDropdown)}
                  onFocus={handleFocus}
                  onBlur={handleBlur}
                  className="w-full h-9 pl-3 pr-9 text-sm text-left border-0 bg-transparent focus:outline-none flex items-center justify-between"
                >
                  <span className="truncate text-foreground">{getSelectedLabel()}</span>
                  <ChevronsUpDown className="w-4 h-4 text-muted-foreground shrink-0" />
                </button>

                {showSelectDropdown && (
                  <div className="absolute z-50 w-full left-0 top-full mt-1 bg-popover border border-border rounded-md shadow-md overflow-hidden">
                    <div className="max-h-48 overflow-y-auto py-1">
                      {options.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => handleSelectOption(option)}
                          className={cn(
                            "w-full px-3 py-2 text-sm text-left hover:bg-accent hover:text-accent-foreground transition-colors",
                            displayValue === option.value && "bg-accent text-accent-foreground",
                          )}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div className="absolute right-1.5 top-1/2 -translate-y-1/2">
                  <InlineToggleButton />
                </div>
              </>
            ) : (
              <>
                <input
                  ref={inputRef}
                  type="text"
                  value={displayValue}
                  onChange={handleChange}
                  onFocus={handleFocus}
                  onBlur={handleBlur}
                  placeholder={placeholder}
                  className="w-full h-9 px-3 pr-9 text-sm border-0 bg-transparent focus:outline-none placeholder:text-muted-foreground"
                />
                <div className="absolute right-1.5 top-1/2 -translate-y-1/2">
                  <InlineToggleButton />
                </div>
              </>
            )}
          </div>
        ) : (
          // Expression mode with syntax highlighting and autocomplete
          <div>
            <div className="relative">
              {/* Background for prefix area */}
              <div className="absolute left-0 top-0 bottom-0 w-9 bg-muted/50 rounded-l-md border-r border-border z-[5]" />
              
              <div className="absolute left-2 top-3 flex items-center justify-center w-5 h-5 z-10">
                <Variable className="w-4 h-4 text-primary" />
              </div>
              
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
                onFocus={handleFocus}
                onBlur={handleBlur}
                onScroll={handleScroll}
                placeholder=""
                className={cn(
                  "relative flex w-full px-3 py-2 pl-10 text-sm",
                  "placeholder:text-muted-foreground/50",
                  "focus-visible:outline-none",
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

              {/* Autocomplete dropdown */}
              {showAutocomplete && (
                <div className="absolute z-50 w-full left-0 top-full mt-1">
                  <AutocompleteDropdown
                    items={autocompleteItems}
                    selectedIndex={selectedIndex}
                    onSelect={handleAutocompleteSelect}
                    onHover={setSelectedIndex}
                    position={{ top: 0, left: 0 }}
                  />
                </div>
              )}
            </div>
            
            {isFocused && (
              <div className="border-t border-border bg-muted/50 px-3 py-2">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-0.5">Result</div>
                    <div className="text-sm font-medium truncate">
                      {result?.success ? (
                        result.value === "undefined" || result.type === "undefined" ? (
                          <span className="text-destructive">⚠ Undefined - field does not exist</span>
                        ) : (
                          <span className="text-foreground">{getCollapsedResultDisplay(result.value)}</span>
                        )
                      ) : result?.error ? (
                        <span className="text-destructive">Error: {result.error}</span>
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
                    className="ml-2 p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
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
                      className="w-3.5 h-3.5"
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
        )}
      </div>

      {error && <p className="text-sm text-destructive mt-1.5">{error}</p>}
      </div>
    </>
  )
}
