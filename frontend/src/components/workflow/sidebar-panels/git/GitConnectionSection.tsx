/**
 * GitConnectionSection Component
 * 
 * Component for Git connection management. Displays connection form when not connected,
 * and repository information with disconnect option when connected.
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.5, 5.1, 5.4
 */

import { memo, useState, useEffect } from 'react'
import { useNavigate } from 'react-router'
import { GitBranch, Loader2, CheckCircle2, AlertCircle, ExternalLink, Edit, RefreshCw, Plus } from 'lucide-react'
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
import { GitRepositoryInfo, GitCredential, GitService } from '@/services/git.service'

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
  const navigate = useNavigate()

  // Git service instance
  const gitService = new GitService()

  // Form state
  const [repositoryUrl, setRepositoryUrl] = useState('')
  const [branch, setBranch] = useState('main')
  const [selectedCredentialId, setSelectedCredentialId] = useState('')

  // Credentials state
  const [credentials, setCredentials] = useState<GitCredential[]>([])
  const [isLoadingCredentials, setIsLoadingCredentials] = useState(false)
  const [credentialsError, setCredentialsError] = useState<string | null>(null)

  // Edit mode state
  const [isEditMode, setIsEditMode] = useState(false)

  // Local error state for validation
  const [validationError, setValidationError] = useState<string | null>(null)

  // Fetch credentials on mount
  useEffect(() => {
    fetchCredentials()
  }, [])

  // Fetch available Git credentials
  const fetchCredentials = async () => {
    setIsLoadingCredentials(true)
    setCredentialsError(null)
    try {
      const creds = await gitService.getGitCredentials()
      setCredentials(creds)
      
      // Auto-select first credential if available
      if (creds.length > 0 && !selectedCredentialId) {
        setSelectedCredentialId(creds[0].id)
      }
    } catch (error: any) {
      console.error('Failed to fetch credentials:', error)
      setCredentialsError(error.message || 'Failed to load Git credentials')
    } finally {
      setIsLoadingCredentials(false)
    }
  }

  // Handle form submission
  const handleConnect = async () => {
    // Clear previous errors
    setValidationError(null)

    // Validate inputs
    if (!repositoryUrl.trim()) {
      setValidationError('Repository URL is required')
      return
    }

    if (!selectedCredentialId) {
      setValidationError('Please select a Git credential')
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
        credentialId: selectedCredentialId,
      })

      // Success - form will be hidden as component switches to connected view
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

  // Handle edit credentials
  const handleEditCredentials = () => {
    // Pre-fill form with current connection info
    if (repositoryInfo) {
      setRepositoryUrl(repositoryInfo.repositoryUrl)
      setBranch(repositoryInfo.branch)
    }
    setIsEditMode(true)
  }

  // Handle cancel edit
  const handleCancelEdit = () => {
    setIsEditMode(false)
    setSelectedCredentialId('')
    setValidationError(null)
  }

  // Handle update credentials
  const handleUpdateCredentials = async () => {
    // Clear previous errors
    setValidationError(null)

    // Validate credential selection
    if (!selectedCredentialId) {
      setValidationError('Please select a Git credential')
      return
    }

    try {
      // Reconnect with new credentials (this updates the existing connection)
      await connectRepository(workflowId, {
        repositoryUrl: repositoryUrl.trim(),
        branch: branch.trim() || 'main',
        credentialId: selectedCredentialId,
      })

      // Clear form and exit edit mode on success
      setSelectedCredentialId('')
      setIsEditMode(false)
    } catch (error) {
      // Error is handled by the store
      console.error('Credential update failed:', error)
    }
  }

  // Get credential display info
  const getCredentialIcon = (type: string) => {
    if (type.includes('github')) return '🐙'
    if (type.includes('gitlab')) return '🦊'
    if (type.includes('bitbucket')) return '🪣'
    return '🔐'
  }

  const getCredentialLabel = (type: string) => {
    if (type === 'githubOAuth2') return 'GitHub OAuth2'
    if (type === 'githubPAT') return 'GitHub PAT'
    if (type === 'gitlabOAuth2') return 'GitLab OAuth2'
    if (type === 'gitlabPAT') return 'GitLab PAT'
    if (type === 'bitbucketOAuth2') return 'Bitbucket OAuth2'
    if (type === 'bitbucketPAT') return 'Bitbucket App Password'
    return type
  }

  const isCredentialExpired = (credential: GitCredential) => {
    if (!credential.expiresAt) return false
    return new Date(credential.expiresAt) < new Date()
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

          {/* Credential selector */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="edit-credential" className="text-xs">
                Git Credential <span className="text-destructive">*</span>
              </Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={fetchCredentials}
                disabled={isLoadingCredentials || isConnecting}
                className="h-6 px-2"
              >
                <RefreshCw className={`h-3 w-3 ${isLoadingCredentials ? 'animate-spin' : ''}`} />
              </Button>
            </div>

            {isLoadingCredentials ? (
              <div className="flex items-center justify-center p-4 border rounded-lg">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                <span className="ml-2 text-xs text-muted-foreground">Loading credentials...</span>
              </div>
            ) : credentials.length === 0 ? (
              <div className="p-4 border rounded-lg bg-muted/30 space-y-2">
                <p className="text-xs text-muted-foreground">No Git credentials found.</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/credentials?type=git')}
                  className="w-full"
                >
                  <Plus className="mr-2 h-3 w-3" />
                  Create Git Credential
                </Button>
              </div>
            ) : (
              <Select
                value={selectedCredentialId}
                onValueChange={setSelectedCredentialId}
                disabled={isConnecting}
              >
                <SelectTrigger id="edit-credential" className="text-xs">
                  <SelectValue placeholder="Select a credential..." />
                </SelectTrigger>
                <SelectContent>
                  {credentials.map((cred) => (
                    <SelectItem
                      key={cred.id}
                      value={cred.id}
                      disabled={isCredentialExpired(cred)}
                      className="text-xs"
                    >
                      <span className="flex items-center gap-2">
                        <span>{getCredentialIcon(cred.type)}</span>
                        <span>{cred.name}</span>
                        <span className="text-muted-foreground">({getCredentialLabel(cred.type)})</span>
                        {isCredentialExpired(cred) && (
                          <span className="text-destructive">- EXPIRED</span>
                        )}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {selectedCredentialId && credentials.length > 0 && (
              <div className="p-2 border rounded-lg bg-muted/30 text-xs">
                {(() => {
                  const selected = credentials.find(c => c.id === selectedCredentialId)
                  if (!selected) return null
                  return (
                    <div className="space-y-1">
                      <p><strong>Type:</strong> {getCredentialLabel(selected.type)}</p>
                      {selected.expiresAt && (
                        <p><strong>Expires:</strong> {new Date(selected.expiresAt).toLocaleDateString()}</p>
                      )}
                      {!selected.isOwner && (
                        <p className="text-blue-600">🔗 Shared with you ({selected.permission})</p>
                      )}
                    </div>
                  )
                })()}
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            <Button
              onClick={handleUpdateCredentials}
              disabled={isConnecting || !selectedCredentialId}
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

        {/* Credential selector */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="credential" className="text-xs">
              Git Credential <span className="text-destructive">*</span>
            </Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={fetchCredentials}
              disabled={isLoadingCredentials || isConnecting || readOnly}
              className="h-6 px-2"
            >
              <RefreshCw className={`h-3 w-3 ${isLoadingCredentials ? 'animate-spin' : ''}`} />
            </Button>
          </div>

          {credentialsError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">{credentialsError}</AlertDescription>
            </Alert>
          )}

          {isLoadingCredentials ? (
            <div className="flex items-center justify-center p-4 border rounded-lg">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              <span className="ml-2 text-xs text-muted-foreground">Loading credentials...</span>
            </div>
          ) : credentials.length === 0 ? (
            <div className="p-4 border rounded-lg bg-muted/30 space-y-2">
              <p className="text-xs text-muted-foreground">No Git credentials found.</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => navigate('/credentials?type=git')}
                className="w-full"
              >
                <Plus className="mr-2 h-3 w-3" />
                Create Git Credential
              </Button>
            </div>
          ) : (
            <>
              <Select
                value={selectedCredentialId}
                onValueChange={setSelectedCredentialId}
                disabled={isConnecting || readOnly}
              >
                <SelectTrigger id="credential" className="text-xs">
                  <SelectValue placeholder="Select a credential..." />
                </SelectTrigger>
                <SelectContent>
                  {credentials.map((cred) => (
                    <SelectItem
                      key={cred.id}
                      value={cred.id}
                      disabled={isCredentialExpired(cred)}
                      className="text-xs"
                    >
                      <span className="flex items-center gap-2">
                        <span>{getCredentialIcon(cred.type)}</span>
                        <span>{cred.name}</span>
                        <span className="text-muted-foreground">({getCredentialLabel(cred.type)})</span>
                        {isCredentialExpired(cred) && (
                          <span className="text-destructive">- EXPIRED</span>
                        )}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => navigate('/credentials?type=git')}
                className="w-full"
              >
                <Plus className="mr-2 h-3 w-3" />
                Create New Credential
              </Button>
            </>
          )}

          {selectedCredentialId && credentials.length > 0 && (
            <div className="p-3 border rounded-lg bg-muted/30 text-xs space-y-1">
              {(() => {
                const selected = credentials.find(c => c.id === selectedCredentialId)
                if (!selected) return null
                return (
                  <>
                    <p><strong>Credential:</strong> {selected.name}</p>
                    <p><strong>Type:</strong> {getCredentialLabel(selected.type)}</p>
                    {selected.expiresAt && (
                      <p><strong>Expires:</strong> {new Date(selected.expiresAt).toLocaleDateString()}</p>
                    )}
                    {!selected.isOwner && (
                      <p className="text-blue-600">🔗 Shared with you ({selected.permission})</p>
                    )}
                  </>
                )
              })()}
            </div>
          )}
        </div>

        {/* Connect button */}
        <Button
          onClick={handleConnect}
          disabled={isConnecting || readOnly || !selectedCredentialId || credentials.length === 0}
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
          <p className="text-xs font-semibold">About Git Credentials</p>
          <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
            <li>Select from your saved Git credentials (OAuth2 or Personal Access Token)</li>
            <li>Credentials are securely encrypted and stored</li>
            <li>You can reuse the same credential across multiple workflows</li>
            <li>Credentials can be shared with team members</li>
          </ul>
          
          <p className="text-xs font-semibold mt-3">Need to create a credential?</p>
          <p className="text-xs text-muted-foreground">
            Click "Create New Credential" above to set up GitHub, GitLab, or Bitbucket authentication.
            You can use OAuth2 for easy setup or Personal Access Tokens for more control.
          </p>
        </div>
      </div>
    </div>
  )
})
