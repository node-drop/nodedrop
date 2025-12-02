import React, { useState, useEffect, useRef } from 'react'
import { MessageCircle, X, Send } from 'lucide-react'
import './widget-styles.css'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
}

interface ChatConfig {
  chatTitle: string
  chatDescription: string
  welcomeMessage: string
  placeholderText: string
  widgetTheme: string
  widgetPosition: string
  bubbleColor: string
  headerColor: string
  workflowName?: string
  isActive?: boolean
}

interface ChatResponse {
  success: boolean
  chat?: ChatConfig
  chatId?: string
  workflowId?: string
  error?: string
}

interface MessageResponse {
  success: boolean
  response?: string
  sessionId: string
  timestamp: string
  executionId?: string
  error?: string
}

interface PublicChatWidgetProps {
  chatId: string
  apiUrl?: string
  theme?: 'light' | 'dark' | 'auto'
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'
  onMessage?: (message: string) => void
  onResponse?: (response: string) => void
  onError?: (error: any) => void
  onOpen?: () => void
  onClose?: () => void
}

export function PublicChatWidget({
  chatId,
  apiUrl: customApiUrl,
  theme = 'auto',
  position = 'bottom-right',
  onMessage,
  onResponse,
  onError,
  onOpen,
  onClose
}: PublicChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [chatConfig, setChatConfig] = useState<ChatConfig | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [currentMessage, setCurrentMessage] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showErrorPopup, setShowErrorPopup] = useState(false)
  const [sessionId] = useState(() => `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768)

  // Get API URL
  const getApiUrl = () => {
    if (customApiUrl) return customApiUrl
    
    // Try to detect from current page
    const currentOrigin = window.location.origin
    const apiUrl = currentOrigin.includes('localhost') 
      ? 'http://localhost:4000/api' 
      : `${currentOrigin}/api`
    
    return apiUrl
  }

  // Auto-scroll to latest messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Handle window resize for mobile responsiveness
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768)
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Apply theme
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark')
    } else if (theme === 'light') {
      document.documentElement.classList.remove('dark')
    } else {
      // Auto: detect system preference
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      if (isDark) {
        document.documentElement.classList.add('dark')
      }
    }
  }, [theme])

  // Fetch chat configuration on mount
  useEffect(() => {
    const fetchChatConfig = async () => {
      try {
        const apiUrl = getApiUrl()
        const response = await fetch(`${apiUrl}/public/chats/${chatId}`)
        const data: ChatResponse = await response.json()
        
        if (data.success && data.chat) {
          setChatConfig(data.chat)
          // Add welcome message if configured
          if (data.chat.welcomeMessage) {
            const welcomeMsg: ChatMessage = {
              id: `welcome-${Date.now()}`,
              role: 'assistant',
              content: data.chat.welcomeMessage,
              timestamp: new Date()
            }
            setMessages([welcomeMsg])
          }
        } else {
          const errorMsg = data.error || 'Chat not found'
          setError(errorMsg)
          setShowErrorPopup(true)
          onError?.(errorMsg)
        }
      } catch (error: any) {
        console.error('Error fetching chat config:', error)
        const errorMessage = error.message || 'Failed to load chat configuration'
        setError(errorMessage)
        setShowErrorPopup(true)
        onError?.(errorMessage)
      } finally {
        setLoading(false)
      }
    }

    fetchChatConfig()
  }, [chatId, customApiUrl])

  // Get position styles for chat bubble
  const getPositionStyles = () => {
    const baseStyles = {
      position: 'fixed' as const,
      zIndex: 1000,
    }

    switch (position) {
      case 'bottom-left':
        return { ...baseStyles, bottom: '20px', left: '20px' }
      case 'top-right':
        return { ...baseStyles, top: '20px', right: '20px' }
      case 'top-left':
        return { ...baseStyles, top: '20px', left: '20px' }
      case 'bottom-right':
      default:
        return { ...baseStyles, bottom: '20px', right: '20px' }
    }
  }

  // Get popup position styles
  const getPopupPositionStyles = () => {
    if (isMobile) {
      // Full screen on mobile
      return {
        position: 'fixed' as const,
        zIndex: 999,
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100%',
        height: '100%',
      }
    }

    const baseStyles = {
      position: 'fixed' as const,
      zIndex: 999,
      width: '350px',
      height: '500px',
    }

    switch (position) {
      case 'bottom-left':
        return { ...baseStyles, bottom: '90px', left: '20px' }
      case 'top-right':
        return { ...baseStyles, top: '90px', right: '20px' }
      case 'top-left':
        return { ...baseStyles, top: '90px', left: '20px' }
      case 'bottom-right':
      default:
        return { ...baseStyles, bottom: '90px', right: '20px' }
    }
  }

  // Handle message submission
  const handleSendMessage = async () => {
    if (!currentMessage.trim() || isTyping || !chatConfig) return

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: currentMessage.trim(),
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setCurrentMessage('')
    setIsTyping(true)
    onMessage?.(userMessage.content)

    try {
      const apiUrl = getApiUrl()
      const response = await fetch(`${apiUrl}/public/chats/${chatId}/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage.content,
          sessionId: sessionId,
        }),
      })

      const data: MessageResponse = await response.json()

      if (data.success && data.response) {
        const aiMessage: ChatMessage = {
          id: `ai-${Date.now()}`,
          role: 'assistant',
          content: data.response,
          timestamp: new Date()
        }
        setMessages(prev => [...prev, aiMessage])
        onResponse?.(data.response)
      } else {
        const errorMsg = data.error || 'Failed to get response'
        const errorMessage: ChatMessage = {
          id: `error-${Date.now()}`,
          role: 'system',
          content: `❌ ${errorMsg}`,
          timestamp: new Date()
        }
        setMessages(prev => [...prev, errorMessage])
        onError?.(errorMsg)
      }
    } catch (error: any) {
      console.error('Error sending message:', error)
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        role: 'system',
        content: `❌ ${error.message || 'Network error occurred'}`,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
      onError?.(error)
    } finally {
      setIsTyping(false)
    }
  }

  // Handle Enter key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  // Toggle chat popup
  const toggleChat = () => {
    const newIsOpen = !isOpen
    setIsOpen(newIsOpen)
    
    if (newIsOpen) {
      // Opening chat
      setTimeout(() => {
        inputRef.current?.focus()
      }, 100)
      
      // Call onOpen callback
      if (onOpen) {
        onOpen()
      }
    } else {
      // Closing chat
      if (onClose) {
        onClose()
      }
    }
  }

  // Get bubble color from config or default
  const bubbleColor = chatConfig?.bubbleColor || '#007bff'
  const headerColor = chatConfig?.headerColor || '#007bff'

  // Chat Bubble Component
  const ChatBubble = () => (
    <div
      style={{
        ...getPositionStyles(),
        width: '60px',
        height: '60px',
        backgroundColor: error ? '#dc2626' : bubbleColor,
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        boxShadow: error 
          ? '0 4px 12px rgba(220, 38, 38, 0.3)' 
          : '0 4px 12px rgba(0,0,0,0.15)',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease',
      }}
      onClick={error ? () => setShowErrorPopup(true) : toggleChat}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'scale(1.1)'
        e.currentTarget.style.boxShadow = error 
          ? '0 6px 16px rgba(220, 38, 38, 0.4)' 
          : '0 6px 16px rgba(0,0,0,0.2)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1)'
        e.currentTarget.style.boxShadow = error 
          ? '0 4px 12px rgba(220, 38, 38, 0.3)' 
          : '0 4px 12px rgba(0,0,0,0.15)'
      }}
    >
      {error ? (
        <span style={{ fontSize: '24px' }}>⚠️</span>
      ) : (
        <MessageCircle size={24} color="white" />
      )}
      
      {/* Error indicator badge */}
      {error && (
        <div style={{
          position: 'absolute',
          top: '-2px',
          right: '-2px',
          width: '16px',
          height: '16px',
          backgroundColor: '#fbbf24',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '10px',
          animation: 'pulse 2s infinite'
        }}>
          !
        </div>
      )}
    </div>
  )

  if (loading) {
    return <ChatBubble />
  }

  if (error || !chatConfig) {
    return (
      <>
        <ChatBubble />
        {/* Error popup for invalid chat ID */}
        {showErrorPopup && error && (
          <div
            style={{
              ...getPopupPositionStyles(),
              backgroundColor: 'white',
              borderRadius: '12px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
              border: '1px solid #fecaca',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              maxWidth: '350px',
            }}
          >
            {/* Error Header */}
            <div
              style={{
                backgroundColor: '#fef2f2',
                color: '#dc2626',
                padding: isMobile ? '20px' : '16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: '1px solid #fecaca',
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>
                  Chat Unavailable
                </h3>
              </div>
              <button
                onClick={() => setShowErrorPopup(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#dc2626',
                  cursor: 'pointer',
                  padding: isMobile ? '8px' : '4px',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minWidth: isMobile ? '44px' : 'auto',
                  minHeight: isMobile ? '44px' : 'auto',
                }}
              >
                <X size={isMobile ? 24 : 20} />
              </button>
            </div>

            {/* Error Content */}
            <div style={{ padding: '16px' }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px',
                marginBottom: '12px'
              }}>
                <div style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  backgroundColor: '#fecaca',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px'
                }}>
                  ⚠️
                </div>
                <span style={{ fontSize: '14px', fontWeight: '500', color: '#374151' }}>
                  Configuration Error
                </span>
              </div>
              
              <p style={{ 
                margin: '0 0 12px 0', 
                fontSize: '14px', 
                color: '#6b7280',
                lineHeight: '1.4'
              }}>
                {error.includes('Chat not found') || error.includes('404') 
                  ? `The chat ID "${chatId}" was not found. Please check that:`
                  : 'There was an error loading the chat:'
                }
              </p>
              
              {(error.includes('Chat not found') || error.includes('404')) && (
                <ul style={{ 
                  margin: '0 0 12px 0', 
                  paddingLeft: '20px',
                  fontSize: '13px',
                  color: '#6b7280'
                }}>
                  <li>The chat workflow is published and active</li>
                  <li>The chat ID matches your workflow configuration</li>
                  <li>The backend server is running</li>
                </ul>
              )}
              
              <div style={{
                backgroundColor: '#f9fafb',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                padding: '8px',
                fontSize: '12px',
                fontFamily: 'monospace',
                color: '#374151',
                wordBreak: 'break-all'
              }}>
                Chat ID: {chatId}
              </div>
              
              {error && !error.includes('Chat not found') && !error.includes('404') && (
                <div style={{
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '6px',
                  padding: '8px',
                  fontSize: '12px',
                  color: '#dc2626',
                  marginTop: '8px'
                }}>
                  Error: {error}
                </div>
              )}
            </div>
          </div>
        )}
      </>
    )
  }

  return (
    <>
      {/* Chat Bubble */}
      <ChatBubble />

      {/* Chat Popup */}
      {isOpen && (
        <div
          style={{
            ...getPopupPositionStyles(),
            backgroundColor: 'white',
            borderRadius: '12px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
            border: '1px solid #e5e7eb',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div
            style={{
              backgroundColor: headerColor,
              color: 'white',
              padding: isMobile ? '20px' : '16px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>
                {chatConfig.chatTitle}
              </h3>
              {chatConfig.chatDescription && (
                <p style={{ margin: '4px 0 0 0', fontSize: '14px', opacity: 0.9 }}>
                  {chatConfig.chatDescription}
                </p>
              )}
            </div>
            <button
              onClick={toggleChat}
              style={{
                background: 'none',
                border: 'none',
                color: 'white',
                cursor: 'pointer',
                padding: isMobile ? '8px' : '4px',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: isMobile ? '44px' : 'auto', // Touch-friendly
                minHeight: isMobile ? '44px' : 'auto',
              }}
            >
              <X size={isMobile ? 24 : 20} />
            </button>
          </div>

          {/* Messages Area */}
          <div
            style={{
              flex: 1,
              padding: '16px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            {messages.map((message) => (
              <div
                key={message.id}
                style={{
                  display: 'flex',
                  justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start',
                }}
              >
                <div
                  style={{
                    maxWidth: '80%',
                    padding: '8px 12px',
                    borderRadius: '12px',
                    backgroundColor: message.role === 'user' 
                      ? bubbleColor 
                      : message.role === 'system' 
                        ? '#f3f4f6' 
                        : '#f9fafb',
                    color: message.role === 'user' ? 'white' : '#374151',
                    fontSize: '14px',
                    lineHeight: '1.4',
                    wordWrap: 'break-word',
                  }}
                >
                  {message.content}
                </div>
              </div>
            ))}

            {/* Typing Indicator */}
            {isTyping && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div
                  style={{
                    padding: '8px 12px',
                    borderRadius: '12px',
                    backgroundColor: '#f9fafb',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <span style={{ fontSize: '14px', color: '#6b7280', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    AI is typing
                    <div style={{ display: 'flex', gap: '2px', alignItems: 'center' }}>
                      <div style={{ 
                        width: '4px', 
                        height: '4px', 
                        borderRadius: '50%', 
                        backgroundColor: '#6b7280',
                        animation: 'typing-dots 1.4s infinite ease-in-out'
                      }}></div>
                      <div style={{ 
                        width: '4px', 
                        height: '4px', 
                        borderRadius: '50%', 
                        backgroundColor: '#6b7280',
                        animation: 'typing-dots 1.4s infinite ease-in-out',
                        animationDelay: '0.2s'
                      }}></div>
                      <div style={{ 
                        width: '4px', 
                        height: '4px', 
                        borderRadius: '50%', 
                        backgroundColor: '#6b7280',
                        animation: 'typing-dots 1.4s infinite ease-in-out',
                        animationDelay: '0.4s'
                      }}></div>
                    </div>
                  </span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div
            style={{
              padding: isMobile ? '20px' : '16px',
              borderTop: '1px solid #e5e7eb',
              display: 'flex',
              gap: '8px',
              alignItems: 'flex-end',
            }}
          >
            <input
              ref={inputRef}
              type="text"
              value={currentMessage}
              onChange={(e) => setCurrentMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={chatConfig.placeholderText || 'Type your message...'}
              disabled={isTyping}
              style={{
                flex: 1,
                padding: isMobile ? '12px 16px' : '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: isMobile ? '16px' : '14px', // Prevent zoom on iOS
                outline: 'none',
                resize: 'none',
                minHeight: isMobile ? '44px' : 'auto', // Touch-friendly height
              }}
            />
            <button
              onClick={handleSendMessage}
              disabled={!currentMessage.trim() || isTyping}
              style={{
                padding: isMobile ? '12px' : '8px',
                backgroundColor: bubbleColor,
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: currentMessage.trim() && !isTyping ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: currentMessage.trim() && !isTyping ? 1 : 0.5,
                minWidth: isMobile ? '44px' : 'auto', // Touch-friendly width
                minHeight: isMobile ? '44px' : 'auto',
              }}
            >
              <Send size={isMobile ? 20 : 16} />
            </button>
          </div>
        </div>
      )}
    </>
  )
}