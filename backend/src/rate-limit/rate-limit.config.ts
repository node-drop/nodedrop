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
   * Rate limit for authentication endpoints (general)
   */
  auth: {
    windowMs: parseInt(process.env.AUTH_WINDOW_MS || "900000"), // 15 minutes default
    max: parseInt(process.env.AUTH_MAX_REQUESTS || "5"), // 5 attempts default
    message: "Too many authentication attempts, please try again later",
  },

  /**
   * Rate limit for login endpoint
   * More restrictive to prevent brute force attacks
   * Requirements: 14.1, 14.4
   */
  authLogin: {
    windowMs: parseInt(process.env.AUTH_LOGIN_WINDOW_MS || "900000"), // 15 minutes default
    max: parseInt(process.env.AUTH_LOGIN_MAX_REQUESTS || "5"), // 5 attempts default
    message: "Too many login attempts, please try again later",
  },

  /**
   * Rate limit for registration endpoint
   * Prevents mass account creation
   * Requirements: 14.2, 14.4
   */
  authRegister: {
    windowMs: parseInt(process.env.AUTH_REGISTER_WINDOW_MS || "3600000"), // 1 hour default
    max: parseInt(process.env.AUTH_REGISTER_MAX_REQUESTS || "5"), // 5 registrations default
    message: "Too many registration attempts, please try again later",
  },

  /**
   * Rate limit for password reset endpoint
   * Per email address to prevent abuse
   * Requirements: 14.3, 14.4
   */
  authPasswordReset: {
    windowMs: parseInt(process.env.AUTH_RESET_WINDOW_MS || "3600000"), // 1 hour default
    max: parseInt(process.env.AUTH_RESET_MAX_REQUESTS || "3"), // 3 attempts default
    message: "Too many password reset requests, please try again later",
  },

  /**
   * Rate limit for public chat fetching (GET requests)
   */
  publicChatFetch: {
    windowMs: parseInt(process.env.CHAT_FETCH_WINDOW_MS || "60000"), // 1 minute default
    max: parseInt(process.env.CHAT_FETCH_MAX_REQUESTS || "30"), // 30 requests default
    message: "Too many chat requests, please try again later",
  },

  /**
   * Rate limit for public chat message submission (POST requests)
   */
  publicChatSubmit: {
    windowMs: parseInt(process.env.CHAT_SUBMIT_WINDOW_MS || "60000"), // 1 minute default
    max: parseInt(process.env.CHAT_SUBMIT_MAX_REQUESTS || "10"), // 10 messages default
    message: "Too many messages, please slow down",
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
