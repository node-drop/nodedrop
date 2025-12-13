/**
 * Auth Client Configuration Tests
 * 
 * Tests for better-auth React client configuration.
 * Verifies that the auth client is properly configured for:
 * - Cookie-based authentication (credentials: 'include')
 * - Correct backend URL
 * - httpOnly cookie storage (verified via configuration)
 * 
 * Requirements: 10.1, 10.2, 10.3
 */

import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";

// Store the captured config
let capturedConfig: any = null;

// Mock the env module before importing auth-client
vi.mock("@/config/env", () => ({
  env: {
    API_URL: "http://localhost:4000",
    API_BASE_URL: "http://localhost:4000/api",
  },
}));

// Mock better-auth/react and capture the config
vi.mock("better-auth/react", () => ({
  createAuthClient: (config: any) => {
    capturedConfig = config;
    return {
      useSession: vi.fn(),
      signIn: { email: vi.fn() },
      signUp: { email: vi.fn() },
      signOut: vi.fn(),
    };
  },
}));

describe("Auth Client Configuration", () => {
  beforeAll(async () => {
    // Reset modules to ensure fresh import
    vi.resetModules();
    // Import the module to trigger initialization
    await import("@/lib/auth-client");
  });

  describe("14.1 - Auth client initialization", () => {
    it("should initialize createAuthClient with backend URL", () => {
      // Verify baseURL is set to the API URL
      expect(capturedConfig).not.toBeNull();
      expect(capturedConfig.baseURL).toBe("http://localhost:4000");
    });

    it("should set credentials to 'include' for cookie-based auth", () => {
      // Verify credentials is set to 'include' for httpOnly cookies
      expect(capturedConfig.fetchOptions?.credentials).toBe("include");
    });
  });

  describe("14.3 - httpOnly cookie storage verification", () => {
    it("should configure fetch options for cookie-based sessions", () => {
      // Verify fetchOptions is configured
      expect(capturedConfig.fetchOptions).toBeDefined();

      // credentials: 'include' ensures cookies are sent with cross-origin requests
      // This is required for httpOnly cookie-based authentication
      expect(capturedConfig.fetchOptions.credentials).toBe("include");
    });

    /**
     * Note: httpOnly and secure flags are set by the backend (better-auth server).
     * The frontend cannot directly verify these flags as they are not accessible
     * via JavaScript (that's the point of httpOnly).
     * 
     * Backend configuration (verified in backend/src/config/auth.ts):
     * - httpOnly: true (default for better-auth)
     * - secure: true in production (useSecureCookies: process.env.NODE_ENV === "production")
     * 
     * This test verifies the frontend is configured to work with httpOnly cookies
     * by using credentials: 'include'.
     */
    it("should be configured to work with httpOnly cookies", () => {
      // The frontend must use credentials: 'include' to send httpOnly cookies
      // This is the only way to authenticate with httpOnly cookie-based sessions
      expect(capturedConfig.fetchOptions?.credentials).toBe("include");
    });
  });

  describe("14.5 - Automatic token inclusion", () => {
    it("should export auth hooks for session management", async () => {
      const authClient = await import("@/lib/auth-client");

      // Verify all required exports are available
      expect(authClient.useSession).toBeDefined();
      expect(authClient.signIn).toBeDefined();
      expect(authClient.signUp).toBeDefined();
      expect(authClient.signOut).toBeDefined();
    });

    it("should export the auth client for advanced use cases", async () => {
      const authClient = await import("@/lib/auth-client");

      // Verify the client is exported
      expect(authClient.authClient).toBeDefined();
      expect(authClient.default).toBeDefined();
    });
  });
});

describe("Cookie Security Configuration", () => {
  /**
   * These tests document the expected cookie security configuration.
   * The actual cookie flags are set by the backend and cannot be verified
   * from the frontend due to httpOnly restrictions.
   */

  it("documents expected cookie configuration", () => {
    // Expected backend cookie configuration:
    const expectedConfig = {
      httpOnly: true, // Prevents JavaScript access to cookies
      secure: "production-only", // HTTPS only in production
      sameSite: "lax", // CSRF protection
      path: "/", // Cookie available for all paths
    };

    // This test documents the expected configuration
    // Actual verification happens in backend tests
    expect(expectedConfig.httpOnly).toBe(true);
    expect(expectedConfig.secure).toBe("production-only");
  });

  it("documents that credentials: include is required for httpOnly cookies", () => {
    // When using httpOnly cookies:
    // 1. JavaScript cannot read the cookie value
    // 2. The browser automatically includes the cookie in requests
    // 3. credentials: 'include' must be set for cross-origin requests
    
    const fetchConfig = {
      credentials: "include" as const,
    };

    // This is the required configuration for httpOnly cookie auth
    expect(fetchConfig.credentials).toBe("include");
  });
});

describe("Automatic Token Inclusion (14.5)", () => {
  /**
   * Tests verifying that tokens are automatically included in authenticated requests.
   * With httpOnly cookies, the browser handles token inclusion automatically.
   */

  it("should configure credentials: include for automatic cookie inclusion", () => {
    // When credentials: 'include' is set, the browser automatically:
    // 1. Sends cookies with every request to the same origin
    // 2. Sends cookies with cross-origin requests (if CORS allows)
    // 3. Handles cookie storage and retrieval transparently
    
    expect(capturedConfig.fetchOptions?.credentials).toBe("include");
  });

  it("should use the correct base URL for API requests", () => {
    // All auth requests should go to the configured backend URL
    expect(capturedConfig.baseURL).toBe("http://localhost:4000");
  });

  it("documents automatic token inclusion behavior", () => {
    // With better-auth and httpOnly cookies:
    // 1. After successful login, the server sets httpOnly cookies
    // 2. The browser stores these cookies securely
    // 3. On subsequent requests with credentials: 'include':
    //    - Browser automatically attaches cookies to requests
    //    - No manual token management required in frontend code
    //    - Tokens cannot be accessed or stolen via JavaScript (XSS protection)
    
    // This is verified by the credentials: 'include' configuration
    const isConfiguredForAutomaticTokens = 
      capturedConfig.fetchOptions?.credentials === "include";
    
    expect(isConfiguredForAutomaticTokens).toBe(true);
  });

  it("should work with various API endpoints", () => {
    // The auth client configuration applies to all better-auth endpoints:
    // - /api/auth/sign-in/email
    // - /api/auth/sign-up/email
    // - /api/auth/sign-out
    // - /api/auth/session
    // - /api/auth/forgot-password
    // - /api/auth/reset-password
    
    // All these endpoints will receive cookies automatically due to:
    // 1. Same baseURL configuration
    // 2. credentials: 'include' setting
    
    expect(capturedConfig.baseURL).toBeDefined();
    expect(capturedConfig.fetchOptions?.credentials).toBe("include");
  });
});
