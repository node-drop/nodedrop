/**
 * better-auth Configuration
 * 
 * This module configures the better-auth instance with Prisma adapter,
 * email/password authentication, session management, and rate limiting.
 * 
 * Requirements: 3.1, 7.1, 7.2, 14.1
 */

import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./database";
import { rolePlugin } from "./auth-role-plugin";

/**
 * Session expiration time in seconds (7 days)
 */
const SESSION_EXPIRATION_SECONDS = 60 * 60 * 24 * 7; // 7 days

/**
 * Session update age in seconds (24 hours)
 * Sessions are refreshed if they're older than this
 */
const SESSION_UPDATE_AGE_SECONDS = 60 * 60 * 24; // 24 hours

/**
 * Cookie cache max age in seconds (5 minutes)
 */
const COOKIE_CACHE_MAX_AGE_SECONDS = 60 * 5; // 5 minutes

/**
 * Rate limiting configuration
 */
const RATE_LIMIT_WINDOW_SECONDS = parseInt(process.env.AUTH_WINDOW_MS || "900000") / 1000; // 15 minutes default
const RATE_LIMIT_MAX_REQUESTS = parseInt(process.env.AUTH_MAX_REQUESTS || "5"); // 5 attempts default

/**
 * better-auth instance configured with:
 * - Prisma adapter for PostgreSQL
 * - Email/password authentication
 * - 7-day session expiration
 * - httpOnly cookies (secure in production)
 * - Rate limiting
 * - Custom role plugin for ADMIN/USER assignment
 */
export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql"
  }),
  
  // User model configuration
  user: {
    additionalFields: {
      role: {
        type: "string",
        defaultValue: "USER"
      },
      active: {
        type: "boolean",
        defaultValue: true
      }
    }
  },
  
  // Email and password authentication configuration
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false, // Can enable later
    minPasswordLength: 8,
    maxPasswordLength: 128
  },
  
  // Session configuration - 7 day expiration per Requirements 7.1, 7.2
  session: {
    expiresIn: SESSION_EXPIRATION_SECONDS,
    updateAge: SESSION_UPDATE_AGE_SECONDS,
    // Cookie cache disabled to ensure logout properly invalidates sessions
    // When enabled, cached sessions could persist for up to maxAge after logout
    cookieCache: {
      enabled: false,
      maxAge: COOKIE_CACHE_MAX_AGE_SECONDS
    }
  },
  
  // Advanced cookie and security settings
  advanced: {
    cookiePrefix: "nd_auth",
    useSecureCookies: process.env.NODE_ENV === "production"
  },
  
  // Rate limiting configuration per Requirements 14.1
  rateLimit: {
    enabled: process.env.RATE_LIMIT_ENABLED !== "false",
    window: RATE_LIMIT_WINDOW_SECONDS,
    max: RATE_LIMIT_MAX_REQUESTS
  },
  
  // OAuth providers configuration (disabled by default) per Requirements 8.1, 8.5
  // These can be enabled by setting the appropriate environment variables
  socialProviders: {
    // Google OAuth - disabled by default
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET ? {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET
      }
    } : {}),
    
    // GitHub OAuth - disabled by default
    ...(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET ? {
      github: {
        clientId: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET
      }
    } : {})
  },
  
  // Custom plugins (role assignment is handled separately in auth routes)
  plugins: [],
  
  // Trust host header for proxy setups
  trustedOrigins: process.env.CORS_ORIGIN ? [process.env.CORS_ORIGIN] : ["http://localhost:3000"]
});

/**
 * Type inference for better-auth session
 */
export type AuthSession = typeof auth.$Infer.Session;
export type AuthUser = typeof auth.$Infer.Session.user;
