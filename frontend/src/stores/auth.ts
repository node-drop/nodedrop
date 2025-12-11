import { signIn, signOut, signUp } from "@/lib/auth-client";
import { apiClient } from "@/services/api";
import { AuthState, LoginCredentials, RegisterCredentials, User } from "@/types";
import { persist } from "zustand/middleware";
import { createWithEqualityFn } from "zustand/traditional";

// Helper function to load all user preferences with a single API call
const loadAllPreferences = async () => {
  try {
    // Make a single API call to get all preferences
    const { userService } = await import("@/services");
    const preferences = await userService.getPreferences();

    // Load canvas preferences using silent setter to avoid triggering savePreferences
    const { useReactFlowUIStore } = await import("./reactFlowUI");
    const reactFlowStore = useReactFlowUIStore.getState();
    reactFlowStore.setPreferencesFromAPI(preferences);

    // Load theme preferences
    if (preferences.theme) {
      localStorage.setItem("theme", preferences.theme);
      // Dispatch custom event to notify ThemeProvider
      window.dispatchEvent(
        new CustomEvent("theme-loaded", { detail: preferences.theme })
      );
    }
  } catch (error) {
    console.error("Failed to load user preferences:", error);
  }
};

/**
 * Transform better-auth user response to our User type
 * better-auth returns user without role, so we fetch it from /auth/me
 */
const transformUser = (betterAuthUser: any, role?: string): User => {
  return {
    id: betterAuthUser.id,
    email: betterAuthUser.email,
    name: betterAuthUser.name || "",
    role: (role as "admin" | "user") || "user",
    createdAt: betterAuthUser.createdAt?.toString() || new Date().toISOString(),
    updatedAt: betterAuthUser.updatedAt?.toString(),
  };
};

interface AuthActions {
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (credentials: RegisterCredentials) => Promise<void>;
  loginAsGuest: () => Promise<void>;
  logout: () => Promise<void>;
  getCurrentUser: () => Promise<void>;
  clearError: () => void;
  setLoading: (loading: boolean) => void;
}

type AuthStore = AuthState & AuthActions;

export const useAuthStore = createWithEqualityFn<AuthStore>()(
  persist(
    (set) => ({
      // State
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      // Actions
      login: async (credentials: LoginCredentials) => {
        try {
          set({ isLoading: true, error: null });

          // Use better-auth client directly
          const response = await signIn.email({
            email: credentials.email,
            password: credentials.password,
          });

          if (response.error) {
            throw new Error(response.error.message || "Login failed");
          }

          const betterAuthUser = response.data?.user;
          const token = response.data?.token || "session-based";

          if (!betterAuthUser) {
            throw new Error("No user data received from login response");
          }

          // Set token in apiClient if available
          if (token && token !== "session-based") {
            apiClient.setToken(token);
          }

          // Fetch full user data with role from /auth/me
          try {
            const meResponse = await apiClient.get<User>("/auth/me");
            if (meResponse.data) {
              set({
                user: meResponse.data,
                token,
                isAuthenticated: true,
                isLoading: false,
                error: null,
              });
            } else {
              // Fallback to basic user data
              set({
                user: transformUser(betterAuthUser),
                token,
                isAuthenticated: true,
                isLoading: false,
                error: null,
              });
            }
          } catch {
            // Fallback to basic user data if /auth/me fails
            set({
              user: transformUser(betterAuthUser),
              token,
              isAuthenticated: true,
              isLoading: false,
              error: null,
            });
          }

          // Load user preferences after successful login
          loadAllPreferences();
        } catch (error: any) {
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
            error: error.message || "Login failed",
          });
          throw error;
        }
      },

      register: async (credentials: RegisterCredentials) => {
        try {
          set({ isLoading: true, error: null });

          // Use better-auth client directly
          const response = await signUp.email({
            email: credentials.email,
            password: credentials.password,
            name: credentials.name,
          });

          if (response.error) {
            throw new Error(response.error.message || "Registration failed");
          }

          const betterAuthUser = response.data?.user;
          const token = response.data?.token || "session-based";

          if (!betterAuthUser) {
            throw new Error("No user data received from register response");
          }

          // Set token in apiClient if available
          if (token && token !== "session-based") {
            apiClient.setToken(token);
          }

          // Fetch full user data with role from /auth/me
          try {
            const meResponse = await apiClient.get<User>("/auth/me");
            if (meResponse.data) {
              set({
                user: meResponse.data,
                token,
                isAuthenticated: true,
                isLoading: false,
                error: null,
              });
            } else {
              // Fallback to basic user data
              set({
                user: transformUser(betterAuthUser),
                token,
                isAuthenticated: true,
                isLoading: false,
                error: null,
              });
            }
          } catch {
            // Fallback to basic user data if /auth/me fails
            set({
              user: transformUser(betterAuthUser),
              token,
              isAuthenticated: true,
              isLoading: false,
              error: null,
            });
          }

          // Load user preferences after successful registration
          loadAllPreferences();
        } catch (error: any) {
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
            error: error.message || "Registration failed",
          });
          throw error;
        }
      },

      loginAsGuest: async () => {
        try {
          set({ isLoading: true, error: null });

          // Create a guest user without making API calls
          const guestUser: User = {
            id: "guest",
            email: "guest@example.com",
            name: "Guest User",
            role: "user" as const,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          set({
            user: guestUser,
            token: "guest-token",
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } catch (error: any) {
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
            error: error.message || "Guest login failed",
          });
          throw error;
        }
      },

      logout: async () => {
        try {
          set({ isLoading: true });
          // Use better-auth client directly
          await signOut();
        } catch (error) {
          console.warn("Logout error:", error);
        } finally {
          apiClient.clearToken();
          
          // Reset workspace store to clear stale workspace data
          const { useWorkspaceStore } = await import("./workspace");
          useWorkspaceStore.getState().reset();
          
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
          });
        }
      },

      getCurrentUser: async () => {
        try {
          set({ isLoading: true, error: null });

          // Call the /auth/me endpoint directly
          const response = await apiClient.get<User>("/auth/me");

          if (!response.data) {
            throw new Error("No user data received");
          }

          set({
            user: response.data,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });

          // Load user preferences after getting current user
          loadAllPreferences();
        } catch (error: any) {
          // Clear token from localStorage and apiClient when getCurrentUser fails
          localStorage.removeItem("auth_token");
          apiClient.clearToken();
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
            error: error.message || "Failed to get user info",
          });
          throw error;
        }
      },

      clearError: () => {
        set({ error: null });
      },

      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },
    }),
    {
      name: "auth-store",
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
