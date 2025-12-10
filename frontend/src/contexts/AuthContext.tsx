/**
 * AuthContext Provider
 * 
 * Provides authentication state and methods to the application using better-auth.
 * This context wraps the useSession hook from better-auth and provides a consistent
 * interface for authentication throughout the app.
 * 
 * Requirements: 10.1 - Wrap useSession hook, provide auth state, handle loading states
 * Requirements: 10.4 - Automatic session refresh on expiration
 * Requirements: 10.5 - Redirect to login when refresh fails
 */

import { signIn, signOut, signUp, useSession } from "@/lib/auth-client";
import { useAuthStore } from "@/stores";
import { User } from "@/types";
import React, { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef } from "react";

/**
 * Session data structure from better-auth
 */
interface BetterAuthSession {
  id: string;
  userId: string;
  expiresAt: Date;
  token: string;
}

/**
 * Session refresh interval in milliseconds (5 minutes)
 * This checks if the session needs to be refreshed periodically
 */
const SESSION_REFRESH_INTERVAL_MS = 5 * 60 * 1000;

/**
 * Session expiration buffer in milliseconds (10 minutes)
 * Refresh session if it expires within this time window
 */
const SESSION_EXPIRATION_BUFFER_MS = 10 * 60 * 1000;

/**
 * Auth context type definition
 */
interface AuthContextType {
  /** Current authenticated user or null */
  user: User | null;
  /** Current session data or null */
  session: BetterAuthSession | null;
  /** Whether authentication state is being loaded */
  isLoading: boolean;
  /** Whether user is authenticated */
  isAuthenticated: boolean;
  /** Whether session refresh failed (requires re-login) */
  sessionExpired: boolean;
  /** Sign in with email and password */
  handleSignIn: (email: string, password: string) => Promise<void>;
  /** Sign up with email, password, and name */
  handleSignUp: (email: string, password: string, name: string) => Promise<void>;
  /** Sign out and clear session */
  handleSignOut: () => Promise<void>;
  /** Refresh the current session */
  refetchSession: () => Promise<void>;
  /** Clear the session expired flag */
  clearSessionExpired: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

/**
 * AuthProvider component that wraps the application and provides auth state.
 * 
 * Uses better-auth's useSession hook to manage session state and provides
 * methods for sign in, sign up, and sign out operations.
 * 
 * Implements automatic session refresh (Requirements 10.4) and handles
 * failed refresh by setting sessionExpired flag (Requirements 10.5).
 */
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const { data: sessionData, isPending, refetch } = useSession();
  const [sessionExpired, setSessionExpired] = React.useState(false);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isRefreshingRef = useRef(false);

  /**
   * Transform better-auth user data to our User type
   * Note: role is a custom field added via better-auth plugin, accessed via type assertion
   */
  const user: User | null = useMemo(() => {
    if (!sessionData?.user) return null;
    
    const betterAuthUser = sessionData.user as typeof sessionData.user & { role?: string };
    return {
      id: betterAuthUser.id,
      email: betterAuthUser.email,
      name: betterAuthUser.name || "",
      role: (betterAuthUser.role as "admin" | "user") || "user",
      createdAt: betterAuthUser.createdAt?.toString() || new Date().toISOString(),
      updatedAt: betterAuthUser.updatedAt?.toString(),
    };
  }, [sessionData?.user]);

  /**
   * Transform better-auth session data
   */
  const session: BetterAuthSession | null = useMemo(() => {
    if (!sessionData?.session) return null;
    
    return {
      id: sessionData.session.id,
      userId: sessionData.session.userId,
      expiresAt: new Date(sessionData.session.expiresAt),
      token: sessionData.session.token,
    };
  }, [sessionData?.session]);

  /**
   * Check if session is about to expire
   * Returns true if session expires within the buffer window
   */
  const isSessionExpiringSoon = useCallback((): boolean => {
    if (!session?.expiresAt) return false;
    const expiresAt = new Date(session.expiresAt).getTime();
    const now = Date.now();
    return expiresAt - now < SESSION_EXPIRATION_BUFFER_MS;
  }, [session?.expiresAt]);

