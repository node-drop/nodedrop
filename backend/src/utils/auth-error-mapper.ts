/**
 * better-auth Error Mapper
 * 
 * This module maps better-auth error codes to the application's ApiResponse format.
 * It maintains existing error codes for API compatibility.
 * 
 * Requirements: 11.1, 11.5, 15.2
 */

/**
 * Mapped error structure
 */
export interface MappedAuthError {
  statusCode: number;
  code: string;
  message: string;
  details?: any;
}

/**
 * Error code mappings from better-auth to application error codes
 */
const ERROR_CODE_MAP: Record<string, { statusCode: number; code: string; message: string }> = {
  // Authentication errors
  "INVALID_CREDENTIALS": {
    statusCode: 401,
    code: "INVALID_CREDENTIALS",
    message: "Invalid email or password"
  },
  "INVALID_EMAIL_OR_PASSWORD": {
    statusCode: 401,
    code: "INVALID_CREDENTIALS",
    message: "Invalid email or password"
  },
  "USER_NOT_FOUND": {
    statusCode: 401,
    code: "INVALID_CREDENTIALS",
    message: "Invalid email or password"
  },
  "INVALID_PASSWORD": {
    statusCode: 401,
    code: "INVALID_CREDENTIALS",
    message: "Invalid email or password"
  },
  
  // Registration errors
  "USER_ALREADY_EXISTS": {
    statusCode: 400,
    code: "USER_EXISTS",
    message: "User already exists with this email"
  },
  "EMAIL_ALREADY_IN_USE": {
    statusCode: 400,
    code: "USER_EXISTS",
    message: "User already exists with this email"
  },
  
  // Session errors
  "SESSION_NOT_FOUND": {
    statusCode: 401,
    code: "UNAUTHORIZED",
    message: "Authentication required"
  },
  "SESSION_EXPIRED": {
    statusCode: 401,
    code: "SESSION_EXPIRED",
    message: "Session has expired. Please log in again."
  },
  "INVALID_SESSION": {
    statusCode: 401,
    code: "INVALID_SESSION",
    message: "Invalid session"
  },
  
  // Rate limiting errors
  "RATE_LIMIT_EXCEEDED": {
    statusCode: 429,
    code: "RATE_LIMIT_EXCEEDED",
    message: "Too many requests. Please try again later."
  },
  "TOO_MANY_REQUESTS": {
    statusCode: 429,
    code: "RATE_LIMIT_EXCEEDED",
    message: "Too many requests. Please try again later."
  },
  
  // Validation errors
  "INVALID_EMAIL": {
    statusCode: 400,
    code: "VALIDATION_ERROR",
    message: "Invalid email format"
  },
  "PASSWORD_TOO_SHORT": {
    statusCode: 400,
    code: "VALIDATION_ERROR",
    message: "Password must be at least 8 characters"
  },
  "PASSWORD_TOO_LONG": {
    statusCode: 400,
    code: "VALIDATION_ERROR",
    message: "Password must be less than 128 characters"
  },
  "MISSING_REQUIRED_FIELD": {
    statusCode: 400,
    code: "VALIDATION_ERROR",
    message: "Missing required field"
  },
  
  // Password reset errors
  "INVALID_TOKEN": {
    statusCode: 400,
    code: "INVALID_TOKEN",
    message: "Invalid or expired reset token"
  },
  "TOKEN_EXPIRED": {
    statusCode: 400,
    code: "TOKEN_EXPIRED",
    message: "Reset token has expired. Please request a new one."
  },
  
  // Account errors
  "ACCOUNT_NOT_FOUND": {
    statusCode: 404,
    code: "ACCOUNT_NOT_FOUND",
    message: "Account not found"
  },
  "ACCOUNT_DISABLED": {
    statusCode: 403,
    code: "ACCOUNT_DEACTIVATED",
    message: "Account is deactivated"
  },
  
  // OAuth errors
  "OAUTH_ERROR": {
    statusCode: 400,
    code: "OAUTH_ERROR",
    message: "OAuth authentication failed"
  },
  "OAUTH_ACCOUNT_NOT_LINKED": {
    statusCode: 400,
    code: "OAUTH_NOT_LINKED",
    message: "OAuth account is not linked to any user"
  }
};

/**
 * Maps a better-auth error to the application's error format
 * 
 * @param error - The error from better-auth
 * @returns MappedAuthError with statusCode, code, message, and optional details
 */
export function mapBetterAuthError(error: unknown): MappedAuthError {
  // Handle null/undefined
  if (!error) {
    return {
      statusCode: 500,
      code: "AUTH_ERROR",
      message: "An authentication error occurred"
    };
  }

  // Extract error code from various error formats
  let errorCode: string | undefined;
  let errorMessage: string | undefined;
  let errorDetails: any;

  if (typeof error === "object") {
    const err = error as any;
    
    // better-auth error format
    errorCode = err.code || err.errorCode || err.error?.code;
    errorMessage = err.message || err.error?.message;
    errorDetails = err.details || err.error?.details;
    
    // Handle HTTP response errors
    if (err.status && !errorCode) {
      if (err.status === 401) {
        errorCode = "UNAUTHORIZED";
      } else if (err.status === 403) {
        errorCode = "FORBIDDEN";
      } else if (err.status === 429) {
        errorCode = "RATE_LIMIT_EXCEEDED";
      }
    }
  }

  // Look up the error code in our mapping
  if (errorCode && ERROR_CODE_MAP[errorCode]) {
    const mapped = ERROR_CODE_MAP[errorCode];
    return {
      statusCode: mapped.statusCode,
      code: mapped.code,
      message: errorMessage || mapped.message,
      ...(errorDetails && { details: errorDetails })
    };
  }

  // Handle string errors
  if (typeof error === "string") {
    // Check if the string matches a known error code
    if (ERROR_CODE_MAP[error]) {
      return ERROR_CODE_MAP[error];
    }
    
    return {
      statusCode: 400,
      code: "AUTH_ERROR",
      message: error
    };
  }

  // Default error response
  return {
    statusCode: 500,
    code: "AUTH_ERROR",
    message: errorMessage || "An authentication error occurred",
    ...(errorDetails && { details: errorDetails })
  };
}

/**
 * Creates an ApiResponse error object from a MappedAuthError
 * 
 * @param error - The mapped error
 * @returns ApiResponse formatted error object
 */
export function createAuthErrorResponse(error: MappedAuthError): {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
  };
} {
  return {
    success: false,
    error: {
      code: error.code,
      message: error.message,
      ...(error.details && { details: error.details })
    }
  };
}

/**
 * Checks if an error is a rate limit error
 * 
 * @param error - The error to check
 * @returns true if the error is a rate limit error
 */
export function isRateLimitError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }
  
  const err = error as any;
  const code = err.code || err.errorCode || err.error?.code;
  
  return code === "RATE_LIMIT_EXCEEDED" || 
         code === "TOO_MANY_REQUESTS" ||
         err.status === 429;
}

/**
 * Checks if an error is an authentication error
 * 
 * @param error - The error to check
 * @returns true if the error is an authentication error
 */
export function isAuthenticationError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }
  
  const err = error as any;
  const code = err.code || err.errorCode || err.error?.code;
  
  return code === "INVALID_CREDENTIALS" ||
         code === "INVALID_EMAIL_OR_PASSWORD" ||
         code === "USER_NOT_FOUND" ||
         code === "INVALID_PASSWORD" ||
         code === "SESSION_NOT_FOUND" ||
         code === "SESSION_EXPIRED" ||
         code === "INVALID_SESSION" ||
         err.status === 401;
}
