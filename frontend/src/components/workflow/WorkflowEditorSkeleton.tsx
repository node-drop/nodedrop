/**
 * Skeleton loading state for the workflow editor
 * Mimics the actual editor layout for a smooth loading experience
 */
export function WorkflowEditorSkeleton() {
  return (
    <div className="flex flex-col h-full w-full bg-background">
      {/* Toolbar Skeleton */}
      <div className="border-b bg-card">
        <div className="flex items-center justify-between px-4 py-3">
          {/* Left side - Back button and title */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-muted rounded-md animate-pulse" />
            <div className="h-6 w-48 bg-muted rounded animate-pulse" />
          </div>
          
          {/* Right side - Action buttons */}
          <div className="flex items-center gap-2">
            <div className="w-20 h-9 bg-muted rounded-md animate-pulse" />
            <div className="w-20 h-9 bg-muted rounded-md animate-pulse" />
            <div className="w-24 h-9 bg-muted rounded-md animate-pulse" />
          </div>
        </div>
      </div>

      {/* Canvas Area Skeleton */}
      <div className="flex-1 relative bg-muted/20">
  
        {/* Grid pattern overlay */}
        <div className="absolute inset-0 opacity-10">
          <svg width="100%" height="100%">
            <defs>
              <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                <circle cx="1" cy="1" r="1" fill="currentColor" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>
      </div>

      {/* Mini-map Skeleton (bottom right) */}
      <div className="absolute bottom-4 right-4 w-48 h-32 bg-card border rounded-lg shadow-lg animate-pulse" />

      {/* Controls Skeleton (bottom left) */}
      <div className="absolute bottom-4 left-4 flex flex-col gap-2">
        <div className="w-10 h-10 bg-card border rounded-md animate-pulse" style={{ animationDelay: '0ms' }} />
        <div className="w-10 h-10 bg-card border rounded-md animate-pulse" style={{ animationDelay: '100ms' }} />
        <div className="w-10 h-10 bg-card border rounded-md animate-pulse" style={{ animationDelay: '200ms' }} />
        <div className="w-10 h-10 bg-card border rounded-md animate-pulse" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  )
}
