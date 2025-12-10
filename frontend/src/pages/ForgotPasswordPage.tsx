/**
 * ForgotPasswordPage Component
 * 
 * Handles password reset request using better-auth client.
 * Calls the password reset endpoint and shows success/error messages.
 * 
 * Requirements: 6.1 - Password reset request generates secure token
 * Requirements: 14.3 - Rate limiting for password reset requests
 */
import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { ArrowLeft, CheckCircle, Loader2, Workflow } from 'lucide-react'

import { apiClient } from '@/services'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'

interface ForgotPasswordFormData {
  email: string
}

/**
 * Maps better-auth error codes to user-friendly messages
 * Handles rate limiting errors specifically (Requirements 14.3)
 */
const mapAuthError = (error: any): string => {
  // Handle better-auth error codes
  const errorCode = error?.code || error?.message || ''
  
  if (errorCode.includes('RATE_LIMIT') || errorCode.includes('Too many') || errorCode.includes('rate limit') || errorCode.includes('429')) {
    return 'Too many password reset requests. Please try again later.'
  }
  if (errorCode.includes('USER_NOT_FOUND') || errorCode.includes('not found')) {
    // Don't reveal if user exists for security
    return 'If an account exists with this email, you will receive a reset link.'
  }
  if (errorCode.includes('INVALID_EMAIL') || errorCode.includes('Invalid email')) {
    return 'Please enter a valid email address'
  }
  
  // Default error message
  return error?.message || 'Failed to send reset email. Please try again.'
}

export const ForgotPasswordPage: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSuccess, setIsSuccess] = useState(false)

  const form = useForm<ForgotPasswordFormData>({
    defaultValues: {
      email: '',
    },
  })

  const onSubmit = async (data: ForgotPasswordFormData) => {
    try {
      setError(null)
      setIsLoading(true)

      // Call better-auth's forget-password endpoint via API client
      // The endpoint is /api/auth/forget-password for better-auth
      await apiClient.post('/auth/forget-password', {
        email: data.email,
        redirectTo: `${window.location.origin}/reset-password`,
      })

      setIsSuccess(true)
    } catch (err: any) {
      // Map error to user-friendly message (Requirements 14.3)
      const errorMessage = mapAuthError(err)
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <div className="flex justify-center mb-4">
              <div className="h-12 w-12 rounded-lg bg-green-100 dark:bg-green-950 flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <CardTitle className="text-2xl text-center">Check your email</CardTitle>
            <CardDescription className="text-center">
              We've sent a password reset link to your email address.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-4">
                Didn't receive the email? Check your spam folder or try again.
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  setIsSuccess(false)
                  form.reset()
                }}
                className="w-full"
              >
                Try again
              </Button>
            </div>
            <div className="text-center">
              <Link
                to="/login"
                className="inline-flex items-center text-sm text-primary hover:underline"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to sign in
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex justify-center mb-4">
            <div className="h-12 w-12 rounded-lg bg-primary flex items-center justify-center">
              <Workflow className="h-6 w-6 text-primary-foreground" />
            </div>
          </div>
          <CardTitle className="text-2xl text-center">Forgot your password?</CardTitle>
          <CardDescription className="text-center">
            Enter your email address and we'll send you a link to reset your password.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                rules={{
                  required: 'Email is required',
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: 'Invalid email address',
                  },
                }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email address</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="Enter your email"
                        autoComplete="email"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending reset link...
                  </>
                ) : (
                  'Send reset link'
                )}
              </Button>
            </form>
          </Form>

          <div className="text-center">
            <Link
              to="/login"
              className="inline-flex items-center text-sm text-primary hover:underline"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to sign in
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
