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
import { admin } from "better-auth/plugins/admin";
import { prisma } from "./database";
import { WorkspaceRole } from "@prisma/client";

/**
 * Generate a URL-friendly slug from a string
 */
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 50);
}

/**
 * Create a default workspace for a new user
 */
async function createDefaultWorkspace(userId: string, userName: string | null, userEmail: string): Promise<void> {
  try {
    const workspaceName = userName ? `${userName}'s Workspace` : "My Workspace";
    let slug = generateSlug(workspaceName);
    
    // Ensure slug is unique by appending random suffix if needed
    const existingWorkspace = await prisma.workspace.findUnique({ where: { slug } });
    if (existingWorkspace) {
      slug = `${slug}-${Math.random().toString(36).substring(2, 8)}`;
    }

    // Create workspace
    const workspace = await prisma.workspace.create({
      data: {
        name: workspaceName,
        slug,
        ownerId: userId,
        plan: "free",
        maxMembers: 1,
        maxWorkflows: 5,
        maxExecutionsPerMonth: 1000,
        maxCredentials: 10,
      },
    });

    // Add user as workspace member with OWNER role
    await prisma.workspaceMember.create({
      data: {
        workspaceId: workspace.id,
        userId: userId,
        role: WorkspaceRole.OWNER,
      },
    });

    // Set as user's default workspace
    await prisma.user.update({
      where: { id: userId },
      data: { defaultWorkspaceId: workspace.id },
    });

    console.log(`[Auth] Created default workspace "${workspaceName}" for user ${userEmail}`);
  } catch (error) {
    console.error(`[Auth] Failed to create default workspace for user ${userEmail}:`, error);
    // Don't throw - user creation should still succeed even if workspace creation fails
  }
}

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
 * Note: Better Auth's built-in rate limiting applies to ALL endpoints including get-session.
 * Since get-session fires on every tab focus, we need high limits here.
 * Sensitive endpoints (login/signup/password-reset) have their own stricter rate limiters
 * defined in auth-rate-limiters.ts
 */
const RATE_LIMIT_WINDOW_SECONDS = 60; // 1 minute window
const RATE_LIMIT_MAX_REQUESTS = 100; // 100 requests per minute (handles multiple tabs)

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
  secret: process.env.BETTER_AUTH_SECRET || "default-secret-change-in-production",
  
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
  
  // Admin plugin for role management
  // First user automatically becomes admin, subsequent users get "user" role
  plugins: [
    admin()
  ],
  
  // Trust host header for proxy setups
  trustedOrigins: process.env.CORS_ORIGIN ? [process.env.CORS_ORIGIN] : ["http://localhost:3000"],
  
  // Database hooks for user lifecycle events
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          // Create a default workspace for new users
          await createDefaultWorkspace(user.id, user.name, user.email);
        },
      },
    },
  },
});

/**
 * Type inference for better-auth session
 */
export type AuthSession = typeof auth.$Infer.Session;
export type AuthUser = typeof auth.$Infer.Session.user;
