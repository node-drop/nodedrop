export interface ApiResponse<T = any> {
  data?: T;
  message?: string;
  success: boolean;
  error?: {
    code?: string;
    message: string;
    stack?: string;
    details?: any;
  };
  warnings?: Array<{
    type: string;
    message: string;
    details?: any;
  }>;
}

export interface ApiError {
  message: string;
  code?: string;
  status?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface RequestConfig {
  headers?: Record<string, string>;
  params?: Record<string, any>;
  timeout?: number;
}
