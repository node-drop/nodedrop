import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import { CredentialRotationModal } from '@/components/credential/CredentialRotationModal'
import { useCredentialStore } from '@/stores'

// Mock the store
vi.mock('@/stores', () => ({
  useCredentialStore: vi.fn()
}))

const mockCredential = {
  id: '1',
  name: 'Test API Key',
  type: 'apiKey',
  userId: 'user1',
  expiresAt: new Date(Date.now() + 86400000).toISOString(), // expires tomorrow
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
}

const mockCredentialType = {
  name: 'apiKey',
  displayName: 'API Key',
  description: 'API key for service authentication',
  properties: [
    {
      displayName: 'API Key',
      name: 'apiKey',
      type: 'password' as const,
      required: true,
      description: 'Your API key',
      placeholder: 'Enter API key'
    },
    {
      displayName: 'Header Name',
      name: 'headerName',
      type: 'string' as const,
      required: false,
      default: 'Authorization',
      description: 'Header name for the API key',
      placeholder: 'Authorization'
    }
  ]
}

const mockStore = {
  credentialTypes: [mockCredentialType],
  rotateCredential: vi.fn(),
  fetchCredentialTypes: vi.fn(),
  isLoading: false
}

describe('CredentialRotationModal', () => {
  const mockOnClose = vi.fn()
  const mockOnRotate = vi.fn()

  beforeEach(() => {
    vi.mocked(useCredentialStore).mockReturnValue(mockStore)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('renders rotation modal with credential info', () => {
    render(
      <CredentialRotationModal
        credential={mockCredential}
        onClose={mockOnClose}
        onRotate={mockOnRotate}
      />
    )

    expect(screen.getByText('Rotate Credential')).toBeInTheDocument()
    expect(screen.getByText('Update "Test API Key" with new values')).toBeInTheDocument()
  })

  it('displays expiration warning for expiring credential', () => {
    render(
      <CredentialRotationModal
        credential={mockCredential}
        onClose={mockOnClose}
        onRotate={mockOnRotate}
      />
    )

    expect(screen.getByText('Credential Status')).toBeInTheDocument()
    expect(screen.getByText(/expires in \d+ day/)).toBeInTheDocument()
  })

  it('displays expired warning for expired credential', () => {
    const expiredCredential = {
      ...mockCredential,
      expiresAt: new Date(Date.now() - 86400000).toISOString() // expired yesterday
    }

    render(
      <CredentialRotationModal
        credential={expiredCredential}
        onClose={mockOnClose}
        onRotate={mockOnRotate}
      />
    )

    expect(screen.getByText('This credential has expired')).toBeInTheDocument()
  })

  it('renders form fields based on credential type', () => {
    render(
      <CredentialRotationModal
        credential={mockCredential}
        onClose={mockOnClose}
        onRotate={mockOnRotate}
      />
    )

    expect(screen.getByLabelText(/API Key/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Header Name/)).toBeInTheDocument()
  })

  it('validates required fields', async () => {
    render(
      <CredentialRotationModal
        credential={mockCredential}
        onClose={mockOnClose}
        onRotate={mockOnRotate}
      />
    )

    const rotateButton = screen.getByText('Rotate Credential')
    fireEvent.click(rotateButton)

    await waitFor(() => {
      expect(screen.getByText('API Key is required')).toBeInTheDocument()
    })

    expect(mockStore.rotateCredential).not.toHaveBeenCalled()
  })

  it('calls rotateCredential with form data when valid', async () => {
    mockStore.rotateCredential.mockResolvedValue(mockCredential)

    render(
      <CredentialRotationModal
        credential={mockCredential}
        onClose={mockOnClose}
        onRotate={mockOnRotate}
      />
    )

    // Fill in required field
    const apiKeyInput = screen.getByLabelText(/API Key/)
    fireEvent.change(apiKeyInput, { target: { value: 'new-api-key-123' } })

    const rotateButton = screen.getByText('Rotate Credential')
    fireEvent.click(rotateButton)

    await waitFor(() => {
      expect(mockStore.rotateCredential).toHaveBeenCalledWith('1', {
        apiKey: 'new-api-key-123',
        headerName: ''
      })
    })
  })

  it('shows success message after successful rotation', async () => {
    mockStore.rotateCredential.mockResolvedValue(mockCredential)

    render(
      <CredentialRotationModal
        credential={mockCredential}
        onClose={mockOnClose}
        onRotate={mockOnRotate}
      />
    )

    // Fill in required field
    const apiKeyInput = screen.getByLabelText(/API Key/)
    fireEvent.change(apiKeyInput, { target: { value: 'new-api-key-123' } })

    const rotateButton = screen.getByText('Rotate Credential')
    fireEvent.click(rotateButton)

    await waitFor(() => {
      expect(screen.getByText('Credential Rotated Successfully')).toBeInTheDocument()
    })

    // Should call onRotate after success
    await waitFor(() => {
      expect(mockOnRotate).toHaveBeenCalled()
    }, { timeout: 3000 })
  })

  it('displays error message on rotation failure', async () => {
    const errorMessage = 'Failed to rotate credential'
    mockStore.rotateCredential.mockRejectedValue(new Error(errorMessage))

    render(
      <CredentialRotationModal
        credential={mockCredential}
        onClose={mockOnClose}
        onRotate={mockOnRotate}
      />
    )

    // Fill in required field
    const apiKeyInput = screen.getByLabelText(/API Key/)
    fireEvent.change(apiKeyInput, { target: { value: 'new-api-key-123' } })

    const rotateButton = screen.getByText('Rotate Credential')
    fireEvent.click(rotateButton)

    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument()
    })

    expect(mockOnRotate).not.toHaveBeenCalled()
  })

  it('handles different input types correctly', () => {
    const credentialTypeWithVariousInputs = {
      ...mockCredentialType,
      properties: [
        ...mockCredentialType.properties,
        {
          displayName: 'Port',
          name: 'port',
          type: 'number' as const,
          required: false,
          description: 'Port number'
        },
        {
          displayName: 'Enable SSL',
          name: 'enableSsl',
          type: 'boolean' as const,
          required: false,
          description: 'Enable SSL connection'
        },
        {
          displayName: 'Environment',
          name: 'environment',
          type: 'options' as const,
          required: false,
          options: [
            { name: 'Development', value: 'dev' },
            { name: 'Production', value: 'prod' }
          ]
        }
      ]
    }

    const storeWithVariousInputs = {
      ...mockStore,
      credentialTypes: [credentialTypeWithVariousInputs]
    }
    vi.mocked(useCredentialStore).mockReturnValue(storeWithVariousInputs)

    render(
      <CredentialRotationModal
        credential={mockCredential}
        onClose={mockOnClose}
        onRotate={mockOnRotate}
      />
    )

    expect(screen.getByLabelText(/Port/)).toHaveAttribute('type', 'number')
    expect(screen.getByLabelText(/Enable SSL/)).toHaveAttribute('type', 'checkbox')
    expect(screen.getByLabelText(/Environment/)).toBeInTheDocument()
  })

  it('closes modal when close button is clicked', () => {
    render(
      <CredentialRotationModal
        credential={mockCredential}
        onClose={mockOnClose}
        onRotate={mockOnRotate}
      />
    )

    const closeButton = screen.getByRole('button', { name: /close/i })
    fireEvent.click(closeButton)

    expect(mockOnClose).toHaveBeenCalled()
  })

  it('closes modal when cancel button is clicked', () => {
    render(
      <CredentialRotationModal
        credential={mockCredential}
        onClose={mockOnClose}
        onRotate={mockOnRotate}
      />
    )

    const cancelButton = screen.getByText('Cancel')
    fireEvent.click(cancelButton)

    expect(mockOnClose).toHaveBeenCalled()
  })

  it('fetches credential types if not loaded', () => {
    const storeWithoutTypes = {
      ...mockStore,
      credentialTypes: []
    }
    vi.mocked(useCredentialStore).mockReturnValue(storeWithoutTypes)

    render(
      <CredentialRotationModal
        credential={mockCredential}
        onClose={mockOnClose}
        onRotate={mockOnRotate}
      />
    )

    expect(mockStore.fetchCredentialTypes).toHaveBeenCalled()
  })

  it('shows loading state when credential types are not available', () => {
    const storeWithoutTypes = {
      ...mockStore,
      credentialTypes: []
    }
    vi.mocked(useCredentialStore).mockReturnValue(storeWithoutTypes)

    render(
      <CredentialRotationModal
        credential={mockCredential}
        onClose={mockOnClose}
        onRotate={mockOnRotate}
      />
    )

    expect(screen.getByText('Loading credential type...')).toBeInTheDocument()
  })

  it('disables rotate button when loading', () => {
    const loadingStore = {
      ...mockStore,
      isLoading: true
    }
    vi.mocked(useCredentialStore).mockReturnValue(loadingStore)

    render(
      <CredentialRotationModal
        credential={mockCredential}
        onClose={mockOnClose}
        onRotate={mockOnRotate}
      />
    )

    const rotateButton = screen.getByText('Rotate Credential')
    expect(rotateButton).toBeDisabled()
  })
})
