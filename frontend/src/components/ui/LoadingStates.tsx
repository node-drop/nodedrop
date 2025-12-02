/**
 * Loading state and progress indicator components
 * Provides various loading indicators for different use cases
 */

import React from 'react'
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import { clsx } from 'clsx'

export interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
  color?: 'primary' | 'secondary' | 'white'
}

export function LoadingSpinner({ 
  size = 'md', 
  className,
  color = 'primary'
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  }

  const colorClasses = {
    primary: 'text-blue-600',
    secondary: 'text-gray-600',
    white: 'text-white'
  }

  return (
    <Loader2 
      className={clsx(
        'animate-spin',
        sizeClasses[size],
        colorClasses[color],
        className
      )}
    />
  )
}

export interface ProgressBarProps {
  progress: number
  size?: 'sm' | 'md' | 'lg'
  color?: 'primary' | 'success' | 'warning' | 'danger'
  showPercentage?: boolean
  label?: string
  className?: string
}

export function ProgressBar({
  progress,
  size = 'md',
  color = 'primary',
  showPercentage = false,
  label,
  className
}: ProgressBarProps) {
  const clampedProgress = Math.max(0, Math.min(100, progress))

  const sizeClasses = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3'
  }

  const colorClasses = {
    primary: 'bg-blue-500',
    success: 'bg-green-500',
    warning: 'bg-yellow-500',
    danger: 'bg-red-500'
  }

  return (
    <div className={clsx('w-full', className)}>
      {(label || showPercentage) && (
        <div className="flex justify-between items-center mb-1">
          {label && (
            <span className="text-sm font-medium text-gray-700">{label}</span>
          )}
          {showPercentage && (
            <span className="text-sm text-gray-500">{Math.round(clampedProgress)}%</span>
          )}
        </div>
      )}
      
      <div className={clsx(
        'w-full bg-gray-200 rounded-full overflow-hidden',
        sizeClasses[size]
      )}>
        <div
          className={clsx(
            'h-full transition-all duration-300 ease-out rounded-full',
            colorClasses[color]
          )}
          style={{ width: `${clampedProgress}%` }}
          role="progressbar"
          aria-valuenow={clampedProgress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={label || `Progress: ${Math.round(clampedProgress)}%`}
        />
      </div>
    </div>
  )
}

export interface CircularProgressProps {
  progress: number
  size?: number
  strokeWidth?: number
  color?: 'primary' | 'success' | 'warning' | 'danger'
  showPercentage?: boolean
  className?: string
}

export function CircularProgress({
  progress,
  size = 40,
  strokeWidth = 4,
  color = 'primary',
  showPercentage = false,
  className
}: CircularProgressProps) {
  const clampedProgress = Math.max(0, Math.min(100, progress))
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const strokeDashoffset = circumference - (clampedProgress / 100) * circumference

  const colorClasses = {
    primary: 'text-blue-500',
    success: 'text-green-500',
    warning: 'text-yellow-500',
    danger: 'text-red-500'
  }

  return (
    <div className={clsx('relative inline-flex items-center justify-center', className)}>
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
        role="progressbar"
        aria-valuenow={clampedProgress}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          className="text-gray-200"
        />
        
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className={clsx('transition-all duration-300 ease-out', colorClasses[color])}
        />
      </svg>
      
      {showPercentage && (
        <span className="absolute text-xs font-medium text-gray-700">
          {Math.round(clampedProgress)}%
        </span>
      )}
    </div>
  )
}

export interface LoadingOverlayProps {
  isVisible: boolean
  message?: string
  progress?: number
  showProgress?: boolean
  className?: string
}

export function LoadingOverlay({
  isVisible,
  message = 'Loading...',
  progress,
  showProgress = false,
  className
}: LoadingOverlayProps) {
  if (!isVisible) return null

  return (
    <div className={clsx(
      'absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center z-10',
      className
    )}>
      <div className="text-center">
        {showProgress && typeof progress === 'number' ? (
          <CircularProgress
            progress={progress}
            size={48}
            showPercentage
            className="mb-4"
          />
        ) : (
          <LoadingSpinner size="lg" className="mb-4" />
        )}
        
        <p className="text-sm text-gray-600 font-medium">{message}</p>
        
        {showProgress && typeof progress === 'number' && (
          <div className="mt-2 w-48 mx-auto">
            <ProgressBar progress={progress} size="sm" />
          </div>
        )}
      </div>
    </div>
  )
}

export interface OperationStatusProps {
  status: 'idle' | 'loading' | 'success' | 'error'
  message?: string
  progress?: number
  showProgress?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function OperationStatus({
  status,
  message,
  progress,
  showProgress = false,
  size = 'md',
  className
}: OperationStatusProps) {
  const getIcon = () => {
    switch (status) {
      case 'loading':
        return <LoadingSpinner size={size} />
      case 'success':
        return <CheckCircle className={clsx(
          'text-green-500',
          size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-8 h-8' : 'w-6 h-6'
        )} />
      case 'error':
        return <AlertCircle className={clsx(
          'text-red-500',
          size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-8 h-8' : 'w-6 h-6'
        )} />
      default:
        return null
    }
  }

  const getTextColor = () => {
    switch (status) {
      case 'success':
        return 'text-green-700'
      case 'error':
        return 'text-red-700'
      default:
        return 'text-gray-700'
    }
  }

  if (status === 'idle') return null

  return (
    <div className={clsx('flex items-center space-x-2', className)}>
      {getIcon()}
      
      <div className="flex-1 min-w-0">
        {message && (
          <p className={clsx(
            'font-medium',
            size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-base' : 'text-sm',
            getTextColor()
          )}>
            {message}
          </p>
        )}
        
        {showProgress && typeof progress === 'number' && status === 'loading' && (
          <div className="mt-1">
            <ProgressBar 
              progress={progress} 
              size={size === 'lg' ? 'md' : 'sm'}
              showPercentage={size !== 'sm'}
            />
          </div>
        )}
      </div>
    </div>
  )
}

export interface ButtonLoadingStateProps {
  isLoading: boolean
  children: React.ReactNode
  loadingText?: string
  disabled?: boolean
  className?: string
  onClick?: () => void
}

export function ButtonLoadingState({
  isLoading,
  children,
  loadingText,
  disabled = false,
  className,
  onClick
}: ButtonLoadingStateProps) {
  return (
    <button
      onClick={onClick}
      disabled={isLoading || disabled}
      className={clsx(
        'flex items-center justify-center space-x-2 transition-all duration-200',
        (isLoading || disabled) && 'opacity-50 cursor-not-allowed',
        className
      )}
    >
      {isLoading && <LoadingSpinner size="sm" color="white" />}
      <span>{isLoading && loadingText ? loadingText : children}</span>
    </button>
  )
}
