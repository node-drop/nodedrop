import { getIconComponent, isTextIcon } from '@/utils/iconMapper'
import { LucideIcon, Zap } from 'lucide-react'
import { memo, ReactNode } from 'react'

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
    nodeType?: string
    nodeGroup?: string[]
    displayName?: string
  }
  /** Whether the node is currently executing */
  isExecuting?: boolean
  /** Icon size */
  size?: 'xs' | 'sm' | 'md' | 'lg'
  /** Additional CSS classes */
  className?: string
}

// Hexagon sizes based on icon size
const hexagonSizes = {
  xs: { width: 24 * 0.645, height: 24, borderRadius: 24 * 0.1 },
  sm: { width: 28 * 0.645, height: 28, borderRadius: 28 * 0.1 },
  md: { width: 32 * 0.645, height: 32, borderRadius: 32 * 0.1 },
  lg: { width: 40 * 0.645, height: 40, borderRadius: 40 * 0.1 }
}

interface HexagonWrapperProps {
  size: 'xs' | 'sm' | 'md' | 'lg'
  color: string
  children: ReactNode
}

// Helper to create gradient from a base color
function createGradient(baseColor: string): string {
  // Create a gradient by lightening the color for the start
  return `linear-gradient(135deg, ${baseColor} 0%, ${adjustColor(baseColor, -20)} 100%)`
}

// Adjust color brightness (negative = darker, positive = lighter)
function adjustColor(color: string, amount: number): string {
  // Handle hex colors
  if (color.startsWith('#')) {
    const hex = color.slice(1)
    const num = parseInt(hex, 16)
    const r = Math.min(255, Math.max(0, (num >> 16) + amount))
    const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + amount))
    const b = Math.min(255, Math.max(0, (num & 0x0000FF) + amount))
    return `#${(1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1)}`
  }
  return color
}

// Hexagon component using child divs for proper background inheritance
const HexagonWrapper = memo(function HexagonWrapper({ size, color, children }: HexagonWrapperProps) {
  const { width, height, borderRadius } = hexagonSizes[size]
  // Calculate horizontal margin to make total width equal to height (like square icons)
  const horizontalMargin = (height - width) / 2
  const gradient = createGradient(color)
  
  return (
    <div
      className="relative flex items-center justify-center shadow-sm"
      style={{
        width: `${width}px`,
        height: `${height}px`,
        borderRadius: `${borderRadius}px`,
        background: gradient,
        marginLeft: `${horizontalMargin}px`,
        marginRight: `${horizontalMargin}px`
      }}
    >
      {/* Rotated background layers for hexagon effect */}
      <div
        className="absolute inset-0 h-full w-full"
        style={{
          background: 'inherit',
          borderRadius: 'inherit',
          transform: 'rotate(60deg)'
        }}
      />
      <div
        className="absolute inset-0 h-full w-full"
        style={{
          background: 'inherit',
          borderRadius: 'inherit',
          transform: 'rotate(-60deg)'
        }}
      />
      {/* Content on top */}
      <div className="relative z-10 flex items-center justify-center">
        {children}
      </div>
    </div>
  )
})

