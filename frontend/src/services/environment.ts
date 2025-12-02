import type {
  CreateEnvironmentInput,
  DeployEnvironmentInput,
  EnvironmentComparison,
  EnvironmentSummary,
  EnvironmentType,
  PromoteEnvironmentInput,
  RollbackEnvironmentInput,
  UpdateEnvironmentInput,
  WorkflowEnvironment,
  WorkflowEnvironmentDeployment,
} from "@/types/environment";
import api from "./api";

/**
 * Service for managing workflow environments
 */

export const environmentService = {
  /**
   * Get all environments for a workflow
   */
  async getWorkflowEnvironments(
    workflowId: string
  ): Promise<WorkflowEnvironment[]> {
    const response = await api.get(`/workflows/${workflowId}/environments`);
    return response.data || [];
  },

  /**
   * Get environment summaries
   */
  async getEnvironmentSummaries(
    workflowId: string
  ): Promise<EnvironmentSummary[]> {
    const response = await api.get(
      `/workflows/${workflowId}/environments/summary`
    );
    return response.data || [];
  },

  /**
   * Get a specific environment
   */
  async getEnvironment(
    workflowId: string,
    environment: EnvironmentType
  ): Promise<WorkflowEnvironment> {
    const response = await api.get(
      `/workflows/${workflowId}/environments/${environment}`
    );
    return response.data;
  },

  /**
   * Create a new environment
   */
  async createEnvironment(
    workflowId: string,
    input: CreateEnvironmentInput
  ): Promise<WorkflowEnvironment> {
    const response = await api.post(
      `/workflows/${workflowId}/environments`,
      input
    );
    return response.data;
  },

  /**
   * Deploy from one environment to another
   */
  async deployToEnvironment(
    workflowId: string,
    input: DeployEnvironmentInput
  ): Promise<WorkflowEnvironment> {
    const response = await api.post(
      `/workflows/${workflowId}/environments/deploy`,
      input
    );
    return response.data;
  },

  /**
   * Update environment with current workflow state
   */
  async updateEnvironment(
    workflowId: string,
    environment: EnvironmentType,
    input: Omit<UpdateEnvironmentInput, "environment">
  ): Promise<WorkflowEnvironment> {
    const response = await api.post(
      `/workflows/${workflowId}/environments/${environment}/update`,
      input
    );
    return response.data;
  },

  /**
   * Promote environment to next level
   */
  async promoteEnvironment(
    workflowId: string,
    environment: EnvironmentType,
    input: PromoteEnvironmentInput
  ): Promise<WorkflowEnvironment> {
    const response = await api.post(
      `/workflows/${workflowId}/environments/${environment}/promote`,
      input
    );
    return response.data;
  },

  /**
   * Rollback environment to previous deployment
   */
  async rollbackEnvironment(
    workflowId: string,
    environment: EnvironmentType,
    input: RollbackEnvironmentInput
  ): Promise<WorkflowEnvironment> {
    const response = await api.post(
      `/workflows/${workflowId}/environments/${environment}/rollback`,
      input
    );
    return response.data;
  },

  /**
   * Get deployment history
   */
  async getDeploymentHistory(
    workflowId: string,
    environment: EnvironmentType,
    page: number = 1,
    limit: number = 20
  ): Promise<{
    deployments: WorkflowEnvironmentDeployment[];
    totalCount: number;
    page: number;
    limit: number;
  }> {
    const response = await api.get(
      `/workflows/${workflowId}/environments/${environment}/deployments`,
      {
        params: { page, limit },
      }
    );
    return response.data;
  },

  /**
   * Compare two environments
   */
  async compareEnvironments(
    workflowId: string,
    source: EnvironmentType,
    target: EnvironmentType
  ): Promise<EnvironmentComparison> {
    const response = await api.get(
      `/workflows/${workflowId}/environments/compare`,
      {
        params: { source, target },
      }
    );
    return response.data;
  },

  /**
   * Activate an environment
   */
  async activateEnvironment(
    workflowId: string,
    environment: EnvironmentType
  ): Promise<WorkflowEnvironment> {
    const response = await api.put(
      `/workflows/${workflowId}/environments/${environment}/activate`
    );
    return response.data;
  },

  /**
   * Deactivate an environment
   */
  async deactivateEnvironment(
    workflowId: string,
    environment: EnvironmentType
  ): Promise<WorkflowEnvironment> {
    const response = await api.put(
      `/workflows/${workflowId}/environments/${environment}/deactivate`
    );
    return response.data;
  },

  /**
   * Delete an environment
   */
  async deleteEnvironment(
    workflowId: string,
    environment: EnvironmentType
  ): Promise<void> {
    await api.delete(`/workflows/${workflowId}/environments/${environment}`);
  },
};
