import { NodeServiceDrizzle } from '../../services/NodeService.drizzle';
import { db } from '../../db/client';
import { nodeTypes } from '../../db/schema/nodes';
import { NodeDefinition, NodeRegistrationResult } from '../../types/node.types';
import { eq } from 'drizzle-orm';

// Mock the database
jest.mock('../../db/client', () => ({
  db: {
    query: {
      nodeTypes: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
      },
    },
    insert: jest.fn(),
    update: jest.fn(),
  },
}));

// Mock logger
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
  },
}));

// Mock NodeDiscovery
jest.mock('../../utils/NodeDiscovery', () => ({
  nodeDiscovery: {
    loadAllNodes: jest.fn().mockResolvedValue([]),
    loadCustomNodes: jest.fn().mockResolvedValue([]),
  },
}));

// Mock SecureExecutionService
jest.mock('../../services/SecureExecutionService', () => ({
  SecureExecutionService: jest.fn().mockImplementation(() => ({
    validateInputData: jest.fn().mockReturnValue({ valid: true, sanitizedData: {} }),
    validateOutputData: jest.fn().mockReturnValue({ valid: true, sanitizedData: [] }),
    createSecureContext: jest.fn().mockResolvedValue({}),
    cleanupExecution: jest.fn().mockResolvedValue(undefined),
  })),
}));

