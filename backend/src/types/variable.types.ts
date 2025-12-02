export interface Variable {
  id: string;
  key: string;
  value: string;
  description?: string | null;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateVariableRequest {
  key: string;
  value: string;
  description?: string;
}

export interface UpdateVariableRequest {
  key?: string;
  value?: string;
  description?: string | null;
}

export interface VariableQueryOptions {
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: "key" | "createdAt" | "updatedAt";
  sortOrder?: "asc" | "desc";
}

export interface VariablesResponse {
  variables: Variable[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface BulkUpsertVariablesRequest {
  variables: CreateVariableRequest[];
}

export interface BulkUpsertVariablesResponse {
  created: number;
  updated: number;
  variables: Variable[];
}

export interface VariableStatsResponse {
  totalVariables: number;
  recentlyCreated: number;
  recentlyUpdated: number;
}

export interface VariableReplaceRequest {
  text: string;
}

export interface VariableReplaceResponse {
  originalText: string;
  replacedText: string;
  variablesFound: string[];
}
