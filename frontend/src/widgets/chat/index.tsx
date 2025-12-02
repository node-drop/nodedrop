import React from 'react'
import ReactDOM from 'react-dom/client'
import { PublicChatWidget } from './PublicChatWidget'

interface ChatWidgetConfig {
  chatId: string
  apiUrl?: string
  container?: string | HTMLElement
  theme?: 'light' | 'dark' | 'auto'
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'
  onMessage?: (message: string) => void
  onResponse?: (response: string) => void
  onError?: (error: any) => void
  onOpen?: () => void
  onClose?: () => void
  onReady?: () => void
}

class nodeDropChatWidget {
  private root: ReactDOM.Root | null = null
  private container: HTMLElement | null = null
  private config: ChatWidgetConfig | null = null
  private isInitialized: boolean = false
  private detectedTheme: 'light' | 'dark' = 'light'
  private themeMediaQuery: MediaQueryList | null = null

  /**
   * Initialize and render the chat widget
   */
  public init(config: ChatWidgetConfig): void {
    // Prevent double initialization
    if (this.isInitialized) {
      console.warn('nodeDropChatWidget: Widget is already initialized. Call destroy() first.')
      return
    }

    const {
      chatId,
      apiUrl,
      container,
      theme = 'auto',
      position = 'bottom-right',
      onMessage,
      onResponse,
      onError,
      onOpen,
      onClose,
      onReady
    } = config

    if (!chatId) {
      console.error('nodeDropChatWidget: chatId is required')
      return
    }

    // Validate configuration
    if (!this.validateConfig(config)) {
      return
    }

    // Store configuration
    this.config = {
      chatId,
      apiUrl,
      container,
      theme,
      position,
      onMessage,
      onResponse,
      onError,
      onOpen,
      onClose,
      onReady
    }

    // Setup theme detection
    this.setupThemeDetection(theme)

    // Get or create container
    if (typeof container === 'string') {
      this.container = document.querySelector(container)
      if (!this.container) {
        console.error(`nodeDropChatWidget: Container element "${container}" not found`)
        return
      }
    } else if (container instanceof HTMLElement) {
      this.container = container
    } else {
      // Create a default container for the chat widget
      this.container = document.createElement('div')
      this.container.id = 'nd-chat-widget'
      this.container.style.position = 'fixed'
      this.container.style.zIndex = '999999'
      document.body.appendChild(this.container)
    }

    // Add widget class for scoped styling
    this.container.classList.add('nd-chat-widget')
    
    // Apply theme (resolve 'auto' to actual theme)
    const resolvedTheme = this.resolveTheme(theme)
    this.container.setAttribute('data-theme', resolvedTheme)
    this.container.setAttribute('data-position', position)

    try {
      // Mount React component using ReactDOM.createRoot
      this.root = ReactDOM.createRoot(this.container)
      this.root.render(
        <React.StrictMode>
          <PublicChatWidget
            chatId={chatId}
            apiUrl={apiUrl}
            theme={resolvedTheme}
            position={position}
            onMessage={this.wrapCallback(onMessage, 'onMessage')}
            onResponse={this.wrapCallback(onResponse, 'onResponse')}
            onError={this.wrapCallback(onError, 'onError')}
            onOpen={this.wrapCallback(onOpen, 'onOpen')}
            onClose={this.wrapCallback(onClose, 'onClose')}
          />
        </React.StrictMode>
      )

      this.isInitialized = true
      console.log('nodeDropChatWidget: Successfully initialized with chatId:', chatId)
      
      // Call onReady callback
      if (onReady) {
        try {
          onReady()
        } catch (error) {
          console.error('nodeDropChatWidget: Error in onReady callback:', error)
        }
      }
    } catch (error) {
      console.error('nodeDropChatWidget: Failed to initialize widget:', error)
      this.cleanup()
    }
  }

