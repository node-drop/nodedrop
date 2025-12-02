import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { CredentialSelector } from '@/components/credential/CredentialSelector'
import { useCredentialStore } from '@/stores'

// Mock the credential store
vi.mock('@/stores', () => ({
  useCredentialStore: vi.fn()
}))

// Mock the credential modal
vi.mock('@/components/credential/CredentialModal', () => ({
  CredentialModal: ({ onSave, onClose }: any) => (
    <div data-testid="credential-modal">
      <button onClick={() => onSave({ id: 'new-cred', name: 'New Credential', type: 'apiKey' })}>
        Save
      </button>
      <button onClick={onClose}>Close</button>
    </div>
  )
}))

const mockCredentials = [
  { id: 'cred-1', name: 'Test API Key', type: 'apiKey', userId: 'user-1', createdAt: '2023-01-01', updatedAt: '2023-01-01' },
  { id: 'cred-2', name: 'Another API Key', type: 'apiKey', userId: 'user-1', createdAt: '2023-01-01', updatedAt: '2023-01-01' },
  { id: 'cred-3', name: 'HTTP Auth', type: 'httpBasicAuth', userId: 'user-1', createdAt: '2023-01-01', updatedAt: '2023-01-01' }
]

const mockCredentialTypes = [
  {
    name: 'apiKey',
    displayName: 'API Key',
    description: 'API key authentication',
    properties: [
      { displayName: 'API Key', name: 'apiKey', type: 'password' as const, required: true }
    ]
  }
]

const mockStore = {
  credentials: mockCredentials,
  credentialTypes: mockCredentialTypes,
  fetchCredentials: vi.fn(),
  fetchCredentialTypes: vi.fn(),
  getCredentialsByType: vi.fn((type: string) => mockCredentials.filter(c => c.type === type))
}

describe('CredentialSelector', () => {
  beforeEach(() => {
    vi.mocked(useCredentialStore).mockReturnValue(mockStore as any)
  })

  it('should render credential selector with placeholder', () => {
    const onChange = vi.fn()
    
    render(
      <CredentialSelector
        credentialType="apiKey"
        onChange={onChange}
      />
    )

    expect(screen.getByText('Select credential...')).toBeInTheDocument()
  })

  it('should show selected credential name', () => {
    const onChange = vi.fn()
    
    render(
      <CredentialSelector
        credentialType="apiKey"
        value="cred-1"
        onChange={onChange}
      />
    )

    expect(screen.getByText('Test API Key')).toBeInTheDocument()
  })

  it('should open dropdown when clicked', async () => {
    const onChange = vi.fn()
    
    render(
      <CredentialSelector
        credentialType="apiKey"
        onChange={onChange}
      />
    )

    fireEvent.click(screen.getByRole('button'))

    await waitFor(() => {
      expect(screen.getByText('Test API Key')).toBeInTheDocument()
      expect(screen.getByText('Another API Key')).toBeInTheDocument()
      expect(screen.getByText('Create new credential')).toBeInTheDocument()
    })
  })

  it('should filter credentials by type', async () => {
    const onChange = vi.fn()
    
    render(
      <CredentialSelector
        credentialType="apiKey"
        onChange={onChange}
      />
    )

    fireEvent.click(screen.getByRole('button'))

    await waitFor(() => {
      expect(screen.getByText('Test API Key')).toBeInTheDocument()
      expect(screen.getByText('Another API Key')).toBeInTheDocument()
      expect(screen.queryByText('HTTP Auth')).not.toBeInTheDocument()
    })
  })

  it('should call onChange when credential is selected', async () => {
    const onChange = vi.fn()
    
    render(
      <CredentialSelector
        credentialType="apiKey"
        onChange={onChange}
      />
    )

    fireEvent.click(screen.getByRole('button'))

    await waitFor(() => {
      fireEvent.click(screen.getByText('Test API Key'))
    })

    expect(onChange).toHaveBeenCalledWith('cred-1')
  })

  it('should show "No credential" option when not required', async () => {
    const onChange = vi.fn()
    
    render(
      <CredentialSelector
        credentialType="apiKey"
        onChange={onChange}
        required={false}
      />
    )

    fireEvent.click(screen.getByRole('button'))

    await waitFor(() => {
      expect(screen.getByText('No credential')).toBeInTheDocument()
    })
  })

  it('should not show "No credential" option when required', async () => {
    const onChange = vi.fn()
    
    render(
      <CredentialSelector
        credentialType="apiKey"
        onChange={onChange}
        required={true}
      />
    )

    fireEvent.click(screen.getByRole('button'))

    await waitFor(() => {
      expect(screen.queryByText('No credential')).not.toBeInTheDocument()
    })
  })

  it('should show error message', () => {
    const onChange = vi.fn()
    
    render(
      <CredentialSelector
        credentialType="apiKey"
        onChange={onChange}
        error="This field is required"
      />
    )

    expect(screen.getByText('This field is required')).toBeInTheDocument()
  })

  it('should open credential modal when "Create new credential" is clicked', async () => {
    const onChange = vi.fn()
    
    render(
      <CredentialSelector
        credentialType="apiKey"
        onChange={onChange}
      />
    )

    fireEvent.click(screen.getByRole('button'))

    await waitFor(() => {
      fireEvent.click(screen.getByText('Create new credential'))
    })

    expect(screen.getByTestId('credential-modal')).toBeInTheDocument()
  })

  it('should handle credential creation from modal', async () => {
    const onChange = vi.fn()
    
    render(
      <CredentialSelector
        credentialType="apiKey"
        onChange={onChange}
      />
    )

    fireEvent.click(screen.getByRole('button'))

    await waitFor(() => {
      fireEvent.click(screen.getByText('Create new credential'))
    })

    fireEvent.click(screen.getByText('Save'))

    expect(onChange).toHaveBeenCalledWith('new-cred')
  })
})
