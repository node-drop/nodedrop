/**
 * ProtectedRoute Component
 * 
 * Handles route protection based on authentication state and user roles.
 * Implements redirect on failed session refresh (Requirements 10.5).
 * Supports role-based protection (Requirements 4.2, 9.1).
 */

import { useAuthStore, usePinnedNodesStore } from '@/stores'
import { useAuth } from '@/contexts/AuthContext'
import { socketService } from '@/services/socket'
import { Loader2 } from 'lucide-react'
import React, { useEffect } from 'react'
import { Navigate, useLocation } from 'react-router-dom'

interface ProtectedRouteProps {
  children: React.ReactNode
  /** Whether authentication is required (default: true) */
  requireAuth?: boolean
  /** Required role(s) for access - if specified, user must have one of these roles */
  requiredRole?: 'user' | 'admin' | Array<'user' | 'admin'>
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requireAuth = true,
  requiredRole,
}) => {
  const { isAuthenticated, isLoading, getCurrentUser, token } = useAuthStore()
  const { sessionExpired, clearSessionExpired, handleSignOut } = useAuth()
  const location = useLocation()
  const [hasTriedAuth, setHasTriedAuth] = React.useState(false)

  useEffect(() => {
    // If we have a token but no user info, try to get current user (only once)
    if (token && token !== 'guest-token' && !isAuthenticated && !isLoading && !hasTriedAuth) {
      setHasTriedAuth(true)
      getCurrentUser().catch(() => {
        // getCurrentUser will handle clearing the token/state on failure
        setHasTriedAuth(false)
      })
    }
    // Remove automatic guest login - users must explicitly choose guest mode
  }, [token, isAuthenticated, isLoading, getCurrentUser, hasTriedAuth])

  // Initialize socket connection and pinned nodes when user is authenticated
  const { initialize: initializePinnedNodes } = usePinnedNodesStore()
  
  useEffect(() => {
    if (isAuthenticated && token && token !== 'guest-token') {
      // Initialize socket connection with current token
      socketService.initialize(token).catch(error => {
        console.error('Failed to initialize socket connection:', error)
      })
      
      // Initialize pinned nodes from user preferences
      initializePinnedNodes().catch(error => {
        console.error('Failed to initialize pinned nodes:', error)
      })
    } else if (!isAuthenticated) {
      // Disconnect socket when user is not authenticated
      socketService.disconnect()
    }
  }, [isAuthenticated, token, initializePinnedNodes])

  /**
   * Handle session expiration - redirect to login (Requirements 10.5)
   * When session refresh fails, clear auth state and redirect to login
   */
  useEffect(() => {
    if (sessionExpired && requireAuth) {
      console.log('Session expired, redirecting to login...')
      // Clear the expired flag
      clearSessionExpired()
      // Sign out to clear any remaining auth state
      handleSignOut().catch(console.error)
    }
  }, [sessionExpired, requireAuth, clearSessionExpired, handleSignOut])

  // Show loading spinner while checking authentication
  // Don't show loading for auth pages (login/register) as they have their own loading states
  const isAuthPage = location.pathname === '/login' || location.pathname === '/register'
  if ((isLoading || (token && !isAuthenticated && hasTriedAuth)) && !isAuthPage) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary-600" />
          <p className="mt-2 text-sm text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // If session expired, redirect to login with message (Requirements 10.5)
  if (sessionExpired && requireAuth) {
    return <Navigate to="/login" state={{ from: location, sessionExpired: true }} replace />
  }

  // If authentication is required but user is not authenticated (and not guest)
  if (requireAuth && !isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // If user is authenticated but trying to access auth pages
  if (!requireAuth && isAuthenticated) {
    const from = location.state?.from?.pathname || '/workflows'
    return <Navigate to={from} replace />
  }

  // Role-based access control (Requirements 4.2, 9.1)
  if (requireAuth && requiredRole && isAuthenticated) {
    const { user } = useAuthStore.getState()
    if (user) {
      const allowedRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole]
      // admin role has access to everything
      if (user.role !== 'admin' && !allowedRoles.includes(user.role as 'user' | 'admin')) {
        return <Navigate to="/unauthorized" state={{ from: location }} replace />
      }
    }
  }

  return <>{children}</>
}