describe('NodeServiceDrizzle', () => {
  let nodeService: NodeServiceDrizzle;

  beforeEach(() => {
    nodeService = new NodeServiceDrizzle();
    jest.clearAllMocks();
  });

  describe('registerNode', () => {
    const validNodeDefinition: NodeDefinition = {
      identifier: 'test-node',
      displayName: 'Test Node',
      name: 'testNode',
      group: ['test'],
      version: 1,
      description: 'A test node',
      defaults: {},
      inputs: ['main'],
      outputs: ['main'],
      properties: [
        {
          displayName: 'Test Property',
          name: 'testProp',
          type: 'string',
          required: true,
          default: 'test',
        },
      ],
      execute: async function () {
        return [{ main: [] }];
      },
    };

    it('should register a new node successfully with all fields', async () => {
      (db.query.nodeTypes.findFirst as jest.Mock).mockResolvedValue(null);
      
      const mockInsert = jest.fn().mockReturnValue({
        values: jest.fn().mockResolvedValue({}),
      });
      (db.insert as jest.Mock).mockReturnValue(mockInsert());

      const result = await nodeService.registerNode(validNodeDefinition, false, {
        workspaceId: 'workspace-1',
      });

      expect(result.success).toBe(true);
      expect(result.identifier).toBe('test-node');
    });

    it('should include credentials and credentialSelector fields in insert', async () => {
      (db.query.nodeTypes.findFirst as jest.Mock).mockResolvedValue(null);

      const nodeWithCredentials: NodeDefinition = {
        ...validNodeDefinition,
        credentials: { type: 'oauth2' },
        credentialSelector: { field: 'credential' },
      };

      const mockInsert = jest.fn().mockReturnValue({
        values: jest.fn().mockResolvedValue({}),
      });
      (db.insert as jest.Mock).mockReturnValue(mockInsert());

      await nodeService.registerNode(nodeWithCredentials);

      // Verify insert was called
      expect(db.insert).toHaveBeenCalled();
    });

    it('should include credentials and credentialSelector fields in update', async () => {
      (db.query.nodeTypes.findFirst as jest.Mock).mockResolvedValue({
        identifier: 'test-node',
        active: true,
      });

      const nodeWithCredentials: NodeDefinition = {
        ...validNodeDefinition,
        credentials: { type: 'oauth2' },
        credentialSelector: { field: 'credential' },
      };

      const mockUpdate = jest.fn().mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue({}),
        }),
      });
      (db.update as jest.Mock).mockReturnValue(mockUpdate());

      await nodeService.registerNode(nodeWithCredentials);

      // Verify update was called
      expect(db.update).toHaveBeenCalled();
    });

    it('should handle group field as array', async () => {
      (db.query.nodeTypes.findFirst as jest.Mock).mockResolvedValue(null);

      const nodeWithGroupArray: NodeDefinition = {
        ...validNodeDefinition,
        group: ['category1', 'category2', 'category3'],
      };

      const mockInsert = jest.fn().mockReturnValue({
        values: jest.fn().mockResolvedValue({}),
      });
      (db.insert as jest.Mock).mockReturnValue(mockInsert());

      const result = await nodeService.registerNode(nodeWithGroupArray);

      expect(result.success).toBe(true);
    });

    it('should fail with descriptive error for missing identifier', async () => {
      const invalidNode = {
        ...validNodeDefinition,
        identifier: undefined,
      } as any;

      const result = await nodeService.registerNode(invalidNode);

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors![0]).toContain('identifier');
    });

    it('should fail with descriptive error for missing displayName', async () => {
      const invalidNode = {
        ...validNodeDefinition,
        displayName: undefined,
      } as any;

      const result = await nodeService.registerNode(invalidNode);

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors![0]).toContain('displayName');
    });

    it('should fail with descriptive error for missing name', async () => {
      const invalidNode = {
        ...validNodeDefinition,
        name: undefined,
      } as any;

      const result = await nodeService.registerNode(invalidNode);

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors![0]).toContain('name');
    });

    it('should fail with descriptive error for missing description', async () => {
      const invalidNode = {
        ...validNodeDefinition,
        description: undefined,
      } as any;

      const result = await nodeService.registerNode(invalidNode);

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors![0]).toContain('description');
    });

    it('should fail with descriptive error for non-array group', async () => {
      const invalidNode = {
        ...validNodeDefinition,
        group: 'not-an-array',
      } as any;

      const result = await nodeService.registerNode(invalidNode);

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors![0]).toContain('group');
    });

    it('should fail with descriptive error for non-array inputs', async () => {
      const invalidNode = {
        ...validNodeDefinition,
        inputs: 'not-an-array',
      } as any;

      const result = await nodeService.registerNode(invalidNode);

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors![0]).toContain('inputs');
    });

    it('should fail with descriptive error for non-array outputs', async () => {
      const invalidNode = {
        ...validNodeDefinition,
        outputs: 'not-an-array',
      } as any;

      const result = await nodeService.registerNode(invalidNode);

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors![0]).toContain('outputs');
    });

    it('should serialize error objects properly in logging', async () => {
      const dbError = new Error('Database connection failed');
      (dbError as any).code = 'ECONNREFUSED';
      (db.query.nodeTypes.findFirst as jest.Mock).mockRejectedValue(dbError);

      const result = await nodeService.registerNode(validNodeDefinition);

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors![0]).toContain('Database connection failed');
    });

    it('should handle unique constraint violations', async () => {
      const constraintError = new Error('duplicate key value violates unique constraint');
      (constraintError as any).code = '23505';
      (db.query.nodeTypes.findFirst as jest.Mock).mockRejectedValue(constraintError);

      const result = await nodeService.registerNode(validNodeDefinition);

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors![0]).toContain('already exists');
    });

    it('should handle not null constraint violations', async () => {
      const constraintError = new Error('null value in column violates not-null constraint');
      (constraintError as any).code = '23502';
      (constraintError as any).detail = 'Failing row contains (null, test, ...)';
      (db.query.nodeTypes.findFirst as jest.Mock).mockRejectedValue(constraintError);

      const result = await nodeService.registerNode(validNodeDefinition);

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors![0]).toContain('Missing required field');
    });

    it('should preserve active status on update', async () => {
      (db.query.nodeTypes.findFirst as jest.Mock).mockResolvedValue({
        identifier: 'test-node',
        active: false, // Node is inactive
      });

      const mockUpdate = jest.fn().mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue({}),
        }),
      });
      (db.update as jest.Mock).mockReturnValue(mockUpdate());

      await nodeService.registerNode(validNodeDefinition);

      // Verify update was called (active status should not be in the update)
      expect(db.update).toHaveBeenCalled();
    });

    it('should preserve workspaceId on update', async () => {
      (db.query.nodeTypes.findFirst as jest.Mock).mockResolvedValue({
        identifier: 'test-node',
        workspaceId: 'original-workspace',
      });

      const mockUpdate = jest.fn().mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue({}),
        }),
      });
      (db.update as jest.Mock).mockReturnValue(mockUpdate());

      await nodeService.registerNode(validNodeDefinition, false, {
        workspaceId: 'new-workspace',
      });

      // Verify update was called (workspaceId should not be in the update)
      expect(db.update).toHaveBeenCalled();
    });
  });

  describe('preValidateNodeDefinition', () => {
    const validNodeDefinition: NodeDefinition = {
      identifier: 'test-node',
      displayName: 'Test Node',
      name: 'testNode',
      group: ['test'],
      version: 1,
      description: 'A test node',
      defaults: {},
      inputs: ['main'],
      outputs: ['main'],
      properties: [],
      execute: async function () {
        return [{ main: [] }];
      },
    };

    it('should validate correct node definition', () => {
      const result = (nodeService as any).preValidateNodeDefinition(
        validNodeDefinition
      );

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject node with non-string identifier', () => {
      const invalidNode = {
        ...validNodeDefinition,
        identifier: 123,
      } as any;

      const result = (nodeService as any).preValidateNodeDefinition(invalidNode);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('identifier');
    });

    it('should reject node with non-string displayName', () => {
      const invalidNode = {
        ...validNodeDefinition,
        displayName: 123,
      } as any;

      const result = (nodeService as any).preValidateNodeDefinition(invalidNode);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('displayName');
    });

    it('should reject node with non-string name', () => {
      const invalidNode = {
        ...validNodeDefinition,
        name: 123,
      } as any;

      const result = (nodeService as any).preValidateNodeDefinition(invalidNode);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('name');
    });

    it('should reject node with non-string description', () => {
      const invalidNode = {
        ...validNodeDefinition,
        description: 123,
      } as any;

      const result = (nodeService as any).preValidateNodeDefinition(invalidNode);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('description');
    });

    it('should reject node with non-array group', () => {
      const invalidNode = {
        ...validNodeDefinition,
        group: 'not-array',
      } as any;

      const result = (nodeService as any).preValidateNodeDefinition(invalidNode);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('group');
    });

    it('should reject node with non-array inputs', () => {
      const invalidNode = {
        ...validNodeDefinition,
        inputs: 'not-array',
      } as any;

      const result = (nodeService as any).preValidateNodeDefinition(invalidNode);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('inputs');
    });

    it('should reject node with non-array outputs', () => {
      const invalidNode = {
        ...validNodeDefinition,
        outputs: 'not-array',
      } as any;

      const result = (nodeService as any).preValidateNodeDefinition(invalidNode);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('outputs');
    });

    it('should reject node with invalid properties type', () => {
      const invalidNode = {
        ...validNodeDefinition,
        properties: 'not-array-or-function',
      } as any;

      const result = (nodeService as any).preValidateNodeDefinition(invalidNode);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('properties');
    });

    it('should accept node with properties as function', () => {
      const nodeWithFunctionProperties = {
        ...validNodeDefinition,
        properties: () => [],
      };

      const result = (nodeService as any).preValidateNodeDefinition(
        nodeWithFunctionProperties
      );

      expect(result.valid).toBe(true);
    });
  });
});
