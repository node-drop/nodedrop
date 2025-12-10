import { apiClient } from './api'
import { LoginCredentials, RegisterCredentials, AuthResponse, User } from '@/types'

export class AuthService {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    // Use better-auth sign-in endpoint
    const response = await apiClient.post<any>('/auth/sign-in/email', {
      email: credentials.email,
      password: credentials.password
    })
    
    // better-auth returns user and session directly, not wrapped in data
    // Transform to expected AuthResponse format
    const authResponse: AuthResponse = {
      user: response.data?.user || response.user,
      token: response.data?.session?.token || response.session?.token || 'session-based'
    }
    
    if (authResponse.token && authResponse.token !== 'session-based') {
      apiClient.setToken(authResponse.token)
    }
    
    if (!authResponse.user) {
      throw new Error('No user data received from login response')
    }
    
    return authResponse
  }

  async register(credentials: RegisterCredentials): Promise<AuthResponse> {
    // Use better-auth sign-up endpoint
    const response = await apiClient.post<any>('/auth/sign-up/email', {
      email: credentials.email,
      password: credentials.password,
      name: credentials.name
    })
    
    // better-auth returns user and session directly
    // Transform to expected AuthResponse format
    const authResponse: AuthResponse = {
      user: response.data?.user || response.user,
      token: response.data?.session?.token || response.session?.token || 'session-based'
    }
    
    if (authResponse.token && authResponse.token !== 'session-based') {
      apiClient.setToken(authResponse.token)
    }
    
    if (!authResponse.user) {
      throw new Error('No user data received from register response')
    }
    
    return authResponse
  }

  async logout(): Promise<void> {
    try {
      // Use better-auth sign-out endpoint
      await apiClient.post('/auth/sign-out')
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
