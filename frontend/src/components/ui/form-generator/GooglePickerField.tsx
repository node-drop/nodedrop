import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { X } from 'lucide-react'
import { useEffect, useState } from 'react'

interface GooglePickerFieldProps {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  error?: string
  credentialId?: string
  pickerType?: 'sheets' | 'drive' | 'both'
  field?: any
  authentication?: string // From dependsOn
}

interface GoogleFile {
  id: string
  name: string
  mimeType: string
}

export function GooglePickerField({
  value,
  onChange,
  disabled = false,
  error,
  credentialId,
  pickerType = 'sheets',
  field,
  authentication,
}: GooglePickerFieldProps) {
  const [inputValue, setInputValue] = useState(value)
  const [files, setFiles] = useState<GoogleFile[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<GoogleFile | null>(null)

  // Use authentication from dependsOn if credentialId not provided
  const effectiveCredentialId = credentialId || authentication

  // Load files from Google Drive when component mounts or credential changes
  useEffect(() => {
    if (effectiveCredentialId) {
      loadFiles()
    }
  }, [effectiveCredentialId])

  // Update selected file when value changes
  useEffect(() => {
    if (value && files.length > 0) {
      const file = files.find(f => f.id === value)
      setSelectedFile(file || null)
    }
  }, [value, files])

  const loadFiles = async () => {
    setIsLoading(true)
    setLoadError(null)
    try {
      const response = await fetch(`/api/credentials/${effectiveCredentialId}/access-token`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      })

      if (!response.ok) {
        throw new Error('Failed to get access token')
      }

      const { accessToken } = await response.json()

      // Query Google Drive API for files
      const mimeType = pickerType === 'sheets' 
        ? 'application/vnd.google-apps.spreadsheet'
        : pickerType === 'drive'
        ? 'application/vnd.google-apps.document'
        : undefined

      const query = mimeType 
        ? `mimeType='${mimeType}' and trashed=false`
        : `(mimeType='application/vnd.google-apps.spreadsheet' or mimeType='application/vnd.google-apps.document') and trashed=false`

      const driveResponse = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&spaces=drive&fields=files(id,name,mimeType)&pageSize=100&orderBy=modifiedTime%20desc`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      )

      if (!driveResponse.ok) {
        throw new Error('Failed to load files from Google Drive')
      }

      const data = await driveResponse.json()
      setFiles(data.files || [])
    } catch (err: any) {
      setLoadError(err.message)
      console.error('Error loading files:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSelectFile = (fileId: string) => {
    onChange(fileId)
    setInputValue(fileId)
  }

  const handleIdChange = () => {
    onChange(inputValue)
  }

  const handleClear = () => {
    onChange('')
    setInputValue('')
    setSelectedFile(null)
  }

  const getPlaceholder = () => {
    if (pickerType === 'sheets') {
      return 'Enter Google Sheet ID'
    } else if (pickerType === 'drive') {
      return 'Enter Google Drive file ID'
    }
    return 'Enter file ID'
  }

  const getFileTypeLabel = (mimeType: string) => {
    if (mimeType === 'application/vnd.google-apps.spreadsheet') {
      return 'Sheet'
    } else if (mimeType === 'application/vnd.google-apps.document') {
      return 'Doc'
    }
    return 'File'
  }

  return (
    <div className="space-y-3">
      {/* Two column layout: Dropdown on left, ID input on right */}
      <div className="grid grid-cols-2 gap-3">
        {/* Left: Dropdown with file list */}
        <div className="space-y-2">
          <label className="text-xs font-medium">From List</label>
          {isLoading ? (
            <div className="text-sm text-muted-foreground p-2 border rounded">
              Loading files...
            </div>
          ) : loadError ? (
            <div className="text-sm text-destructive p-2 border rounded">
              {loadError}
            </div>
          ) : files.length > 0 ? (
            <Select value={value} onValueChange={handleSelectFile} disabled={disabled}>
              <SelectTrigger className={error ? 'border-destructive' : ''}>
                <SelectValue placeholder="Select a file..." />
              </SelectTrigger>
              <SelectContent>
                {files.map((file) => (
                  <SelectItem key={file.id} value={file.id}>
                    <div className="flex items-center gap-2">
                      <span className="text-xs bg-muted px-2 py-0.5 rounded">
                        {getFileTypeLabel(file.mimeType)}
                      </span>
                      <span className="truncate max-w-xs">{file.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <div className="text-sm text-muted-foreground p-2 border rounded">
              No {pickerType === 'sheets' ? 'sheets' : 'files'} found
            </div>
          )}
          {!effectiveCredentialId && (
            <p className="text-xs text-amber-600">
              Select credentials above
            </p>
          )}
        </div>

        {/* Right: Manual ID input */}
        <div className="space-y-2">
          <label className="text-xs font-medium">By ID</label>
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={getPlaceholder()}
                className={`text-sm ${error ? 'border-destructive' : ''}`}
                disabled={disabled}
              />
              {inputValue && (
                <button
                  type="button"
                  onClick={() => setInputValue('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  disabled={disabled}
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <Button
              type="button"
              onClick={handleIdChange}
              disabled={disabled || !inputValue}
              size="sm"
              variant="default"
              className="px-3"
            >
              Set
            </Button>
          </div>
        </div>
      </div>

      {/* Current value display */}
      {value && (
        <div className="flex items-center justify-between bg-muted p-2 rounded text-sm">
          <div className="flex items-center gap-2 min-w-0">
            {selectedFile && (
              <span className="text-xs bg-background px-2 py-0.5 rounded">
                {getFileTypeLabel(selectedFile.mimeType)}
              </span>
            )}
            <span className="truncate font-mono text-xs">{selectedFile?.name || value}</span>
          </div>
          <button
            type="button"
            onClick={handleClear}
            className="text-muted-foreground hover:text-foreground ml-2 flex-shrink-0"
            disabled={disabled}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}