  /**
   * Attempt to refresh the session
   * Sets sessionExpired flag if refresh fails (Requirements 10.5)
   */
  const attemptSessionRefresh = useCallback(async (): Promise<boolean> => {
    if (isRefreshingRef.current) return true;
    
    isRefreshingRef.current = true;
    try {
      await refetch();
      // Clear expired flag on successful refresh
      setSessionExpired(false);
      return true;
    } catch (error) {
      console.error("Session refresh failed:", error);
      setSessionExpired(true);
      return false;
    } finally {
      isRefreshingRef.current = false;
    }
  }, [refetch]);

  /**
   * Automatic session refresh effect (Requirements 10.4)
   * Periodically checks session validity and refreshes if needed
   */
  useEffect(() => {
    // Only set up refresh interval if user is authenticated
    if (!user || !session) {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
      return;
    }

    // Check and refresh session periodically
    const checkAndRefreshSession = async () => {
      if (isSessionExpiringSoon()) {
        console.log("Session expiring soon, attempting refresh...");
        await attemptSessionRefresh();
      }
    };

    // Initial check
    checkAndRefreshSession();

    // Set up periodic refresh check
    refreshIntervalRef.current = setInterval(checkAndRefreshSession, SESSION_REFRESH_INTERVAL_MS);

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
    };
  }, [user, session, isSessionExpiringSoon, attemptSessionRefresh]);
  
  /**
   * Sync better-auth state with global Zustand store
   * This ensures the store is always up to date with the session
   */
  useEffect(() => {
    // Only update if not loading
    if (!isPending) {
        useAuthStore.setState({
          user: user ? {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
          } : null,
          token: session?.token || null,
          isAuthenticated: !!user,
          isLoading: false,
          error: null,
        });
    } else {
        useAuthStore.setState({ isLoading: true });
    }
  }, [user, session, isPending]);

  /**
   * Clear the session expired flag
   */
  const clearSessionExpired = useCallback(() => {
    setSessionExpired(false);
  }, []);

  /**
   * Sign in with email and password
   */
  const handleSignIn = useCallback(async (email: string, password: string) => {
    try {
      const result = await signIn.email({
        email,
        password,
      });

      console.log("[Auth] Sign in result:", result);

      if (result.error) {
        console.error("[Auth] Sign in error:", result.error);
        throw new Error(result.error.message || "Sign in failed");
      }

      // Refetch session to update state after successful sign-in
      console.log("[Auth] Sign in successful, refetching session...");
      await refetch();
      
      console.log("[Auth] Session refetched");
    } catch (error) {
      console.error("[Auth] Sign in exception:", error);
      throw error;
    }
  }, [refetch]);

  /**
   * Sign up with email, password, and name
   */
  const handleSignUp = useCallback(async (email: string, password: string, name: string) => {
    const result = await signUp.email({
      email,
      password,
      name,
    });

    console.log("[Auth] Sign up result:", result);

    if (result.error) {
      console.error("[Auth] Sign up error:", result.error);
      throw new Error(result.error.message || "Sign up failed");
    }

    // Refetch session to update state
    await refetch();
  }, [refetch]);

  /**
   * Sign out and clear session
   */
  const handleSignOut = useCallback(async () => {
    await signOut();
    // Refetch to clear session state
    await refetch();
  }, [refetch]);

  /**
   * Refetch the current session
   */
  const refetchSession = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const value: AuthContextType = useMemo(() => ({
    user,
    session,
    isLoading: isPending,
    isAuthenticated: !!user,
    sessionExpired,
    handleSignIn,
    handleSignUp,
    handleSignOut,
    refetchSession,
    clearSessionExpired,
  }), [user, session, isPending, sessionExpired, handleSignIn, handleSignUp, handleSignOut, refetchSession, clearSessionExpired]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

/**
 * Hook to access auth context
 * @throws Error if used outside of AuthProvider
 */
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export default AuthContext;
