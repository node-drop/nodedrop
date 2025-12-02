import { useReactFlowUIStore, useWorkflowToolbarStore } from "@/stores";

/**
 * Custom hook for managing UI state in the workflow editor
 * Handles panel visibility, sizes, ReactFlow view settings, and other UI state
 *
 * NOTE: This hook now uses Zustand stores instead of local state
 * to ensure state is shared across components
 */
export function useWorkflowEditorUI() {
  // Get UI state from stores
  const {
    showNodePalette,
    showExecutionsPanel,
    toggleNodePalette,
    toggleExecutionsPanel,
  } = useWorkflowToolbarStore();

  const {
    showMinimap,
    showBackground,
    showControls,
    backgroundVariant,
    showExecutionPanel,
    executionPanelSize,
    toggleMinimap,
    toggleBackground,
    toggleControls,
    changeBackgroundVariant,
    toggleExecutionPanel,
    setShowMinimap,
    setShowBackground,
    setShowControls,
    setBackgroundVariant,
    setExecutionPanelSize,
  } = useReactFlowUIStore();

  return {
    // Panel visibility
    showNodePalette,
    showExecutionsPanel,
    showExecutionPanel,

    // Panel controls
    toggleNodePalette,
    toggleExecutionsPanel,
    handleToggleExecutionPanel: toggleExecutionPanel,

    // Panel sizes
    executionPanelSize,
    setExecutionPanelSize,

    // ReactFlow view settings
    showMinimap,
    showBackground,
    showControls,
    backgroundVariant,

    // ReactFlow view controls
    handleToggleMinimap: toggleMinimap,
    handleToggleBackground: toggleBackground,
    handleToggleControls: toggleControls,
    handleChangeBackgroundVariant: changeBackgroundVariant,

    // Setters for direct control
    setShowMinimap,
    setShowBackground,
    setShowControls,
    setBackgroundVariant,
  };
}
