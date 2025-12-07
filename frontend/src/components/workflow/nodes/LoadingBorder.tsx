import React from 'react'

/**
 * Animation configuration for the rotating gradient border
 */
export const LOADING_BORDER_ANIMATION = {
  background: 'conic-gradient(transparent, transparent 270deg, #1e90ff, #ff6347, #f9d71c, transparent 360deg)',
  animationDuration: '1s',
  animationTimingFunction: 'linear',
} as const

interface LoadingBorderProps {
  children: React.ReactNode
  isLoading: boolean
  className?: string
}

/**
 * LoadingBorder - Wraps content with an animated rotating gradient border when loading
 * 
 * @param isLoading - Whether to show the loading animation
 * @param children - Content to wrap
 * @param className - Additional classes for the wrapper
 */
export function LoadingBorder({ children, isLoading, className = '' }: LoadingBorderProps) {
  return (
    <div className={`relative rounded-lg p-[2px] ${isLoading ? 'node-neon-glow' : ''} ${className}`}>
      {/* Animated rotating gradient border for loading state - overflow-hidden only on this element */}
      {isLoading && (
        <div className="absolute inset-0 rounded-lg overflow-hidden pointer-events-none">
          <div
            className="absolute inset-[-50%] animate-spin"
            style={LOADING_BORDER_ANIMATION}
          />
        </div>
      )}
      {children}
    </div>
  )
}

LoadingBorder.displayName = 'LoadingBorder'
