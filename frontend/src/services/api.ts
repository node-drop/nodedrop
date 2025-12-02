import { env } from "@/config/env";
import { ApiError, ApiResponse, RequestConfig } from "@/types";
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from "axios";

class ApiClient {
  private client: AxiosInstance;
  private token: string | null = null;

  constructor(baseURL: string = env.API_BASE_URL) {
    this.client = axios.create({
      baseURL,
      timeout: 30000, // Increased to 30 seconds for better handling of uploads
      headers: {
        "Content-Type": "application/json",
      },
    });

    this.setupInterceptors();
    this.loadTokenFromStorage();
  }

  private setupInterceptors() {
    // Request interceptor to add auth token
    this.client.interceptors.request.use(
      (config) => {
        if (this.token) {
          config.headers.Authorization = `Bearer ${this.token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor to handle errors
    this.client.interceptors.response.use(
      (response: AxiosResponse) => response,
      (error) => {
        if (error.response?.status === 401) {
          // Only handle unauthorized for authenticated requests, not login attempts
          const isLoginRequest = error.config?.url?.includes('/auth/login');
          if (!isLoginRequest) {
            // Clear token and notify auth store
            this.clearToken();
            this.handleUnauthorized();
          }
        }
        const formattedError = this.formatError(error);
        const errorObj = new Error(formattedError.message);
        (errorObj as any).code = formattedError.code;
        (errorObj as any).status = formattedError.status;
        return Promise.reject(errorObj);
      }
    );
  }

  private loadTokenFromStorage() {
    const token = localStorage.getItem("auth_token");
    if (token) {
      this.setToken(token);
    }
  }

  private formatError(error: any): ApiError {
    if (error.response) {
      // Handle nested error object: { error: { message: "...", code: "..." } }
      const errorData = error.response.data?.error || error.response.data;

      return {
        message:
          errorData?.message ||
          error.response.data?.message ||
          "An error occurred",
        code: errorData?.code || error.response.data?.code,
        status: error.response.status,
      };
    } else if (error.request) {
      return {
        message: "Network error - please check your connection",
        code: "NETWORK_ERROR",
      };
    } else {
      return {
        message: error.message || "An unexpected error occurred",
        code: "UNKNOWN_ERROR",
      };
    }
  }

  setToken(token: string) {
    this.token = token;
    localStorage.setItem("auth_token", token);
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem("auth_token");
    localStorage.removeItem("refresh_token");
  }

  private handleUnauthorized() {
    // Clear auth store state and redirect to login
    // We use a timeout to avoid circular imports and ensure the store is available
    setTimeout(() => {
      try {
        // Import the auth store dynamically to avoid circular dependencies
        import('@/stores/auth').then(({ useAuthStore }) => {
          const authStore = useAuthStore.getState();
          // Clear the auth state which will trigger a redirect to login
          authStore.logout();
        });
      } catch (error) {
        console.error('Failed to clear auth state on 401:', error);
        // Fallback: redirect to login manually
        window.location.href = '/login';
      }
    }, 0);
  }

  async get<T = any>(
    url: string,
    config?: RequestConfig
  ): Promise<ApiResponse<T>> {
    const response = await this.client.get(url, config as AxiosRequestConfig);
    return response.data;
  }

  async post<T = any>(
    url: string,
    data?: any,
    config?: RequestConfig
  ): Promise<ApiResponse<T>> {
    const response = await this.client.post(
      url,
      data,
      config as AxiosRequestConfig
    );
    return response.data;
  }

  async put<T = any>(
    url: string,
    data?: any,
    config?: RequestConfig
  ): Promise<ApiResponse<T>> {
    const response = await this.client.put(
      url,
      data,
      config as AxiosRequestConfig
    );
    return response.data;
  }

  async delete<T = any>(
    url: string,
    config?: RequestConfig
  ): Promise<ApiResponse<T>> {
    const response = await this.client.delete(
      url,
      config as AxiosRequestConfig
    );
    return response.data;
  }

  async patch<T = any>(
    url: string,
    data?: any,
    config?: RequestConfig
  ): Promise<ApiResponse<T>> {
    const response = await this.client.patch(
      url,
      data,
      config as AxiosRequestConfig
    );
    return response.data;
  }
}

export const apiClient = new ApiClient();
export default apiClient;
