import { Button } from '@/components/ui/button'
import { useWorkflowStore } from '@/stores'
import { Node, NodeProps } from '@xyflow/react'
import { Download, Image as ImageIcon, Maximize2, RefreshCw } from 'lucide-react'
import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { BaseNodeWrapper } from './BaseNodeWrapper'

interface ImagePreviewNodeData extends Record<string, unknown> {
  label: string
  nodeType: string
  parameters: Record<string, any>
  disabled: boolean
  locked?: boolean
  status?: 'idle' | 'running' | 'success' | 'error' | 'skipped'
  executionResult?: any
  lastExecutionData?: any
  // Dynamic handles from node definition
  inputs?: string[]
  outputs?: string[]
  executionCapability?: 'trigger' | 'action' | 'transform' | 'condition'
}

type ImagePreviewNodeType = Node<ImagePreviewNodeData>

/**
 * ImagePreviewNode - An example of using BaseNodeWrapper for a different use case.
 * This node displays image previews from the workflow execution results.
 * 
 * Features:
 * - Displays images from connected nodes
 * - Supports multiple image formats
 * - Download and fullscreen capabilities
 * - Uses BaseNodeWrapper for consistent behavior
 */
export const ImagePreviewNode = memo(function ImagePreviewNode({ data, selected, id }: NodeProps<ImagePreviewNodeType>) {
  const { updateNode, workflow, lastExecutionResult } = useWorkflowStore()
  const isReadOnly = false
  
  // Track expanded state (stored in node parameters to persist)
  const [isExpanded, setIsExpanded] = useState(data.parameters?.isExpanded ?? false)
  // State for input and UI
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [imageError, setImageError] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  // Get parameters from node configuration
  const imagePlaceholder = data.parameters?.placeholder || 'No image to display'

  // Get image URL from connected node's output or node parameters
  const getImageFromExecution = useCallback(() => {
    // First, try to get from node parameters (user configured URL)
    const configuredUrl = data.parameters?.imageUrl
    if (configuredUrl && typeof configuredUrl === 'string' && configuredUrl.trim()) {
      return configuredUrl
    }

    // Then try to get from workflow execution results
    if (!workflow || !lastExecutionResult) {
      return null
    }
    
    // Find connections where this node is the target
    const incomingConnections = workflow.connections.filter(
      conn => conn.targetNodeId === id
    )
    
    if (incomingConnections.length === 0) return null
    
    // Get the first connected node's execution result
    const sourceNodeId = incomingConnections[0].sourceNodeId
    const sourceNodeExecution = lastExecutionResult.nodeResults?.find(
      nr => nr.nodeId === sourceNodeId
    )
    
    if (!sourceNodeExecution || !sourceNodeExecution.data) return null
    
    // Extract image URL from the execution data
    let execData = sourceNodeExecution.data
    
    // If data has a 'main' output array, get the first item's json
    if (execData.main && Array.isArray(execData.main) && execData.main.length > 0) {
      const mainOutput = execData.main[0]
      if (mainOutput.json) {
        execData = mainOutput.json
      }
    }
    
    // Look for common image URL properties
    return (
      execData.imageUrl ||
      execData.image_url ||
      execData.url ||
      execData.imageURL ||
      execData.src ||
      execData.data?.imageUrl ||
      null
    )
  }, [workflow, lastExecutionResult, id, data.parameters?.imageUrl])

  // Update image when execution results change
  useEffect(() => {
    const url = getImageFromExecution()
    if (url && url !== imageUrl) {
      setIsLoading(true)
      setImageUrl(url)
      setImageError(false)
    }
  }, [lastExecutionResult, getImageFromExecution, imageUrl])

  // Handle image load
  const handleImageLoad = useCallback(() => {
    setIsLoading(false)
  }, [])

  // Handle image error
  const handleImageError = useCallback(() => {
    setIsLoading(false)
    setImageError(true)
  }, [])

  // Handle expand/collapse toggle
  const handleToggleExpand = useCallback(() => {
    const newExpanded = !isExpanded
    setIsExpanded(newExpanded)
    // Save expanded state to node parameters
    updateNode(id, {
      parameters: {
        ...data.parameters,
        isExpanded: newExpanded
      }
    })
  }, [isExpanded, id, data.parameters, updateNode])

  // Handle image download
  const handleDownload = useCallback(() => {
    if (!imageUrl) return
    
    const link = document.createElement('a')
    link.href = imageUrl
    link.download = `image-${Date.now()}.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }, [imageUrl])

  // Handle fullscreen toggle
  const handleFullscreen = useCallback(() => {
    setIsFullscreen(!isFullscreen)
  }, [isFullscreen])

  // Prepare header info text
  const headerInfo = useMemo(() => 
    imageUrl ? 'Image loaded' : 'Waiting for image',
    [imageUrl]
  )

  // Collapsed content (small preview) - memoized
  const collapsedContent = useMemo(() => {
    if (!imageUrl || imageError) return null
    
    return (
      <div className="relative w-full h-20 bg-gray-100 rounded overflow-hidden">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
            <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        <img
          src={imageUrl}
          alt="Preview"
          className="w-full h-full object-cover"
          onLoad={handleImageLoad}
          onError={handleImageError}
        />
      </div>
    )
  }, [imageUrl, imageError, isLoading, handleImageLoad, handleImageError])

  // Expanded content (full image preview) - memoized
  const expandedContent = useMemo(() => (
    <>
      {/* Image Display Area */}
      <div className="p-3">
        {!imageUrl || imageError ? (
          <div className="flex flex-col items-center justify-center h-[300px] bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
            <ImageIcon className="w-16 h-16 mb-2 text-gray-400" />
            <p className="text-sm text-muted-foreground text-center px-4">
              {imageError ? 'Failed to load image' : imagePlaceholder}
            </p>
            {imageError && imageUrl && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setImageError(false)
                  setImageUrl(imageUrl)
                }}
                className="mt-2"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry
              </Button>
            )}
          </div>
        ) : (
          <div className="relative">
            <div className="relative w-full h-[300px] bg-gray-100 rounded-lg overflow-hidden">
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                  <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
              <img
                src={imageUrl}
                alt="Preview"
                className="w-full h-full object-contain"
                onLoad={handleImageLoad}
                onError={handleImageError}
              />
            </div>
            
            {/* Image Actions */}
            <div className="flex gap-2 mt-2 justify-end">
              <Button
                size="sm"
                variant="outline"
                onClick={handleFullscreen}
                className="h-8 px-2"
              >
                <Maximize2 className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleDownload}
                className="h-8 px-2"
              >
                <Download className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Fullscreen Modal */}
      {isFullscreen && imageUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={handleFullscreen}
        >
          <div className="relative max-w-[90vw] max-h-[90vh]">
            <img
              src={imageUrl}
              alt="Fullscreen preview"
              className="max-w-full max-h-[90vh] object-contain"
            />
            <Button
              size="sm"
              variant="outline"
              onClick={handleFullscreen}
              className="absolute top-4 right-4"
            >
              Close
            </Button>
          </div>
        </div>
      )}
    </>
  ), [imageUrl, imageError, isLoading, imagePlaceholder, handleImageLoad, handleImageError, handleFullscreen, handleDownload, isFullscreen])

  return (
    <BaseNodeWrapper
      id={id}
      selected={selected}
      data={data}
      isReadOnly={isReadOnly}
      isExpanded={isExpanded}
      onToggleExpand={handleToggleExpand}
      Icon={ImageIcon}
      iconColor="bg-purple-500"
      collapsedWidth="200px"
      expandedWidth="360px"
      headerInfo={headerInfo}
      collapsedContent={collapsedContent}
      expandedContent={expandedContent}
      showInputHandle={true}
      showOutputHandle={true}
      inputHandleColor="!bg-purple-500"
      outputHandleColor="!bg-purple-500"
    />
  )
})

