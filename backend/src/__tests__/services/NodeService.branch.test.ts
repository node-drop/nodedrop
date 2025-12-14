/**
 * Unit tests for branch execution in NodeService
 * Tests the standardizeNodeOutput function with various node types
 */

import prisma from '../../config/database';
import { NodeService } from '../../services/NodeService';
import { NodeOutputData } from '../../types/node.types';

// Mock isolated-vm
jest.mock('isolated-vm', () => ({
  __esModule: true,
  default: {
    Isolate: jest.fn(),
  },
}));

// Mock Prisma
jest.mock('@prisma/client');

describe('NodeService - Branch Execution', () => {
  let nodeService: NodeService;

  beforeEach(() => {
    process.env.CREDENTIAL_ENCRYPTION_KEY = 'a'.repeat(64);
    nodeService = new NodeService(prisma);
  });

  describe('standardizeNodeOutput', () => {
    describe('If/IfElse nodes - Named branch outputs', () => {
      it('should correctly standardize If node output with true branch', () => {
        const outputs: NodeOutputData[] = [
          { true: [{ json: { id: 1, name: 'Test' } }] },
          { false: [] }
        ];

        const nodeDefinition = {
          identifier: 'if',
          outputs: ['true', 'false']
        };

        // Access private method via type assertion
        const result = (nodeService as any).standardizeNodeOutput('if', outputs, nodeDefinition);

        expect(result).toEqual({
          main: [{ json: { id: 1, name: 'Test' } }],
          branches: {
            true: [{ json: { id: 1, name: 'Test' } }],
            false: []
          },
          metadata: {
            nodeType: 'if',
            outputCount: 2,
            hasMultipleBranches: true
          }
        });
      });

      it('should correctly standardize If node output with false branch', () => {
        const outputs: NodeOutputData[] = [
          { true: [] },
          { false: [{ json: { id: 2, status: 'inactive' } }] }
        ];

        const nodeDefinition = {
          identifier: 'if',
          outputs: ['true', 'false']
        };

        const result = (nodeService as any).standardizeNodeOutput('if', outputs, nodeDefinition);

        expect(result.branches.true).toHaveLength(0);
        expect(result.branches.false).toHaveLength(1);
        expect(result.branches.false[0]).toEqual({ json: { id: 2, status: 'inactive' } });
      });

      it('should handle IfElse node with multiple items in true branch', () => {
        const outputs: NodeOutputData[] = [
          { 
            true: [
              { json: { id: 1 } },
              { json: { id: 2 } },
              { json: { id: 3 } }
            ] 
          },
          { false: [] }
        ];

        const nodeDefinition = {
          identifier: 'ifElse',
          outputs: ['true', 'false']
        };

        const result = (nodeService as any).standardizeNodeOutput('ifElse', outputs, nodeDefinition);

        expect(result.branches.true).toHaveLength(3);
        expect(result.main).toHaveLength(3);
      });
    });

    describe('Switch node - Dynamic branch outputs', () => {
      it('should correctly standardize Switch node with dynamic branch names', () => {
        const outputs: NodeOutputData[] = [
          { status: [{ json: { id: 1, status: 'active' } }] },
          { priority: [{ json: { id: 2, priority: 'high' } }] },
          { category: [] }
        ];

        const nodeDefinition = {
          identifier: 'switch',
          outputs: ['main']
        };

        const result = (nodeService as any).standardizeNodeOutput('switch', outputs, nodeDefinition);

        expect(result.branches).toHaveProperty('status');
        expect(result.branches).toHaveProperty('priority');
        expect(result.branches).toHaveProperty('category');
        expect(result.branches.status).toHaveLength(1);
        expect(result.branches.priority).toHaveLength(1);
        expect(result.branches.category).toHaveLength(0);
      });

      it('should handle Switch node with multiple items in same branch', () => {
        const outputs: NodeOutputData[] = [
          { 
            status: [
              { json: { id: 1, status: 'active' } },
              { json: { id: 2, status: 'active' } }
            ] 
          },
          { priority: [] }
        ];

        const nodeDefinition = {
          identifier: 'switch',
          outputs: ['main']
        };

        const result = (nodeService as any).standardizeNodeOutput('switch', outputs, nodeDefinition);

        expect(result.branches.status).toHaveLength(2);
        expect(result.main).toHaveLength(2);
      });
    });

    describe('Loop node - Positional outputs', () => {
      it('should correctly standardize Loop node with loop output', () => {
        const outputs: NodeOutputData[] = [
          { main: [{ json: { iteration: 1, value: 'test' } }] },
          { main: [] }
        ];

        const nodeDefinition = {
          identifier: 'loop',
          outputs: ['loop', 'done']
        };

        const result = (nodeService as any).standardizeNodeOutput('loop', outputs, nodeDefinition);

        expect(result.branches).toHaveProperty('loop');
        expect(result.branches).toHaveProperty('done');
        expect(result.branches.loop).toHaveLength(1);
        expect(result.branches.done).toHaveLength(0);
        expect(result.branches.loop[0]).toEqual({ json: { iteration: 1, value: 'test' } });
      });

      it('should correctly standardize Loop node with done output', () => {
        const outputs: NodeOutputData[] = [
          { main: [] },
          { main: [{ json: { completed: true, totalIterations: 5 } }] }
        ];

        const nodeDefinition = {
          identifier: 'loop',
          outputs: ['loop', 'done']
        };

        const result = (nodeService as any).standardizeNodeOutput('loop', outputs, nodeDefinition);

        expect(result.branches.loop).toHaveLength(0);
        expect(result.branches.done).toHaveLength(1);
        expect(result.branches.done[0]).toEqual({ json: { completed: true, totalIterations: 5 } });
      });

      it('should handle Loop node with multiple iterations', () => {
        const outputs: NodeOutputData[] = [
          { 
            main: [
              { json: { iteration: 1 } },
              { json: { iteration: 2 } },
              { json: { iteration: 3 } }
            ] 
          },
          { main: [] }
        ];

        const nodeDefinition = {
          identifier: 'loop',
          outputs: ['loop', 'done']
        };

        const result = (nodeService as any).standardizeNodeOutput('loop', outputs, nodeDefinition);

        expect(result.branches.loop).toHaveLength(3);
        expect(result.main).toHaveLength(3);
      });
    });

    describe('Standard nodes - Single output', () => {
      it('should correctly standardize standard node with main output', () => {
        const outputs: NodeOutputData[] = [
          { 
            main: [
              { json: { id: 1, name: 'Test' } },
              { json: { id: 2, name: 'Test2' } }
            ] 
          }
        ];

        const nodeDefinition = {
          identifier: 'json',
          outputs: ['main']
        };

        const result = (nodeService as any).standardizeNodeOutput('json', outputs, nodeDefinition);

        expect(result.main).toHaveLength(2);
        expect(result.branches).toBeUndefined();
        expect(result.metadata.hasMultipleBranches).toBe(false);
      });

      it('should handle empty main output', () => {
        const outputs: NodeOutputData[] = [
          { main: [] }
        ];

        const nodeDefinition = {
          identifier: 'json',
          outputs: ['main']
        };

        const result = (nodeService as any).standardizeNodeOutput('json', outputs, nodeDefinition);

        expect(result.main).toHaveLength(0);
        expect(result.metadata.hasMultipleBranches).toBe(false);
      });
    });

    describe('Edge cases', () => {
      it('should handle empty outputs array', () => {
        const outputs: NodeOutputData[] = [];

        const nodeDefinition = {
          identifier: 'test',
          outputs: ['main']
        };

        const result = (nodeService as any).standardizeNodeOutput('test', outputs, nodeDefinition);

        expect(result.main).toHaveLength(0);
      });

      it('should handle mixed branch names including main', () => {
        const outputs: NodeOutputData[] = [
          { main: [{ json: { id: 1 } }] },
          { custom: [{ json: { id: 2 } }] }
        ];

        const nodeDefinition = {
          identifier: 'custom',
          outputs: ['main']
        };

        const result = (nodeService as any).standardizeNodeOutput('custom', outputs, nodeDefinition);

        expect(result.branches).toHaveProperty('main');
        expect(result.branches).toHaveProperty('custom');
        expect(result.main).toHaveLength(2);
      });

      it('should concatenate data from multiple outputs with same branch name', () => {
        const outputs: NodeOutputData[] = [
          { true: [{ json: { id: 1 } }] },
          { true: [{ json: { id: 2 } }] },
          { false: [] }
        ];

        const nodeDefinition = {
          identifier: 'if',
          outputs: ['true', 'false']
        };

        const result = (nodeService as any).standardizeNodeOutput('if', outputs, nodeDefinition);

        expect(result.branches.true).toHaveLength(2);
        expect(result.branches.true[0]).toEqual({ json: { id: 1 } });
        expect(result.branches.true[1]).toEqual({ json: { id: 2 } });
      });
    });
  });
});
