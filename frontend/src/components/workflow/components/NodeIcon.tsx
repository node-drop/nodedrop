import { getIconComponent, isTextIcon } from '@/utils/iconMapper'
import { LucideIcon } from 'lucide-react'
import { memo } from 'react'

interface NodeIconProps {
  /** Lucide icon component */
  Icon?: LucideIcon
  /** Background color for the icon (Tailwind class) */
  iconColor?: string
  /** Node configuration for rendering icon from config */
  config?: {
    icon?: string
    color?: string
    isTrigger?: boolean
    imageUrl?: string
    nodeType?: string  // Added to support file: icons
  }
  /** Whether the node is currently executing */
  isExecuting?: boolean
  /** Icon size */
  size?: 'sm' | 'md' | 'lg'
}

/**
 * NodeIcon - A reusable component for rendering node icons
 * 
 * Supports three modes:
 * 1. Lucide Icon with background color
 * 2. Node config with text/emoji icon or image
 * 3. No icon (returns null)
 * 
 * @example
 * ```tsx
 * // Lucide icon
 * <NodeIcon Icon={MessageCircle} iconColor="bg-blue-500" />
 * 
 * // Config-based icon
 * <NodeIcon config={{ icon: '📧', color: '#4CAF50', isTrigger: true }} />
 * 
 * // With execution spinner
 * <NodeIcon Icon={Database} iconColor="bg-purple-500" isExecuting={true} />
 * ```
 */
export const NodeIcon = memo(function NodeIcon({
  Icon,
  iconColor = 'bg-blue-500',
  config,
  isExecuting = false,
  size = 'md'
}: NodeIconProps) {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-10 h-10'
  }
  
  const iconSizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  }
  
  // Mode 1: Lucide Icon prop is provided directly
  if (Icon) {
    return (
      <div 
        className={`${sizeClasses[size]} rounded-md ${iconColor} flex items-center justify-center flex-shrink-0 shadow-sm`}
      >
        <Icon className={`${iconSizeClasses[size]} text-white`} />
      </div>
    )
  }
  
  // Mode 2: Node config is provided
  if (config) {
    const { icon, color, isTrigger, imageUrl, nodeType } = config
    
    // Get icon component from icon mapper, passing nodeType for file: icons
    const IconComponent = getIconComponent(icon, nodeType)
    const useTextIcon = !IconComponent && isTextIcon(icon)
    const isSvgPath = typeof IconComponent === 'string'
    
    return (
      <div className="flex-shrink-0">
        <div 
          className={`${sizeClasses[size]} flex items-center justify-center text-white text-sm font-bold relative shadow-sm ${
            isTrigger ? 'rounded-full' : 'rounded-md'
          }`}
          style={{ backgroundColor: color || '#666' }}
        >
          {imageUrl ? (
            <img 
              src={imageUrl} 
              alt={icon || 'Node icon'} 
              className={`w-full h-full object-cover ${isTrigger ? 'rounded-full' : 'rounded-md'}`}
            />
          ) : isSvgPath ? (
            // Render custom SVG icon from file
            <>
              <img
                src={IconComponent as string}
                alt={icon || 'Node icon'}
                className={`${iconSizeClasses[size]} ${isExecuting ? 'opacity-30' : ''}`}
                crossOrigin="anonymous"
              />
              {isExecuting && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </>
          ) : IconComponent ? (
            // Render Lucide icon component
            <>
              {/* @ts-ignore - IconComponent is LucideIcon here */}
              <IconComponent className={`${iconSizeClasses[size]} ${isExecuting ? 'opacity-30' : ''}`} />
              {isExecuting && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </>
          ) : (
            // Fallback to text/emoji
            <>
              <span className={isExecuting ? 'opacity-30' : ''}>
                {useTextIcon ? icon : (icon || '?')}
              </span>
              {isExecuting && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    )
  }
  
  
  // Mode 3: No icon
  return null
})

