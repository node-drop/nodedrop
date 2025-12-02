import { useReactFlowUIStore } from "@/stores";
import { useEnvironmentStore } from "@/stores/environment";
import { EnvironmentType } from "@/types/environment";
import { useCallback } from "react";
import { triggerReactFlowFitView } from "./useReactFlowAutoLayout";

/**
 * Hook to handle environment switching logic
 * Manages loading environment workflows and triggering layout recalculation
 *
 * @param workflowId - The ID of the workflow
 * @returns Object with environment switching handlers
 */
export function useEnvironmentSwitcher(workflowId: string) {
  const { selectEnvironment } = useEnvironmentStore();

  /**
   * Switch to a specific environment
   * Loads the environment workflow and triggers layout recalculation
   */
  const switchToEnvironment = useCallback(
    async (environment: EnvironmentType) => {
      selectEnvironment(environment);

      if (!workflowId) return;

      try {
        const { loadEnvironmentWorkflow } = useEnvironmentStore.getState();
        const { workflow: currentWorkflow, setWorkflow } = await import(
          "@/stores/workflow"
        ).then((m) => ({
          workflow: m.useWorkflowStore.getState().workflow,
          setWorkflow: m.useWorkflowStore.getState().setWorkflow,
        }));

        const envData = await loadEnvironmentWorkflow(workflowId, environment);
        if (envData && currentWorkflow) {
          // Merge environment data with original workflow metadata
          // Only override environment-specific data: nodes, connections, settings, active
          setWorkflow({
            ...currentWorkflow, // Keep original: name, description, category, tags, userId, createdAt, updatedAt, etc.
            nodes: envData.nodes || [], // Override with environment nodes
            connections: envData.connections || [], // Override with environment connections
            settings: envData.settings || {}, // Override with environment settings
            active: envData.active, // Override with environment active state
          });

          // Trigger ReactFlow to recalculate layout after environment switch
          const { reactFlowInstance } = useReactFlowUIStore.getState();
          triggerReactFlowFitView(reactFlowInstance, 100);
        }
      } catch (error) {
        console.error("Failed to load environment workflow:", error);
        throw error;
      }
    },
    [workflowId, selectEnvironment]
  );

  /**
   * Exit environment view and return to main workflow
   * Reloads the main workflow from the server
   */
  const exitEnvironmentView = useCallback(async () => {
    // Clear the selected environment
    selectEnvironment(null as any);

    if (!workflowId) return;

    try {
      const { setWorkflow } = await import("@/stores/workflow").then((m) => ({
        setWorkflow: m.useWorkflowStore.getState().setWorkflow,
      }));
      const { workflowService } = await import("@/services");

      const mainWorkflow = await workflowService.getWorkflow(workflowId);
      setWorkflow(mainWorkflow);

      // Trigger ReactFlow to recalculate layout after exiting environment view
      const { reactFlowInstance } = useReactFlowUIStore.getState();
      triggerReactFlowFitView(reactFlowInstance, 100);
    } catch (error) {
      console.error("Failed to reload main workflow:", error);
      // Fallback to page reload if API call fails
      window.location.reload();
      throw error;
    }
  }, [workflowId, selectEnvironment]);

  return {
    switchToEnvironment,
    exitEnvironmentView,
  };
}
