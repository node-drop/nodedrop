import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useCredentialStore } from '@/stores/credential'
import { credentialService } from '@/services'

// Mock the credential service
vi.mock('@/services', () => ({
  credentialService: {
    getCredentials: vi.fn(),
    getCredentialTypes: vi.fn(),
    createCredential: vi.fn(),
    updateCredential: vi.fn(),
    deleteCredential: vi.fn(),
    testCredential: vi.fn(),
    rotateCredential: vi.fn(),
    getExpiringCredentials: vi.fn(),
    getCredentialUsage: vi.fn(),
    getCredentialAuditLogs: vi.fn(),
    bulkExportCredentials: vi.fn(),
    bulkImportCredentials: vi.fn(),
    bulkDeleteCredentials: vi.fn(),
    bulkRotateCredentials: vi.fn(),
    shareCredential: vi.fn(),
    unshareCredential: vi.fn(),
    getSharedCredentials: vi.fn(),
    getSecurityPolicies: vi.fn(),
    createSecurityPolicy: vi.fn(),
    updateSecurityPolicy: vi.fn(),
    deleteSecurityPolicy: vi.fn(),
    createBackup: vi.fn(),
    getBackups: vi.fn(),
    restoreBackup: vi.fn(),
    deleteBackup: vi.fn()
  }
}))

const mockCredentials = [
  {
    id: '1',
    name: 'Test API Key',
    type: 'apiKey',
    userId: 'user1',
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-01-01T00:00:00Z'
  },
  {
    id: '2',
    name: 'OAuth Token',
    type: 'oauth2',
    userId: 'user1',
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-01-01T00:00:00Z'
  }
]

const mockCredentialTypes = [
  {
    name: 'apiKey',
    displayName: 'API Key',
    description: 'API key authentication',
    properties: []
  }
]

