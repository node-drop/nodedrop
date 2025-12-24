/**
 * GitConnectionSection Component
 * 
 * Component for Git connection management. Displays connection form when not connected,
 * and repository information with disconnect option when connected.
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.5, 5.1, 5.4
 */

import { memo, useState } from 'react'
import { GitBranch, Eye, EyeOff, Loader2, CheckCircle2, AlertCircle, ExternalLink, Edit } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useGitStore } from '@/stores/git'
import { GitRepositoryInfo, GitCredentialType, GitProvider } from '@/services/git.service'

interface GitConnectionSectionProps {
  workflowId: string
  connected: boolean
  repositoryInfo?: GitRepositoryInfo
  readOnly?: boolean
}

export const GitConnectionSection = memo(function GitConnectionSection({
  workflowId,
  connected,
  repositoryInfo,
  readOnly = false
}: GitConnectionSectionProps) {
  const { connectRepository, disconnectRepository, isConnecting, connectionError } = useGitStore()

  // Form state
  const [repositoryUrl, setRepositoryUrl] = useState('')
  const [credentialType, setCredentialType] = useState<GitCredentialType>('personal_access_token')
  const [provider, setProvider] = useState<GitProvider>('github')
  const [token, setToken] = useState('')
  const [showToken, setShowToken] = useState(false)
  const [branch, setBranch] = useState('main')

  // Edit mode state
  const [isEditMode, setIsEditMode] = useState(false)

  // Local error state for validation
  const [validationError, setValidationError] = useState<string | null>(null)

  // Handle form submission
  const handleConnect = async () => {
    // Clear previous errors
    setValidationError(null)

    // Validate inputs
    if (!repositoryUrl.trim()) {
      setValidationError('Repository URL is required')
      return
    }

    if (!token.trim()) {
      setValidationError('Access token is required')
      return
    }

    // Validate URL format
    try {
      new URL(repositoryUrl)
    } catch {
      setValidationError('Invalid repository URL format')
      return
    }

    try {
      await connectRepository(workflowId, {
        repositoryUrl: repositoryUrl.trim(),
        branch: branch.trim() || 'main',
        credentials: {
          type: credentialType,
          token: token.trim(),
          provider,
        },
      })

      // Clear form on success
      setToken('')
      setShowToken(false)
    } catch (error) {
      // Error is handled by the store
      console.error('Connection failed:', error)
    }
  }

  // Handle disconnect
  const handleDisconnect = async () => {
    if (window.confirm('Are you sure you want to disconnect from this repository?')) {
      try {
        await disconnectRepository(workflowId)
      } catch (error) {
        console.error('Disconnect failed:', error)
      }
    }
  }

  // Handle OAuth flow (placeholder for future implementation)
  const handleOAuthConnect = () => {
    // TODO: Implement OAuth flow in task 11
    alert('OAuth authentication will be implemented in a future update')
  }

  // Handle edit credentials
  const handleEditCredentials = () => {
    // Pre-fill form with current connection info
    if (repositoryInfo) {
      setRepositoryUrl(repositoryInfo.repositoryUrl)
      setBranch(repositoryInfo.branch)
      // Provider would need to be stored in repositoryInfo to pre-fill
      // For now, user will need to re-select
    }
    setIsEditMode(true)
  }

  // Handle cancel edit
  const handleCancelEdit = () => {
    setIsEditMode(false)
    setToken('')
    setShowToken(false)
    setValidationError(null)
  }

  // Handle update credentials
  const handleUpdateCredentials = async () => {
    // Clear previous errors
    setValidationError(null)

    // Validate token input
    if (!token.trim()) {
      setValidationError('Access token is required to update credentials')
      return
    }

    try {
      // Reconnect with new credentials (this updates the existing connection)
      await connectRepository(workflowId, {
        repositoryUrl: repositoryUrl.trim(),
        branch: branch.trim() || 'main',
        credentials: {
          type: credentialType,
          token: token.trim(),
          provider,
        },
      })

      // Clear form and exit edit mode on success
      setToken('')
      setShowToken(false)
      setIsEditMode(false)
    } catch (error) {
      // Error is handled by the store
      console.error('Credential update failed:', error)
    }
  }

  // If connected, show repository info and disconnect option
  if (connected && repositoryInfo) {
    // If in edit mode, show credential update form
    if (isEditMode) {
      return (
        <div className="space-y-4">
          <div className="space-y-1">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Edit className="w-4 h-4" />
              Update Git Credentials
            </h3>
            <p className="text-xs text-muted-foreground">
              Update your access token or repository settings
            </p>
          </div>

          {/* Error display */}
          {(connectionError || validationError) && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                {validationError || connectionError}
              </AlertDescription>
            </Alert>
          )}

          {/* Repository info (read-only) */}
          <div className="space-y-3 p-3 border rounded-lg bg-muted/30">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Repository URL</Label>
              <p className="text-xs font-mono break-all">{repositoryUrl}</p>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Branch</Label>
              <p className="text-xs font-mono">{branch}</p>
            </div>
          </div>

          {/* Provider selector */}
          <div className="space-y-2">
            <Label htmlFor="edit-provider" className="text-xs">
              Git Provider <span className="text-destructive">*</span>
            </Label>
            <Select
              value={provider}
              onValueChange={(value) => setProvider(value as GitProvider)}
              disabled={isConnecting}
            >
              <SelectTrigger id="edit-provider" className="text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="github" className="text-xs">GitHub</SelectItem>
                <SelectItem value="gitlab" className="text-xs">GitLab</SelectItem>
                <SelectItem value="bitbucket" className="text-xs">Bitbucket</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* New token input */}
          <div className="space-y-2">
            <Label htmlFor="edit-token" className="text-xs">
              New Personal Access Token <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <Input
                id="edit-token"
                type={showToken ? 'text' : 'password'}
                placeholder="Enter your new access token"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                disabled={isConnecting}
                className="text-xs font-mono pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                onClick={() => setShowToken(!showToken)}
                disabled={isConnecting}
              >
                {showToken ? (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Eye className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Required for pushing changes to the repository
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            <Button
              onClick={handleUpdateCredentials}
              disabled={isConnecting || !token.trim()}
              className="flex-1"
              size="sm"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Credentials'
              )}
            </Button>
            <Button
              variant="outline"
              onClick={handleCancelEdit}
              disabled={isConnecting}
              size="sm"
            >
              Cancel
            </Button>
          </div>

          {/* Help text */}
          <div className="p-3 border rounded-lg bg-muted/30 space-y-2">
            <p className="text-xs font-semibold">Why update credentials?</p>
            <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
              <li>Token expired or revoked</li>
              <li>Need to change permissions</li>
              <li>Switching to a different token</li>
              <li>Security best practice (rotate tokens regularly)</li>
            </ul>
          </div>
        </div>
      )
    }

    // Normal connected view
    return (
      <div className="space-y-4">
        <div className="space-y-1">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <GitBranch className="w-4 h-4" />
            Connected Repository
          </h3>
          <p className="text-xs text-muted-foreground">
            Your workflow is connected to a Git repository
          </p>
        </div>

        {/* Connection status */}
        <Alert className="border-green-200 bg-green-50 dark:bg-green-950/20">
          <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
          <AlertDescription className="text-xs text-green-800 dark:text-green-300">
            Successfully connected to repository
          </AlertDescription>
        </Alert>

        {/* Repository information */}
        <div className="space-y-3 p-3 border rounded-lg bg-muted/30">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Repository URL</Label>
            <div className="flex items-center gap-2">
              <p className="text-xs font-mono break-all flex-1">{repositoryInfo.repositoryUrl}</p>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => window.open(repositoryInfo.repositoryUrl, '_blank')}
                title="Open in browser"
              >
                <ExternalLink className="h-3 w-3" />
              </Button>
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Current Branch</Label>
            <p className="text-xs font-mono">{repositoryInfo.branch}</p>
          </div>

          {repositoryInfo.lastSyncAt && (
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Last Sync</Label>
              <p className="text-xs">{new Date(repositoryInfo.lastSyncAt).toLocaleString()}</p>
            </div>
          )}

          {repositoryInfo.unpushedCommits > 0 && (
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Unpushed Commits</Label>
              <p className="text-xs font-semibold text-orange-600 dark:text-orange-400">
                {repositoryInfo.unpushedCommits} commit{repositoryInfo.unpushedCommits !== 1 ? 's' : ''}
              </p>
            </div>
          )}
        </div>

        {/* Disconnect button */}
        {!readOnly && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleEditCredentials}
              className="flex-1"
            >
              <Edit className="mr-2 h-3 w-3" />
              Edit Credentials
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDisconnect}
              className="flex-1"
            >
              Disconnect
            </Button>
          </div>
        )}
      </div>
    )
  }

  // Not connected - show connection form
  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <GitBranch className="w-4 h-4" />
          Connect to Git Repository
        </h3>
        <p className="text-xs text-muted-foreground">
          Connect your workflow to a Git repository for version control
        </p>
      </div>

      {/* Error display */}
      {(connectionError || validationError) && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            {validationError || connectionError}
          </AlertDescription>
        </Alert>
      )}

      {/* Connection form */}
      <div className="space-y-4">
        {/* Repository URL */}
        <div className="space-y-2">
          <Label htmlFor="repository-url" className="text-xs">
            Repository URL <span className="text-destructive">*</span>
          </Label>
          <Input
            id="repository-url"
            type="url"
            placeholder="https://github.com/username/repo.git"
            value={repositoryUrl}
            onChange={(e) => setRepositoryUrl(e.target.value)}
            disabled={isConnecting || readOnly}
            className="text-xs font-mono"
          />
          <p className="text-xs text-muted-foreground">
            The HTTPS URL of your Git repository
          </p>
        </div>

        {/* Branch name */}
        <div className="space-y-2">
          <Label htmlFor="branch" className="text-xs">
            Branch
          </Label>
          <Input
            id="branch"
            type="text"
            placeholder="main"
            value={branch}
            onChange={(e) => setBranch(e.target.value)}
            disabled={isConnecting || readOnly}
            className="text-xs"
          />
          <p className="text-xs text-muted-foreground">
            Default branch to use (defaults to 'main')
          </p>
        </div>

        {/* Provider selector */}
        <div className="space-y-2">
          <Label htmlFor="provider" className="text-xs">
            Git Provider <span className="text-destructive">*</span>
          </Label>
          <Select
            value={provider}
            onValueChange={(value) => setProvider(value as GitProvider)}
            disabled={isConnecting || readOnly}
          >
            <SelectTrigger id="provider" className="text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="github" className="text-xs">GitHub</SelectItem>
              <SelectItem value="gitlab" className="text-xs">GitLab</SelectItem>
              <SelectItem value="bitbucket" className="text-xs">Bitbucket</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Credential type selector */}
        <div className="space-y-2">
          <Label htmlFor="credential-type" className="text-xs">
            Authentication Method <span className="text-destructive">*</span>
          </Label>
          <Select
            value={credentialType}
            onValueChange={(value) => setCredentialType(value as GitCredentialType)}
            disabled={isConnecting || readOnly}
          >
            <SelectTrigger id="credential-type" className="text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="personal_access_token" className="text-xs">
                Personal Access Token
              </SelectItem>
              <SelectItem value="oauth" className="text-xs">
                OAuth (Coming Soon)
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Token input or OAuth button */}
        {credentialType === 'personal_access_token' ? (
          <div className="space-y-2">
            <Label htmlFor="token" className="text-xs">
              Personal Access Token <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <Input
                id="token"
                type={showToken ? 'text' : 'password'}
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                disabled={isConnecting || readOnly}
                className="text-xs font-mono pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                onClick={() => setShowToken(!showToken)}
                disabled={isConnecting || readOnly}
              >
                {showToken ? (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Eye className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Required for pushing changes. Private repos also need it for read access.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleOAuthConnect}
              disabled={isConnecting || readOnly}
              className="w-full"
            >
              Connect with OAuth
            </Button>
            <p className="text-xs text-muted-foreground">
              OAuth authentication will be available in a future update
            </p>
          </div>
        )}

        {/* Connect button */}
        <Button
          onClick={handleConnect}
          disabled={isConnecting || readOnly || credentialType === 'oauth'}
          className="w-full"
          size="sm"
        >
          {isConnecting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Connecting...
            </>
          ) : (
            <>
              <GitBranch className="mr-2 h-4 w-4" />
              Connect Repository
            </>
          )}
        </Button>

        {/* Help text */}
        <div className="p-3 border rounded-lg bg-muted/30 space-y-2">
          <p className="text-xs font-semibold">Why is a token required?</p>
          <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
            <li><strong>Push access:</strong> Required to push your workflow changes</li>
            <li><strong>Private repos:</strong> Required for all operations (read and write)</li>
            <li><strong>Public repos:</strong> Only validated when you push changes</li>
          </ul>
          
          <p className="text-xs font-semibold mt-3">How to get a token:</p>
          <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
            <li>
              <strong>GitHub:</strong> Settings → Developer settings → Personal access tokens → Generate new token
            </li>
            <li>
              <strong>GitLab:</strong> User Settings → Access Tokens → Add new token
            </li>
            <li>
              <strong>Bitbucket:</strong> Personal settings → App passwords → Create app password
            </li>
          </ul>
          <p className="text-xs text-muted-foreground mt-2">
            Ensure your token has repository read/write permissions.
          </p>
        </div>
      </div>
    </div>
  )
})