  /**
   * Destroy the widget instance and clean up resources
   */
  public destroy(): void {
    if (!this.isInitialized) {
      console.warn('nodeDropChatWidget: Widget is not initialized')
      return
    }

    try {
      // Unmount React component
      if (this.root) {
        this.root.unmount()
        this.root = null
      }

      this.cleanup()
      console.log('nodeDropChatWidget: Successfully destroyed')
    } catch (error) {
      console.error('nodeDropChatWidget: Error during destroy:', error)
    }
  }

  /**
   * Update widget configuration by re-initializing with new config
   */
  public update(newConfig: Partial<ChatWidgetConfig>): void {
    if (!this.config) {
      console.error('nodeDropChatWidget: Cannot update - widget not initialized')
      return
    }

    // Merge new config with existing config
    const updatedConfig: ChatWidgetConfig = {
      ...this.config,
      ...newConfig
    }

    // Destroy current instance and reinitialize with updated config
    this.destroy()
    this.init(updatedConfig)
  }

  /**
   * Get current widget configuration
   */
  public getConfig(): ChatWidgetConfig | null {
    return this.config ? { ...this.config } : null
  }

  /**
   * Check if widget is initialized
   */
  public isReady(): boolean {
    return this.isInitialized
  }

  /**
   * Setup theme detection for auto theme mode
   */
  private setupThemeDetection(theme: string): void {
    if (theme === 'auto' && typeof window !== 'undefined' && window.matchMedia) {
      this.themeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      this.detectedTheme = this.themeMediaQuery.matches ? 'dark' : 'light'
      
      // Listen for theme changes
      const handleThemeChange = (e: MediaQueryListEvent) => {
        this.detectedTheme = e.matches ? 'dark' : 'light'
        if (this.container && this.config?.theme === 'auto') {
          this.container.setAttribute('data-theme', this.detectedTheme)
        }
      }
      
      if (this.themeMediaQuery.addEventListener) {
        this.themeMediaQuery.addEventListener('change', handleThemeChange)
      } else {
        // Fallback for older browsers
        this.themeMediaQuery.addListener(handleThemeChange)
      }
    }
  }

  /**
   * Resolve theme value (convert 'auto' to actual theme)
   */
  private resolveTheme(theme: string): 'light' | 'dark' {
    if (theme === 'auto') {
      return this.detectedTheme
    }
    return theme as 'light' | 'dark'
  }

  /**
   * Validate configuration options
   */
  private validateConfig(config: ChatWidgetConfig): boolean {
    const { chatId, theme, position } = config

    // Validate chatId
    if (!chatId || typeof chatId !== 'string' || chatId.trim() === '') {
      console.error('nodeDropChatWidget: chatId must be a non-empty string')
      return false
    }

    // Validate theme
    const validThemes = ['light', 'dark', 'auto']
    if (theme && !validThemes.includes(theme)) {
      console.error(`nodeDropChatWidget: Invalid theme "${theme}". Must be one of: ${validThemes.join(', ')}`)
      return false
    }

    // Validate position
    const validPositions = ['bottom-right', 'bottom-left', 'top-right', 'top-left']
    if (position && !validPositions.includes(position)) {
      console.error(`nodeDropChatWidget: Invalid position "${position}". Must be one of: ${validPositions.join(', ')}`)
      return false
    }

    return true
  }

  /**
   * Wrap callback functions with error handling
   */
  private wrapCallback<T extends (...args: any[]) => any>(
    callback: T | undefined,
    callbackName: string
  ): T | undefined {
    if (!callback) return undefined

    return ((...args: Parameters<T>) => {
      try {
        return callback(...args)
      } catch (error) {
        console.error(`nodeDropChatWidget: Error in ${callbackName} callback:`, error)
      }
    }) as T
  }

  /**
   * Get current resolved theme
   */
  public getCurrentTheme(): 'light' | 'dark' {
    if (!this.config) return 'light'
    return this.resolveTheme(this.config.theme || 'auto')
  }

