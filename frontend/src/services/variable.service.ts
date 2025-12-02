import {
  BulkUpsertVariablesRequest,
  CreateVariableRequest,
  UpdateVariableRequest,
  Variable,
  VariableReplaceRequest,
  VariableReplaceResponse,
  VariableStatsResponse,
} from "@/types/variable";
import { apiClient } from "./api";

export class VariableService {
  /**
   * Get all variables for the authenticated user
   */
  async getVariables(search?: string): Promise<Variable[]> {
    const params = new URLSearchParams();
    if (search) {
      params.append("search", search);
    }

    const response = await apiClient.get<Variable[]>(
      `/variables?${params.toString()}`
    );
    return response.data || [];
  }

  /**
   * Get a specific variable by ID
   */
  async getVariable(id: string): Promise<Variable> {
    const response = await apiClient.get<Variable>(`/variables/${id}`);
    if (!response.success || !response.data) {
      throw new Error("Failed to fetch variable");
    }
    return response.data;
  }

  /**
   * Create a new variable
   */
  async createVariable(data: CreateVariableRequest): Promise<Variable> {
    const response = await apiClient.post<Variable>("/variables", data);
    if (!response.success || !response.data) {
      throw new Error("Failed to create variable");
    }
    return response.data;
  }

  /**
   * Update a variable
   */
  async updateVariable(
    id: string,
    data: UpdateVariableRequest
  ): Promise<Variable> {
    const response = await apiClient.put<Variable>(`/variables/${id}`, data);
    if (!response.success || !response.data) {
      throw new Error("Failed to update variable");
    }
    return response.data;
  }

  /**
   * Delete a variable
   */
  async deleteVariable(id: string): Promise<void> {
    const response = await apiClient.delete(`/variables/${id}`);
    if (!response.success) {
      throw new Error("Failed to delete variable");
    }
  }

  /**
   * Bulk create or update variables
   */
  async bulkUpsertVariables(
    data: BulkUpsertVariablesRequest
  ): Promise<Variable[]> {
    const response = await apiClient.post<Variable[]>("/variables/bulk", data);
    if (!response.success || !response.data) {
      throw new Error("Failed to bulk upsert variables");
    }
    return response.data;
  }

  /**
   * Replace variables in text
   */
  async replaceVariables(
    data: VariableReplaceRequest
  ): Promise<VariableReplaceResponse> {
    const response = await apiClient.post<VariableReplaceResponse>(
      "/variables/replace",
      data
    );
    if (!response.success || !response.data) {
      throw new Error("Failed to replace variables");
    }
    return response.data;
  }

  /**
   * Get variable statistics
   */
  async getVariableStats(): Promise<VariableStatsResponse> {
    const response = await apiClient.get<VariableStatsResponse>(
      "/variables/stats"
    );
    if (!response.success || !response.data) {
      throw new Error("Failed to fetch variable stats");
    }
    return response.data;
  }

  /**
   * Get variables for execution (key-value pairs)
   */
  async getVariablesForExecution(): Promise<Record<string, string>> {
    const response = await apiClient.get<Record<string, string>>(
      "/variables/execution"
    );
    return response.data || {};
  }
}

export const variableService = new VariableService();
