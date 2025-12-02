import { APP_NAME } from '@/config/env'
import { useAuthStore } from '@/stores'
import {
    Activity,
    Bell,
    ChevronDown,
    LogOut,
    Menu,
    Package,
    Search,
    Settings,
    User,
    Workflow,
    X
} from 'lucide-react'
import React, { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'

export const Header: React.FC = () => {
  const { user, logout, isAuthenticated } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)

  const handleLogout = async () => {
    try {
      await logout()
      navigate('/login')
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

  const isActiveRoute = (path: string) => {
    return location.pathname.startsWith(path)
  }

  const navLinkClass = (path: string) =>
    `flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActiveRoute(path)
      ? 'text-primary-600 bg-primary-50'
      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
    }`

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false)
    setIsUserMenuOpen(false)
  }, [location.pathname])

  if (!isAuthenticated) {
    return null
  }

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and Navigation */}
          <div className="flex items-center space-x-8">
            <Link to="/" className="flex items-center space-x-2 flex-shrink-0">
              <div className="w-8 h-8 bg-gradient-to-br from-primary-600 to-primary-700 rounded-lg flex items-center justify-center shadow-sm">
                <Workflow className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900 hidden sm:block">
                {APP_NAME}
              </span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex space-x-1">
              <Link to="/workflows" className={navLinkClass('/workflows')}>
                <Workflow className="w-4 h-4" />
                <span>Workflows</span>
              </Link>
              <Link to="/executions" className={navLinkClass('/executions')}>
                <Activity className="w-4 h-4" />
                <span>Executions</span>
              </Link>
              <Link to="/custom-nodes" className={navLinkClass('/custom-nodes')}>
                <Package className="w-4 h-4" />
                <span>Custom Nodes</span>
              </Link>
            </nav>
          </div>

          {/* Search Bar */}
          <div className="hidden lg:flex flex-1 max-w-md mx-8">
            <div className="relative w-full">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search workflows, executions..."
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-primary-500 focus:border-primary-500 text-sm"
              />
            </div>
          </div>

          {/* Right Side Actions */}
          <div className="flex items-center space-x-3">
            {/* Search Button for Mobile */}
            <button className="lg:hidden p-2 text-gray-400 hover:text-gray-600 rounded-md">
              <Search className="w-5 h-5" />
            </button>

            {/* Notifications */}
            <button className="relative p-2 text-gray-400 hover:text-gray-600 rounded-md">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 block h-2 w-2 rounded-full bg-red-400"></span>
            </button>

            {/* Guest Sign In */}
            {user?.id === 'guest' && (
              <Link
                to="/login"
                className="text-sm font-medium text-primary-600 hover:text-primary-500 px-3 py-2 rounded-md transition-colors"
              >
                Sign In
              </Link>
            )}

            {/* User Menu */}
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4" />
                </div>
                <span className="hidden sm:block max-w-32 truncate">
                  {user?.id === 'guest' ? 'Guest' : (user?.name || user?.email)}
                </span>
                <ChevronDown className="w-4 h-4" />
              </button>

              {/* User Dropdown Menu */}
              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 border border-gray-200">
                  <div className="px-4 py-2 text-xs text-gray-500 border-b border-gray-100">
                    {user?.email}
                  </div>
                  {user?.id !== 'guest' && (
                    <Link
                      to="/settings"
                      className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      onClick={() => setIsUserMenuOpen(false)}
                    >
                      <Settings className="w-4 h-4" />
                      <span>Settings</span>
                    </Link>
                  )}
                  <button
                    onClick={() => {
                      handleLogout()
                      setIsUserMenuOpen(false)
                    }}
                    className="flex items-center space-x-2 w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>{user?.id === 'guest' ? 'Exit Guest Mode' : 'Sign out'}</span>
                  </button>
                </div>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 text-gray-400 hover:text-gray-600 rounded-md"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-gray-200 bg-white">
          {/* Mobile Search */}
          <div className="px-4 py-3 border-b border-gray-100">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search workflows, executions..."
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-primary-500 focus:border-primary-500 text-sm"
              />
            </div>
          </div>

          {/* Mobile Navigation Links */}
          <nav className="px-4 py-2 space-y-1">
            <Link
              to="/workflows"
              className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium ${isActiveRoute('/workflows')
                  ? 'text-primary-600 bg-primary-50'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <Workflow className="w-4 h-4" />
              <span>Workflows</span>
            </Link>
            <Link
              to="/executions"
              className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium ${isActiveRoute('/executions')
                  ? 'text-primary-600 bg-primary-50'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <Activity className="w-4 h-4" />
              <span>Executions</span>
            </Link>
            <Link
              to="/custom-nodes"
              className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium ${isActiveRoute('/custom-nodes')
                  ? 'text-primary-600 bg-primary-50'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <Package className="w-4 h-4" />
              <span>Custom Nodes</span>
            </Link>
          </nav>
        </div>
      )}
    </header>
  )
}
