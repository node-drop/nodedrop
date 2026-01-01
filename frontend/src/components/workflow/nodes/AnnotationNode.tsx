import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuSub, ContextMenuSubContent, ContextMenuSubTrigger, ContextMenuTrigger } from '@/components/ui/context-menu'
import { useDetachNodes } from '@/hooks/workflow'
import { useCopyPasteStore, useWorkflowStore } from '@/stores'
import { NodeProps, NodeResizer, useReactFlow, ResizeParams } from '@xyflow/react'
import { Copy, Palette, Scissors, Trash2, Ungroup, StickyNote, Type } from 'lucide-react'
import { memo, useCallback, useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

// Available annotation colors - sticky note style with backgrounds
const ANNOTATION_COLORS = [
  { name: 'Yellow', value: '#fef9c3', text: '#854d0e', border: '#fde047' },
  { name: 'Green', value: '#dcfce7', text: '#166534', border: '#86efac' },
  { name: 'Blue', value: '#dbeafe', text: '#1e40af', border: '#93c5fd' },
  { name: 'Purple', value: '#f3e8ff', text: '#6b21a8', border: '#d8b4fe' },
  { name: 'Pink', value: '#fce7f3', text: '#9d174d', border: '#f9a8d4' },
  { name: 'Orange', value: '#ffedd5', text: '#9a3412', border: '#fdba74' },
  { name: 'Gray', value: '#f3f4f6', text: '#374151', border: '#d1d5db' },
  { name: 'White', value: '#ffffff', text: '#374151', border: '#e5e7eb' },
]

// Annotation display styles
type AnnotationStyle = 'sticky' | 'text'

function AnnotationNode({ id, data, selected, parentId }: NodeProps) {
  const { updateNode, workflow, updateWorkflow, saveToHistory } = useWorkflowStore()
  const { copy, cut } = useCopyPasteStore()
  const { setNodes } = useReactFlow()
  const detachNodes = useDetachNodes()
  const [isEditing, setIsEditing] = useState(false)
  const editableRef = useRef<HTMLDivElement>(null)
  
  // Get label and color from parameters or data
  const dataAny = data as any
  const currentLabel = (dataAny.parameters?.label || dataAny.label || 'Add your note here...') as string
  const currentColor = (dataAny.parameters?.color || dataAny.color || '#fef9c3') as string
  const currentStyle = (dataAny.parameters?.displayStyle || 'sticky') as AnnotationStyle
  
  // Get color config
  const colorConfig = ANNOTATION_COLORS.find(c => c.value === currentColor) || ANNOTATION_COLORS[0]
  
  // Check if node is in a group
  const isInGroup = !!parentId

  // Handle resize - persist dimensions to workflow store
  const handleResize = useCallback((_event: any, params: ResizeParams) => {
    const workflowNode = workflow?.nodes.find(n => n.id === id)
    if (!workflowNode) return
    
    // Update the node's style with new dimensions
    updateNode(id, {
      style: {
        ...workflowNode.style,
        width: params.width,
        height: params.height,
      }
    }, true) // skipHistory to avoid cluttering undo stack during drag
  }, [id, workflow, updateNode])

  // Save to history when resize ends
  const handleResizeEnd = useCallback(() => {
    saveToHistory('Resize annotation')
  }, [saveToHistory])

  // Focus and select all when entering edit mode
  useEffect(() => {
    if (isEditing && editableRef.current) {
      editableRef.current.focus()
      // Select all text
      const range = document.createRange()
      range.selectNodeContents(editableRef.current)
      const selection = window.getSelection()
      selection?.removeAllRanges()
      selection?.addRange(range)
    }
  }, [isEditing])

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setIsEditing(true)
  }, [])

  const handleSave = useCallback(() => {
    if (!editableRef.current) return
    const newText = editableRef.current.innerText.trim()
    
    if (newText && newText !== currentLabel) {
      updateNode(id, { 
        parameters: { 
          ...(typeof data.parameters === 'object' && data.parameters !== null ? data.parameters : {}),
          label: newText
        } 
      })
    }
    setIsEditing(false)
  }, [currentLabel, id, updateNode, data.parameters])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    e.stopPropagation()
    
    if (e.key === 'Escape') {
      e.preventDefault()
      if (editableRef.current) {
        editableRef.current.innerText = currentLabel
      }
      setIsEditing(false)
    }
    // Allow Enter for new lines, Shift+Enter or Ctrl+Enter to save
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      handleSave()
    }
  }, [handleSave, currentLabel])

  const handleBlur = useCallback(() => {
    setTimeout(() => handleSave(), 100)
  }, [handleSave])

  // Prevent canvas from capturing events while editing
  const stopPropagation = useCallback((e: React.SyntheticEvent) => {
    e.stopPropagation()
  }, [])

  // Delete handler
  const handleDelete = useCallback(() => {
    if (!workflow) return
    saveToHistory('Delete annotation')
    setNodes((nodes) => nodes.filter((node) => node.id !== id))
    updateWorkflow({ nodes: workflow.nodes.filter((node) => node.id !== id) }, true)
  }, [id, workflow, updateWorkflow, saveToHistory, setNodes])

  // Copy handler
  const handleCopy = useCallback(() => {
    setNodes((nodes) => nodes.map((node) => ({ ...node, selected: node.id === id })))
    setTimeout(() => copy?.(), 50)
  }, [id, copy, setNodes])

  // Cut handler
  const handleCut = useCallback(() => {
    setNodes((nodes) => nodes.map((node) => ({ ...node, selected: node.id === id })))
    setTimeout(() => cut?.(), 50)
  }, [id, cut, setNodes])

  // Ungroup handler
  const handleUngroup = useCallback(() => {
    detachNodes([id], undefined)
  }, [id, detachNodes])

  // Color change handler
  const handleColorChange = useCallback((color: string) => {
    saveToHistory('Change annotation color')
    updateNode(id, { 
      parameters: { 
        ...(typeof data.parameters === 'object' && data.parameters !== null ? data.parameters : {}),
        color
      } 
    })
  }, [id, updateNode, data.parameters, saveToHistory])

  // Style change handler
  const handleStyleChange = useCallback((displayStyle: AnnotationStyle) => {
    saveToHistory('Change annotation style')
    updateNode(id, { 
      parameters: { 
        ...(typeof data.parameters === 'object' && data.parameters !== null ? data.parameters : {}),
        displayStyle
      } 
    })
  }, [id, updateNode, data.parameters, saveToHistory])

  // Get wrapper styles based on display style
  const getWrapperStyle = () => {
    if (currentStyle === 'text') {
      return {
        backgroundColor: 'transparent',
        borderColor: selected ? 'hsl(var(--border))' : 'transparent',
        color: 'hsl(var(--foreground))',
      }
    }
    return {
      backgroundColor: colorConfig.value,
      borderColor: colorConfig.border,
      color: colorConfig.text,
    }
  }

  return (
    <>
      <NodeResizer 
        isVisible={selected}
        minWidth={150}
        minHeight={80}
        lineClassName="!border-gray-400"
        handleClassName="!w-2 !h-2 !bg-white !border-gray-400"
        onResize={handleResize}
        onResizeEnd={handleResizeEnd}
      />
      <ContextMenu>
        <ContextMenuTrigger asChild disabled={isEditing}>
          <div 
            className={`annotation-wrapper ${currentStyle === 'text' ? 'annotation-text-style' : ''}`}
            style={getWrapperStyle()}
            onContextMenu={isEditing ? stopPropagation : undefined}
          >
            {isEditing ? (
              <div
                ref={editableRef}
                className="annotation-editable nodrag nopan"
                contentEditable
                suppressContentEditableWarning
                onKeyDown={handleKeyDown}
                onBlur={handleBlur}
                onMouseDown={stopPropagation}
                onClick={stopPropagation}
                onCopy={stopPropagation}
                onCut={stopPropagation}
                onPaste={stopPropagation}
                spellCheck={false}
              >
                {currentLabel}
              </div>
            ) : (
              <div 
                className='annotation-display'
                onDoubleClick={handleDoubleClick}
              >
                <ReactMarkdown 
                  remarkPlugins={[remarkGfm]}
                  components={{
                    h1: ({node, ref, ...props}) => <h1 className="text-2xl font-bold mb-2" {...props} />,
                    h2: ({node, ref, ...props}) => <h2 className="text-xl font-bold mb-2" {...props} />,
                    h3: ({node, ref, ...props}) => <h3 className="text-lg font-bold mb-1" {...props} />,
                    p: ({node, ref, ...props}) => <p className="mb-2 last:mb-0" {...props} />,
                    ul: ({node, ref, ...props}) => <ul className="list-disc list-inside mb-2" {...props} />,
                    ol: ({node, ref, ...props}) => <ol className="list-decimal list-inside mb-2" {...props} />,
                    li: ({node, ref, ...props}) => <li className="ml-2" {...props} />,
                    code: ({node, ref, inline, ...props}: any) => 
                      inline 
                        ? <code className="bg-black/10 px-1 rounded text-sm" {...props} />
                        : <code className="block bg-black/10 p-2 rounded text-sm my-2" {...props} />,
                    pre: ({node, ref, ...props}) => <pre className="my-2" {...props} />,
                    blockquote: ({node, ref, ...props}) => <blockquote className="border-l-4 border-current/30 pl-3 italic my-2" {...props} />,
                    a: ({node, ref, ...props}) => <a className="underline hover:opacity-70" {...props} />,
                    strong: ({node, ref, ...props}) => <strong className="font-bold" {...props} />,
                    em: ({node, ref, ...props}) => <em className="italic" {...props} />,
                  }}
                >
                  {currentLabel}
                </ReactMarkdown>
              </div>
            )}
          </div>
        </ContextMenuTrigger>
        
        <ContextMenuContent className="w-48">
          <ContextMenuItem onClick={handleCopy} className="cursor-pointer">
            <Copy className="mr-2 h-4 w-4" />
            Copy
          </ContextMenuItem>

          <ContextMenuItem onClick={handleCut} className="cursor-pointer">
            <Scissors className="mr-2 h-4 w-4" />
            Cut
          </ContextMenuItem>

          <ContextMenuSeparator />

          <ContextMenuSub>
            <ContextMenuSubTrigger className="cursor-pointer">
              <StickyNote className="mr-2 h-4 w-4" />
              Style
            </ContextMenuSubTrigger>
            <ContextMenuSubContent className="w-32">
              <ContextMenuItem
                onClick={() => handleStyleChange('sticky')}
                className="cursor-pointer"
              >
                <StickyNote className="mr-2 h-4 w-4" />
                Sticky Note
                {currentStyle === 'sticky' && <span className="ml-auto">✓</span>}
              </ContextMenuItem>
              <ContextMenuItem
                onClick={() => handleStyleChange('text')}
                className="cursor-pointer"
              >
                <Type className="mr-2 h-4 w-4" />
                Text
                {currentStyle === 'text' && <span className="ml-auto">✓</span>}
              </ContextMenuItem>
            </ContextMenuSubContent>
          </ContextMenuSub>

          {currentStyle === 'sticky' && (
            <ContextMenuSub>
              <ContextMenuSubTrigger className="cursor-pointer">
                <Palette className="mr-2 h-4 w-4" />
                Color
              </ContextMenuSubTrigger>
              <ContextMenuSubContent className="w-32">
                {ANNOTATION_COLORS.map((color) => (
                  <ContextMenuItem
                    key={color.value}
                    onClick={() => handleColorChange(color.value)}
                    className="cursor-pointer"
                  >
                    <div 
                      className="mr-2 h-4 w-4 rounded border border-gray-300" 
                      style={{ backgroundColor: color.value }}
                    />
                    {color.name}
                    {currentColor === color.value && <span className="ml-auto">✓</span>}
                  </ContextMenuItem>
                ))}
              </ContextMenuSubContent>
            </ContextMenuSub>
          )}

          {isInGroup && (
            <>
              <ContextMenuSeparator />
              <ContextMenuItem onClick={handleUngroup} className="cursor-pointer">
                <Ungroup className="mr-2 h-4 w-4" />
                Remove from Group
              </ContextMenuItem>
            </>
          )}

          <ContextMenuSeparator />

          <ContextMenuItem onClick={handleDelete} className="cursor-pointer text-red-600">
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    </>
  )
}

export default memo(AnnotationNode)
