import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { useExecutionControls } from '@/hooks/workflow';
import { apiClient } from "@/services/api";
import { useNodeTypesStore } from "@/stores/nodeTypes";
import { useWorkflowStore } from "@/stores/workflow";
import { filterExistingNodeResults } from '@/utils/executionResultsFilter';
import { validateWorkflowDetailed } from '@/utils/workflowValidation';
import { useReactFlow } from '@xyflow/react';
import { formatDistanceToNow } from 'date-fns';
import { AlertCircle, ArrowLeft, CheckCircle2, ChevronDown, ChevronRight, History, Loader2, Play, Plus, Settings, Sparkles, StopCircle, Trash2, XCircle } from 'lucide-react';
import { memo, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { AISettingsForm } from './AISettingsForm';
interface Message {
  role: 'user' | 'assistant'
  content: string
  workflow?: any
  missingNodes?: string[]
  metadata?: any
  executionResult?: any // Store full execution result for strict visual rendering
  executionLogs?: any[] // Snapshot of logs for this execution
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
  const [showSettings, setShowSettings] = useState(false);
  const [isLoading, setIsLoading] = useState(false)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { fitView } = useReactFlow();
  
  const workflow = useWorkflowStore(state => state.workflow)
  const updateWorkflow = useWorkflowStore(state => state.updateWorkflow)
  const nodeTypes = useNodeTypesStore(state => state.nodeTypes); // Access node types correctly

  const { executeWorkflow, stopExecution, isExecuting, lastExecutionResult, executionLogs } = useExecutionControls();
  const [handledExecutionId, setHandledExecutionId] = useState<string | null>(null);
  const shouldMonitorExecution = useRef(false);

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

  // Monitor execution results for errors
  useEffect(() => {
    if (!lastExecutionResult) return;
    if (lastExecutionResult.executionId === handledExecutionId) return;
    
    // Only monitor if specifically requested (by Copilot action)
    if (!shouldMonitorExecution.current) return;

    if (lastExecutionResult.status === 'error') {
        setHandledExecutionId(lastExecutionResult.executionId);
        shouldMonitorExecution.current = false; // Reset flag
        
        // Find the specific error
        const failedNodes = lastExecutionResult.nodeResults.filter(n => n.status === 'error');
        const errorDetails = failedNodes.map(n => `Node '${n.nodeName}' failed: ${n.error}`).join('\n');
        const generalError = lastExecutionResult.error ? `Workflow Error: ${lastExecutionResult.error}` : '';
        
        const errorMessage = `Execution failed:\n${errorDetails}\n${generalError}\n\nPlease analyze this error and suggest a fix.`;
        
        // Auto-send message to AI
        // We use a slight delay to allow the UI to settle
        setTimeout(() => {
            handleSendMessageInternal(errorMessage, true);
        }, 500);
    } else if (lastExecutionResult.status === 'success') {
         setHandledExecutionId(lastExecutionResult.executionId);
         shouldMonitorExecution.current = false; // Reset flag
         
         // Add message with execution result for visual rendering
         setMessages(prev => [...prev, { 
             role: 'assistant', 
             content: "Workflow executed successfully!",
             executionResult: lastExecutionResult,
             executionLogs: [...executionLogs] // Snapshot logs
         }]);
    }
  }, [lastExecutionResult, handledExecutionId, executionLogs]);

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

  const handleSendMessage = () => {
      if (input.trim() === '/run') {
          handleRunCurrentWorkflow();
          setInput('');
      } else {
          handleSendMessageInternal(input);
      }
  };

  const handleSendMessageInternal = async (content: string, isSystemTriggered = false) => {
    if (!content.trim() || isLoading) return
    
    // Ensure active session
    let currentSessionId = activeSessionId;
    if (!currentSessionId && workflow?.id) {
        try {
             // Create session lazily if sending first message
             const res = await apiClient.post<ChatSession>('/ai/sessions', {
                workflowId: workflow.id,
                title: content.substring(0, 30) // Use prompt as title
            });
            const newSession = res as unknown as ChatSession;
            setSessions(prev => [newSession, ...prev]);
            currentSessionId = newSession.id;
            setActiveSessionId(newSession.id);
        } catch (err) {
            console.error("Failed to create lazy session", err);
        }
    }

    if (!isSystemTriggered) {
        setInput('');
    }
    
    // Add user message to UI (or system observation)
    setMessages(prev => [...prev, { role: 'user', content: content }]);
    setIsLoading(true);

    try {
      // Get current workflow for context
      const currentWorkflow = workflow ? {
        nodes: workflow.nodes,
        connections: workflow.connections
      } : undefined;

      const response = await apiClient.post<{ workflow: any; message: string; missingNodeTypes: string[] }>("/ai/generate-workflow", {
        prompt: content,
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

  // Common logic to execute a given set of nodes (after finding trigger)
  const executeWorkflowLogic = async (nodes: any[]) => {
    // 0. Pre-validate workflow
    // We need to pass the full workflow object to validation
    const fullWorkflow = {
        ...workflow,
        nodes: nodes, // Use the nodes relevant to this execution
        connections: workflow?.connections || []
    } as any;

    const validation = validateWorkflowDetailed(fullWorkflow, nodeTypes);
    
    if (!validation.isValid) {
        // Format validation errors
        let errorMsg = "I found some issues with the workflow configuration that need to be fixed before running:\n";
        
        validation.nodeErrors.forEach((errors, nodeId) => {
            const node = nodes.find((n: any) => n.id === nodeId);
            const nodeName = node?.parameters?.displayName || node?.name || node?.type || 'Unknown Node';
            errorMsg += `\n**${nodeName}**:\n${errors.map(e => `- ${e}`).join('\n')}`;
        });

        errorMsg += "\n\nPlease open these nodes and enter the missing values.";
        
        // Show validation error directly in chat without AI generation
        setMessages(prev => [...prev, { role: 'assistant', content: errorMsg }]);
        toast.warning("Validation failed. Please check the chat for details.");
        return;
    }

    // Find a suitable trigger node
    const triggerNode = nodes.find((n: any) => 
        n.type === 'manual-trigger' || 
        n.type === 'chat-trigger' || 
        n.type === 'webhook' ||
        n.type === 'schedule'
    );

    if (!triggerNode) {
        toast.warning("No trigger node found. Starting from first node.");
    }
    
    const startNodeId = triggerNode?.id || nodes[0]?.id;
    
    if (startNodeId) {
        toast.info("Starting workflow...");
        // Enable monitoring for this run
        shouldMonitorExecution.current = true;
        await executeWorkflow(startNodeId);
    } else {
        toast.error("Cannot run execution: No nodes found.");
    }
  };

  // Run the CURRENT workflow in the store (Triggered by /run)
  const handleRunCurrentWorkflow = async () => {
      if (!workflow || workflow.nodes.length === 0) {
          toast.error("No workflow to run.");
          return;
      }
      // Add a system message to chat to indicate run started
      setMessages(prev => [...prev, { role: 'user', content: '/run' }]);
      await executeWorkflowLogic(workflow.nodes);
  };

  // Run the SNAPSHOT workflow from the message (Triggered by "Run" button)
  const handleRunWorkflow = async (workflowData: any) => {
    // 1. Apply the workflow first to ensure state is synced
    handleApplyWorkflow(workflowData);
    
    // 2. Execute
    await executeWorkflowLogic(workflowData.nodes);
  };

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
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-6 w-6" 
            onClick={() => setShowSettings(true)}
            title="Settings"
          >
            <Settings className="h-4 w-4" />
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

                        <div className="flex gap-2">
                            <Button 
                                size="sm" 
                                className="flex-1 gap-2"
                                variant="outline"
                                onClick={() => handleApplyWorkflow(msg.workflow)}
                            >
                                <Plus className="h-3 w-3" />
                                Apply
                            </Button>
                            
                            {isExecuting ? (
                                <Button 
                                    size="sm" 
                                    variant="destructive"
                                    className="flex-1 gap-2" 
                                    onClick={() => stopExecution()}
                                >
                                    <StopCircle className="h-3 w-3" />
                                    Stop
                                </Button>
                            ) : (
                                <Button 
                                    size="sm" 
                                    className="flex-1 gap-2" 
                                    onClick={() => handleRunWorkflow(msg.workflow)}
                                >
                                    <Play className="h-3 w-3" />
                                    Run
                                </Button>
                            )}
                        </div>
                    </div>
                )}
                
                {/* Execution Report Widget */}
                {msg.executionResult && (
                    <div className="mt-2 w-full">
                        <ExecutionReport result={msg.executionResult} logs={msg.executionLogs} />
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
      {/* AI Settings Slide-in Panel */}
      {showSettings && (
        <div className="absolute inset-0 bg-background z-20 flex flex-col animate-in slide-in-from-right duration-200">
          <div className="flex-shrink-0 border-b p-3 flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSettings(false)}
              className="h-7 w-7 p-0 flex-shrink-0"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h3 className="text-sm font-semibold">AI Settings</h3>
          </div>
          <div className="flex-1 min-h-0 overflow-auto p-4">
             <AISettingsForm onClose={() => setShowSettings(false)} />
          </div>
        </div>
      )}
    </div>
  )
})

// --- Sub-components ---

function ExecutionReport({ result, logs = [] }: { result: any, logs?: any[] }) {
    const [expandedNodeId, setExpandedNodeId] = useState<string | null>(null);
    const workflow = useWorkflowStore(state => state.workflow);
    const nodeTypes = useNodeTypesStore(state => state.nodeTypes);

    // Get nodes in order of execution, filtering out deleted nodes using shared utility
    const nodes = filterExistingNodeResults(result.nodeResults || [], workflow?.nodes);

    return (
        <div className="border rounded-md bg-card overflow-hidden text-sm">
            <div className="p-2 border-b bg-muted/50 flex items-center justify-between">
                <span className="font-semibold flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    Execution Report
                </span>
                <span className="text-xs text-muted-foreground">
                    {result.duration}ms
                </span>
            </div>
            
            <ScrollArea className="max-h-[300px]">
                <div className="divide-y">
                    {nodes.map((node: any) => {
                        const isExpanded = expandedNodeId === node.nodeId;
                        const statusColor = node.status === 'success' ? 'text-green-500' : 
                                          node.status === 'error' ? 'text-destructive' : 'text-muted-foreground';
                        const StatusIcon = node.status === 'success' ? CheckCircle2 : 
                                         node.status === 'error' ? XCircle : AlertCircle;

                        // Resolve display name:
                        // 1. Custom name in parameters (user renamed)
                        // 2. Generic type name (e.g. "HTTP Request")
                        // 3. Fallback to ID/System Name
                        const workflowNode = workflow?.nodes.find(n => n.id === node.nodeId);
                        const nodeType = workflowNode ? nodeTypes.find(nt => nt.identifier === workflowNode.type) : undefined;
                        const displayName = workflowNode?.parameters?.displayName || nodeType?.displayName || node.nodeName || node.nodeId;

                        return (
                            <div key={node.nodeId} className="bg-background">
                                <button
                                    onClick={() => setExpandedNodeId(isExpanded ? null : node.nodeId)}
                                    className="w-full flex items-center justify-between p-2 hover:bg-muted/50 transition-colors text-left"
                                >
                                    <div className="flex items-center gap-2 overflow-hidden">
                                        <StatusIcon className={`h-4 w-4 flex-shrink-0 ${statusColor}`} />
                                        <span className="truncate font-medium">{displayName}</span>
                                    </div>
                                    {isExpanded ? <ChevronDown className="h-3 w-3 opacity-50" /> : <ChevronRight className="h-3 w-3 opacity-50" />}
                                </button>
                                
                                {isExpanded && (
                                    <div className="p-2 bg-muted/20 border-t overflow-hidden space-y-2">
                                        {/* Output */}
                                        {node.data && (
                                            <div>
                                                <div className="text-[10px] font-semibold text-muted-foreground mb-1 uppercase tracking-wider">Output</div>
                                                <div className="text-xs font-mono bg-muted p-2 rounded max-h-[150px] overflow-auto whitespace-pre-wrap">
                                                    {typeof node.data === 'object' ? JSON.stringify(node.data, null, 2) : String(node.data)}
                                                </div>
                                            </div>
                                        )}

                                        {/* Logs */}
                                        {logs && logs.filter(l => l.nodeId === node.nodeId).length > 0 && (
                                            <div>
                                                <div className="text-[10px] font-semibold text-muted-foreground mb-1 uppercase tracking-wider">Logs</div>
                                                 <div className="space-y-1">
                                                    {logs.filter(l => l.nodeId === node.nodeId).map((log, idx) => (
                                                        <div key={idx} className="text-xs p-1.5 bg-background border rounded flex gap-2 items-start">
                                                            <span className={`shrink-0 font-mono text-[10px] uppercase px-1 rounded ${
                                                                log.level === 'error' ? 'bg-red-100 text-red-700' :
                                                                log.level === 'warn' ? 'bg-yellow-100 text-yellow-700' :
                                                                'bg-blue-100 text-blue-700'
                                                            }`}>
                                                                {log.level}
                                                            </span>
                                                            <span className="break-all">{log.message}</span>
                                                        </div>
                                                    ))}
                                                 </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </ScrollArea>
        </div>
    );
}



