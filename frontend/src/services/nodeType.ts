import { apiClient as api } from "./api";

export interface NodeType {
  id: string;
  type: string;
  displayName: string;
  name: string;
  group: string[];
  version: number;
  description: string;
  defaults: Record<string, any>;
  inputs: string[];
  outputs: string[];
  properties: any[];
  icon?: string;
  color?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UploadResult {
  success: boolean;
  message: string;
  nodes?: NodeType[];
  errors?: string[];
}

export class NodeTypeService {
  private baseUrl = "/node-types";

  /**
   * Get all node types from NodeService (live node definitions)
   */
  async getAllNodeTypes(): Promise<NodeType[]> {
    const response = await api.get(`${this.baseUrl}`);
    return response.data || [];
  }

  /**
   * Get node types by group (category)
   */
  async getNodeTypesByGroup(group: string): Promise<NodeType[]> {
    const response = await api.get(
      `${this.baseUrl}?category=${encodeURIComponent(group)}`
    );
    return response.data.data;
  }

  /**
   * Get a specific node type by type identifier
   */
  async getNodeType(type: string): Promise<NodeType> {
    const response = await api.get(
      `${this.baseUrl}/${encodeURIComponent(type)}`
    );
    return response.data.data;
  }

  /**
   * Upload a zip file containing custom nodes
   */
  async uploadCustomNodes(file: File): Promise<UploadResult> {
    try {
      const formData = new FormData();
      formData.append("nodes", file);

      const response = await api.post(`/node-types/upload`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        timeout: 60000, // 60 seconds for file uploads
      });

      // Transform the backend response to match frontend expectations
      const backendResponse = response.data;

      // Handle the actual backend response structure
      const transformedResult = {
        success: true, // If we get here, the upload was successful
        message: `Successfully uploaded ${backendResponse.data?.nodes?.length || 0
          } custom node(s)`,
        nodes: backendResponse.data?.nodes || [],
        errors: undefined,
      };

      return transformedResult;
    } catch (error: any) {
      console.error('Upload service error:', error);
      
      // Extract detailed error information
      let errorMessage = 'Failed to upload custom nodes';
      let errors: string[] = [];
      
      if (error?.response?.data) {
        const errorData = error.response.data;
        if (errorData.errors && Array.isArray(errorData.errors)) {
          errors = errorData.errors;
          errorMessage = errors[0] || errorMessage;
        } else if (errorData.error) {
          errorMessage = errorData.error;
          errors = [errorData.error];
        } else if (errorData.message) {
          errorMessage = errorData.message;
          errors = [errorData.message];
        }
      } else if (error?.message) {
        errorMessage = error.message;
        errors = [error.message];
      }
      
      // Return a failed result instead of throwing
      return {
        success: false,
        message: errorMessage,
        nodes: [],
        errors: errors.length > 0 ? errors : [errorMessage],
      };
    }
  }

  /**
   * Delete a custom node type (removes from database and deletes files)
   */
  async deleteNodeType(type: string): Promise<void> {
    // Use the package deletion endpoint that removes both database entries and files
    await api.delete(`/node-types/packages/${encodeURIComponent(type)}`);
  }

  /**
   * Update a node type's active status
   */
  async updateNodeTypeStatus(type: string, active: boolean): Promise<NodeType> {
    const response = await api.patch(
      `/node-types/${encodeURIComponent(type)}`,
      {
        active,
      }
    );
    return response.data;
  }
}

export const nodeTypeService = new NodeTypeService();
