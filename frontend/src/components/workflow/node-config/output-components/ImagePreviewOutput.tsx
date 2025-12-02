import { ScrollArea } from '@/components/ui/scroll-area'
import { ExternalLink, ImageIcon } from 'lucide-react'
import { useState } from 'react'

interface ImagePreviewOutputProps {
  data: any
}

/**
 * Custom output component for Image Preview node
 * This component is dynamically loaded and rendered by OutputColumn
 */
export function ImagePreviewOutput({ data }: ImagePreviewOutputProps) {
  const [imageError, setImageError] = useState(false)
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null)
  const imageUrl = data?.imageUrl as string

  if (!imageUrl) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        <p className="text-sm">No image URL provided</p>
        <pre className="text-xs mt-2">{JSON.stringify(data, null, 2)}</pre>
      </div>
    )
  }

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget
    setImageDimensions({
      width: img.naturalWidth,
      height: img.naturalHeight
    })
  }

  return (
    <div className="space-y-3">
      {/* Image Preview Card */}
      <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
        {!imageError ? (
          <div className="relative group">
            <img
              src={imageUrl}
              alt={data?.altText || 'Preview'}
              className="w-full h-auto max-h-96 object-contain bg-gray-50"
              onError={() => setImageError(true)}
              onLoad={handleImageLoad}
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
                <span className="text-sm font-medium">Open full size</span>
              </a>
            </div>
          </div>
        ) : (
          <div className="p-8 text-center bg-gray-50">
            <ImageIcon className="w-12 h-12 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-600">Failed to load image</p>
            <p className="text-xs text-gray-500 mt-1 truncate">{imageUrl}</p>
          </div>
        )}
        
        {/* Image Info */}
        {!imageError && (
          <div className="p-3 bg-gray-50 border-t border-gray-200">
            <div className="space-y-2">
              <div>
                <p className="text-xs text-gray-500">Image URL:</p>
                <p className="text-xs text-gray-900 font-mono truncate">{imageUrl}</p>
              </div>
              {imageDimensions && (
                <div>
                  <p className="text-xs text-gray-500">Dimensions:</p>
                  <p className="text-xs text-gray-900">{imageDimensions.width}px × {imageDimensions.height}px</p>
                </div>
              )}
              {data?.altText && (
                <div>
                  <p className="text-xs text-gray-500">Alt Text:</p>
                  <p className="text-xs text-gray-900">{data.altText}</p>
                </div>
              )}
              {data?.metadata && (
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-200">
                  {data.metadata.dimensions && (
                    <div className="col-span-2">
                      <p className="text-xs text-gray-500">Dimensions:</p>
                      <p className="text-xs text-gray-900 font-semibold">{data.metadata.dimensions}</p>
                    </div>
                  )}
                  {data.metadata.contentType && (
                    <div>
                      <p className="text-xs text-gray-500">Type:</p>
                      <p className="text-xs text-gray-900">{data.metadata.contentType}</p>
                    </div>
                  )}
                  {data.metadata.sizeFormatted && (
                    <div>
                      <p className="text-xs text-gray-500">Size:</p>
                      <p className="text-xs text-gray-900">{data.metadata.sizeFormatted}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* JSON Output (Collapsible) */}
      <details className="border rounded-lg">
        <summary className="cursor-pointer p-3 bg-muted/30 hover:bg-muted/50 transition-colors">
          <span className="text-sm font-medium">View JSON Output</span>
        </summary>
        <div className="p-3 border-t">
          <ScrollArea className="h-64 w-full">
            <pre className="text-xs font-mono whitespace-pre-wrap break-all">
              {JSON.stringify(data, null, 2)}
            </pre>
          </ScrollArea>
        </div>
      </details>
    </div>
  )
}
