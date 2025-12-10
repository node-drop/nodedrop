import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { LoginForm } from '@/components/auth/LoginForm'
import { useAuth } from '@/contexts/AuthContext'

// Mock the auth context
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}))

const mockHandleSignIn = vi.fn()

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
    vi.mocked(useAuth).mockReturnValue({
      handleSignIn: mockHandleSignIn,
      handleSignUp: vi.fn(),
      handleSignOut: vi.fn(),
      isLoading: false,
      user: null,
      session: null,
      isAuthenticated: false,
      sessionExpired: false,
      refetchSession: vi.fn(),
      clearSessionExpired: vi.fn(),
    })
    vi.clearAllMocks()
  })

  it('should render login form', () => {
    renderLoginForm()
    
    expect(screen.getByText('Sign in to your account')).toBeInTheDocument()
    expect(screen.getByLabelText('Email address')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Enter your password')).toBeInTheDocument()
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

  it('should have email validation pattern', () => {
    // This test verifies the email field has validation rules
    // The actual validation is handled by react-hook-form
    renderLoginForm()
    
    const emailInput = screen.getByLabelText('Email address')
    expect(emailInput).toHaveAttribute('type', 'email')
  })

  it('should call handleSignIn function with correct credentials', async () => {
    renderLoginForm()
    
    const emailInput = screen.getByLabelText('Email address')
    const passwordInput = screen.getByPlaceholderText('Enter your password')
    const submitButton = screen.getByRole('button', { name: 'Sign in' })
    
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.change(passwordInput, { target: { value: 'password123' } })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(mockHandleSignIn).toHaveBeenCalledWith('test@example.com', 'password123')
    })
  })

  it('should display error message when login fails', async () => {
    // The error mapper converts "Invalid credentials" to "Invalid email or password"
    mockHandleSignIn.mockRejectedValueOnce(new Error('Invalid credentials'))

    renderLoginForm()
    
    const emailInput = screen.getByLabelText('Email address')
    const passwordInput = screen.getByPlaceholderText('Enter your password')
    const submitButton = screen.getByRole('button', { name: 'Sign in' })
    
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } })
    fireEvent.click(submitButton)

    await waitFor(() => {
      // The mapAuthError function maps "Invalid credentials" to "Invalid email or password"
      expect(screen.getByText('Invalid email or password')).toBeInTheDocument()
    })
  })

  it('should show loading state when submitting', () => {
    vi.mocked(useAuth).mockReturnValue({
      handleSignIn: mockHandleSignIn,
      handleSignUp: vi.fn(),
      handleSignOut: vi.fn(),
      isLoading: true,
      user: null,
      session: null,
      isAuthenticated: false,
      sessionExpired: false,
      refetchSession: vi.fn(),
      clearSessionExpired: vi.fn(),
    })

    renderLoginForm()
    
    const submitButton = screen.getByRole('button', { name: /signing in/i })
    expect(submitButton).toBeDisabled()
  })
})