  /**
   * Update theme dynamically
   */
  public setTheme(theme: 'light' | 'dark' | 'auto'): void {
    if (!this.isInitialized || !this.config || !this.container) {
      console.error('nodeDropChatWidget: Cannot set theme - widget not initialized')
      return
    }

    this.config.theme = theme
    this.setupThemeDetection(theme)
    
    const resolvedTheme = this.resolveTheme(theme)
    this.container.setAttribute('data-theme', resolvedTheme)
  }

  /**
   * Update position dynamically
   */
  public setPosition(position: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'): void {
    if (!this.isInitialized || !this.config || !this.container) {
      console.error('nodeDropChatWidget: Cannot set position - widget not initialized')
      return
    }

    const validPositions = ['bottom-right', 'bottom-left', 'top-right', 'top-left']
    if (!validPositions.includes(position)) {
      console.error(`nodeDropChatWidget: Invalid position "${position}"`)
      return
    }

    this.config.position = position
    this.container.setAttribute('data-position', position)
  }

  /**
   * Private method to clean up DOM elements and state
   */
  private cleanup(): void {
    // Clean up theme detection
    if (this.themeMediaQuery) {
      if (this.themeMediaQuery.removeEventListener) {
        this.themeMediaQuery.removeEventListener('change', () => {})
      } else {
        // Fallback for older browsers
        this.themeMediaQuery.removeListener(() => {})
      }
      this.themeMediaQuery = null
    }

    if (this.container) {
      // Remove widget classes and attributes
      this.container.classList.remove('nd-chat-widget')
      this.container.removeAttribute('data-theme')
      this.container.removeAttribute('data-position')
      
      // If we created the container, remove it from DOM
      if (this.container.id === 'nd-chat-widget' && this.container.parentNode) {
        this.container.parentNode.removeChild(this.container)
      } else {
        // Otherwise just clear its content
        this.container.innerHTML = ''
      }
      
      this.container = null
    }

    this.config = null
    this.isInitialized = false
    this.detectedTheme = 'light'
  }
}

// Global widget instance
declare global {
  interface Window {
    nodeDropChatWidget?: typeof nodeDropChatWidget
  }
}

// Store initialized widgets to prevent duplicate initialization
const initializedWidgets = new WeakMap<HTMLElement, nodeDropChatWidget>()

/**
 * Auto-initialization functionality
 * Scans DOM for elements with data-nd-chat attributes and initializes widgets
 */
