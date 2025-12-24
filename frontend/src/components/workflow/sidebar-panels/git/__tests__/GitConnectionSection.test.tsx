/**
 * GitConnectionSection Component Tests
 * 
 * Tests for the Git connection management component.
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.5, 5.1, 5.4
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { GitConnectionSection } from '../GitConnectionSection'
import type { GitRepositoryInfo } from '../../../../services/git.service'

// Mock the git store
const mockConnectRepository = vi.fn()
const mockDisconnectRepository = vi.fn()

vi.mock('../../../../stores/git', () => ({
  useGitStore: vi.fn(() => ({
    connectRepository: mockConnectRepository,
    disconnectRepository: mockDisconnectRepository,
    isConnecting: false,
    connectionError: null,
  })),
}))

describe('GitConnectionSection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Not Connected State', () => {
    it('should render connection form when not connected', () => {
      render(
        <GitConnectionSection
          workflowId="test-workflow"
          connected={false}
        />
      )

      expect(screen.getByText('Connect to Git Repository')).toBeInTheDocument()
      expect(screen.getByLabelText(/Repository URL/)).toBeInTheDocument()
      expect(screen.getByLabelText(/Branch/)).toBeInTheDocument()
      expect(screen.getByLabelText(/Git Provider/)).toBeInTheDocument()
      expect(screen.getByLabelText(/Authentication Method/)).toBeInTheDocument()
      expect(screen.getByLabelText(/Personal Access Token/)).toBeInTheDocument()
    })

    it('should show validation error for empty repository URL', async () => {
      render(
        <GitConnectionSection
          workflowId="test-workflow"
          connected={false}
        />
      )

      const connectButton = screen.getByRole('button', { name: /Connect Repository/ })
      fireEvent.click(connectButton)

      await waitFor(() => {
        expect(screen.getByText('Repository URL is required')).toBeInTheDocument()
      })

      expect(mockConnectRepository).not.toHaveBeenCalled()
    })

    it('should show validation error for empty token', async () => {
      render(
        <GitConnectionSection
          workflowId="test-workflow"
          connected={false}
        />
      )

      const urlInput = screen.getByLabelText(/Repository URL/)
      fireEvent.change(urlInput, { target: { value: 'https://github.com/user/repo.git' } })

      const connectButton = screen.getByRole('button', { name: /Connect Repository/ })
      fireEvent.click(connectButton)

      await waitFor(() => {
        expect(screen.getByText('Access token is required')).toBeInTheDocument()
      })

      expect(mockConnectRepository).not.toHaveBeenCalled()
    })

    it('should show validation error for invalid URL format', async () => {
      render(
        <GitConnectionSection
          workflowId="test-workflow"
          connected={false}
        />
      )

      const urlInput = screen.getByLabelText(/Repository URL/)
      fireEvent.change(urlInput, { target: { value: 'not-a-valid-url' } })

      const tokenInput = screen.getByLabelText(/Personal Access Token/)
      fireEvent.change(tokenInput, { target: { value: 'test-token' } })

      const connectButton = screen.getByRole('button', { name: /Connect Repository/ })
      fireEvent.click(connectButton)

      await waitFor(() => {
        expect(screen.getByText('Invalid repository URL format')).toBeInTheDocument()
      })

      expect(mockConnectRepository).not.toHaveBeenCalled()
    })

    it('should call connectRepository with correct config on valid submission', async () => {
      mockConnectRepository.mockResolvedValue(undefined)

      render(
        <GitConnectionSection
          workflowId="test-workflow"
          connected={false}
        />
      )

      // Fill in the form
      const urlInput = screen.getByLabelText(/Repository URL/)
      fireEvent.change(urlInput, { target: { value: 'https://github.com/user/repo.git' } })

      const branchInput = screen.getByLabelText(/Branch/)
      fireEvent.change(branchInput, { target: { value: 'develop' } })

      const tokenInput = screen.getByLabelText(/Personal Access Token/)
      fireEvent.change(tokenInput, { target: { value: 'ghp_test_token_123' } })

      const connectButton = screen.getByRole('button', { name: /Connect Repository/ })
      fireEvent.click(connectButton)

      await waitFor(() => {
        expect(mockConnectRepository).toHaveBeenCalledWith('test-workflow', {
          repositoryUrl: 'https://github.com/user/repo.git',
          branch: 'develop',
          credentials: {
            type: 'personal_access_token',
            token: 'ghp_test_token_123',
            provider: 'github',
          },
        })
      })
    })

    it('should toggle token visibility when eye icon is clicked', () => {
      render(
        <GitConnectionSection
          workflowId="test-workflow"
          connected={false}
        />
      )

      const tokenInput = screen.getByLabelText(/Personal Access Token/) as HTMLInputElement
      expect(tokenInput.type).toBe('password')

      // Find and click the eye button
      const eyeButtons = screen.getAllByRole('button')
      const eyeButton = eyeButtons.find(btn => btn.querySelector('svg'))
      
      if (eyeButton) {
        fireEvent.click(eyeButton)
        expect(tokenInput.type).toBe('text')

        fireEvent.click(eyeButton)
        expect(tokenInput.type).toBe('password')
      }
    })

    it('should display connection error from store', () => {
      const { useGitStore } = require('../../../../stores/git')
      useGitStore.mockReturnValue({
        connectRepository: mockConnectRepository,
        disconnectRepository: mockDisconnectRepository,
        isConnecting: false,
        connectionError: 'Invalid credentials',
      })

      render(
        <GitConnectionSection
          workflowId="test-workflow"
          connected={false}
        />
      )

      expect(screen.getByText('Invalid credentials')).toBeInTheDocument()
    })

    it('should disable form inputs when connecting', () => {
      const { useGitStore } = require('../../../../stores/git')
      useGitStore.mockReturnValue({
        connectRepository: mockConnectRepository,
        disconnectRepository: mockDisconnectRepository,
        isConnecting: true,
        connectionError: null,
      })

      render(
        <GitConnectionSection
          workflowId="test-workflow"
          connected={false}
        />
      )

      expect(screen.getByLabelText(/Repository URL/)).toBeDisabled()
      expect(screen.getByLabelText(/Branch/)).toBeDisabled()
      expect(screen.getByLabelText(/Personal Access Token/)).toBeDisabled()
      expect(screen.getByRole('button', { name: /Connecting.../ })).toBeDisabled()
    })

    it('should disable form when readOnly is true', () => {
      render(
        <GitConnectionSection
          workflowId="test-workflow"
          connected={false}
          readOnly={true}
        />
      )

      expect(screen.getByLabelText(/Repository URL/)).toBeDisabled()
      expect(screen.getByLabelText(/Branch/)).toBeDisabled()
      expect(screen.getByLabelText(/Personal Access Token/)).toBeDisabled()
      expect(screen.getByRole('button', { name: /Connect Repository/ })).toBeDisabled()
    })
  })

  describe('Connected State', () => {
    const mockRepositoryInfo: GitRepositoryInfo = {
      workflowId: 'test-workflow',
      repositoryUrl: 'https://github.com/user/repo.git',
      branch: 'main',
      connected: true,
      lastSyncAt: new Date('2024-01-01T12:00:00Z'),
      lastCommitHash: 'abc123',
      unpushedCommits: 2,
    }

    it('should render repository information when connected', () => {
      render(
        <GitConnectionSection
          workflowId="test-workflow"
          connected={true}
          repositoryInfo={mockRepositoryInfo}
        />
      )

      expect(screen.getByText('Connected Repository')).toBeInTheDocument()
      expect(screen.getByText('Successfully connected to repository')).toBeInTheDocument()
      expect(screen.getByText('https://github.com/user/repo.git')).toBeInTheDocument()
      expect(screen.getByText('main')).toBeInTheDocument()
      expect(screen.getByText('2 commits')).toBeInTheDocument()
    })

    it('should display last sync time when available', () => {
      render(
        <GitConnectionSection
          workflowId="test-workflow"
          connected={true}
          repositoryInfo={mockRepositoryInfo}
        />
      )

      expect(screen.getByText('Last Sync')).toBeInTheDocument()
    })

    it('should show disconnect button when not readOnly', () => {
      render(
        <GitConnectionSection
          workflowId="test-workflow"
          connected={true}
          repositoryInfo={mockRepositoryInfo}
        />
      )

      expect(screen.getByRole('button', { name: /Disconnect Repository/ })).toBeInTheDocument()
    })

    it('should not show disconnect button when readOnly', () => {
      render(
        <GitConnectionSection
          workflowId="test-workflow"
          connected={true}
          repositoryInfo={mockRepositoryInfo}
          readOnly={true}
        />
      )

      expect(screen.queryByRole('button', { name: /Disconnect Repository/ })).not.toBeInTheDocument()
    })

    it('should call disconnectRepository with confirmation on disconnect', async () => {
      // Mock window.confirm
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
      mockDisconnectRepository.mockResolvedValue(undefined)

      render(
        <GitConnectionSection
          workflowId="test-workflow"
          connected={true}
          repositoryInfo={mockRepositoryInfo}
        />
      )

      const disconnectButton = screen.getByRole('button', { name: /Disconnect Repository/ })
      fireEvent.click(disconnectButton)

      await waitFor(() => {
        expect(confirmSpy).toHaveBeenCalled()
        expect(mockDisconnectRepository).toHaveBeenCalledWith('test-workflow')
      })

      confirmSpy.mockRestore()
    })

    it('should not disconnect if user cancels confirmation', async () => {
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)

      render(
        <GitConnectionSection
          workflowId="test-workflow"
          connected={true}
          repositoryInfo={mockRepositoryInfo}
        />
      )

      const disconnectButton = screen.getByRole('button', { name: /Disconnect Repository/ })
      fireEvent.click(disconnectButton)

      await waitFor(() => {
        expect(confirmSpy).toHaveBeenCalled()
      })

      expect(mockDisconnectRepository).not.toHaveBeenCalled()
      confirmSpy.mockRestore()
    })
  })
})
