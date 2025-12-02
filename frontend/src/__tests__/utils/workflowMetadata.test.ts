/**
 * Unit tests for workflow metadata management utilities
 */

import {
  createDefaultMetadata,
  updateMetadata,
  migrateMetadata,
  validateMetadata,
  ensureWorkflowMetadata,
  updateWorkflowTitle,
  addCustomProperty,
  removeCustomProperty,
  addTag,
  removeTag,
  getMetadataSummary,
  CURRENT_METADATA_SCHEMA_VERSION,
  DEFAULT_METADATA
} from '@/utils/workflowMetadata'
import { Workflow, WorkflowMetadata } from '@/types/workflow'

describe('workflowMetadata', () => {
  const mockWorkflow: Workflow = {
    id: 'test-workflow-1',
    name: 'Test Workflow',
    description: 'A test workflow',
    userId: 'user-1',
    nodes: [],
    connections: [],
    settings: {},
    active: true,
    createdAt: '2023-01-01T00:00:00.000Z',
    updatedAt: '2023-01-01T00:00:00.000Z'
  }

  describe('createDefaultMetadata', () => {
    it('should create default metadata with required fields', () => {
      const metadata = createDefaultMetadata('Test Title', 'user-1')
      
      expect(metadata.title).toBe('Test Title')
      expect(metadata.createdBy).toBe('user-1')
      expect(metadata.lastModifiedBy).toBe('user-1')
      expect(metadata.exportVersion).toBe(DEFAULT_METADATA.exportVersion)
      expect(metadata.schemaVersion).toBe(CURRENT_METADATA_SCHEMA_VERSION)
      expect(metadata.version).toBe(1)
      expect(metadata.tags).toEqual([])
      expect(metadata.customProperties).toEqual({})
      expect(metadata.lastTitleUpdate).toBeDefined()
    })

    it('should use default title when none provided', () => {
      const metadata = createDefaultMetadata('')
      
      expect(metadata.title).toBe('Untitled Workflow')
    })

    it('should work without createdBy parameter', () => {
      const metadata = createDefaultMetadata('Test Title')
      
      expect(metadata.title).toBe('Test Title')
      expect(metadata.createdBy).toBeUndefined()
      expect(metadata.lastModifiedBy).toBeUndefined()
    })
  })

  describe('updateMetadata', () => {
    const baseMetadata: WorkflowMetadata = {
      title: 'Original Title',
      lastTitleUpdate: '2023-01-01T00:00:00.000Z',
      exportVersion: '1.0.0',
      schemaVersion: '1.0.0',
      version: 1,
      tags: ['tag1'],
      customProperties: { prop1: 'value1' }
    }

    it('should update metadata fields', () => {
      const updated = updateMetadata(baseMetadata, {
        title: 'New Title',
        tags: ['tag1', 'tag2']
      }, 'user-2')
      
      expect(updated.title).toBe('New Title')
      expect(updated.tags).toEqual(['tag1', 'tag2'])
      expect(updated.lastModifiedBy).toBe('user-2')
      expect(updated.version).toBe(2) // Should increment for non-title changes
    })

    it('should update lastTitleUpdate when title changes', () => {
      const originalTime = baseMetadata.lastTitleUpdate
      const updated = updateMetadata(baseMetadata, { title: 'New Title' })
      
      expect(updated.lastTitleUpdate).not.toBe(originalTime)
    })

    it('should not increment version for title-only changes', () => {
      const updated = updateMetadata(baseMetadata, { title: 'New Title' })
      
      expect(updated.version).toBe(1)
    })

    it('should increment version for content changes', () => {
      const updated = updateMetadata(baseMetadata, { 
        customProperties: { newProp: 'newValue' }
      })
      
      expect(updated.version).toBe(2)
    })

    it('should create default metadata when none exists', () => {
      const updated = updateMetadata(undefined, { title: 'New Title' })
      
      expect(updated.title).toBe('New Title')
      expect(updated.schemaVersion).toBe(CURRENT_METADATA_SCHEMA_VERSION)
      expect(updated.version).toBe(1)
    })
  })

  describe('migrateMetadata', () => {
    it('should create default metadata when none exists', () => {
      const migrated = migrateMetadata(undefined, 'Workflow Name')
      
      expect(migrated.title).toBe('Workflow Name')
      expect(migrated.schemaVersion).toBe(CURRENT_METADATA_SCHEMA_VERSION)
      expect(migrated.version).toBe(1)
    })

    it('should migrate from older schema version', () => {
      const oldMetadata = {
        title: 'Old Title',
        lastTitleUpdate: '2023-01-01T00:00:00.000Z',
        exportVersion: '1.0.0',
        schemaVersion: '0.9.0'
      }
      
      const migrated = migrateMetadata(oldMetadata)
      
      expect(migrated.title).toBe('Old Title')
      expect(migrated.schemaVersion).toBe(CURRENT_METADATA_SCHEMA_VERSION)
      expect(migrated.version).toBe(1)
      expect(migrated.tags).toEqual([])
      expect(migrated.customProperties).toEqual({})
    })

    it('should handle unknown schema versions', () => {
      const unknownMetadata = {
        title: 'Title',
        lastTitleUpdate: '2023-01-01T00:00:00.000Z',
        exportVersion: '1.0.0',
        schemaVersion: '2.0.0'
      }
      
      const migrated = migrateMetadata(unknownMetadata)
      
      expect(migrated.schemaVersion).toBe(CURRENT_METADATA_SCHEMA_VERSION)
    })

    it('should fill in missing required fields', () => {
      const incompleteMetadata = {
        title: 'Title'
      }
      
      const migrated = migrateMetadata(incompleteMetadata)
      
      expect(migrated.lastTitleUpdate).toBeDefined()
      expect(migrated.exportVersion).toBeDefined()
      expect(migrated.schemaVersion).toBe(CURRENT_METADATA_SCHEMA_VERSION)
      expect(migrated.version).toBe(1)
    })
  })

  describe('validateMetadata', () => {
    const validMetadata: WorkflowMetadata = {
      title: 'Valid Title',
      lastTitleUpdate: '2023-01-01T00:00:00.000Z',
      exportVersion: '1.0.0',
      schemaVersion: '1.0.0',
      version: 1,
      tags: ['tag1', 'tag2'],
      customProperties: { prop1: 'value1' }
    }

    it('should validate correct metadata', () => {
      const errors = validateMetadata(validMetadata)
      
      expect(errors).toHaveLength(0)
    })

    it('should require metadata object', () => {
      const errors = validateMetadata(undefined)
      
      expect(errors).toHaveLength(1)
      expect(errors[0].code).toBe('METADATA_MISSING')
    })

    it('should require title', () => {
      const invalidMetadata = { ...validMetadata, title: '' }
      const errors = validateMetadata(invalidMetadata)
      
      expect(errors.some(e => e.code === 'METADATA_TITLE_EMPTY')).toBe(true)
    })

    it('should validate title length', () => {
      const longTitle = 'a'.repeat(201)
      const invalidMetadata = { ...validMetadata, title: longTitle }
      const errors = validateMetadata(invalidMetadata)
      
      expect(errors.some(e => e.code === 'METADATA_TITLE_TOO_LONG')).toBe(true)
    })

    it('should validate version number', () => {
      const invalidMetadata = { ...validMetadata, version: -1 }
      const errors = validateMetadata(invalidMetadata)
      
      expect(errors.some(e => e.code === 'METADATA_VERSION_INVALID')).toBe(true)
    })

    it('should validate tags array', () => {
      const invalidMetadata = { ...validMetadata, tags: 'not-an-array' as any }
      const errors = validateMetadata(invalidMetadata)
      
      expect(errors.some(e => e.code === 'METADATA_TAGS_INVALID')).toBe(true)
    })

    it('should validate individual tags', () => {
      const longTag = 'a'.repeat(51)
      const invalidMetadata = { ...validMetadata, tags: [longTag] }
      const errors = validateMetadata(invalidMetadata)
      
      expect(errors.some(e => e.code === 'METADATA_TAG_TOO_LONG')).toBe(true)
    })

    it('should validate custom properties type', () => {
      const invalidMetadata = { ...validMetadata, customProperties: 'not-an-object' as any }
      const errors = validateMetadata(invalidMetadata)
      
      expect(errors.some(e => e.code === 'METADATA_CUSTOM_PROPERTIES_INVALID')).toBe(true)
    })
  })

  describe('ensureWorkflowMetadata', () => {
    it('should add metadata to workflow without metadata', () => {
      const workflowWithoutMetadata = { ...mockWorkflow }
      const result = ensureWorkflowMetadata(workflowWithoutMetadata, 'user-1')
      
      expect(result.metadata).toBeDefined()
      expect(result.metadata!.title).toBe(mockWorkflow.name)
      expect(result.metadata!.createdBy).toBe('user-1')
    })

    it('should migrate existing metadata', () => {
      const workflowWithOldMetadata = {
        ...mockWorkflow,
        metadata: {
          title: 'Old Title',
          lastTitleUpdate: '2023-01-01T00:00:00.000Z',
          exportVersion: '1.0.0',
          schemaVersion: '0.9.0'
        } as WorkflowMetadata
      }
      
      const result = ensureWorkflowMetadata(workflowWithOldMetadata)
      
      expect(result.metadata!.schemaVersion).toBe(CURRENT_METADATA_SCHEMA_VERSION)
      expect(result.metadata!.version).toBe(1)
    })
  })

  describe('updateWorkflowTitle', () => {
    it('should update workflow title and metadata', () => {
      const workflowWithMetadata = {
        ...mockWorkflow,
        metadata: createDefaultMetadata('Old Title')
      }
      
      const result = updateWorkflowTitle(workflowWithMetadata, 'New Title', 'user-2')
      
      expect(result.name).toBe('New Title')
      expect(result.metadata!.title).toBe('New Title')
      expect(result.metadata!.lastModifiedBy).toBe('user-2')
    })
  })

  describe('addCustomProperty', () => {
    it('should add custom property to metadata', () => {
      const workflowWithMetadata = {
        ...mockWorkflow,
        metadata: createDefaultMetadata('Title')
      }
      
      const result = addCustomProperty(workflowWithMetadata, 'newProp', 'newValue', 'user-1')
      
      expect(result.metadata!.customProperties!.newProp).toBe('newValue')
      expect(result.metadata!.version).toBe(2) // Should increment version
    })

    it('should work with workflow without existing custom properties', () => {
      const workflowWithoutCustomProps = {
        ...mockWorkflow,
        metadata: {
          ...createDefaultMetadata('Title'),
          customProperties: undefined
        }
      }
      
      const result = addCustomProperty(workflowWithoutCustomProps, 'prop', 'value')
      
      expect(result.metadata!.customProperties!.prop).toBe('value')
    })
  })

  describe('removeCustomProperty', () => {
    it('should remove custom property from metadata', () => {
      const workflowWithCustomProps = {
        ...mockWorkflow,
        metadata: {
          ...createDefaultMetadata('Title'),
          customProperties: { prop1: 'value1', prop2: 'value2' }
        }
      }
      
      const result = removeCustomProperty(workflowWithCustomProps, 'prop1', 'user-1')
      
      expect(result.metadata!.customProperties!.prop1).toBeUndefined()
      expect(result.metadata!.customProperties!.prop2).toBe('value2')
      expect(result.metadata!.version).toBe(2)
    })
  })

  describe('addTag', () => {
    it('should add tag to metadata', () => {
      const workflowWithMetadata = {
        ...mockWorkflow,
        metadata: createDefaultMetadata('Title')
      }
      
      const result = addTag(workflowWithMetadata, 'newTag', 'user-1')
      
      expect(result.metadata!.tags).toContain('newTag')
      expect(result.metadata!.version).toBe(2)
    })

    it('should not add duplicate tags', () => {
      const workflowWithTags = {
        ...mockWorkflow,
        metadata: {
          ...createDefaultMetadata('Title'),
          tags: ['existingTag']
        }
      }
      
      const result = addTag(workflowWithTags, 'existingTag')
      
      expect(result.metadata!.tags).toEqual(['existingTag'])
      expect(result.metadata!.version).toBe(1) // Should not increment
    })
  })

  describe('removeTag', () => {
    it('should remove tag from metadata', () => {
      const workflowWithTags = {
        ...mockWorkflow,
        metadata: {
          ...createDefaultMetadata('Title'),
          tags: ['tag1', 'tag2', 'tag3']
        }
      }
      
      const result = removeTag(workflowWithTags, 'tag2', 'user-1')
      
      expect(result.metadata!.tags).toEqual(['tag1', 'tag3'])
      expect(result.metadata!.version).toBe(2)
    })
  })

  describe('getMetadataSummary', () => {
    it('should return summary for valid metadata', () => {
      const metadata: WorkflowMetadata = {
        title: 'Test Title',
        lastTitleUpdate: '2023-01-01T00:00:00.000Z',
        exportVersion: '1.0.0',
        schemaVersion: '1.0.0',
        version: 3,
        tags: ['tag1', 'tag2'],
        customProperties: { prop1: 'value1' }
      }
      
      const summary = getMetadataSummary(metadata)
      
      expect(summary.title).toBe('Test Title')
      expect(summary.version).toBe(3)
      expect(summary.lastModified).toBe('2023-01-01T00:00:00.000Z')
      expect(summary.tags).toEqual(['tag1', 'tag2'])
      expect(summary.hasCustomProperties).toBe(true)
    })

    it('should return default summary for undefined metadata', () => {
      const summary = getMetadataSummary(undefined)
      
      expect(summary.title).toBe('Untitled Workflow')
      expect(summary.version).toBe(1)
      expect(summary.lastModified).toBe('Unknown')
      expect(summary.tags).toEqual([])
      expect(summary.hasCustomProperties).toBe(false)
    })

    it('should handle metadata without optional fields', () => {
      const minimalMetadata: WorkflowMetadata = {
        title: 'Minimal Title',
        lastTitleUpdate: '2023-01-01T00:00:00.000Z',
        exportVersion: '1.0.0',
        schemaVersion: '1.0.0'
      }
      
      const summary = getMetadataSummary(minimalMetadata)
      
      expect(summary.title).toBe('Minimal Title')
      expect(summary.version).toBe(1)
      expect(summary.tags).toEqual([])
      expect(summary.hasCustomProperties).toBe(false)
    })
  })
})