describe('useCredentialStore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset store state
    useCredentialStore.setState({
      credentials: [],
      credentialTypes: [],
      expiringCredentials: [],
      sharedCredentials: [],
      usageLogs: [],
      auditLogs: [],
      securityPolicies: [],
      backups: [],
      isLoading: false,
      error: null
    })
  })

  describe('fetchCredentials', () => {
    it('should fetch and set credentials', async () => {
      vi.mocked(credentialService.getCredentials).mockResolvedValue(mockCredentials)

      const { fetchCredentials } = useCredentialStore.getState()
      await fetchCredentials()

      const state = useCredentialStore.getState()
      expect(state.credentials).toEqual(mockCredentials)
      expect(state.isLoading).toBe(false)
      expect(state.error).toBeNull()
    })

    it('should handle fetch credentials error', async () => {
      const errorMessage = 'Failed to fetch credentials'
      vi.mocked(credentialService.getCredentials).mockRejectedValue(new Error(errorMessage))

      const { fetchCredentials } = useCredentialStore.getState()
      await fetchCredentials()

      const state = useCredentialStore.getState()
      expect(state.credentials).toEqual([])
      expect(state.isLoading).toBe(false)
      expect(state.error).toBe(errorMessage)
    })
  })

  describe('fetchCredentialTypes', () => {
    it('should fetch and set credential types', async () => {
      vi.mocked(credentialService.getCredentialTypes).mockResolvedValue(mockCredentialTypes)

      const { fetchCredentialTypes } = useCredentialStore.getState()
      await fetchCredentialTypes()

      const state = useCredentialStore.getState()
      expect(state.credentialTypes).toEqual(mockCredentialTypes)
      expect(state.isLoading).toBe(false)
      expect(state.error).toBeNull()
    })
  })

  describe('createCredential', () => {
    it('should create and add credential', async () => {
      const newCredential = mockCredentials[0]
      const createData = {
        name: 'Test API Key',
        type: 'apiKey',
        data: { apiKey: 'test-key' }
      }

      vi.mocked(credentialService.createCredential).mockResolvedValue(newCredential)

      const { createCredential } = useCredentialStore.getState()
      const result = await createCredential(createData)

      expect(result).toEqual(newCredential)
      const state = useCredentialStore.getState()
      expect(state.credentials).toContain(newCredential)
    })

    it('should handle create credential error', async () => {
      const errorMessage = 'Failed to create credential'
      const createData = {
        name: 'Test API Key',
        type: 'apiKey',
        data: { apiKey: 'test-key' }
      }

      vi.mocked(credentialService.createCredential).mockRejectedValue(new Error(errorMessage))

      const { createCredential } = useCredentialStore.getState()

      await expect(createCredential(createData)).rejects.toThrow(errorMessage)
      const state = useCredentialStore.getState()
      expect(state.error).toBe(errorMessage)
    })
  })

  describe('rotateCredential', () => {
    it('should rotate credential and update state', async () => {
      const rotatedCredential = { ...mockCredentials[0], updatedAt: '2023-01-02T00:00:00Z' }
      const newData = { apiKey: 'new-key' }

      // Set initial state
      useCredentialStore.setState({ credentials: mockCredentials })

      vi.mocked(credentialService.rotateCredential).mockResolvedValue(rotatedCredential)

      const { rotateCredential } = useCredentialStore.getState()
      const result = await rotateCredential('1', newData)

      expect(result).toEqual(rotatedCredential)
      const state = useCredentialStore.getState()
      expect(state.credentials.find(c => c.id === '1')).toEqual(rotatedCredential)
    })
  })

  describe('fetchExpiringCredentials', () => {
    it('should fetch expiring credentials', async () => {
      const expiringCredentials = [mockCredentials[0]]
      vi.mocked(credentialService.getExpiringCredentials).mockResolvedValue(expiringCredentials)

      const { fetchExpiringCredentials } = useCredentialStore.getState()
      await fetchExpiringCredentials(7)

      const state = useCredentialStore.getState()
      expect(state.expiringCredentials).toEqual(expiringCredentials)
      expect(credentialService.getExpiringCredentials).toHaveBeenCalledWith(7)
    })
  })

  describe('bulkExportCredentials', () => {
    it('should export credentials', async () => {
      const exportData = {
        credentials: mockCredentials,
        exportedAt: '2023-01-01T00:00:00Z',
        exportedBy: 'user1'
      }
      const credentialIds = ['1', '2']

      vi.mocked(credentialService.bulkExportCredentials).mockResolvedValue(exportData)

      const { bulkExportCredentials } = useCredentialStore.getState()
      const result = await bulkExportCredentials(credentialIds)

      expect(result).toEqual(exportData)
      expect(credentialService.bulkExportCredentials).toHaveBeenCalledWith(credentialIds)
    })
  })

  describe('bulkImportCredentials', () => {
    it('should import credentials and refresh list', async () => {
      const importData = {
        credentials: [
          {
            name: 'Imported Credential',
            type: 'apiKey',
            data: { apiKey: 'imported-key' }
          }
        ]
      }
      const importResult = { imported: 1, errors: [] }

      vi.mocked(credentialService.bulkImportCredentials).mockResolvedValue(importResult)
      vi.mocked(credentialService.getCredentials).mockResolvedValue([
        ...mockCredentials,
        {
          id: '3',
          name: 'Imported Credential',
          type: 'apiKey',
          userId: 'user1',
          createdAt: '2023-01-01T00:00:00Z',
          updatedAt: '2023-01-01T00:00:00Z'
        }
      ])

      const { bulkImportCredentials } = useCredentialStore.getState()
      const result = await bulkImportCredentials(importData)

      expect(result).toEqual(importResult)
      const state = useCredentialStore.getState()
      expect(state.credentials).toHaveLength(3)
    })
  })

  describe('shareCredential', () => {
    it('should share credential and update state', async () => {
      const credentialId = '1'
      const userIds = ['user2', 'user3']

      // Set initial state
      useCredentialStore.setState({ credentials: mockCredentials })

      vi.mocked(credentialService.shareCredential).mockResolvedValue(undefined)

      const { shareCredential } = useCredentialStore.getState()
      await shareCredential(credentialId, userIds)

      const state = useCredentialStore.getState()
      const sharedCredential = state.credentials.find(c => c.id === credentialId)
      expect(sharedCredential?.isShared).toBe(true)
      expect(sharedCredential?.sharedWith).toEqual(userIds)
    })
  })

  describe('fetchSecurityPolicies', () => {
    it('should fetch security policies', async () => {
      const policies = [
        {
          id: '1',
          name: 'Default Policy',
          description: 'Default security policy',
          rules: {
            requireRotation: true,
            rotationInterval: 90,
            allowSharing: true,
            requireMFA: false,
            encryptionLevel: 'standard' as const
          }
        }
      ]

      vi.mocked(credentialService.getSecurityPolicies).mockResolvedValue(policies)

      const { fetchSecurityPolicies } = useCredentialStore.getState()
      await fetchSecurityPolicies()

      const state = useCredentialStore.getState()
      expect(state.securityPolicies).toEqual(policies)
    })
  })

  describe('createBackup', () => {
    it('should create backup and add to state', async () => {
      const backup = {
        id: '1',
        name: 'Test Backup',
        description: 'Test backup description',
        credentials: [
          { id: '1', name: 'Test API Key', type: 'apiKey', encrypted: true }
        ],
        createdAt: '2023-01-01T00:00:00Z',
        size: 1024
      }

      vi.mocked(credentialService.createBackup).mockResolvedValue(backup)

      const { createBackup } = useCredentialStore.getState()
      const result = await createBackup('Test Backup', ['1'], 'Test backup description')

      expect(result).toEqual(backup)
      const state = useCredentialStore.getState()
      expect(state.backups).toContain(backup)
    })
  })

  describe('getCredentialsByType', () => {
    it('should filter credentials by type', () => {
      // Set initial state
      useCredentialStore.setState({ credentials: mockCredentials })

      const { getCredentialsByType } = useCredentialStore.getState()
      const apiKeyCredentials = getCredentialsByType('apiKey')

      expect(apiKeyCredentials).toHaveLength(1)
      expect(apiKeyCredentials[0].type).toBe('apiKey')
    })
  })

  describe('clearError', () => {
    it('should clear error state', () => {
      // Set error state
      useCredentialStore.setState({ error: 'Test error' })

      const { clearError } = useCredentialStore.getState()
      clearError()

      const state = useCredentialStore.getState()
      expect(state.error).toBeNull()
    })
  })
})
