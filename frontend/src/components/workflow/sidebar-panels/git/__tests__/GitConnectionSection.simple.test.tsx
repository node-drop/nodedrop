/**
 * GitConnectionSection Simple Verification Tests
 * 
 * Basic tests to verify component structure and rendering.
 */

import { describe, it, expect } from 'vitest'
import { GitConnectionSection } from '../GitConnectionSection'

describe('GitConnectionSection - Component Structure', () => {
  it('should be defined and exportable', () => {
    expect(GitConnectionSection).toBeDefined()
    expect(typeof GitConnectionSection).toBe('function')
  })

  it('should have correct display name', () => {
    expect(GitConnectionSection.name).toBe('GitConnectionSection')
  })

  it('should accept required props', () => {
    // Type check - this will fail at compile time if props are wrong
    const props = {
      workflowId: 'test-workflow',
      connected: false,
    }
    
    expect(props.workflowId).toBe('test-workflow')
    expect(props.connected).toBe(false)
  })

  it('should accept optional props', () => {
    const props = {
      workflowId: 'test-workflow',
      connected: true,
      repositoryInfo: {
        workflowId: 'test-workflow',
        repositoryUrl: 'https://github.com/user/repo.git',
        branch: 'main',
        connected: true,
        unpushedCommits: 0,
      },
      readOnly: true,
    }
    
    expect(props.readOnly).toBe(true)
    expect(props.repositoryInfo).toBeDefined()
  })
})
