import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useAuthStore } from '@/stores/auth'
import { authService } from '@/services/auth'

// Mock the auth service
vi.mock('@/services/auth', () => ({
  authService: {
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    getCurrentUser: vi.fn(),
  },
}))

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
    const mockAuthResponse = {
      user: { id: '1', email: 'test@example.com', name: 'Test User', role: 'user' as const, createdAt: '2024-01-01', updatedAt: '2024-01-01' },
      token: 'mock-token',
      refreshToken: 'mock-refresh-token',
    }

    vi.mocked(authService.login).mockResolvedValue(mockAuthResponse)

    const { login } = useAuthStore.getState()
    await login({ email: 'test@example.com', password: 'password' })

    const state = useAuthStore.getState()
    expect(state.user).toEqual(mockAuthResponse.user)
    expect(state.token).toBe(mockAuthResponse.token)
    expect(state.isAuthenticated).toBe(true)
    expect(state.isLoading).toBe(false)
    expect(state.error).toBeNull()
  })

  it('should handle login failure', async () => {
    const mockError = new Error('Invalid credentials')
    vi.mocked(authService.login).mockRejectedValue(mockError)

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
      user: { id: '1', email: 'test@example.com', name: 'Test User', role: 'user', createdAt: '2024-01-01', updatedAt: '2024-01-01' },
      token: 'mock-token',
      isAuthenticated: true,
    })

    vi.mocked(authService.logout).mockResolvedValue()

    const { logout } = useAuthStore.getState()
    await logout()

    const state = useAuthStore.getState()
    expect(state.user).toBeNull()
    expect(state.token).toBeNull()
    expect(state.isAuthenticated).toBe(false)
    expect(state.isLoading).toBe(false)
    expect(state.error).toBeNull()
  })

  it('should handle guest login', async () => {
    const { loginAsGuest } = useAuthStore.getState()
    await loginAsGuest()

    const state = useAuthStore.getState()
    expect(state.user).toEqual({
      id: 'guest',
      email: 'guest@example.com',
      name: 'Guest User',
      role: 'user',
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
