/**
 * API Request/Response Types
 *
 * Consolidated API types shared between frontend and backend.
 * These types define the contract for API communication.
 */

/**
 * Standard API response wrapper
 * Used for all API endpoints to provide consistent response structure
 */
export interface ApiResponse<T = any> {
  /** Indicates if the request was successful */
  success: boolean;
  /** The response data payload */
  data?: T;
  /** Optional message for the response */
  message?: string;
  /** Error details if the request failed */
  error?: ApiErrorDetails;
  /** Optional warnings that don't prevent success */
  warnings?: ApiWarning[];
  /** Pagination metadata for list endpoints */
  pagination?: PaginationMeta;
}

/**
 * Detailed error information returned in API responses
 */
export interface ApiErrorDetails {
  /** Error code for programmatic handling */
  code?: string;
  /** Human-readable error message */
  message: string;
  /** Additional error details */
  details?: any;
  /** Stack trace (only in development) */
  stack?: string;
}

/**
 * API error interface for error handling
 */
export interface ApiError {
  /** Human-readable error message */
  message: string;
  /** Error code for programmatic handling */
  code?: string;
  /** HTTP status code */
  status?: number;
  /** Additional error details */
  details?: any;
}

/**
 * Warning information that doesn't prevent success
 */
export interface ApiWarning {
  /** Warning type/category */
  type: string;
  /** Human-readable warning message */
  message: string;
  /** Additional warning details */
  details?: any;
}

/**
 * Pagination metadata returned with paginated responses
 */
export interface PaginationMeta {
  /** Current page number (1-indexed) */
  page: number;
  /** Number of items per page */
  limit: number;
  /** Total number of items across all pages */
  total: number;
  /** Total number of pages */
  totalPages: number;
}

/**
 * Paginated response wrapper for list endpoints
 * Provides data array with pagination metadata
 */
export interface PaginatedResponse<T> {
  /** Array of items for the current page */
  data: T[];
  /** Total number of items across all pages */
  total: number;
  /** Current page number (1-indexed) */
  page: number;
  /** Number of items per page */
  limit: number;
  /** Total number of pages */
  totalPages: number;
}

/**
 * Pagination parameters for list requests
 */
export interface PaginationParams {
  /** Page number to retrieve (1-indexed) */
  page?: number;
  /** Number of items per page */
  limit?: number;
  /** Field to sort by */
  sortBy?: string;
  /** Sort direction */
  sortOrder?: "asc" | "desc";
}

/**
 * Request configuration options
 */
export interface RequestConfig {
  /** Custom headers to include in the request */
  headers?: Record<string, string>;
  /** Query parameters */
  params?: Record<string, any>;
  /** Request timeout in milliseconds */
  timeout?: number;
}

/**
 * Common query parameters for list endpoints
 */
export interface ListQueryParams extends PaginationParams {
  /** Search term for filtering */
  search?: string;
}

/**
 * ID parameter for single resource endpoints
 */
export interface IdParam {
  /** Resource identifier */
  id: string;
}
