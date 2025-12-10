/**
 * better-auth React Client Configuration
 * 
 * This module initializes the better-auth client for the frontend application.
 * It provides type-safe authentication hooks and methods for:
 * - Session management (useSession)
 * - Sign in/up/out operations
 * - Automatic cookie-based authentication
 * - Admin role management via admin plugin
 * 
 * Requirements: 10.1 - Initialize createAuthClient with backend URL
 */

import { createAuthClient } from "better-auth/react";
import { adminClient } from "better-auth/client/plugins";
import { env } from "@/config/env";

/**
 * Initialize the better-auth client with the backend API URL.
 * 
 * Configuration:
 * - baseURL: Points to the backend API (without /api suffix as better-auth adds /auth)
 * - fetchOptions.credentials: 'include' ensures cookies are sent with requests
 * - plugins: adminClient for role management
 */
export const authClient = createAuthClient({
  baseURL: env.API_URL, // Use base URL without /api - better-auth handles routing
  fetchOptions: {
    credentials: "include", // Required for httpOnly cookie-based sessions
  },
  plugins: [
    adminClient()
  ]
});

/**
 * Export auth hooks and methods for use throughout the application.
 * 
 * Hooks:
 * - useSession: React hook to access current session state (includes user.role)
 * 
 * Methods:
 * - signIn: Authenticate user with email/password or OAuth
 * - signUp: Register new user with email/password
 * - signOut: End current session and clear cookies
 */
export const {
  useSession,
  signIn,
  signUp,
  signOut,
} = authClient;

// Re-export the client for advanced use cases
export default authClient;
