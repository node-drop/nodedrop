import { WorkflowSerializer, WorkflowData, SerializedWorkflow, WorkflowFiles } from './WorkflowSerializer';
import { AppError } from '../utils/errors';
import { expect } from 'bun:test';
import { expect } from 'bun:test';
import { it } from 'bun:test';
import { expect } from 'bun:test';
import { it } from 'bun:test';
import { expect } from 'bun:test';
import { it } from 'bun:test';
import { expect } from 'bun:test';
import { expect } from 'bun:test';
import { expect } from 'bun:test';
import { it } from 'bun:test';
import { describe } from 'bun:test';
import { expect } from 'bun:test';
import { expect } from 'bun:test';
import { expect } from 'bun:test';
import { expect } from 'bun:test';
import { it } from 'bun:test';
import { expect } from 'bun:test';
import { it } from 'bun:test';
import { describe } from 'bun:test';
import { expect } from 'bun:test';
import { expect } from 'bun:test';
import { expect } from 'bun:test';
import { expect } from 'bun:test';
import { it } from 'bun:test';
import { expect } from 'bun:test';
import { expect } from 'bun:test';
import { expect } from 'bun:test';
import { expect } from 'bun:test';
import { expect } from 'bun:test';
import { expect } from 'bun:test';
import { it } from 'bun:test';
import { describe } from 'bun:test';
import { expect } from 'bun:test';
import { it } from 'bun:test';
import { expect } from 'bun:test';
import { it } from 'bun:test';
import { expect } from 'bun:test';
import { expect } from 'bun:test';
import { expect } from 'bun:test';
import { expect } from 'bun:test';
import { expect } from 'bun:test';
import { expect } from 'bun:test';
import { it } from 'bun:test';
import { describe } from 'bun:test';
import { expect } from 'bun:test';
import { expect } from 'bun:test';
import { it } from 'bun:test';
import { expect } from 'bun:test';
import { expect } from 'bun:test';
import { expect } from 'bun:test';
import { expect } from 'bun:test';
import { expect } from 'bun:test';
import { expect } from 'bun:test';
import { expect } from 'bun:test';
import { it } from 'bun:test';
import { expect } from 'bun:test';
import { expect } from 'bun:test';
import { expect } from 'bun:test';
import { expect } from 'bun:test';
import { expect } from 'bun:test';
import { expect } from 'bun:test';
import { expect } from 'bun:test';
import { expect } from 'bun:test';
import { expect } from 'bun:test';
import { expect } from 'bun:test';
import { expect } from 'bun:test';
import { expect } from 'bun:test';
import { it } from 'bun:test';
import { expect } from 'bun:test';
import { it } from 'bun:test';
import { expect } from 'bun:test';
import { expect } from 'bun:test';
import { expect } from 'bun:test';
import { expect } from 'bun:test';
import { expect } from 'bun:test';
import { expect } from 'bun:test';
import { it } from 'bun:test';
import { describe } from 'bun:test';
import { expect } from 'bun:test';
import { it } from 'bun:test';
import { expect } from 'bun:test';
import { it } from 'bun:test';
import { expect } from 'bun:test';
import { it } from 'bun:test';
import { expect } from 'bun:test';
import { expect } from 'bun:test';
import { expect } from 'bun:test';
import { it } from 'bun:test';
import { expect } from 'bun:test';
import { expect } from 'bun:test';
import { expect } from 'bun:test';
import { expect } from 'bun:test';
import { expect } from 'bun:test';
import { expect } from 'bun:test';
import { expect } from 'bun:test';
import { expect } from 'bun:test';
import { it } from 'bun:test';
import { describe } from 'bun:test';
import { expect } from 'bun:test';
import { expect } from 'bun:test';
import { expect } from 'bun:test';
import { it } from 'bun:test';
import { expect } from 'bun:test';
import { expect } from 'bun:test';
import { expect } from 'bun:test';
import { expect } from 'bun:test';
import { expect } from 'bun:test';
import { expect } from 'bun:test';
import { expect } from 'bun:test';
import { it } from 'bun:test';
import { expect } from 'bun:test';
import { expect } from 'bun:test';
import { expect } from 'bun:test';
import { expect } from 'bun:test';
import { it } from 'bun:test';
import { expect } from 'bun:test';
import { expect } from 'bun:test';
import { expect } from 'bun:test';
import { expect } from 'bun:test';
import { expect } from 'bun:test';
import { expect } from 'bun:test';
import { expect } from 'bun:test';
import { expect } from 'bun:test';
import { expect } from 'bun:test';
import { expect } from 'bun:test';
import { expect } from 'bun:test';
import { expect } from 'bun:test';
import { expect } from 'bun:test';
import { expect } from 'bun:test';
import { it } from 'bun:test';
import { describe } from 'bun:test';
import { beforeEach } from 'bun:test';
import { describe } from 'bun:test';

