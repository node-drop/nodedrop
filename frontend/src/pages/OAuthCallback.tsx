import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { apiClient } from '@/services/api'
import { CheckCircle, Loader2, XCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'

export function OAuthCallback() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')

  // Check if we're in a popup window
  const isPopup = window.opener && !window.opener.closed

  useEffect(() => {
    const handleOAuthCallback = async () => {
      try {
        const code = searchParams.get('code')
        const state = searchParams.get('state') // encoded state with credential info
        const error = searchParams.get('error')
        const errorDescription = searchParams.get('error_description')

        if (error) {
          const fullError = errorDescription 
            ? `${error}: ${errorDescription}` 
            : `OAuth error: ${error}`
          throw new Error(fullError)
        }

        if (!code || !state) {
          throw new Error('Missing authorization code or state')
        }

        // Exchange code for tokens - backend will decode state and create/update credential
        const response = await apiClient.post('/oauth/google/callback', {
          code,
          state, // Pass the encoded state
        })

        if (response.success) {
          setStatus('success')
          setMessage('Successfully authenticated with Google!')
          
          if (isPopup) {
            // Send success message to parent window
            window.opener.postMessage(
              { 
                type: 'oauth-success',
                credential: response.data?.credential 
              },
              window.location.origin
            )
            
            // Show success briefly before closing
            setTimeout(() => {
              window.close()
            }, 1500)
          } else {
            toast.success('Google authentication successful')
            
            // Redirect to credentials page after a short delay
            setTimeout(() => {
              navigate('/credentials')
            }, 2000)
          }
        } else {
          throw new Error(response.error?.message || 'Failed to authenticate')
        }
      } catch (error: any) {
        console.error('OAuth callback error:', error)
        setStatus('error')
        
        // Extract error message from various possible error formats
        const errorMessage = 
          error.response?.data?.error?.message ||  // API error format
          error.response?.data?.message ||          // Alternative API format
          error.message ||                          // JavaScript Error
          'Authentication failed'                   // Fallback
        
        setMessage(errorMessage)
        
        if (isPopup) {
          // Send error message to parent window
          window.opener.postMessage(
            { 
              type: 'oauth-error',
              error: errorMessage
            },
            window.location.origin
          )
          
          // Keep popup open for errors so user can see what went wrong
          setTimeout(() => {
            if (window.confirm('Close this window?')) {
              window.close()
            }
          }, 3000)
        } else {
          toast.error('Failed to authenticate with Google')
        }
      }
    }

    handleOAuthCallback()
  }, [searchParams, navigate, isPopup])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            {status === 'loading' && (
              <>
                <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                <span>Authenticating...</span>
              </>
            )}
            {status === 'success' && (
              <>
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span>Authentication Successful</span>
              </>
            )}
            {status === 'error' && (
              <>
                <XCircle className="w-5 h-5 text-red-600" />
                <span>Authentication Failed</span>
              </>
            )}
          </CardTitle>
          <CardDescription>
            {status === 'loading' && 'Completing Google OAuth2 authentication...'}
            {status === 'success' && (isPopup 
              ? 'Closing this window...' 
              : 'Your Google Sheets credentials are now configured.'
            )}
            {status === 'error' && 'There was a problem with the authentication.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {message && (
            <div className={`p-3 rounded-lg mb-4 ${
              status === 'success' ? 'bg-green-50 text-green-800' :
              status === 'error' ? 'bg-red-50 text-red-800' :
              'bg-blue-50 text-blue-800'
            }`}>
              {message}
            </div>
          )}
          
          {status === 'success' && !isPopup && (
            <p className="text-sm text-gray-600 mb-4">
              Redirecting you to the credentials page...
            </p>
          )}
          
          {status === 'error' && (
            <div className="space-y-3">
              <p className="text-sm text-gray-600">
                {message.includes('redirect_uri_mismatch') ? (
                  <>
                    <strong>How to fix:</strong> In your Google Cloud Console, make sure 
                    your Authorized redirect URI is exactly: 
                    <code className="block mt-2 p-2 bg-gray-100 rounded text-xs">
                      {window.location.origin}/oauth/callback
                    </code>
                  </>
                ) : (
                  'Please try again or contact support if the problem persists.'
                )}
              </p>
              {!isPopup && (
                <div className="flex space-x-2">
                  <Button
                    onClick={() => navigate('/credentials')}
                    variant="default"
                    className="flex-1"
                  >
                    Go to Credentials
                  </Button>
                  <Button
                    onClick={() => window.location.reload()}
                    variant="outline"
                    className="flex-1"
                  >
                    Retry
                  </Button>
                </div>
              )}
              {isPopup && (
                <Button
                  onClick={() => window.close()}
                  variant="outline"
                  className="w-full"
                >
                  Close Window
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
