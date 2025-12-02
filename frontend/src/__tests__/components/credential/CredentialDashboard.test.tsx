import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import { CredentialDashboard } from '@/components/credential/CredentialDashboard'
import { useCredentialStore } from '@/stores'

// Mock the store
vi.mock('@/stores', () => ({
  useCredentialStore: vi.fn()
}))

// Mock the modal components
vi.mock('@/components/credential/CredentialRotationModal', () => ({
  CredentialRotationModal: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="rotation-modal">
      <button onClick={onClose}>Close</button>
    </div>
  )
}))

vi.mock('@/components/credential/CredentialSharingModal', () => ({
  CredentialSharingModal: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="sharing-modal">
      <button onClick={onClose}>Close</button>
    </div>
  )
}))

vi.mock('@/components/credential/CredentialBulkOperationsModal', () => ({
  CredentialBulkOperationsModal: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="bulk-modal">
      <button onClick={onClose}>Close</button>
    </div>
  )
}))

vi.mock('@/components/credential/CredentialSecurityPoliciesModal', () => ({
  CredentialSecurityPoliciesModal: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="security-modal">
      <button onClick={onClose}>Close</button>
    </div>
  )
}))

vi.mock('@/components/credential/CredentialBackupModal', () => ({
  CredentialBackupModal: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="backup-modal">
      <button onClick={onClose}>Close</button>
    </div>
  )
}))

vi.mock('@/components/credential/CredentialUsageModal', () => ({
  CredentialUsageModal: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="usage-modal">
      <button onClick={onClose}>Close</button>
    </div>
  )
}))

vi.mock('@/components/credential/CredentialAuditModal', () => ({
  CredentialAuditModal: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="audit-modal">
      <button onClick={onClose}>Close</button>
    </div>
  )
}))