export const NodeIcon = memo(function NodeIcon({
  Icon,
  iconColor = 'bg-blue-500',
  config,
  isExecuting = false,
  size = 'md',
  className = ''
}: NodeIconProps) {
  const sizeClasses = {
    xs: 'w-6 h-6',
    sm: 'w-7 h-7',
    md: 'w-8 h-8',
    lg: 'w-10 h-10'
  }
  
  const iconSizeClasses = {
    xs: 'w-3 h-3',
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  }

  const zapSizes = {
    xs: 'w-[4px] h-[4px]',
    sm: 'w-[4px] h-[4px]',
    md: 'w-[5px] h-[5px]',
    lg: 'w-[6px] h-[6px]'
  }

  // Mode 1: Lucide Icon prop is provided directly
  if (Icon) {
    const isTrigger = config?.isTrigger
    const bgColor = iconColor.includes('bg-') ? iconColor : 'bg-blue-500'
    
    if (isTrigger) {
      // Use hexagon for trigger nodes
      return (
        <div className="flex-shrink-0 relative" style={{ overflow: 'visible' }}>
          <HexagonWrapper size={size} color={config?.color || '#3b82f6'}>
            <Icon className={`${iconSizeClasses[size]} text-white`} />
          </HexagonWrapper>
          <div className="absolute -top-0.5 -right-0.5 bg-yellow-400 rounded-full p-px shadow-sm z-20 flex items-center justify-center" style={{ width: size === 'xs' || size === 'sm' ? '8px' : '10px', height: size === 'xs' || size === 'sm' ? '8px' : '10px' }}>
            <Zap className={`${zapSizes[size]} text-yellow-900 fill-yellow-900`} />
          </div>
        </div>
      )
    }
    
    return (
      <div className="flex-shrink-0 relative">
        <div className={`${sizeClasses[size]} ${bgColor} flex items-center justify-center shadow-sm rounded-md`}>
          <Icon className={`${iconSizeClasses[size]} text-white`} />
        </div>
      </div>
    )
  }
  
  // Mode 2: Node config is provided
  if (config) {
    const { icon, color, isTrigger, imageUrl, nodeType, nodeGroup, displayName } = config
    const IconComponent = getIconComponent(icon, nodeType, nodeGroup)
    const useTextIcon = !IconComponent && isTextIcon(icon)
    const isSvgPath = typeof IconComponent === 'string'
    const bgColor = color || '#666'
    
    const renderIconContent = () => {
      if (imageUrl) {
        return (
          <img 
            src={imageUrl} 
            alt={icon || displayName || 'Node icon'} 
            className={`${iconSizeClasses[size]} object-cover`}
          />
        )
      }
      
      if (isSvgPath) {
        return (
          <img
            src={IconComponent as string}
            alt={icon || displayName || 'Node icon'}
            className={`${iconSizeClasses[size]} ${isExecuting ? 'opacity-30' : ''}`}
            crossOrigin="anonymous"
          />
        )
      }
      
      if (IconComponent) {
        return (
          // @ts-ignore
          <IconComponent className={`${iconSizeClasses[size]} ${isExecuting ? 'opacity-30' : ''}`} />
        )
      }
      
      return (
        <span className={isExecuting ? 'opacity-30' : ''}>
          {useTextIcon ? icon : (icon || displayName?.charAt(0).toUpperCase() || '?')}
        </span>
      )
    }
    
    if (isTrigger) {
      // Use hexagon for trigger nodes
      return (
        <div className={`flex-shrink-0 relative ${className}`} style={{ overflow: 'visible' }}>
          <HexagonWrapper size={size} color={bgColor}>
            <div className="text-white text-sm font-bold">
              {renderIconContent()}
            </div>
          </HexagonWrapper>
          {isExecuting && (
            <div className="absolute inset-0 flex items-center justify-center z-10">
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          <div className="absolute -top-0.5 -right-0.5 bg-yellow-400 rounded-full p-px shadow-sm z-20 flex items-center justify-center" style={{ width: size === 'xs' || size === 'sm' ? '8px' : '10px', height: size === 'xs' || size === 'sm' ? '8px' : '10px' }}>
            <Zap className={`${zapSizes[size]} text-yellow-900 fill-yellow-900`} />
          </div>
        </div>
      )
    }
    
    // Regular rounded square for non-trigger nodes
    return (
      <div className={`flex-shrink-0 relative ${className}`}>
        <div 
          className={`${sizeClasses[size]} flex items-center justify-center text-white text-sm font-bold relative shadow-sm rounded-md`}
          style={{ backgroundColor: bgColor }}
        >
          {renderIconContent()}
          {isExecuting && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>
      </div>
    )
  }
  
  // Mode 3: No icon
  return null
})
