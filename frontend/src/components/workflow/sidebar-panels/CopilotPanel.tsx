
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { apiClient } from "@/services/api";
import { useWorkflowStore } from "@/stores/workflow";
import { AlertCircle, Loader2, Play, Sparkles } from 'lucide-react';
import { memo, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

interface Message {
  role: 'user' | 'assistant'
  content: string
  workflow?: any
  missingNodes?: string[]
}

export const CopilotPanel = memo(function CopilotPanel() {
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Hi! I can help you build workflows. Describe what you want to achieve.' }
  ])
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  const workflowStore = useWorkflowStore(state => state.workflow)
  const updateWorkflow = useWorkflowStore(state => state.updateWorkflow)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return

    const userMessage = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userMessage }])
    setIsLoading(true)

    try {
      // Get current workflow for context (if editing)
      const currentWorkflow = workflowStore ? {
        nodes: workflowStore.nodes,
        connections: workflowStore.connections
      } : undefined;

      const response = await apiClient.post<{ workflow: any; message: string; missingNodeTypes: string[] }>("/ai/generate-workflow", {
        prompt: userMessage, // Corrected from userMessage.content as userMessage is a string
        currentWorkflow: currentWorkflow
          ? {
              nodes: currentWorkflow.nodes,
              connections: currentWorkflow.connections,
            }
          : undefined,
      });

      const data = response as unknown as { workflow: any; message: string; missingNodeTypes: string[] };
      
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: data.message,
        workflow: data.workflow,
        missingNodes: data.missingNodeTypes
      }])

    } catch (error) {
      console.error('Failed to generate workflow:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Sorry, I encountered an error while processing your request.' 
      }])
    } finally {
      setIsLoading(false)
    }
  }

  const handleApplyWorkflow = (workflowData: any) => {
    try {
        if (!workflowData || !workflowData.nodes) return;
        
        updateWorkflow({
            nodes: workflowData.nodes,
            connections: workflowData.connections || []
        });

        toast.success("Workflow updated successfully!");
    } catch (err) {
        console.error("Failed to apply workflow", err);
        toast.error("Failed to apply workflow changes.");
    }
  }

  const handleInstallNodes = async (nodes: string[]) => {
      // Placeholder for installation logic
      toast.info(`Please install: npm install ${nodes.map(n => `@nodedrop/${n}`).join(' ')}`);
  }

  return (
    <div className="flex flex-col h-full bg-background">
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
              <div className={`rounded-lg p-3 max-w-[90%] text-sm ${
                msg.role === 'user' 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-muted text-foreground'
              }`}>
                {msg.content}
              </div>
              
              {/* Workflow Preview / Action Area */}
              {msg.workflow && (
                <div className="mt-2 p-3 border rounded-md bg-card w-full text-xs">
                    <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold">Generated Workflow</span>
                        <span className="text-muted-foreground">{msg.workflow.nodes.length} nodes</span>
                    </div>
                    
                    {msg.missingNodes && msg.missingNodes.length > 0 && (
                        <Alert variant="destructive" className="mb-2 py-2">
                             <AlertCircle className="h-4 w-4" />
                             <AlertTitle>Missing Nodes</AlertTitle>
                             <AlertDescription>
                                {msg.missingNodes.join(', ')}
                                <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="w-full mt-2 h-6 text-xs"
                                    onClick={() => handleInstallNodes(msg.missingNodes!)}
                                >
                                    Install Missing
                                </Button>
                             </AlertDescription>
                        </Alert>
                    )}

                    <Button 
                        size="sm" 
                        className="w-full gap-2" 
                        onClick={() => handleApplyWorkflow(msg.workflow)}
                    >
                        <Play className="h-3 w-3" />
                        Apply to Editor
                    </Button>
                </div>
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      <div className="p-4 border-t bg-background">
        <form 
            onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
            className="relative"
        >
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Describe your workflow..."
            className="min-h-[80px] pr-12 resize-none"
            onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                }
            }}
          />
          <Button 
            type="submit" 
            size="icon"
            disabled={isLoading || !input.trim()}
            className="absolute bottom-2 right-2 h-8 w-8"
          >
            {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
                <Sparkles className="h-4 w-4" />
            )}
            <span className="sr-only">Send</span>
          </Button>
        </form>
      </div>
    </div>
  )
})