const mockCredentials = [
  {
    id: '1',
    name: 'Test API Key',
    type: 'apiKey',
    userId: 'user1',
    expiresAt: new Date(Date.now() + 86400000).toISOString(), // expires tomorrow
    lastUsedAt: new Date().toISOString(),
    usageCount: 5,
    isShared: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '2',
    name: 'Shared OAuth',
    type: 'oauth2',
    userId: 'user1',
    expiresAt: new Date(Date.now() + 86400000 * 30).toISOString(), // expires in 30 days
    lastUsedAt: new Date().toISOString(),
    usageCount: 12,
    isShared: true,
    sharedWith: ['user2', 'user3'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
]

const mockExpiringCredentials = [mockCredentials[0]] // First credential is expiring

const mockStore = {
  credentials: mockCredentials,
  expiringCredentials: mockExpiringCredentials,
  sharedCredentials: [mockCredentials[1]],
  isLoading: false,
  error: null,
  fetchCredentials: vi.fn(),
  fetchExpiringCredentials: vi.fn(),
  fetchSharedCredentials: vi.fn(),
  deleteCredential: vi.fn(),
  clearError: vi.fn()
}

describe('CredentialDashboard', () => {
  const mockOnCreateCredential = vi.fn()
  const mockOnEditCredential = vi.fn()

  beforeEach(() => {
    vi.mocked(useCredentialStore).mockReturnValue(mockStore)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('renders dashboard with credentials', () => {
    render(
      <CredentialDashboard
        onCreateCredential={mockOnCreateCredential}
        onEditCredential={mockOnEditCredential}
      />
    )

    expect(screen.getByText('Credential Management')).toBeInTheDocument()
    expect(screen.getByText('Test API Key')).toBeInTheDocument()
    expect(screen.getByText('Shared OAuth')).toBeInTheDocument()
  })

  it('displays correct stats', () => {
    render(
      <CredentialDashboard
        onCreateCredential={mockOnCreateCredential}
        onEditCredential={mockOnEditCredential}
      />
    )

    expect(screen.getByText('2')).toBeInTheDocument() // Total credentials
    expect(screen.getByText('1')).toBeInTheDocument() // Expiring credentials
    expect(screen.getByText('1')).toBeInTheDocument() // Shared credentials
  })

  it('filters credentials by search term', async () => {
    render(
      <CredentialDashboard
        onCreateCredential={mockOnCreateCredential}
        onEditCredential={mockOnEditCredential}
      />
    )

    const searchInput = screen.getByPlaceholderText('Search credentials...')
    fireEvent.change(searchInput, { target: { value: 'API' } })

    await waitFor(() => {
      expect(screen.getByText('Test API Key')).toBeInTheDocument()
      expect(screen.queryByText('Shared OAuth')).not.toBeInTheDocument()
    })
  })

  it('filters credentials by type', async () => {
    render(
      <CredentialDashboard
        onCreateCredential={mockOnCreateCredential}
        onEditCredential={mockOnEditCredential}
      />
    )

    const filterSelect = screen.getByDisplayValue('All Credentials')
    fireEvent.change(filterSelect, { target: { value: 'shared' } })

    await waitFor(() => {
      expect(screen.getByText('Shared OAuth')).toBeInTheDocument()
      expect(screen.queryByText('Test API Key')).not.toBeInTheDocument()
    })
  })

  it('selects and deselects credentials', () => {
    render(
      <CredentialDashboard
        onCreateCredential={mockOnCreateCredential}
        onEditCredential={mockOnEditCredential}
      />
    )

    const checkboxes = screen.getAllByRole('checkbox')
    const firstCredentialCheckbox = checkboxes[1] // Skip the "select all" checkbox

    fireEvent.click(firstCredentialCheckbox)
    expect(screen.getByText('1 selected')).toBeInTheDocument()
    expect(screen.getByText('Bulk Actions')).toBeInTheDocument()
  })

  it('opens rotation modal when rotation button is clicked', () => {
    render(
      <CredentialDashboard
        onCreateCredential={mockOnCreateCredential}
        onEditCredential={mockOnEditCredential}
      />
    )

    const rotationButtons = screen.getAllByTitle('Rotate credential')
    fireEvent.click(rotationButtons[0])

    expect(screen.getByTestId('rotation-modal')).toBeInTheDocument()
  })

  it('opens sharing modal when sharing button is clicked', () => {
    render(
      <CredentialDashboard
        onCreateCredential={mockOnCreateCredential}
        onEditCredential={mockOnEditCredential}
      />
    )

    const sharingButtons = screen.getAllByTitle('Share credential')
    fireEvent.click(sharingButtons[0])

    expect(screen.getByTestId('sharing-modal')).toBeInTheDocument()
  })

  it('opens bulk operations modal when bulk actions is clicked', () => {
    render(
      <CredentialDashboard
        onCreateCredential={mockOnCreateCredential}
        onEditCredential={mockOnEditCredential}
      />
    )

    // Select a credential first
    const checkboxes = screen.getAllByRole('checkbox')
    fireEvent.click(checkboxes[1])

    const bulkButton = screen.getByText('Bulk Actions')
    fireEvent.click(bulkButton)

    expect(screen.getByTestId('bulk-modal')).toBeInTheDocument()
  })

  it('opens security policies modal', () => {
    render(
      <CredentialDashboard
        onCreateCredential={mockOnCreateCredential}
        onEditCredential={mockOnEditCredential}
      />
    )

    const securityButton = screen.getByText('Security Policies')
    fireEvent.click(securityButton)

    expect(screen.getByTestId('security-modal')).toBeInTheDocument()
  })

  it('opens backup modal', () => {
    render(
      <CredentialDashboard
        onCreateCredential={mockOnCreateCredential}
        onEditCredential={mockOnEditCredential}
      />
    )

    const backupButton = screen.getByText('Backup & Recovery')
    fireEvent.click(backupButton)

    expect(screen.getByTestId('backup-modal')).toBeInTheDocument()
  })

  it('opens usage modal when usage button is clicked', () => {
    render(
      <CredentialDashboard
        onCreateCredential={mockOnCreateCredential}
        onEditCredential={mockOnEditCredential}
      />
    )

    const usageButtons = screen.getAllByTitle('View usage')
    fireEvent.click(usageButtons[0])

    expect(screen.getByTestId('usage-modal')).toBeInTheDocument()
  })

  it('opens audit modal when audit button is clicked', () => {
    render(
      <CredentialDashboard
        onCreateCredential={mockOnCreateCredential}
        onEditCredential={mockOnEditCredential}
      />
    )

    const auditButtons = screen.getAllByTitle('View audit logs')
    fireEvent.click(auditButtons[0])

    expect(screen.getByTestId('audit-modal')).toBeInTheDocument()
  })

  it('calls delete credential when delete button is clicked', async () => {
    // Mock window.confirm
    const originalConfirm = window.confirm
    window.confirm = vi.fn(() => true)

    render(
      <CredentialDashboard
        onCreateCredential={mockOnCreateCredential}
        onEditCredential={mockOnEditCredential}
      />
    )

    const deleteButtons = screen.getAllByTitle('Delete credential')
    fireEvent.click(deleteButtons[0])

    await waitFor(() => {
      expect(mockStore.deleteCredential).toHaveBeenCalledWith('1')
    })

    // Restore original confirm
    window.confirm = originalConfirm
  })

  it('displays error message when error exists', () => {
    const storeWithError = {
      ...mockStore,
      error: 'Failed to load credentials'
    }
    vi.mocked(useCredentialStore).mockReturnValue(storeWithError)

    render(
      <CredentialDashboard
        onCreateCredential={mockOnCreateCredential}
        onEditCredential={mockOnEditCredential}
      />
    )

    expect(screen.getByText('Failed to load credentials')).toBeInTheDocument()
  })

  it('displays loading state', () => {
    const loadingStore = {
      ...mockStore,
      isLoading: true,
      credentials: []
    }
    vi.mocked(useCredentialStore).mockReturnValue(loadingStore)

    render(
      <CredentialDashboard
        onCreateCredential={mockOnCreateCredential}
        onEditCredential={mockOnEditCredential}
      />
    )

    expect(screen.getByText('Loading credentials...')).toBeInTheDocument()
  })

  it('displays empty state when no credentials', () => {
    const emptyStore = {
      ...mockStore,
      credentials: [],
      expiringCredentials: [],
      sharedCredentials: []
    }
    vi.mocked(useCredentialStore).mockReturnValue(emptyStore)

    render(
      <CredentialDashboard
        onCreateCredential={mockOnCreateCredential}
        onEditCredential={mockOnEditCredential}
      />
    )

    expect(screen.getByText('No credentials found')).toBeInTheDocument()
  })

  it('calls onCreateCredential when add credential button is clicked', () => {
    render(
      <CredentialDashboard
        onCreateCredential={mockOnCreateCredential}
        onEditCredential={mockOnEditCredential}
      />
    )

    const addButton = screen.getByText('Add Credential')
    fireEvent.click(addButton)

    expect(mockOnCreateCredential).toHaveBeenCalled()
  })

  it('calls onEditCredential when edit button is clicked', () => {
    render(
      <CredentialDashboard
        onCreateCredential={mockOnCreateCredential}
        onEditCredential={mockOnEditCredential}
      />
    )

    const editButtons = screen.getAllByText('Edit')
    fireEvent.click(editButtons[0])

    expect(mockOnEditCredential).toHaveBeenCalledWith(mockCredentials[0])
  })
})
