import { environmentService } from "@/services/environment";
import type {
  CreateEnvironmentInput,
  DeployEnvironmentInput,
  EnvironmentComparison,
  EnvironmentSummary,
  EnvironmentType,
  PromoteEnvironmentInput,
  RollbackEnvironmentInput,
  WorkflowEnvironment,
  WorkflowEnvironmentDeployment,
} from "@/types/environment";
import { devtools } from "zustand/middleware";
import { createWithEqualityFn } from "zustand/traditional";

interface EnvironmentStore {
  // State
  currentWorkflowId: string | null;
  environments: WorkflowEnvironment[];
  summaries: EnvironmentSummary[];
  selectedEnvironment: EnvironmentType | null;
  comparison: EnvironmentComparison | null;
  deploymentHistory: WorkflowEnvironmentDeployment[];
  isLoading: boolean;
  error: string | null;

  // Private state for request deduplication
  _loadSummariesPromise: Promise<void> | null;

  // Actions
  setWorkflow: (workflowId: string) => void;
  loadEnvironments: (workflowId: string) => Promise<void>;
  loadSummaries: (workflowId: string) => Promise<void>;
  loadEnvironmentWorkflow: (
    workflowId: string,
    environment: EnvironmentType
  ) => Promise<WorkflowEnvironment | null>;
  selectEnvironment: (environment: EnvironmentType) => void;
  createEnvironment: (
    workflowId: string,
    input: CreateEnvironmentInput
  ) => Promise<void>;
  deployToEnvironment: (
    workflowId: string,
    input: DeployEnvironmentInput
  ) => Promise<void>;
  promoteEnvironment: (
    workflowId: string,
    environment: EnvironmentType,
    input: PromoteEnvironmentInput
  ) => Promise<void>;
  rollbackEnvironment: (
    workflowId: string,
    environment: EnvironmentType,
    input: RollbackEnvironmentInput
  ) => Promise<void>;
  compareEnvironments: (
    workflowId: string,
    source: EnvironmentType,
    target: EnvironmentType
  ) => Promise<void>;
  loadDeploymentHistory: (
    workflowId: string,
    environment: EnvironmentType,
    page?: number
  ) => Promise<void>;
  activateEnvironment: (
    workflowId: string,
    environment: EnvironmentType
  ) => Promise<void>;
  deactivateEnvironment: (
    workflowId: string,
    environment: EnvironmentType
  ) => Promise<void>;
  deleteEnvironment: (
    workflowId: string,
    environment: EnvironmentType
  ) => Promise<void>;
  clearComparison: () => void;
  clearError: () => void;
}

