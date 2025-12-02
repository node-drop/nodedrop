export interface User {
  id: string
  email: string
  name: string
  role: 'ADMIN' | 'USER' // Match backend enum values
  createdAt: string
  updatedAt?: string // Optional since backend might not always return it
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterCredentials {
  name: string
  email: string
  password: string
}

export interface AuthResponse {
  user: User
  token: string
  refreshToken?: string // Optional since backend doesn't return it yet
}

export interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
}
