import { authService } from "@/services";
import { AuthState, LoginCredentials, RegisterCredentials } from "@/types";
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

          const authResponse = await authService.login(credentials);

          set({
            user: authResponse.user,
            token: authResponse.token,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });

          // Socket authentication will be handled by Layout component

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

          const authResponse = await authService.register(credentials);

          set({
            user: authResponse.user,
            token: authResponse.token,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });

          // Socket authentication will be handled by Layout component

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
          const guestUser = {
            id: "guest",
            email: "guest@example.com",
            name: "Guest User",
            role: "USER" as const,
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
          await authService.logout();
        } catch (error) {
          console.warn("Logout error:", error);
        } finally {
          // Socket disconnection will be handled by Layout component

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

          const user = await authService.getCurrentUser();

          set({
            user,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });

          // Load user preferences after getting current user
          loadAllPreferences();
        } catch (error: any) {
          // Clear token from localStorage and apiClient when getCurrentUser fails
          localStorage.removeItem("auth_token");
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
