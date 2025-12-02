import { apiClient } from './api'
import { LoginCredentials, RegisterCredentials, AuthResponse, User } from '@/types'

export class AuthService {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/auth/login', credentials)
    
    if (response.success && response.data?.token) {
      apiClient.setToken(response.data.token)
      // Note: Backend doesn't return refreshToken yet, so we'll skip storing it for now
      // localStorage.setItem('refresh_token', response.data.refreshToken)
    }
    
    if (!response.data) {
      throw new Error('No data received from login response')
    }
    
    return response.data
  }

  async register(credentials: RegisterCredentials): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/auth/register', credentials)
    
    if (response.success && response.data?.token) {
      apiClient.setToken(response.data.token)
      // Note: Backend doesn't return refreshToken yet, so we'll skip storing it for now
      // localStorage.setItem('refresh_token', response.data.refreshToken)
    }
    
    if (!response.data) {
      throw new Error('No data received from register response')
    }
    
    return response.data
  }

  async logout(): Promise<void> {
    try {
      await apiClient.post('/auth/logout')
    } catch (error) {
      // Continue with logout even if API call fails
      console.warn('Logout API call failed:', error)
    } finally {
      apiClient.clearToken()
    }
  }

  async getCurrentUser(): Promise<User> {
    const response = await apiClient.get<User>('/auth/me')
    
    if (!response.data) {
      throw new Error('No user data received')
    }
    
    return response.data
  }

  async refreshToken(): Promise<AuthResponse> {
    const refreshToken = localStorage.getItem('refresh_token')
    if (!refreshToken) {
      throw new Error('No refresh token available')
    }

    const response = await apiClient.post<AuthResponse>('/auth/refresh', {
      refreshToken,
    })

    if (response.success && response.data?.token) {
      apiClient.setToken(response.data.token)
      if (response.data.refreshToken) {
        localStorage.setItem('refresh_token', response.data.refreshToken)
      }
    }

    if (!response.data) {
      throw new Error('No data received from refresh token response')
    }

    return response.data
  }

  async forgotPassword(email: string): Promise<void> {
    await apiClient.post('/auth/forgot-password', { email })
  }

  async resetPassword(token: string, password: string): Promise<void> {
    await apiClient.post('/auth/reset-password', { token, password })
  }

  isTokenExpired(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      return payload.exp * 1000 < Date.now()
    } catch {
      return true
    }
  }
}

export const authService = new AuthService()
