export enum HttpErrorType {
  TIMEOUT = 'TIMEOUT',
  DNS_RESOLUTION = 'DNS_RESOLUTION',
  CONNECTION_REFUSED = 'CONNECTION_REFUSED',
  SSL_ERROR = 'SSL_ERROR',
  NETWORK_UNREACHABLE = 'NETWORK_UNREACHABLE',
  HTTP_ERROR = 'HTTP_ERROR',
  PARSE_ERROR = 'PARSE_ERROR',
  SECURITY_ERROR = 'SECURITY_ERROR',
  RESOURCE_LIMIT_ERROR = 'RESOURCE_LIMIT_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

export interface HttpExecutionError extends Error {
  httpErrorType: HttpErrorType;
  statusCode?: number;
  responseHeaders?: Record<string, string>;
  responseBody?: string;
  requestUrl: string;
  requestMethod: string;
  isRetryable: boolean;
  retryAfter?: number;
  originalError?: Error;
}

export class HttpExecutionErrorFactory {
  /**
   * Create an HTTP execution error from a generic error
   */
  public static createFromError(
    error: any,
    requestUrl: string,
    requestMethod: string,
    response?: any
  ): HttpExecutionError {
    const httpError = new Error() as HttpExecutionError;
    httpError.requestUrl = requestUrl;
    httpError.requestMethod = requestMethod;
    httpError.originalError = error;

    // Categorize error based on error properties
    if (error.name === 'AbortError' || error.code === 'ABORT_ERR') {
      httpError.httpErrorType = HttpErrorType.TIMEOUT;
      httpError.message = `Request timeout for ${requestMethod} ${requestUrl}`;
      httpError.isRetryable = true;
    } else if (error.code === 'ENOTFOUND' || error.code === 'EAI_NONAME') {
      httpError.httpErrorType = HttpErrorType.DNS_RESOLUTION;
      httpError.message = `DNS resolution failed for ${requestUrl}`;
      httpError.isRetryable = false;
    } else if (error.code === 'ECONNREFUSED') {
      httpError.httpErrorType = HttpErrorType.CONNECTION_REFUSED;
      httpError.message = `Connection refused to ${requestUrl}`;
      httpError.isRetryable = true;
    } else if (error.code === 'ECONNRESET' || error.code === 'EPIPE') {
      httpError.httpErrorType = HttpErrorType.NETWORK_UNREACHABLE;
      httpError.message = `Network error connecting to ${requestUrl}`;
      httpError.isRetryable = true;
    } else if (error.code === 'CERT_HAS_EXPIRED' || error.code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE') {
      httpError.httpErrorType = HttpErrorType.SSL_ERROR;
      httpError.message = `SSL/TLS error connecting to ${requestUrl}: ${error.message}`;
      httpError.isRetryable = false;
    } else if (response && response.status) {
      httpError.httpErrorType = HttpErrorType.HTTP_ERROR;
      httpError.statusCode = response.status;
      httpError.responseHeaders = this.extractHeaders(response);
      httpError.message = `HTTP ${response.status} ${response.statusText || ''} for ${requestMethod} ${requestUrl}`;
      httpError.isRetryable = this.isRetryableHttpStatus(response.status);

      // Check for Retry-After header
      const retryAfter = response.headers?.get?.('retry-after');
      if (retryAfter) {
        httpError.retryAfter = parseInt(retryAfter, 10) * 1000; // Convert to milliseconds
      }
    } else if (error.message && error.message.includes('JSON')) {
      httpError.httpErrorType = HttpErrorType.PARSE_ERROR;
      httpError.message = `Response parsing error for ${requestUrl}: ${error.message}`;
      httpError.isRetryable = false;
    } else if (error.message && error.message.includes('Security')) {
      httpError.httpErrorType = HttpErrorType.SECURITY_ERROR;
      httpError.message = error.message;
      httpError.isRetryable = false;
    } else if (error.message && error.message.includes('limit')) {
      httpError.httpErrorType = HttpErrorType.RESOURCE_LIMIT_ERROR;
      httpError.message = error.message;
      httpError.isRetryable = false;
    } else {
      httpError.httpErrorType = HttpErrorType.UNKNOWN_ERROR;
      httpError.message = `Unknown error for ${requestMethod} ${requestUrl}: ${error.message || 'Unknown error'}`;
      httpError.isRetryable = false;
    }

    return httpError;
  }

  /**
   * Extract headers from response object
   */
  private static extractHeaders(response: any): Record<string, string> {
    const headers: Record<string, string> = {};

    if (response.headers && typeof response.headers.forEach === 'function') {
      response.headers.forEach((value: string, key: string) => {
        headers[key] = value;
      });
    } else if (response.headers && typeof response.headers === 'object') {
      Object.assign(headers, response.headers);
    }

    return headers;
  }

  /**
   * Check if HTTP status code is retryable
   */
  private static isRetryableHttpStatus(status: number): boolean {
    // Retryable status codes
    const retryableStatuses = [
      408, // Request Timeout
      429, // Too Many Requests
      500, // Internal Server Error
      502, // Bad Gateway
      503, // Service Unavailable
      504, // Gateway Timeout
      507, // Insufficient Storage
      509, // Bandwidth Limit Exceeded
      510  // Not Extended
    ];

    return retryableStatuses.includes(status);
  }

  /**
   * Get user-friendly error message
   */
  public static getUserFriendlyMessage(error: HttpExecutionError): string {
    switch (error.httpErrorType) {
      case HttpErrorType.TIMEOUT:
        return 'The request timed out. The server may be slow or unavailable.';
      case HttpErrorType.DNS_RESOLUTION:
        return 'Could not resolve the domain name. Please check the URL.';
      case HttpErrorType.CONNECTION_REFUSED:
        return 'Connection was refused by the server. The service may be down.';
      case HttpErrorType.SSL_ERROR:
        return 'SSL/TLS certificate error. The connection is not secure.';
      case HttpErrorType.NETWORK_UNREACHABLE:
        return 'Network error occurred. Please check your internet connection.';
      case HttpErrorType.HTTP_ERROR:
        if (error.statusCode === 401) {
          return 'Authentication required. Please check your credentials.';
        } else if (error.statusCode === 403) {
          return 'Access forbidden. You do not have permission to access this resource.';
        } else if (error.statusCode === 404) {
          return 'Resource not found. Please check the URL.';
        } else if (error.statusCode === 429) {
          return 'Too many requests. Please wait before trying again.';
        } else if (error.statusCode && error.statusCode >= 500) {
          return 'Server error occurred. Please try again later.';
        }
        return `HTTP error ${error.statusCode}: ${error.message}`;
      case HttpErrorType.PARSE_ERROR:
        return 'Could not parse the server response. The response format may be invalid.';
      case HttpErrorType.SECURITY_ERROR:
        return 'Security validation failed. The request was blocked for security reasons.';
      case HttpErrorType.RESOURCE_LIMIT_ERROR:
        return 'Resource limit exceeded. The request is too large or uses too many resources.';
      default:
        return 'An unexpected error occurred while making the request.';
    }
  }
}