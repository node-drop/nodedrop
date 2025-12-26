/**
 * GitChangesList Component Tests
 * 
 * Unit tests for the GitChangesList component.
 * Tests rendering, empty states, and user interactions.
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { GitChangesList } from '../GitChangesList'

// Define GitChange type locally for tests
type GitChange = {
  path: string
  type: 'added' | 'modified' | 'deleted'
  staged: boolean
}

describe('GitChangesList', () => {
  const mockWorkflowId = 'test-workflow-123'

  describe('Empty State', () => {
    it('should display empty state when no changes', () => {
      render(
        <GitChangesList
          workflowId={mockWorkflowId}
          changes={[]}
        />
      )

      expect(screen.getByText('No changes')).toBeInTheDocument()
      expect(screen.getByText('Your workflow is up to date')).toBeInTheDocument()
    })
  })

  describe('Changes Display', () => {
    it('should display list of changes with correct icons and labels', () => {
      const changes: GitChange[] = [
        { path: 'workflow.json', type: 'modified', staged: false },
        { path: 'nodes.json', type: 'added', staged: true },
        { path: 'old-config.json', type: 'deleted', staged: false },
      ]

      render(
        <GitChangesList
          workflowId={mockWorkflowId}
          changes={changes}
        />
      )

      // Check that all file paths are displayed
      expect(screen.getByText('workflow.json')).toBeInTheDocument()
      expect(screen.getByText('nodes.json')).toBeInTheDocument()
      expect(screen.getByText('old-config.json')).toBeInTheDocument()

      // Check that change types are displayed
      expect(screen.getByText('Modified')).toBeInTheDocument()
      expect(screen.getByText('Added')).toBeInTheDocument()
      expect(screen.getByText('Deleted')).toBeInTheDocument()
    })

    it('should show staged indicator for staged changes', () => {
      const changes: GitChange[] = [
        { path: 'staged.json', type: 'modified', staged: true },
        { path: 'unstaged.json', type: 'modified', staged: false },
      ]

      const { container } = render(
        <GitChangesList
          workflowId={mockWorkflowId}
          changes={changes}
        />
      )

      // Staged changes should have a different visual indicator
      // We can check for the presence of specific classes or icons
      const stagedElements = container.querySelectorAll('[class*="bg-muted/30"]')
      expect(stagedElements.length).toBeGreaterThan(0)
    })

    it('should display correct summary counts', () => {
      const changes: GitChange[] = [
        { path: 'file1.json', type: 'modified', staged: true },
        { path: 'file2.json', type: 'modified', staged: true },
        { path: 'file3.json', type: 'modified', staged: false },
      ]

      render(
        <GitChangesList
          workflowId={mockWorkflowId}
          changes={changes}
        />
      )

      expect(screen.getByText('2 staged, 1 unstaged')).toBeInTheDocument()
      expect(screen.getByText('3 total')).toBeInTheDocument()
    })
  })

  describe('Bulk Actions', () => {
    it('should render Stage All and Unstage All buttons', () => {
      const changes: GitChange[] = [
        { path: 'file1.json', type: 'modified', staged: false },
      ]

      render(
        <GitChangesList
          workflowId={mockWorkflowId}
          changes={changes}
        />
      )

      expect(screen.getByRole('button', { name: /stage all/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /unstage all/i })).toBeInTheDocument()
    })

    it('should disable Stage All when no unstaged changes', () => {
      const changes: GitChange[] = [
        { path: 'file1.json', type: 'modified', staged: true },
      ]

      render(
        <GitChangesList
          workflowId={mockWorkflowId}
          changes={changes}
        />
      )

      const stageAllButton = screen.getByRole('button', { name: /stage all/i })
      expect(stageAllButton).toBeDisabled()
    })

    it('should disable Unstage All when no staged changes', () => {
      const changes: GitChange[] = [
        { path: 'file1.json', type: 'modified', staged: false },
      ]

      render(
        <GitChangesList
          workflowId={mockWorkflowId}
          changes={changes}
        />
      )

      const unstageAllButton = screen.getByRole('button', { name: /unstage all/i })
      expect(unstageAllButton).toBeDisabled()
    })
  })

  describe('Read-Only Mode', () => {
    it('should disable all action buttons in read-only mode', () => {
      const changes: GitChange[] = [
        { path: 'file1.json', type: 'modified', staged: false },
      ]

      render(
        <GitChangesList
          workflowId={mockWorkflowId}
          changes={changes}
          readOnly={true}
        />
      )

      const stageAllButton = screen.getByRole('button', { name: /stage all/i })
      const unstageAllButton = screen.getByRole('button', { name: /unstage all/i })

      expect(stageAllButton).toBeDisabled()
      expect(unstageAllButton).toBeDisabled()
    })
  })

  describe('Change Types', () => {
    it('should handle all change types correctly', () => {
      const changes: GitChange[] = [
        { path: 'added.json', type: 'added', staged: false },
        { path: 'modified.json', type: 'modified', staged: false },
        { path: 'deleted.json', type: 'deleted', staged: false },
      ]

      render(
        <GitChangesList
          workflowId={mockWorkflowId}
          changes={changes}
        />
      )

      expect(screen.getByText('Added')).toBeInTheDocument()
      expect(screen.getByText('Modified')).toBeInTheDocument()
      expect(screen.getByText('Deleted')).toBeInTheDocument()
    })
  })
})
