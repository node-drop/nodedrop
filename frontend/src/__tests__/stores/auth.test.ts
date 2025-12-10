import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useAuthStore } from '@/stores/auth'

// Mock the better-auth client
vi.mock('@/lib/auth-client', () => ({
  signIn: {
    email: vi.fn(),
  },
  signUp: {
    email: vi.fn(),
  },
  signOut: vi.fn(),
}))

// Mock the api client
vi.mock('@/services/api', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    setToken: vi.fn(),
    clearToken: vi.fn(),
  },
}))

import { signIn, signUp, signOut } from '@/lib/auth-client'
import { apiClient } from '@/services/api'

describe('Auth Store', () => {
  beforeEach(() => {
    // Reset the store state before each test
    useAuthStore.setState({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    })
    vi.clearAllMocks()
  })

  it('should initialize with default state', () => {
    const state = useAuthStore.getState()
    
    expect(state.user).toBeNull()
    expect(state.token).toBeNull()
    expect(state.isAuthenticated).toBe(false)
    expect(state.isLoading).toBe(false)
    expect(state.error).toBeNull()
  })

  it('should handle successful login', async () => {
    const mockUser = { 
      id: '1', 
      email: 'test@example.com', 
      name: 'Test User', 
      role: 'USER' as const, 
      createdAt: '2024-01-01', 
      updatedAt: '2024-01-01' 
    }

    // Mock better-auth signIn response
    vi.mocked(signIn.email).mockResolvedValue({
      data: {
        user: { id: '1', email: 'test@example.com', name: 'Test User', createdAt: new Date(), updatedAt: new Date(), emailVerified: false },
        token: 'mock-token',
      },
      error: null,
    })

    // Mock /auth/me response with full user data including role
    vi.mocked(apiClient.get).mockResolvedValue({
      success: true,
      data: mockUser,
    })

    const { login } = useAuthStore.getState()
    await login({ email: 'test@example.com', password: 'password' })

    const state = useAuthStore.getState()
    expect(state.user).toEqual(mockUser)
    expect(state.token).toBe('mock-token')
    expect(state.isAuthenticated).toBe(true)
    expect(state.isLoading).toBe(false)
    expect(state.error).toBeNull()
  })

  it('should handle login failure', async () => {
    vi.mocked(signIn.email).mockResolvedValue({
      data: null,
      error: { message: 'Invalid credentials', code: 'INVALID_CREDENTIALS', status: 401, statusText: 'Unauthorized' },
    })

    const { login } = useAuthStore.getState()
    
    await expect(login({ email: 'test@example.com', password: 'wrong' })).rejects.toThrow('Invalid credentials')

    const state = useAuthStore.getState()
    expect(state.user).toBeNull()
    expect(state.token).toBeNull()
    expect(state.isAuthenticated).toBe(false)
    expect(state.isLoading).toBe(false)
    expect(state.error).toBe('Invalid credentials')
  })

  it('should handle logout', async () => {
    // Set initial authenticated state
    useAuthStore.setState({
      user: { id: '1', email: 'test@example.com', name: 'Test User', role: 'USER', createdAt: '2024-01-01', updatedAt: '2024-01-01' },
      token: 'mock-token',
      isAuthenticated: true,
    })

    vi.mocked(signOut).mockResolvedValue({ data: null, error: null })

    const { logout } = useAuthStore.getState()
    await logout()

    const state = useAuthStore.getState()
    expect(state.user).toBeNull()
    expect(state.token).toBeNull()
    expect(state.isAuthenticated).toBe(false)
    expect(state.isLoading).toBe(false)
    expect(state.error).toBeNull()
    expect(apiClient.clearToken).toHaveBeenCalled()
  })

  it('should handle guest login', async () => {
    const { loginAsGuest } = useAuthStore.getState()
    await loginAsGuest()

    const state = useAuthStore.getState()
    expect(state.user).toEqual({
      id: 'guest',
      email: 'guest@example.com',
      name: 'Guest User',
      role: 'USER',
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
    })
    expect(state.token).toBe('guest-token')
    expect(state.isAuthenticated).toBe(true)
    expect(state.isLoading).toBe(false)
    expect(state.error).toBeNull()
  })

  it('should clear error', () => {
    useAuthStore.setState({ error: 'Some error' })

    const { clearError } = useAuthStore.getState()
    clearError()

    const state = useAuthStore.getState()
    expect(state.error).toBeNull()
  })
})
