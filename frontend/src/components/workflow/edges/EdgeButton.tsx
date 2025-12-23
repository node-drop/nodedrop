/**
 * EdgeButton - Interactive button overlay for workflow edges
 * 
 * Displays a compact button group on edge connections when hovered, providing:
 * - Add node button (+): Opens NodeSelectorPopover to insert a node between connections
 * - Edge type selector: Switch between Step and Bezier edge rendering
 * - Delete button: Remove the connection
 * 
 * POPOVER INTEGRATION:
 * ====================
 * Uses NodeSelectorContent from NodeSelectorPopover.tsx to show a searchable node list.
 * When a node is selected, it:
 * 1. Removes the existing connection between source and target
 * 2. Creates a new node at the edge midpoint
 * 3. Creates two new connections: source → new node → target
 * 
 * This allows users to easily insert nodes into existing workflow paths without
 * manually reconnecting nodes.
 */

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { NodeSelectorContent } from '@/components/workflow/NodeSelectorPopover';
import { useWorkflowStore } from '@/stores';
import { NodeType } from '@/types';
import { createWorkflowNode } from '@/utils/nodeCreation';
import { EdgeLabelRenderer, useReactFlow } from '@xyflow/react';
import { GitBranch, Plus, Spline, Trash2 } from 'lucide-react';
import { CSSProperties, useCallback, useState } from 'react';
import { Algorithm } from '../EditableEdge/constants';

