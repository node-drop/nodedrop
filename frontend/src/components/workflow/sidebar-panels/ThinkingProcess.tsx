
import { cn } from "@/lib/utils";
import { BrainCircuit, CheckCircle2, ChevronDown, ChevronRight, LayoutTemplate, Loader2, PenTool, Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export type AgentStepType = 'status' | 'node-selection' | 'planning' | 'tool-use';

export interface AgentEvent {
    type: AgentStepType;
    message: string;
    nodes?: string[];
    tool?: string;
    timestamp?: number;
}

interface ThinkingProcessProps {
    events: AgentEvent[];
    isComplete: boolean;
    className?: string;
}

export function ThinkingProcess({ events, isComplete, className }: ThinkingProcessProps) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const [isCollapsed, setIsCollapsed] = useState(false);

    // Auto-scroll to bottom as events come in
    useEffect(() => {
        if (scrollRef.current && !isCollapsed) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [events, isCollapsed]);

    return (
        <div className={cn("flex flex-col gap-2 p-3 bg-muted/30 rounded-lg border text-sm font-sans mb-4 transition-all duration-200", className)}>
            <div 
                className="flex items-center justify-between pb-2 border-b border-muted/20 text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
                onClick={() => setIsCollapsed(!isCollapsed)}
            >
                <div className="flex items-center gap-2">
                    <BrainCircuit className="h-4 w-4 text-primary" />
                    <span className="font-medium text-xs uppercase tracking-wider">AI Thinking Process</span>
                </div>
                <button className="text-muted-foreground hover:text-foreground">
                    {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
            </div>

            {!isCollapsed && (
                <div className="mt-2 space-y-3 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar animate-in slide-in-from-top-2 duration-200" ref={scrollRef}>
                    {events.map((event, idx) => (
                        <div
                            key={idx}
                            className="flex items-start gap-3 overflow-hidden animate-in slide-in-from-bottom-2 fade-in duration-300"
                        >
                            <StepIcon type={event.type} isLast={idx === events.length - 1 && !isComplete} />
                            
                            <div className="flex-1 space-y-1">
                                <div className="text-sm text-foreground/90 leading-tight">
                                    {event.message}
                                </div>
                                
                                {event.nodes && event.nodes.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-1">
                                        {event.nodes.map(node => (
                                            <span 
                                                key={node} 
                                                className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-primary/10 text-primary border border-primary/20"
                                            >
                                                {node}
                                            </span>
                                        ))}
                                    </div>
                                )}
                                
                                {event.tool && (
                                    <div className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                                        <PenTool className="h-3 w-3" />
                                        <span className="font-mono">{event.tool}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                    
                    {!isComplete && (
                        <div 
                            className="flex items-center gap-3 pt-1 animate-in fade-in duration-500"
                        >
                            <div className="w-5 flex justify-center">
                                <span className="relative flex h-2 w-2">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                                </span>
                            </div>
                            <span className="text-xs text-muted-foreground animate-pulse">Working...</span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

function StepIcon({ type, isLast }: { type: AgentStepType, isLast: boolean }) {
    if (isLast) {
        return (
            <div className="mt-0.5 w-5 h-5 flex items-center justify-center shrink-0 text-primary">
                 <Loader2 className="h-4 w-4 animate-spin" />
            </div>
        )
    }

    switch (type) {
        case 'node-selection':
            return <div className="mt-0.5 w-5 h-5 flex items-center justify-center shrink-0 text-blue-500"><Search className="h-4 w-4" /></div>;
        case 'planning':
            return <div className="mt-0.5 w-5 h-5 flex items-center justify-center shrink-0 text-purple-500"><LayoutTemplate className="h-4 w-4" /></div>;
        case 'tool-use':
            return <div className="mt-0.5 w-5 h-5 flex items-center justify-center shrink-0 text-orange-500"><PenTool className="h-4 w-4" /></div>;
        case 'status':
        default:
            return <div className="mt-0.5 w-5 h-5 flex items-center justify-center shrink-0 text-green-500"><CheckCircle2 className="h-4 w-4" /></div>;
    }
}
