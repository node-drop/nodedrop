import { getIconComponent, isTextIcon } from '@/utils/iconMapper'
import { memo } from 'react'

interface NodeIconRendererProps {
  /** Icon string from node configuration */
  icon?: string
  /** Node type for file: icon resolution */
  nodeType?: string
  /** Node group for fallback icons */
  nodeGroup?: string[]
  /** Display name for fallback text */
  displayName?: string
  /** Background color */
  backgroundColor?: string
  /** Whether this is a trigger node (affects shape) */
  isTrigger?: boolean
  /** Size variant */
  size?: 'xs' | 'sm' | 'md' | 'lg'
  /** Additional CSS classes */
  className?: string
  /** Whether the node is executing/running */
  isExecuting?: boolean
}

/**
 * NodeIconRenderer - A unified component for rendering node icons
 * 
 * Handles all icon types:
 * - Lucide icons (from icon mapper)
 * - Custom SVG files (file: prefix)
 * - Text/emoji icons
 * - Fallback to first letter
 * 
 * @example
 * ```tsx
 * // Basic usage
 * <NodeIconRenderer icon="lucide:database" displayName="Database" />
 * 
 * // Custom node with file icon
 * <NodeIconRenderer 
 *   icon="file:postgres.svg" 
 *   nodeType="postgres" 
 *   displayName="PostgreSQL"
 *   backgroundColor="#336791"
 * />
 * 
 * // Trigger node
 * <NodeIconRenderer 
 *   icon="⚡" 
 *   displayName="Webhook" 
 *   isTrigger={true}
 *   backgroundColor="#4CAF50"
 * />
 * ```
 */
export const NodeIconRenderer = memo(function NodeIconRenderer({
  icon,
  nodeType,
  nodeGroup,
  displayName = '',
  backgroundColor = '#666',
  isTrigger = false,
  size = 'md',
  className = '',
  isExecuting = false,
}: NodeIconRendererProps) {
  // Size mappings
  const containerSizes = {
    xs: 'w-6 h-6',
    sm: 'w-7 h-7',
    md: 'w-8 h-8',
    lg: 'w-10 h-10',
  }

  const iconSizes = {
    xs: 'w-3 h-3',
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  }

  const textSizes = {
    xs: 'text-[10px]',
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  }

  // Get icon component from mapper
  const IconComponent = getIconComponent(icon, nodeType, nodeGroup)
  const useTextIcon = !IconComponent && isTextIcon(icon)
  const isSvgPath = typeof IconComponent === 'string'

  return (
    <div
      className={`${containerSizes[size]} flex items-center justify-center text-white font-bold relative ${
        isTrigger ? 'rounded-full' : 'rounded-md'
      } ${className}`}
      style={{ backgroundColor }}
    >
      {isSvgPath ? (
        // Custom SVG icon from file
        <img
          src={IconComponent as string}
          alt={displayName || 'Node icon'}
          className={`${iconSizes[size]} ${isExecuting ? 'opacity-30' : ''}`}
          crossOrigin="anonymous"
        />
      ) : IconComponent ? (
        // Lucide icon component
        <>
          {/* @ts-ignore - IconComponent is LucideIcon here */}
          <IconComponent className={`${iconSizes[size]} ${isExecuting ? 'opacity-30' : ''}`} />
        </>
      ) : (
        // Fallback to text/emoji or first letter
        <span className={`${textSizes[size]} ${isExecuting ? 'opacity-30' : ''}`}>
          {useTextIcon ? icon : (icon || displayName.charAt(0).toUpperCase() || '?')}
        </span>
      )}

      {/* Execution spinner overlay */}
      {isExecuting && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className={`border-2 border-white border-t-transparent rounded-full animate-spin ${
            size === 'xs' ? 'w-4 h-4' : size === 'sm' ? 'w-4 h-4' : 'w-5 h-5'
          }`} />
        </div>
      )}
    </div>
  )
})