describe('WorkflowSerializer', () => {
  let serializer: WorkflowSerializer;

  beforeEach(() => {
    serializer = new WorkflowSerializer();
  });

  // Sample workflow data for testing
  const createSampleWorkflow = (): WorkflowData => ({
    id: 'wf_test123',
    name: 'Test Workflow',
    description: 'A test workflow for serialization',
    category: 'Testing',
    tags: ['test', 'automation'],
    userId: 'user_123',
    workspaceId: 'ws_123',
    teamId: null,
    nodes: [
      {
        id: 'node_1',
        type: 'trigger',
        name: 'Webhook Trigger',
        parameters: { path: '/webhook' },
        position: { x: 100, y: 100 },
        credentials: [],
        disabled: false,
      },
      {
        id: 'node_2',
        type: 'action',
        name: 'HTTP Request',
        parameters: { url: 'https://api.example.com', method: 'POST' },
        position: { x: 300, y: 100 },
        credentials: ['cred_1'],
        disabled: false,
      },
    ],
    connections: [
      {
        id: 'conn_1',
        sourceNodeId: 'node_1',
        sourceOutput: 'default',
        targetNodeId: 'node_2',
        targetInput: 'default',
      },
    ],
    triggers: [
      {
        id: 'trigger_1',
        type: 'webhook',
        settings: { path: '/webhook' },
        active: true,
      },
    ],
    settings: {
      timezone: 'UTC',
      saveExecutionProgress: true,
      saveDataErrorExecution: 'all',
      saveDataSuccessExecution: 'all',
      executionTimeout: 300,
    },
    active: true,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-02T00:00:00Z'),
  });

  describe('serializeWorkflow', () => {
    it('should serialize a complete workflow', async () => {
      const workflow = createSampleWorkflow();
      const result = await serializer.serializeWorkflow(workflow);

      expect(result).toHaveProperty('version');
      expect(result.version).toBe('1.0.0');
      expect(result).toHaveProperty('exportedAt');
      expect(result).toHaveProperty('exportedBy', 'git-service');
      expect(result).toHaveProperty('checksum');
      expect(result.workflow).toEqual({
        title: workflow.name,
        name: workflow.name,
        description: workflow.description,
        category: workflow.category,
        tags: workflow.tags,
        nodes: expect.any(Array),
        connections: expect.any(Array),
        triggers: expect.any(Array),
        settings: expect.any(Object),
        metadata: expect.any(Object),
      });
      expect(result.workflow.nodes).toHaveLength(2);
      expect(result.workflow.connections).toHaveLength(1);
      expect(result.workflow.triggers).toHaveLength(1);
    });

    it('should handle workflow with minimal data', async () => {
      const minimalWorkflow: WorkflowData = {
        id: 'wf_minimal',
        name: 'Minimal Workflow',
        tags: [],
        userId: 'user_123',
        workspaceId: null,
        teamId: null,
        nodes: [],
        connections: [],
        triggers: [],
        settings: {},
        active: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await serializer.serializeWorkflow(minimalWorkflow);

      expect(result.workflow.name).toBe('Minimal Workflow');
      expect(result.workflow.nodes).toEqual([]);
      expect(result.workflow.connections).toEqual([]);
      expect(result.workflow.triggers).toEqual([]);
    });

    it('should sanitize node data correctly', async () => {
      const workflow = createSampleWorkflow();
      const result = await serializer.serializeWorkflow(workflow);

      const node = result.workflow.nodes[0];
      expect(node).toHaveProperty('id');
      expect(node).toHaveProperty('type');
      expect(node).toHaveProperty('name');
      expect(node).toHaveProperty('parameters');
      expect(node).toHaveProperty('position');
      expect(node).toHaveProperty('credentials');
      expect(node).toHaveProperty('disabled');
    });

    it('should handle nodes with group properties', async () => {
      const workflow = createSampleWorkflow();
      workflow.nodes.push({
        id: 'node_3',
        type: 'group',
        name: 'Group Node',
        parameters: {},
        position: { x: 500, y: 100 },
        credentials: [],
        disabled: false,
        parentId: 'node_1',
        extent: 'parent',
        style: { width: 200, height: 150, backgroundColor: '#f0f0f0' },
      });

      const result = await serializer.serializeWorkflow(workflow);
      const groupNode = result.workflow.nodes.find((n: any) => n.id === 'node_3');

      expect(groupNode).toHaveProperty('parentId', 'node_1');
      expect(groupNode).toHaveProperty('extent', 'parent');
      expect(groupNode).toHaveProperty('style');
    });
  });

  describe('deserializeWorkflow', () => {
    it('should deserialize a serialized workflow', async () => {
      const workflow = createSampleWorkflow();
      const serialized = await serializer.serializeWorkflow(workflow);
      const deserialized = await serializer.deserializeWorkflow(serialized);

      expect(deserialized.id).toBe(workflow.id);
      expect(deserialized.name).toBe(workflow.name);
      expect(deserialized.description).toBe(workflow.description);
      expect(deserialized.category).toBe(workflow.category);
      expect(deserialized.tags).toEqual(workflow.tags);
      expect(deserialized.nodes).toHaveLength(2);
      expect(deserialized.connections).toHaveLength(1);
      expect(deserialized.triggers).toHaveLength(1);
    });

    it('should handle missing optional fields', async () => {
      const serialized: SerializedWorkflow = {
        version: '1.0.0',
        exportedAt: new Date().toISOString(),
        exportedBy: 'test',
        workflow: {
          title: 'Test',
          name: 'Test',
          tags: [],
          nodes: [],
          connections: [],
          triggers: [],
          settings: {},
        },
        checksum: 'abc123',
      };

      const result = await serializer.deserializeWorkflow(serialized);

      expect(result.name).toBe('Test');
      expect(result.description).toBeUndefined();
      expect(result.category).toBeUndefined();
    });

    it('should throw error for missing version', async () => {
      const invalidData = {
        exportedAt: new Date().toISOString(),
        exportedBy: 'test',
        workflow: { title: 'Test', name: 'Test', tags: [], nodes: [], connections: [], triggers: [], settings: {} },
        checksum: 'abc123',
      } as any;

      await expect(serializer.deserializeWorkflow(invalidData)).rejects.toThrow(AppError);
    });

    it('should throw error for incompatible future version', async () => {
      const futureVersion: SerializedWorkflow = {
        version: '99.0.0',
        exportedAt: new Date().toISOString(),
        exportedBy: 'test',
        workflow: { title: 'Test', name: 'Test', tags: [], nodes: [], connections: [], triggers: [], settings: {} },
        checksum: 'abc123',
      };

      await expect(serializer.deserializeWorkflow(futureVersion)).rejects.toThrow(AppError);
    });

    it('should handle older compatible versions', async () => {
      const olderVersion: SerializedWorkflow = {
        version: '0.9.0',
        exportedAt: new Date().toISOString(),
        exportedBy: 'test',
        workflow: { title: 'Test', name: 'Test', tags: [], nodes: [], connections: [], triggers: [], settings: {} },
        checksum: 'abc123',
      };

      // Should not throw, but may log a warning
      const result = await serializer.deserializeWorkflow(olderVersion);
      expect(result.name).toBe('Test');
    });
  });

  describe('workflowToFiles', () => {
    it('should convert workflow to single file structure', async () => {
      const workflow = createSampleWorkflow();
      const files = await serializer.workflowToFiles(workflow);

      expect(files['workflow.json']).toBeDefined();
      expect(files['README.md']).toBeDefined();
      // Should not have separate files anymore
      expect(files['nodes.json']).toBeUndefined();
      expect(files['connections.json']).toBeUndefined();
      expect(files['triggers.json']).toBeUndefined();
      expect(files['settings.json']).toBeUndefined();
    });

    it('should generate valid JSON file', async () => {
      const workflow = createSampleWorkflow();
      const files = await serializer.workflowToFiles(workflow);

      // workflow.json should be parseable
      expect(() => JSON.parse(files['workflow.json'])).not.toThrow();
    });

    it('should include complete workflow data in workflow.json', async () => {
      const workflow = createSampleWorkflow();
      const files = await serializer.workflowToFiles(workflow);
      const workflowJson = JSON.parse(files['workflow.json']);

      expect(workflowJson).toHaveProperty('version');
      expect(workflowJson).toHaveProperty('exportedAt');
      expect(workflowJson).toHaveProperty('exportedBy', 'git-service');
      expect(workflowJson).toHaveProperty('checksum');
      expect(workflowJson.workflow).toHaveProperty('name', workflow.name);
      expect(workflowJson.workflow).toHaveProperty('description', workflow.description);
      expect(workflowJson.workflow).toHaveProperty('nodes');
      expect(workflowJson.workflow).toHaveProperty('connections');
      expect(workflowJson.workflow).toHaveProperty('triggers');
      expect(workflowJson.workflow).toHaveProperty('settings');
      expect(workflowJson.workflow.nodes).toHaveLength(2);
      expect(workflowJson.workflow.connections).toHaveLength(1);
    });

    it('should generate README with workflow information', async () => {
      const workflow = createSampleWorkflow();
      const files = await serializer.workflowToFiles(workflow);

      expect(files['README.md']).toContain(workflow.name);
      expect(files['README.md']).toContain(workflow.description!);
      expect(files['README.md']).toContain(workflow.id);
      expect(files['README.md']).toContain('**Nodes**: 2');
      expect(files['README.md']).toContain('**Connections**: 1');
      expect(files['README.md']).toContain('**Triggers**: 1');
      expect(files['README.md']).toContain('Import/Export Compatibility');
    });

    it('should format JSON file with proper indentation', async () => {
      const workflow = createSampleWorkflow();
      const files = await serializer.workflowToFiles(workflow);

      // Check that JSON is formatted (contains newlines and spaces)
      expect(files['workflow.json']).toContain('\n');
      expect(files['workflow.json']).toMatch(/  /); // Contains indentation
    });
  });

  describe('filesToWorkflow', () => {
    it('should reconstruct workflow from single file', async () => {
      const workflow = createSampleWorkflow();
      const files = await serializer.workflowToFiles(workflow);
      const reconstructed = await serializer.filesToWorkflow(files);

      expect(reconstructed.id).toBe(workflow.id);
      expect(reconstructed.name).toBe(workflow.name);
      expect(reconstructed.description).toBe(workflow.description);
      expect(reconstructed.nodes).toHaveLength(2);
      expect(reconstructed.connections).toHaveLength(1);
      expect(reconstructed.triggers).toHaveLength(1);
    });

    it('should handle invalid JSON in workflow.json', async () => {
      const invalidFiles: WorkflowFiles = {
        'workflow.json': 'invalid json',
      };

      await expect(serializer.filesToWorkflow(invalidFiles)).rejects.toThrow();
    });

    it('should validate version from workflow.json', async () => {
      const files: WorkflowFiles = {
        'workflow.json': JSON.stringify({ 
          version: '99.0.0',
          exportedAt: new Date().toISOString(),
          exportedBy: 'test',
          workflow: {
            title: 'Test',
            name: 'Test',
            tags: [],
            nodes: [],
            connections: [],
            triggers: [],
            settings: {},
          },
          checksum: 'abc123',
        }),
      };

      await expect(serializer.filesToWorkflow(files)).rejects.toThrow(AppError);
    });
  });

  describe('round-trip serialization', () => {
    it('should maintain data integrity through serialize-deserialize cycle', async () => {
      const workflow = createSampleWorkflow();
      const serialized = await serializer.serializeWorkflow(workflow);
      const deserialized = await serializer.deserializeWorkflow(serialized);

      expect(deserialized.id).toBe(workflow.id);
      expect(deserialized.name).toBe(workflow.name);
      expect(deserialized.nodes).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: 'node_1' }),
          expect.objectContaining({ id: 'node_2' }),
        ])
      );
    });

    it('should maintain data integrity through file conversion cycle', async () => {
      const workflow = createSampleWorkflow();
      const files = await serializer.workflowToFiles(workflow);
      const reconstructed = await serializer.filesToWorkflow(files);

      expect(reconstructed.id).toBe(workflow.id);
      expect(reconstructed.name).toBe(workflow.name);
      expect(reconstructed.nodes).toHaveLength(workflow.nodes.length);
      expect(reconstructed.connections).toHaveLength(workflow.connections.length);
    });
  });

  describe('version compatibility', () => {
    it('should return current version', () => {
      expect(serializer.getCurrentVersion()).toBe('1.0.0');
    });

    it('should check version compatibility correctly', () => {
      expect(serializer.isVersionCompatible('1.0.0')).toBe(true);
      expect(serializer.isVersionCompatible('0.9.0')).toBe(true);
      expect(serializer.isVersionCompatible('99.0.0')).toBe(false);
      expect(serializer.isVersionCompatible('')).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should handle empty arrays gracefully', async () => {
      const workflow = createSampleWorkflow();
      workflow.nodes = [];
      workflow.connections = [];
      workflow.triggers = [];

      const serialized = await serializer.serializeWorkflow(workflow);
      expect(serialized.workflow.nodes).toEqual([]);
      expect(serialized.workflow.connections).toEqual([]);
      expect(serialized.workflow.triggers).toEqual([]);
    });

    it('should handle null/undefined tags', async () => {
      const workflow = createSampleWorkflow();
      workflow.tags = null as any;

      const serialized = await serializer.serializeWorkflow(workflow);
      expect(serialized.workflow.tags).toEqual([]);
    });

    it('should handle missing settings gracefully', async () => {
      const workflow = createSampleWorkflow();
      workflow.settings = null as any;

      const serialized = await serializer.serializeWorkflow(workflow);
      expect(serialized.workflow.settings).toEqual({});
    });

    it('should handle workflows with special characters in names', async () => {
      const workflow = createSampleWorkflow();
      workflow.name = 'Test Workflow with "quotes" and \'apostrophes\'';
      workflow.description = 'Description with\nnewlines\nand\ttabs';

      const files = await serializer.workflowToFiles(workflow);
      const reconstructed = await serializer.filesToWorkflow(files);

      expect(reconstructed.name).toBe(workflow.name);
      expect(reconstructed.description).toBe(workflow.description);
    });
  });
});
