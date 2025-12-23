/**
 * useNodeActions - Hook providing action handlers for workflow nodes
 * 
 * Provides a comprehensive set of actions that can be performed on workflow nodes,
 * including copy/paste, delete, duplicate, group/ungroup, and node insertion.
 * 
 * NODE INSERTION WITH POPOVER:
 * ============================
 * 
 * This hook creates NodeSelectorNode instances (which show the node selector popover)
 * for two key scenarios:
 * 
 * 1. handleOutputClick - Adding nodes after a node's output
 *    - Triggered by clicking + button on output handles
 *    - Creates NodeSelectorNode positioned to the right of the source node
 *    - Establishes connection context: source node → new node
 *    - Uses NodeSelectorPopover via NodeSelectorNode component
 * 
 * 2. handleServiceInputClick - Adding service provider nodes
 *    - Triggered by clicking + button on service input handles (model, tool, memory)
 *    - Creates NodeSelectorNode positioned below the target node
 *    - Establishes connection context: new node → target node
 *    - Uses NodeSelectorPopover via NodeSelectorNode component
 * 
 * Both methods:
 * - Create a temporary NodeSelectorNode at calculated position
 * - Store insertion context in usePlaceholderNodeStore
 * - Show NodeSelectorContent popover for node selection
 * - Replace selector node with chosen node type when selected
 * 
 * @param nodeId - The ID of the node these actions apply to
 * @returns Object containing all available node action handlers
 */

import { useDetachNodes, useDeleteNodes } from "@/hooks/workflow";
import { useCopyPasteStore } from "@/stores/copyPaste";
import { useWorkflowStore } from "@/stores/workflow";
import { usePlaceholderNodeStore } from "@/stores/placeholderNode";
import { WorkflowNode } from "@/types";
import { useReactFlow } from "@xyflow/react";
import { useCallback } from "react";

