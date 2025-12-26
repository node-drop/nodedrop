import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { apiClient } from "@/services/api";
import { useWorkflowStore } from "@/stores/workflow";
import { useReactFlow } from '@xyflow/react';
import { formatDistanceToNow } from 'date-fns';
import { AlertCircle, History, Loader2, Play, Plus, Sparkles, Trash2 } from 'lucide-react';
import { memo, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

interface Message {
  role: 'user' | 'assistant'
  content: string
  workflow?: any
  missingNodes?: string[]
  metadata?: any
}

interface ChatSession {
  id: string;
  title: string;
  updatedAt: string;
}

export const CopilotPanel = memo(function CopilotPanel() {
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [isLoading, setIsLoading] = useState(false)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { fitView } = useReactFlow();
  
  const workflow = useWorkflowStore(state => state.workflow)
  const updateWorkflow = useWorkflowStore(state => state.updateWorkflow)

  const scrollToBottom = () => {
    setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, 100);
  }

  // Load sessions on mount or workflow change
  useEffect(() => {
    if (workflow?.id) {
        loadSessions(workflow.id);
    }
  }, [workflow?.id]);

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const loadSessions = async (workflowId: string) => {
      try {
          const res = await apiClient.get<ChatSession[]>(`/ai/sessions?workflowId=${workflowId}`);
          const loadedSessions = Array.isArray(res) ? res : []; // Safety check
          setSessions(loadedSessions);
          
          // Auto-select latest session if none active, or create new if empty
          if (!activeSessionId && loadedSessions.length > 0) {
              selectSession(loadedSessions[0].id);
          } else if (loadedSessions.length === 0) {
              // Optionally auto-create? Let's just show empty state or "New Chat" logic
              setMessages([{ role: 'assistant', content: 'Hi! I can help you build workflows. Describe what you want to achieve.' }]);
          }
      } catch (err) {
          console.error("Failed to load sessions", err);
      }
  };

  const selectSession = async (sessionId: string) => {
      setIsLoading(true);
      setShowHistory(false);
      try {
          const res = await apiClient.get<any[]>(`/ai/sessions/${sessionId}/messages`);
          // Map DB messages to UI messages
          // Assuming DB message has: role, content, metadata
          const mappedMessages: Message[] = Array.isArray(res) ? res.map(m => ({
              role: m.role as 'user' | 'assistant',
              content: m.content,
              workflow: m.metadata?.workflow,
              missingNodes: m.metadata?.missingNodeTypes
          })) : [];
          
          setMessages(mappedMessages);
          setActiveSessionId(sessionId);
      } catch (err) {
          toast.error("Failed to load chat history");
      } finally {
          setIsLoading(false);
      }
  };

  const createNewSession = async () => {
      if (!workflow?.id) return;
      try {
          // If we have an active session with no messages, don't create new
          if (activeSessionId && messages.length === 0) return;

          const res = await apiClient.post<ChatSession>('/ai/sessions', {
              workflowId: workflow.id,
              title: 'New Conversation'
          });
          const newSession = res as unknown as ChatSession; // Safety cast
          
          setSessions(prev => [newSession, ...prev]);
          setActiveSessionId(newSession.id);
          setMessages([{ role: 'assistant', content: 'Hi! I can help you build workflows. Describe what you want to achieve.' }]);
          setShowHistory(false);
      } catch (err) {
          toast.error("Failed to create new chat");
      }
  };

  const handleDeleteSession = async (e: React.MouseEvent, sessionId: string) => {
      e.stopPropagation();
      try {
          await apiClient.delete(`/ai/sessions/${sessionId}`);
          setSessions(prev => prev.filter(s => s.id !== sessionId));
          if (activeSessionId === sessionId) {
              setActiveSessionId(null);
              setMessages([{ role: 'assistant', content: 'Hi! I can help you build workflows. Describe what you want to achieve.' }]);
          }
          toast.success("Chat deleted");
      } catch (err) {
          toast.error("Failed to delete chat");
      }
  };

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return
    const userMessage = input.trim()
    
    // Ensure active session
    let currentSessionId = activeSessionId;
    if (!currentSessionId && workflow?.id) {
        try {
             // Create session lazily if sending first message
             const res = await apiClient.post<ChatSession>('/ai/sessions', {
                workflowId: workflow.id,
                title: userMessage.substring(0, 30) // Use prompt as title
            });
            const newSession = res as unknown as ChatSession;
            setSessions(prev => [newSession, ...prev]);
            currentSessionId = newSession.id;
            setActiveSessionId(newSession.id);
        } catch (err) {
            console.error("Failed to create lazy session", err);
            // Continue without session (ephemeral)
        }
    }

    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userMessage }])
    setIsLoading(true)

    try {
      // Get current workflow for context
      const currentWorkflow = workflow ? {
        nodes: workflow.nodes,
        connections: workflow.connections
      } : undefined;

      const response = await apiClient.post<{ workflow: any; message: string; missingNodeTypes: string[] }>("/ai/generate-workflow", {
        prompt: userMessage,
        sessionId: currentSessionId, // Pass session ID to persist
        workflowId: workflow?.id,
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
      
      // Update session title in list if it's new
      if (currentSessionId) {
          loadSessions(workflow!.id); // Refresh list to update timestamps/Sort
      }

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
        
        // Fit view after 100ms to allow React Flow to render new nodes
        setTimeout(() => {
            fitView({ padding: 0.2, duration: 800 });
        }, 100);

    } catch (err) {
        console.error("Failed to apply workflow", err);
        toast.error("Failed to apply workflow changes.");
    }
  }

  const handleInstallNodes = async (nodes: string[]) => {
      toast.info(`Please install: npm install ${nodes.map(n => `@nodedrop/${n}`).join(' ')}`);
  }

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden relative">
      <div className="flex-shrink-0 flex items-center justify-between px-3 py-2 border-b bg-muted/20">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowHistory(!showHistory)}>
             <History className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium">Copilot</span>
        </div>
        <div className="flex gap-1">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-6 w-6" 
            onClick={createNewSession}
            title="New Chat"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* History Overlay */}
      {showHistory && (
          <div className="absolute top-[41px] left-0 bottom-0 w-64 bg-background border-r z-20 shadow-lg flex flex-col animate-in slide-in-from-left duration-200">
              <div className="p-3 border-b bg-muted/10 font-medium text-xs text-muted-foreground">Chat History</div>
              <div className="flex-1 overflow-auto">
                  {sessions.length === 0 ? (
                      <div className="p-4 text-center text-xs text-muted-foreground">No history yet</div>
                  ) : (
                      sessions.map(session => (
                          <div 
                            key={session.id} 
                            className={`p-3 border-b cursor-pointer hover:bg-muted/50 flex justify-between group ${activeSessionId === session.id ? 'bg-muted' : ''}`}
                            onClick={() => selectSession(session.id)}
                          >
                              <div className="flex-1 overflow-hidden">
                                  <div className="text-sm font-medium truncate">{session.title || 'Untitled Chat'}</div>
                                  <div className="text-xs text-muted-foreground mt-1">
                                      {formatDistanceToNow(new Date(session.updatedAt), { addSuffix: true })}
                                  </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={(e) => handleDeleteSession(e, session.id)}
                              >
                                  <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                              </Button>
                          </div>
                      ))
                  )}
              </div>
          </div>
      )}

      {/* Chat Area */}
      <div className="flex-1 min-h-0 relative" onClick={() => showHistory && setShowHistory(false)}>
        <div className="absolute inset-0 overflow-auto p-4">
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
                
                {msg.workflow && (
                    <div className="mt-2 p-3 border rounded-md bg-card w-full text-xs">
                        <div className="flex items-center justify-between mb-2">
                            <span className="font-semibold">Generated Workflow</span>
                            <span className="text-muted-foreground">{msg.workflow.nodes?.length || 0} nodes</span>
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
        </div>
      </div>

      <div className="flex-shrink-0 p-4 border-t bg-background">
        <form 
            onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
            className="relative"
        >
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={activeSessionId ? "Type a message..." : "Describe a workflow to start..."}
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