interface EdgeButtonProps {
  x: number;
  y: number;
  id?: string;
  source?: string;
  target?: string;
  sourceHandleId?: string | null;
  targetHandleId?: string | null;
  algorithm?: string;
  style?: CSSProperties;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

export function EdgeButton({
  x,
  y,
  id,
  source,
  target,
  sourceHandleId,
  targetHandleId,
  algorithm = Algorithm.Step,
  style,
  onMouseEnter,
  onMouseLeave,
}: EdgeButtonProps) {
  const { setEdges } = useReactFlow();
  // OPTIMIZATION: Use Zustand selectors to prevent unnecessary re-renders
  const workflow = useWorkflowStore(state => state.workflow);
  const addNode = useWorkflowStore(state => state.addNode);
  const addConnection = useWorkflowStore(state => state.addConnection);
  const removeConnection = useWorkflowStore(state => state.removeConnection);
  const updateConnection = useWorkflowStore(state => state.updateConnection);
  const readOnly = useWorkflowStore(state => state.readOnly);
  
  const [showEdgeTypes, setShowEdgeTypes] = useState(false);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  
  // Don't render buttons in read-only mode (only when viewing past execution)
  const isReadOnly = readOnly;

  /**
   * Handle selecting a node from the popover
   * Inserts the new node between the source and target nodes
   */
  const handleSelectNode = useCallback(
    (nodeType: NodeType) => {
      if (!source || !target) return;

      const position = { x, y };
      
      // Create new node
      const newNode = createWorkflowNode(nodeType, position);
      addNode(newNode);

      // Remove existing connection
      const existingConnection = workflow?.connections.find(
        conn =>
          conn.sourceNodeId === source &&
          conn.targetNodeId === target &&
          (conn.sourceOutput === sourceHandleId || (!conn.sourceOutput && !sourceHandleId)) &&
          (conn.targetInput === targetHandleId || (!conn.targetInput && !targetHandleId))
      );

      if (existingConnection) {
        removeConnection(existingConnection.id);
      }

      // Create connection from source to new node
      const sourceToNewConnection = {
        id: `${source}-${newNode.id}-${Date.now()}`,
        sourceNodeId: source,
        sourceOutput: sourceHandleId || 'main',
        targetNodeId: newNode.id,
        targetInput: nodeType.inputs?.[0] || 'main',
      };
      addConnection(sourceToNewConnection);

      // Create connection from new node to target
      const newToTargetConnection = {
        id: `${newNode.id}-${target}-${Date.now() + 1}`,
        sourceNodeId: newNode.id,
        sourceOutput: nodeType.outputs?.[0] || 'main',
        targetNodeId: target,
        targetInput: targetHandleId || 'main',
      };
      addConnection(newToTargetConnection);

      setIsPopoverOpen(false);
    },
    [x, y, source, target, sourceHandleId, targetHandleId, workflow, addNode, removeConnection, addConnection]
  );

  const handleDeleteClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      
      // Find the connection to remove
      const connection = workflow?.connections.find(
        conn =>
          conn.sourceNodeId === source &&
          conn.targetNodeId === target &&
          (conn.sourceOutput === sourceHandleId || (!conn.sourceOutput && !sourceHandleId)) &&
          (conn.targetInput === targetHandleId || (!conn.targetInput && !targetHandleId))
      );

      if (connection) {
        removeConnection(connection.id);
      }
    },
    [workflow, removeConnection, source, target, sourceHandleId, targetHandleId]
  );

  const handleEdgeTypeChange = useCallback(
    (newAlgorithm: Algorithm) => {
      if (!id) return;
      
      // Update React Flow edge
      setEdges((edges) =>
        edges.map((edge) => {
          if (edge.id === id) {
            return {
              ...edge,
              data: {
                ...edge.data,
                algorithm: newAlgorithm,
                points: [], // Reset control points when changing algorithm
              },
            };
          }
          return edge;
        })
      );
      
      // Update workflow store
      updateConnection(id, { 
        algorithm: newAlgorithm,
        controlPoints: [], // Reset control points
      } as any);
      
      setShowEdgeTypes(false);
    },
    [id, setEdges, updateConnection]
  );

  // Don't render buttons in read-only mode
  if (isReadOnly) {
    return null;
  }
  
  // Only show Step and Bezier options
  const edgeTypeIcons: Partial<Record<Algorithm, { icon: typeof GitBranch; label: string }>> = {
    [Algorithm.Step]: { icon: GitBranch, label: 'Step' },
    [Algorithm.BezierCatmullRom]: { icon: Spline, label: 'Bezier' },
  };
  
  const currentType = edgeTypeIcons[algorithm as Algorithm] || edgeTypeIcons[Algorithm.Step]!;

  return (
    <EdgeLabelRenderer>
      <div
        className="nodrag nopan pointer-events-auto absolute z-50 flex items-center rounded border bg-card shadow-sm"
        style={{
          transform: `translate(-50%, -50%) translate(${x}px, ${y}px)`,
          padding: '1px',
          gap: '1px',
          ...style,
        }}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
          <PopoverTrigger asChild>
            <button
              onClick={(_e) => {
                // Prevent default behavior if any
              }}
              className="flex h-3 w-3 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              title="Add node"
            >
              <Plus className="h-2 w-2" />
            </button>
          </PopoverTrigger>
          <PopoverContent 
            className="w-[320px] p-0" 
            align="center" 
            side="top"
            sideOffset={10}
            onPointerDownOutside={() => {
              // Close popover when clicking outside (including canvas)
              setIsPopoverOpen(false)
            }}
            onEscapeKeyDown={() => {
              // Close popover on Escape key
              setIsPopoverOpen(false)
            }}
          >
            <NodeSelectorContent 
              onSelectNode={handleSelectNode} 
              onClose={() => setIsPopoverOpen(false)}
              fixedWidth={true}
            />
          </PopoverContent>
        </Popover>

        <div className="h-2 w-px bg-border" />
        
        {/* Edge type selector */}
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowEdgeTypes(!showEdgeTypes);
            }}
            className="flex h-3 w-3 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            title={`Edge type: ${currentType.label}`}
          >
            <currentType.icon className="h-2 w-2" />
          </button>
          
          {showEdgeTypes && (
            <div className="absolute left-1/2 top-full mt-0.5 -translate-x-1/2 flex flex-col rounded border bg-card p-0.5 shadow-md z-[100]" style={{ gap: '1px' }}>
              {Object.entries(edgeTypeIcons).map(([alg, { icon: Icon, label }]) => (
                <button
                  key={alg}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEdgeTypeChange(alg as Algorithm);
                  }}
                  className={`flex items-center gap-1 px-1 py-px text-[9px] rounded-sm transition-colors whitespace-nowrap ${
                    algorithm === alg
                      ? 'bg-accent text-accent-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  }`}
                  title={label}
                >
                  <Icon className="h-2 w-2" />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        
        <div className="h-2 w-px bg-border" />
        <button
          onClick={handleDeleteClick}
          className="flex h-3 w-3 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-destructive hover:text-destructive-foreground"
          title="Delete connection"
        >
          <Trash2 className="h-2 w-2" />
        </button>
      </div>
    </EdgeLabelRenderer>
  );
}
