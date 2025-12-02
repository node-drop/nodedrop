/**
 * Rate Limiting Configuration
 * Centralized configuration for rate limiting across the application
 */

export const rateLimitConfig = {
  /**
   * Rate limit for public form fetching (GET requests)
   */
  publicFormFetch: {
    windowMs: parseInt(process.env.FORM_FETCH_WINDOW_MS || "60000"), // 1 minute default
    max: parseInt(process.env.FORM_FETCH_MAX_REQUESTS || "30"), // 30 requests default
    message: "Too many requests, please try again later",
  },

  /**
   * Rate limit for public form submission (POST requests)
   * More restrictive to prevent spam and abuse
   */
  publicFormSubmit: {
    windowMs: parseInt(process.env.FORM_SUBMIT_WINDOW_MS || "900000"), // 15 minutes default
    max: parseInt(process.env.FORM_SUBMIT_MAX_REQUESTS || "5"), // 5 submissions default
    message: "Too many form submissions, please try again later",
  },

  /**
   * Rate limit for API endpoints (general)
   */
  apiGeneral: {
    windowMs: parseInt(process.env.API_WINDOW_MS || "60000"), // 1 minute default
    max: parseInt(process.env.API_MAX_REQUESTS || "100"), // 100 requests default
    message: "Too many API requests, please try again later",
  },

  /**
   * Rate limit for authentication endpoints
   */
  auth: {
    windowMs: parseInt(process.env.AUTH_WINDOW_MS || "900000"), // 15 minutes default
    max: parseInt(process.env.AUTH_MAX_REQUESTS || "5"), // 5 attempts default
    message: "Too many authentication attempts, please try again later",
  },

  /**
   * Whether to skip rate limiting in development for localhost
   */
  skipLocalhost: process.env.RATE_LIMIT_SKIP_LOCALHOST !== "false",

  /**
   * Global rate limiting enabled/disabled
   */
  enabled: process.env.RATE_LIMIT_ENABLED !== "false",
};

/**
 * Helper to check if an IP should skip rate limiting
 */
export const shouldSkipRateLimit = (ip: string | undefined): boolean => {
  if (!rateLimitConfig.enabled) return true;

  if (
    process.env.NODE_ENV === "development" &&
    rateLimitConfig.skipLocalhost &&
    ip
  ) {
    return (
      ip === "127.0.0.1" ||
      ip === "::1" ||
      ip === "::ffff:127.0.0.1" ||
      ip === "localhost"
    );
  }

  return false;
};
