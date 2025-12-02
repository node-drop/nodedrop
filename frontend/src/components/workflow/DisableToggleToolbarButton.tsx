import { Eye, EyeOff } from 'lucide-react'
import { clsx } from 'clsx'
import { useRef, useEffect } from 'react'
import type { DisableToggleToolbarButtonProps } from './types'
import './toolbar-buttons.css'

export function DisableToggleToolbarButton({
  nodeId,
  nodeLabel,
  disabled,
  onToggle,
  className
}: DisableToggleToolbarButtonProps) {
  // Ref for live region announcements
  const liveRegionRef = useRef<HTMLDivElement>(null)

  // Announce state changes to screen readers
  useEffect(() => {
    if (liveRegionRef.current) {
      liveRegionRef.current.textContent = disabled 
        ? `${nodeLabel} is now disabled` 
        : `${nodeLabel} is now enabled`
    }
  }, [disabled, nodeLabel])
  const handleClick = (event: React.MouseEvent) => {
    event.stopPropagation()
    onToggle(nodeId, !disabled)
  }

  const handleKeyDown = (event: React.KeyboardEvent) => {
    // Handle activation keys
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      event.stopPropagation()
      onToggle(nodeId, !disabled)
    }
    // Allow Tab navigation without stopping propagation
    else if (event.key === 'Tab') {
      // Let the default tab behavior work
      return
    }
    // Stop other keys from propagating to prevent interference
    else {
      event.stopPropagation()
    }
  }

  const getIcon = () => {
    return disabled ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />
  }

  const getAriaLabel = () => {
    return disabled 
      ? `Enable ${nodeLabel} - press Enter or Space to activate`
      : `Disable ${nodeLabel} - press Enter or Space to activate`
  }

  const getTooltip = () => {
    return disabled ? `Enable ${nodeLabel}` : `Disable ${nodeLabel}`
  }

  const getAriaDescription = () => {
    return disabled
      ? 'This node is currently disabled and will not execute during workflow runs. Activate this button to enable it.'
      : 'This node is currently enabled and will execute during workflow runs. Activate this button to disable it.'
  }

  const getButtonStyles = () => {
    return disabled ? 'disabled-node' : 'enabled-node'
  }

  return (
    <>
      <button
        className={clsx(
          'toolbar-button',
          getButtonStyles(),
          className
        )}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        aria-label={getAriaLabel()}
        aria-describedby={`disable-toggle-desc-${nodeId}`}
        aria-pressed={disabled ? 'false' : 'true'}
        title={getTooltip()}
        tabIndex={0}
        role="switch"
        aria-checked={!disabled}
      >
        {getIcon()}
      </button>
      
      {/* Hidden description for screen readers */}
      <div
        id={`disable-toggle-desc-${nodeId}`}
        className="sr-only"
        aria-hidden="true"
      >
        {getAriaDescription()}
      </div>
      
      {/* Live region for state announcements */}
      <div
        ref={liveRegionRef}
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      />
    </>
  )
}
