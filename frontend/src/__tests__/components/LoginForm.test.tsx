import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { LoginForm } from '@/components/auth/LoginForm'
import { useAuthStore } from '@/stores/auth'

// Mock the auth store
vi.mock('@/stores/auth', () => ({
  useAuthStore: vi.fn(),
}))

const mockLogin = vi.fn()
const mockLoginAsGuest = vi.fn()
const mockClearError = vi.fn()

const renderLoginForm = () => {
  return render(
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <LoginForm />
    </BrowserRouter>
  )
}

describe('LoginForm', () => {
  beforeEach(() => {
    vi.mocked(useAuthStore).mockReturnValue({
      login: mockLogin,
      loginAsGuest: mockLoginAsGuest,
      isLoading: false,
      error: null,
      clearError: mockClearError,
      user: null,
      token: null,
      isAuthenticated: false,
      register: vi.fn(),
      logout: vi.fn(),
      getCurrentUser: vi.fn(),
      setLoading: vi.fn(),
    })
    vi.clearAllMocks()
  })

  it('should render login form', () => {
    renderLoginForm()
    
    expect(screen.getByText('Sign in to your account')).toBeInTheDocument()
    expect(screen.getByLabelText('Email address')).toBeInTheDocument()
    expect(screen.getByLabelText('Password')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument()
  })

  it('should show validation errors for empty fields', async () => {
    renderLoginForm()
    
    const submitButton = screen.getByRole('button', { name: 'Sign in' })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('Email is required')).toBeInTheDocument()
      expect(screen.getByText('Password is required')).toBeInTheDocument()
    })
  })

  it('should show validation error for invalid email', async () => {
    renderLoginForm()
    
    const emailInput = screen.getByLabelText('Email address')
    const submitButton = screen.getByRole('button', { name: 'Sign in' })
    
    fireEvent.change(emailInput, { target: { value: 'invalid-email' } })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('Invalid email address')).toBeInTheDocument()
    })
  })

  it('should call login function with correct credentials', async () => {
    renderLoginForm()
    
    const emailInput = screen.getByLabelText('Email address')
    const passwordInput = screen.getByLabelText('Password')
    const submitButton = screen.getByRole('button', { name: 'Sign in' })
    
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.change(passwordInput, { target: { value: 'password123' } })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      })
    })
  })

  it('should display error message when login fails', () => {
    vi.mocked(useAuthStore).mockReturnValue({
      login: mockLogin,
      loginAsGuest: mockLoginAsGuest,
      isLoading: false,
      error: 'Invalid credentials',
      clearError: mockClearError,
      user: null,
      token: null,
      isAuthenticated: false,
      register: vi.fn(),
      logout: vi.fn(),
      getCurrentUser: vi.fn(),
      setLoading: vi.fn(),
    })

    renderLoginForm()
    
    expect(screen.getByText('Invalid credentials')).toBeInTheDocument()
  })

  it('should show loading state when submitting', () => {
    vi.mocked(useAuthStore).mockReturnValue({
      login: mockLogin,
      loginAsGuest: mockLoginAsGuest,
      isLoading: true,
      error: null,
      clearError: mockClearError,
      user: null,
      token: null,
      isAuthenticated: false,
      register: vi.fn(),
      logout: vi.fn(),
      getCurrentUser: vi.fn(),
      setLoading: vi.fn(),
    })

    renderLoginForm()
    
    const submitButton = screen.getByRole('button', { name: /signing in/i })
    expect(submitButton).toBeDisabled()
  })
})