export const useEnvironmentStore = createWithEqualityFn<EnvironmentStore>()(
  devtools(
    (set, get) => ({
      // Initial state
      currentWorkflowId: null,
      environments: [],
      summaries: [],
      selectedEnvironment: null,
      comparison: null,
      deploymentHistory: [],
      isLoading: false,
      error: null,
      _loadSummariesPromise: null,

      // Actions
      setWorkflow: (workflowId: string) => {
        set({
          currentWorkflowId: workflowId,
          environments: [],
          summaries: [],
          selectedEnvironment: null,
          comparison: null,
          deploymentHistory: [],
          _loadSummariesPromise: null,
        });
      },

      loadEnvironments: async (workflowId: string) => {
        set({ isLoading: true, error: null });
        try {
          const environments = await environmentService.getWorkflowEnvironments(
            workflowId
          );
          set({ environments, currentWorkflowId: workflowId });
        } catch (error: any) {
          set({ error: error.message || "Failed to load environments" });
        } finally {
          set({ isLoading: false });
        }
      },

      loadSummaries: async (workflowId: string) => {
        const { _loadSummariesPromise, currentWorkflowId } = get();

        // If there's already a request in progress for the same workflow, return that promise
        if (_loadSummariesPromise && currentWorkflowId === workflowId) {
          return _loadSummariesPromise;
        }

        // Create a new promise for this request
        const loadPromise = (async () => {
          set({ isLoading: true, error: null });
          try {
            const summaries = await environmentService.getEnvironmentSummaries(
              workflowId
            );
            set({ summaries: summaries || [], currentWorkflowId: workflowId });
          } catch (error: any) {
            console.error("[Environment Store] Failed to load summaries:", error);
            set({
              error: error.message || "Failed to load environment summaries",
              summaries: [],
            });
          } finally {
            set({ isLoading: false, _loadSummariesPromise: null });
          }
        })();

        // Store the promise to prevent duplicate requests
        set({ _loadSummariesPromise: loadPromise, currentWorkflowId: workflowId });

        return loadPromise;
      },

      selectEnvironment: (environment: EnvironmentType) => {
        set({ selectedEnvironment: environment });
      },

      loadEnvironmentWorkflow: async (
        workflowId: string,
        environment: EnvironmentType
      ): Promise<WorkflowEnvironment | null> => {
        set({ isLoading: true, error: null });
        try {
          const envData = await environmentService.getEnvironment(
            workflowId,
            environment
          );
          return envData;
        } catch (error: any) {
          console.error(
            "[Environment Store] Failed to load environment workflow:",
            error
          );
          set({
            error: error.message || "Failed to load environment workflow",
          });
          return null;
        } finally {
          set({ isLoading: false });
        }
      },

      createEnvironment: async (
        workflowId: string,
        input: CreateEnvironmentInput
      ) => {
        set({ isLoading: true, error: null });
        try {
          await environmentService.createEnvironment(workflowId, input);
          // Reload environments and summaries
          await Promise.all([
            get().loadEnvironments(workflowId),
            get().loadSummaries(workflowId),
          ]);
        } catch (error: any) {
          set({ error: error.message || "Failed to create environment" });
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },

      deployToEnvironment: async (
        workflowId: string,
        input: DeployEnvironmentInput
      ) => {
        set({ isLoading: true, error: null });
        try {
          await environmentService.deployToEnvironment(workflowId, input);
          // Reload environments and summaries
          await Promise.all([
            get().loadEnvironments(workflowId),
            get().loadSummaries(workflowId),
          ]);
        } catch (error: any) {
          set({ error: error.message || "Failed to deploy to environment" });
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },

      promoteEnvironment: async (
        workflowId: string,
        environment: EnvironmentType,
        input: PromoteEnvironmentInput
      ) => {
        set({ isLoading: true, error: null });
        try {
          await environmentService.promoteEnvironment(
            workflowId,
            environment,
            input
          );
          // Reload environments and summaries
          await Promise.all([
            get().loadEnvironments(workflowId),
            get().loadSummaries(workflowId),
          ]);
        } catch (error: any) {
          set({ error: error.message || "Failed to promote environment" });
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },

      rollbackEnvironment: async (
        workflowId: string,
        environment: EnvironmentType,
        input: RollbackEnvironmentInput
      ) => {
        set({ isLoading: true, error: null });
        try {
          await environmentService.rollbackEnvironment(
            workflowId,
            environment,
            input
          );
          // Reload environments and summaries
          await Promise.all([
            get().loadEnvironments(workflowId),
            get().loadSummaries(workflowId),
          ]);
        } catch (error: any) {
          set({ error: error.message || "Failed to rollback environment" });
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },

      compareEnvironments: async (
        workflowId: string,
        source: EnvironmentType,
        target: EnvironmentType
      ) => {
        set({ isLoading: true, error: null });
        try {
          const comparison = await environmentService.compareEnvironments(
            workflowId,
            source,
            target
          );
          set({ comparison });
        } catch (error: any) {
          set({ error: error.message || "Failed to compare environments" });
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },

      loadDeploymentHistory: async (
        workflowId: string,
        environment: EnvironmentType,
        page: number = 1
      ) => {
        set({ isLoading: true, error: null });
        try {
          const history = await environmentService.getDeploymentHistory(
            workflowId,
            environment,
            page
          );
          set({ deploymentHistory: history.deployments });
        } catch (error: any) {
          set({ error: error.message || "Failed to load deployment history" });
        } finally {
          set({ isLoading: false });
        }
      },

      activateEnvironment: async (
        workflowId: string,
        environment: EnvironmentType
      ) => {
        set({ isLoading: true, error: null });
        try {
          await environmentService.activateEnvironment(workflowId, environment);
          // Reload environments and summaries
          await Promise.all([
            get().loadEnvironments(workflowId),
            get().loadSummaries(workflowId),
          ]);
        } catch (error: any) {
          set({ error: error.message || "Failed to activate environment" });
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },

      deactivateEnvironment: async (
        workflowId: string,
        environment: EnvironmentType
      ) => {
        set({ isLoading: true, error: null });
        try {
          await environmentService.deactivateEnvironment(
            workflowId,
            environment
          );
          // Reload environments and summaries
          await Promise.all([
            get().loadEnvironments(workflowId),
            get().loadSummaries(workflowId),
          ]);
        } catch (error: any) {
          set({ error: error.message || "Failed to deactivate environment" });
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },

      deleteEnvironment: async (
        workflowId: string,
        environment: EnvironmentType
      ) => {
        set({ isLoading: true, error: null });
        try {
          await environmentService.deleteEnvironment(workflowId, environment);
          // Reload environments and summaries
          await Promise.all([
            get().loadEnvironments(workflowId),
            get().loadSummaries(workflowId),
          ]);
        } catch (error: any) {
          set({ error: error.message || "Failed to delete environment" });
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },

      clearComparison: () => {
        set({ comparison: null });
      },

      clearError: () => {
        set({ error: null });
      },
    }),
    { name: "EnvironmentStore" }
  )
);
