import { cn } from "@/lib/utils";
import * as Collapsible from "@radix-ui/react-collapsible";
import { BrainCircuit, CheckCircle2, ChevronRight, Loader2, PenTool, Search } from "lucide-react";
import { useEffect, useState } from "react";

export type AgentStepType = 'status' | 'node-selection' | 'planning' | 'tool-use' | 'thinking';

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
    startTime?: number;
}

export function ThinkingProcess({ events, isComplete, className, startTime }: ThinkingProcessProps) {
    const [elapsedTime, setElapsedTime] = useState(0);
    
    // Track elapsed time while thinking
    useEffect(() => {
        if (isComplete) {
            // For completed, calculate from startTime if provided
            if (startTime) {
                setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
            }
            return;
        }
        
        if (!startTime) return;
        
        const interval = setInterval(() => {
            setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
        }, 1000);
        
        return () => clearInterval(interval);
    }, [isComplete, startTime]);

    // Group events for display
    const thinkingEvent = events.find(e => e.type === 'thinking');
    const toolEvents = events.filter(e => e.type === 'tool-use');
    const nodeSelectionEvent = events.find(e => e.type === 'node-selection');

    const formatTime = (seconds: number) => {
        if (seconds < 60) return `${seconds}s`;
        return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
    };

    return (
        <div className={cn("w-full text-sm space-y-0.5", className)}>
            {/* Thinking/Reasoning - always first if exists */}
            {(thinkingEvent || !isComplete) && (
                <TimelineItem
                    icon={<BrainCircuit className="h-4 w-4" />}
                    label={isComplete ? `Thought for ${formatTime(elapsedTime)}` : `Thinking${elapsedTime > 0 ? ` (${formatTime(elapsedTime)})` : '...'}`}
                    isLoading={!isComplete}
                    expandable={!!thinkingEvent?.message}
                >
                    {thinkingEvent?.message && (
                        <div className="text-xs text-muted-foreground whitespace-pre-wrap pl-6 py-2 max-h-[200px] overflow-y-auto">
                            {thinkingEvent.message}
                        </div>
                    )}
                </TimelineItem>
            )}

            {/* Node Selection */}
            {nodeSelectionEvent && (
                <TimelineItem
                    icon={<Search className="h-4 w-4" />}
                    label={`Found ${nodeSelectionEvent.nodes?.length || 0} relevant nodes`}
                    expandable={!!nodeSelectionEvent.nodes?.length}
                >
                    {nodeSelectionEvent.nodes && (
                        <div className="flex flex-wrap gap-1 pl-6 py-2">
                            {nodeSelectionEvent.nodes.map(node => (
                                <span 
                                    key={node} 
                                    className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-primary/10 text-primary border border-primary/20"
                                >
                                    {node}
                                </span>
                            ))}
                        </div>
                    )}
                </TimelineItem>
            )}

            {/* Tool Uses */}
            {toolEvents.map((event, idx) => (
                <TimelineItem
                    key={`tool-${idx}`}
                    icon={<PenTool className="h-4 w-4" />}
                    label={event.tool || event.message}
                    highlight={event.tool === 'build_workflow'}
                />
            ))}

            {/* Completion status */}
            {isComplete && (
                <TimelineItem
                    icon={<CheckCircle2 className="h-4 w-4 text-green-500" />}
                    label="Completed"
                />
            )}
        </div>
    );
}

interface TimelineItemProps {
    icon: React.ReactNode;
    label: string;
    isLoading?: boolean;
    expandable?: boolean;
    highlight?: boolean;
    children?: React.ReactNode;
}

function TimelineItem({ icon, label, isLoading, expandable, highlight, children }: TimelineItemProps) {
    const [isOpen, setIsOpen] = useState(false);
    
    const content = (
        <div className={cn(
            "flex items-center gap-2 py-1 px-2 rounded-md transition-colors min-h-[28px]",
            highlight && "bg-primary/5 border border-primary/20",
            expandable && "hover:bg-muted/50 cursor-pointer",
            !expandable && !highlight && "text-muted-foreground"
        )}>
            <span className={cn(
                "shrink-0 text-muted-foreground",
                highlight && "text-primary",
                isLoading && "text-primary"
            )}>
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
            </span>
            <span className={cn(
                "flex-1 truncate text-[13px]",
                highlight && "font-medium text-foreground"
            )}>
                {label}
            </span>
            {expandable && (
                <ChevronRight className={cn(
                    "h-3 w-3 shrink-0 text-muted-foreground transition-transform duration-200",
                    isOpen && "rotate-90"
                )} />
            )}
        </div>
    );

    if (!expandable) {
        return <div>{content}</div>;
    }

    return (
        <Collapsible.Root open={isOpen} onOpenChange={setIsOpen}>
            <Collapsible.Trigger asChild>
                {content}
            </Collapsible.Trigger>
            <Collapsible.Content className="overflow-hidden data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0">
                {children}
            </Collapsible.Content>
        </Collapsible.Root>
    );
}