export function useNodeActions(nodeId: string) {
  const executeNode = useWorkflowStore((state) => state.executeNode);
  const updateNode = useWorkflowStore((state) => state.updateNode);
  const addNode = useWorkflowStore((state) => state.addNode);
  const toggleNodeLock = useWorkflowStore((state) => state.toggleNodeLock);
  const openNodeProperties = useWorkflowStore(
    (state) => state.openNodeProperties
  );
  const workflow = useWorkflowStore((state) => state.workflow);
  const updateWorkflow = useWorkflowStore((state) => state.updateWorkflow);
  const saveToHistory = useWorkflowStore((state) => state.saveToHistory);
  const setDirty = useWorkflowStore((state) => state.setDirty);

  const { showPlaceholder } = usePlaceholderNodeStore();
  const { copy, cut, paste, canCopy, canPaste } = useCopyPasteStore();
  const detachNodes = useDetachNodes();
  const deleteNodes = useDeleteNodes();
  const { getNodes, setNodes, getNodesBounds } = useReactFlow();

  // Wrapper to select this node before copying (for context menu)
  const handleCopyFromContext = useCallback(() => {
    setNodes((nodes) =>
      nodes.map((node) => ({
        ...node,
        selected: node.id === nodeId,
      }))
    );
    setTimeout(() => {
      copy?.();
    }, 50);
  }, [nodeId, setNodes, copy]);

  // Wrapper to select this node before cutting (for context menu)
  const handleCutFromContext = useCallback(() => {
    setNodes((nodes) =>
      nodes.map((node) => ({
        ...node,
        selected: node.id === nodeId,
      }))
    );
    setTimeout(() => {
      cut?.();
    }, 50);
  }, [nodeId, setNodes, cut]);

  const handleToggleDisabled = (nodeId: string, disabled: boolean) => {
    updateNode(nodeId, { disabled });
  };

  const handleToggleDisabledFromContext = () => {
    const node = workflow?.nodes.find((n) => n.id === nodeId);
    if (node) {
      updateNode(nodeId, { disabled: !node.disabled });
    }
  };

  const handleOpenProperties = () => {
    // Open regular properties panel for all nodes (including chat)
    openNodeProperties(nodeId);
  };

  const handleExecuteFromContext = () => {
    executeNode(nodeId, undefined, "single");
  };

  const handleDuplicate = () => {
    const nodeToClone = workflow?.nodes.find((n) => n.id === nodeId);
    if (nodeToClone) {
      const clonedNode = {
        ...nodeToClone,
        id: `node-${Date.now()}`,
        name: nodeToClone.name, // addNode will ensure unique name
        position: {
          x: nodeToClone.position.x + 50,
          y: nodeToClone.position.y + 50,
        },
      };
      addNode(clonedNode);
    }
  };

  const handleDelete = () => {
    // Use shared delete handler for consistency
    deleteNodes([nodeId]);
  };

  const handleToggleLock = () => {
    toggleNodeLock(nodeId);
  };

  const handleToggleCompact = () => {
    const node = workflow?.nodes.find((n) => n.id === nodeId);
    if (node) {
      const currentCompact = node.settings?.compact || false;
      updateNode(nodeId, {
        settings: {
          ...node.settings,
          compact: !currentCompact,
        },
      });
    }
  };

  const handleUngroup = () => {
    detachNodes([nodeId], undefined);
  };

  const handleGroup = () => {
    // Get all selected nodes that are not groups and not in groups
    // Use fresh nodes from React Flow to ensure we have current positions
    const allNodes = getNodes();
    const selectedNodes = allNodes.filter(
      (node) => node.selected && !node.parentId && node.type !== "group"
    );

    // Need at least 1 node to create a group
    if (selectedNodes.length < 1) {
      return;
    }

    // Take snapshot for undo/redo
    saveToHistory("Group nodes");

    const groupId = `group_${Math.random() * 10000}`;
    
    // Calculate bounds using fresh positions from getNodes()
    const selectedNodesRectangle = getNodesBounds(selectedNodes);
    const GROUP_PADDING = 25;
    const groupNodePosition = {
      x: selectedNodesRectangle.x,
      y: selectedNodesRectangle.y,
    };

    // Create the group node
    const groupNode = {
      id: groupId,
      type: "group",
      position: groupNodePosition,
      style: {
        width: selectedNodesRectangle.width + GROUP_PADDING * 2,
        height: selectedNodesRectangle.height + GROUP_PADDING * 2,
      },
      data: {},
    };

    const selectedNodeIds = selectedNodes.map((n) => n.id);

    const nextNodes = allNodes.map((node) => {
      if (selectedNodeIds.includes(node.id)) {
        return {
          ...node,
          // Calculate relative position of the node inside the group
          position: {
            x: node.position.x - groupNodePosition.x + GROUP_PADDING,
            y: node.position.y - groupNodePosition.y + GROUP_PADDING,
          },
          extent: "parent" as const,
          parentId: groupId,
          expandParent: true,
          selected: false, // Deselect after grouping
        };
      }
      return node;
    });

    // Update React Flow nodes
    setNodes([groupNode, ...nextNodes]);

    // Sync to Zustand workflow store
    if (workflow) {
      const allNodesUpdated = [groupNode, ...nextNodes];
      const existingNodesMap = new Map(workflow.nodes.map((n) => [n.id, n]));

      const updatedWorkflowNodes: WorkflowNode[] = [];

      allNodesUpdated.forEach((rfNode) => {
        const existingNode = existingNodesMap.get(rfNode.id);

        if (rfNode.type === "group") {
          // Add the new group node
          updatedWorkflowNodes.push({
            id: rfNode.id,
            type: "group",
            name: "",
            description: undefined,
            parameters: rfNode.data || {},
            position: rfNode.position,
            disabled: false,
            style: rfNode.style as any,
          });
        } else if (existingNode) {
          // Update existing node with parent relationship
          const anyRfNode = rfNode as any;
          updatedWorkflowNodes.push({
            ...existingNode,
            position: rfNode.position,
            parentId: anyRfNode.parentId || undefined,
            extent: (anyRfNode.extent || undefined) as any,
          });
        }
      });

      // Skip history since we already saved before grouping
      updateWorkflow({ nodes: updatedWorkflowNodes }, true);
      setDirty(true);
    }
  };

  /**
   * Handle clicking the + button on a node's output handle
   * Creates a NodeSelectorNode to insert a new node after this one
   * 
   * Position calculation:
   * - Places the selector node to the right of this node with proper spacing
   * - This ensures consistent horizontal layout
   */
  const handleOutputClick = (
    event: React.MouseEvent<HTMLDivElement>,
    outputHandle: string
  ) => {
    event.preventDefault();
    event.stopPropagation();

    // Get the current node to calculate position
    const currentNode = getNodes().find((n) => n.id === nodeId);
    if (!currentNode) return;

    // Calculate position to the right of the current node
    const position = {
      x: currentNode.position.x + (currentNode.width || 200) + 100,
      y: currentNode.position.y,
    };

    // Create a node-selector node at the calculated position
    const selectorNodeId = `node-selector-${Date.now()}`;
    const selectorNode = {
      id: selectorNodeId,
      type: "node-selector",
      name: "Select Node",
      parameters: {},
      position,
      disabled: false,
    };

    // Create a temporary connection from source to selector node
    const tempConnection = {
      id: `temp-${nodeId}-${selectorNodeId}`,
      sourceNodeId: nodeId,
      sourceOutput: outputHandle || "main",
      targetNodeId: selectorNodeId,
      targetInput: "main",
    };

    // Add node to workflow store
    if (workflow) {
      updateWorkflow(
        {
          nodes: [...workflow.nodes, selectorNode],
          connections: [...workflow.connections, tempConnection],
        },
        true
      ); // Skip history for temporary selector node
    }

    // Add node directly to React Flow for immediate rendering
    setNodes((nodes) => [
      ...nodes,
      {
        id: selectorNodeId,
        type: "node-selector",
        position,
        data: {
          label: "Select Node",
          nodeType: "node-selector",
        },
      },
    ]);

    // Store insertion context for the selector node
    showPlaceholder(position, {
      sourceNodeId: nodeId,
      targetNodeId: "",
      sourceOutput: outputHandle,
      targetInput: "main",
    });
  };

  /**
   * Handle clicking the + button on a node's service input handle (bottom/top handles)
   * Creates a NodeSelectorNode to insert a service provider node (model, tool, memory)
   * 
   * Position calculation:
   * - Places the selector node below this node with proper spacing
   * - This ensures consistent vertical layout for service connections
   * 
   * Connection direction:
   * - The new node will be the SOURCE (provides the service)
   * - This node will be the TARGET (consumes the service)
   */
  const handleServiceInputClick = (
    event: React.MouseEvent<HTMLDivElement>,
    inputHandle: string
  ) => {
    event.preventDefault();
    event.stopPropagation();

    // Get the current node to calculate position
    const currentNode = getNodes().find((n) => n.id === nodeId);
    if (!currentNode) return;

    // Calculate position below the current node
    const position = {
      x: currentNode.position.x,
      y: currentNode.position.y + (currentNode.height || 100) + 100,
    };

    // Create a node-selector node at the calculated position
    const selectorNodeId = `node-selector-${Date.now()}`;
    const selectorNode = {
      id: selectorNodeId,
      type: "node-selector",
      name: "Select Node",
      parameters: {},
      position,
      disabled: false,
    };

    // Create a temporary connection from selector to this node
    const tempConnection = {
      id: `temp-${selectorNodeId}-${nodeId}`,
      sourceNodeId: selectorNodeId,
      sourceOutput: inputHandle,
      targetNodeId: nodeId,
      targetInput: inputHandle,
    };

    // Add node to workflow store
    if (workflow) {
      updateWorkflow(
        {
          nodes: [...workflow.nodes, selectorNode],
          connections: [...workflow.connections, tempConnection],
        },
        true
      ); // Skip history for temporary selector node
    }

    // Add node directly to React Flow for immediate rendering
    setNodes((nodes) => [
      ...nodes,
      {
        id: selectorNodeId,
        type: "node-selector",
        position,
        data: {
          label: "Select Node",
          nodeType: "node-selector",
        },
      },
    ]);

    // Store insertion context for the selector node
    showPlaceholder(position, {
      sourceNodeId: "",
      targetNodeId: nodeId,
      sourceOutput: inputHandle,
      targetInput: inputHandle,
    });
  };

  return {
    handleToggleDisabled,
    handleToggleDisabledFromContext,
    handleOpenProperties,
    handleExecuteFromContext,
    handleDuplicate,
    handleDelete,
    handleToggleLock,
    handleToggleCompact,
    handleUngroup,
    handleGroup,
    handleOutputClick,
    handleServiceInputClick,
    handleCopyFromContext,
    handleCutFromContext,
    paste,
    canCopy,
    canPaste,
  };
}