const initializeAutoWidgets = (): void => {
  try {
    // Scan DOM for elements with data-nd-chat attributes
    const autoInitElements = document.querySelectorAll('[data-nd-chat]')
    
    console.log(`nodeDropChatWidget: Found ${autoInitElements.length} elements for auto-initialization`)
    
    autoInitElements.forEach((element) => {
      const htmlElement = element as HTMLElement
      
      // Skip if already initialized
      if (initializedWidgets.has(htmlElement)) {
        console.log('nodeDropChatWidget: Element already initialized, skipping')
        return
      }
      
      // Extract configuration from data attributes
      const chatId = element.getAttribute('data-nd-chat')
      const apiUrl = element.getAttribute('data-api-url') || undefined
      const theme = (element.getAttribute('data-theme') as 'light' | 'dark' | 'auto') || 'auto'
      const position = (element.getAttribute('data-position') as 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left') || 'bottom-right'
      
      // Extract callback function names from data attributes
      const onMessageCallback = element.getAttribute('data-on-message')
      const onResponseCallback = element.getAttribute('data-on-response')
      const onErrorCallback = element.getAttribute('data-on-error')
      const onOpenCallback = element.getAttribute('data-on-open')
      const onCloseCallback = element.getAttribute('data-on-close')
      const onReadyCallback = element.getAttribute('data-on-ready')
      
      // Resolve callback functions from global scope
      const getGlobalCallback = (callbackName: string | null) => {
        if (!callbackName) return undefined
        try {
          const fn = (window as any)[callbackName]
          return typeof fn === 'function' ? fn : undefined
        } catch {
          return undefined
        }
      }
      
      // Validate required chatId
      if (!chatId || chatId.trim() === '') {
        console.error('nodeDropChatWidget: data-nd-chat attribute is required and cannot be empty')
        return
      }
      
      // Validate theme value
      const validThemes = ['light', 'dark', 'auto']
      if (!validThemes.includes(theme)) {
        console.warn(`nodeDropChatWidget: Invalid theme "${theme}", using "auto"`)
      }
      
      // Validate position value
      const validPositions = ['bottom-right', 'bottom-left', 'top-right', 'top-left']
      if (!validPositions.includes(position)) {
        console.warn(`nodeDropChatWidget: Invalid position "${position}", using "bottom-right"`)
      }
      
      try {
        // Initialize chat widget automatically
        const widget = new nodeDropChatWidget()
        
        widget.init({
          chatId: chatId.trim(),
          apiUrl,
          // Don't pass container for auto-init, let widget create its own positioned container
          theme: validThemes.includes(theme) ? theme : 'auto',
          position: validPositions.includes(position) ? position : 'bottom-right',
          onMessage: getGlobalCallback(onMessageCallback),
          onResponse: getGlobalCallback(onResponseCallback),
          onError: getGlobalCallback(onErrorCallback),
          onOpen: getGlobalCallback(onOpenCallback),
          onClose: getGlobalCallback(onCloseCallback),
          onReady: getGlobalCallback(onReadyCallback)
        })
        
        // Store widget instance to prevent duplicate initialization
        initializedWidgets.set(htmlElement, widget)
        
        console.log(`nodeDropChatWidget: Auto-initialized widget with chatId: ${chatId}`)
      } catch (error) {
        console.error('nodeDropChatWidget: Failed to auto-initialize widget:', error)
      }
    })
  } catch (error) {
    console.error('nodeDropChatWidget: Error during auto-initialization:', error)
  }
}

/**
 * Re-scan DOM for new elements (useful for dynamically added content)
 */
const reinitializeAutoWidgets = (): void => {
  console.log('nodeDropChatWidget: Re-scanning DOM for new chat widgets')
  initializeAutoWidgets()
}

// Export to global scope
if (typeof window !== 'undefined') {
  window.nodeDropChatWidget = nodeDropChatWidget
  
  // Add reinitialize function to global scope for dynamic content
  ;(window as any).reinitializenodeDropChatWidgets = reinitializeAutoWidgets
  
  // Auto-initialize widgets when DOM is ready
  const handleDOMReady = () => {
    console.log('nodeDropChatWidget: DOM ready, initializing auto widgets')
    initializeAutoWidgets()
  }
  
  // Handle different DOM ready states
  if (document.readyState === 'loading') {
    // DOM is still loading, wait for DOMContentLoaded
    document.addEventListener('DOMContentLoaded', handleDOMReady)
  } else if (document.readyState === 'interactive' || document.readyState === 'complete') {
    // DOM is already ready, initialize immediately
    handleDOMReady()
  }
  
  // Also listen for dynamic content changes (optional enhancement)
  if (typeof MutationObserver !== 'undefined') {
    const observer = new MutationObserver((mutations) => {
      let shouldReinitialize = false
      
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node as Element
              // Check if the added element or its children have data-nd-chat
              if (element.hasAttribute?.('data-nd-chat') || 
                  element.querySelector?.('[data-nd-chat]')) {
                shouldReinitialize = true
              }
            }
          })
        }
      })
      
      if (shouldReinitialize) {
        // Debounce reinitialize calls
        setTimeout(reinitializeAutoWidgets, 100)
      }
    })
    
    // Start observing
    observer.observe(document.body, {
      childList: true,
      subtree: true
    })
  }
}

export { nodeDropChatWidget }
export type { ChatWidgetConfig }