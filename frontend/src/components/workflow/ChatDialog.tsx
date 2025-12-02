import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useExecutionControls } from '@/hooks/workflow'
import { useWorkflowStore } from '@/stores'
import { MessageCircle, Send, Sparkles, User } from 'lucide-react'
import { useCallback, useState } from 'react'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface ChatDialogProps {
  nodeId: string
  nodeName: string
  isOpen: boolean
  onClose: () => void
}

export function ChatDialog({ nodeId, nodeName, isOpen, onClose }: ChatDialogProps) {
  const { workflow, executionState, updateNode } = useWorkflowStore()
  const { executeWorkflow } = useExecutionControls()
  const isReadOnly = !!executionState.executionId
  const isExecuting = executionState.status === 'running'
  
  // Get the node
  const node = workflow?.nodes.find(n => n.id === nodeId)
  const placeholder = node?.parameters?.placeholder || 'Type a message...'
  
  // Check if we have execution results
  const executionResult = (node as any)?.executionResult || (node as any)?.lastExecutionData
  const hasExecutionData = executionResult && executionResult.data
  
  // Use execution data if available, otherwise use local state for interactive mode
  const [localMessages, setLocalMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isTyping, setIsTyping] = useState(false)

  // Determine which messages to display
  let displayMessages: Message[] = localMessages
  
  if (hasExecutionData) {
    // Show data from workflow execution
    const executionData = executionResult.data
    
    // Just show the user message that was sent
    if (executionData.message || executionData.userMessage) {
      displayMessages = [
        {
          id: 'exec-user',
          role: 'user',
          content: executionData.userMessage || executionData.message,
          timestamp: new Date(executionData.timestamp || Date.now())
        }
      ]
    }
  }

  const handleSendMessage = useCallback(async () => {
    if (!inputValue.trim() || isExecuting) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue,
      timestamp: new Date()
    }

    // Add user message to local state for immediate feedback
    setLocalMessages(prev => [...prev, userMessage])
    
    const messageToSend = inputValue
    setInputValue('')
    setIsTyping(true)

    try {
      // First, update the node parameters with the user message
      updateNode(nodeId, {
        parameters: {
          ...node?.parameters,
          userMessage: messageToSend
        },
        disabled: false
      })

      // Wait a tiny bit for the state to propagate
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // Now execute the workflow with this node as trigger
      console.log('Executing workflow with node:', nodeId, 'message:', messageToSend)
      await executeWorkflow(nodeId)
      
      console.log('Workflow execution completed')
      setIsTyping(false)
    } catch (error) {
      console.error('Failed to execute workflow:', error)
      setIsTyping(false)
      
      // Show error message
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `❌ Error: Failed to execute workflow. ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date()
      }
      setLocalMessages(prev => [...prev, errorMessage])
    }
  }, [inputValue, isExecuting, nodeId, node?.parameters, updateNode, executeWorkflow])

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }, [handleSendMessage])

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[700px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-blue-500" />
            {nodeName || 'Chat'}
          </DialogTitle>
          <DialogDescription>
            Send messages to trigger the workflow
            {hasExecutionData && (
              <span className="ml-2 text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded">
                ✓ Sent
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        {/* Chat Messages Area */}
        <ScrollArea className="h-[400px] px-4 py-2 border rounded-md">
          {displayMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <MessageCircle className="w-16 h-16 mb-3 opacity-50" />
              <p className="text-sm">No messages yet</p>
              <p className="text-xs">Type to start...</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {displayMessages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  {message.role === 'assistant' && (
                    <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                      <Sparkles className="w-5 h-5 text-white" />
                    </div>
                  )}
                  <div
                    className={`rounded-lg px-4 py-3 max-w-[75%] ${
                      message.role === 'user'
                        ? 'bg-blue-500 text-white'
                        : 'bg-secondary text-foreground'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    <span className="text-xs opacity-70 mt-1 block">
                      {message.timestamp.toLocaleTimeString([], { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </span>
                  </div>
                  {message.role === 'user' && (
                    <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center flex-shrink-0">
                      <User className="w-5 h-5 text-gray-600" />
                    </div>
                  )}
                </div>
              ))}
              {isTyping && (
                <div className="flex gap-3 justify-start">
                  <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  <div className="rounded-lg px-4 py-3 bg-secondary text-foreground">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        {/* Debug Info - Show output data structure */}
        {hasExecutionData && (
          <div className="text-xs text-muted-foreground bg-secondary p-3 rounded">
            <div className="font-semibold mb-1">📤 Output:</div>
            <div className="space-y-1">
              {executionResult.data.message && (
                <div>Message: {executionResult.data.message}</div>
              )}
              {executionResult.data.timestamp && (
                <div>Time: {new Date(executionResult.data.timestamp).toLocaleTimeString()}</div>
              )}
            </div>
          </div>
        )}
        
        {/* Input field */}
        <div className="flex gap-2">
          <Input
            type="text"
            placeholder={isExecuting ? 'Processing...' : placeholder}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={isReadOnly || isTyping || isExecuting}
            className="flex-1"
          />
          <Button
            size="icon"
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isReadOnly || isTyping || isExecuting}
          >
            {isExecuting ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
