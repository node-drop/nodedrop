import { Alert, AlertDescription } from '@/components/ui/alert'
import { CustomFieldProps } from '@/components/ui/form-generator/types'
import { AlertCircle, ExternalLink, ImageIcon, Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'

/**
 * ImagePreview Custom Component
 * 
 * Displays a live preview of an image from a URL
 * Automatically updates when the URL changes
 * Stores image dimensions in a hidden field for backend use
 */
export function ImagePreview({ field, allValues }: CustomFieldProps) {
  // Get the URL from the specified field
  const urlFieldName = field.componentProps?.urlField || 'imageUrl'
  const imageUrl = allValues?.[urlFieldName] as string
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [imageInfo, setImageInfo] = useState<{
    width: number
    height: number
    loaded: boolean
  } | null>(null)

  useEffect(() => {
    // Reset state when URL changes
    setError(null)
    setImageInfo(null)
    
    if (!imageUrl || imageUrl.trim() === '') {
      return
    }

    // Validate URL format
    try {
      const url = new URL(imageUrl)
      if (!['http:', 'https:'].includes(url.protocol)) {
        setError('Image URL must use HTTP or HTTPS protocol')
        return
      }
    } catch (err) {
      setError('Invalid URL format')
      return
    }

    setLoading(true)

    // Create an image element to load and validate the image
    const img = new Image()
    
    img.onload = () => {
      setLoading(false)
      const dimensions = {
        width: img.naturalWidth,
        height: img.naturalHeight,
        loaded: true,
      }
      setImageInfo(dimensions)
    }
    
    img.onerror = () => {
      setLoading(false)
      setError('Failed to load image. Please check the URL.')
    }
    
    // Set source to trigger load
    img.src = imageUrl

    // Cleanup
    return () => {
      img.onload = null
      img.onerror = null
    }
  }, [imageUrl]) // Only depend on imageUrl

  // Don't render if no URL
  if (!imageUrl || imageUrl.trim() === '') {
    return (
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
        <ImageIcon className="w-12 h-12 text-gray-400 mx-auto mb-2" />
        <p className="text-sm text-gray-500">Enter an image URL to see preview</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700">
          Image Preview
        </label>
        {imageInfo && (
          <span className="text-xs text-gray-500">
            {imageInfo.width} × {imageInfo.height}
          </span>
        )}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="border border-gray-200 rounded-lg p-8 text-center bg-gray-50">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-2" />
          <p className="text-sm text-gray-600">Loading image...</p>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Image Preview */}
      {!error && !loading && imageUrl && (
        <div className="border border-gray-200 rounded-lg overflow-hidden bg-gray-50">
          <div className="relative group">
            <img
              src={imageUrl}
              alt="Preview"
              className="w-full h-auto max-h-96 object-contain"
              style={{ display: imageInfo?.loaded ? 'block' : 'none' }}
            />
            
            {/* Overlay with actions */}
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100">
              <a
                href={imageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white text-gray-900 px-4 py-2 rounded-md flex items-center space-x-2 hover:bg-gray-100 transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                <span className="text-sm font-medium">Open in new tab</span>
              </a>
            </div>
          </div>
          
          {/* Image URL Info */}
          <div className="p-3 bg-white border-t border-gray-200">
            <div className="flex items-start space-x-2">
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500 mb-1">Source URL:</p>
                <p className="text-xs text-gray-900 truncate font-mono">
                  {imageUrl}
                </p>
              </div>
              <a
                href={imageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 flex-shrink-0"
                title="Open in new tab"
              >
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Image Info Card */}
      {imageInfo && !error && (
        <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
          <div className="flex items-start space-x-2">
            <ImageIcon className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-blue-900 mb-1">
                Image loaded successfully
              </p>
              <p className="text-xs text-blue-700">
                Dimensions: {imageInfo.width}px × {imageInfo.height}px
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
