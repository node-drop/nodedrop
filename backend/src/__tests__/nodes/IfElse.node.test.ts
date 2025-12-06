/**
 * Unit tests for If and IfElse nodes
 * Tests condition evaluation and branch routing
 */

import { IfNode } from '../../nodes/Ifxxxxxx/If.node';
import { IfElseNode } from '../../nodes/IfElse/IfElse.node';
import { NodeInputData } from '../../types/node.types';

describe('If Node', () => {
  describe('Condition evaluation', () => {
    it('should route to true branch when condition is met', async () => {
      const inputData: NodeInputData = {
        main: [[{ json: { status: 'active', id: 1 } }]]
      };

      const context = {
        getNodeParameter: jest.fn((name: string) => {
          if (name === 'condition') {
            return {
              key: 'status',
              expression: 'equal',
              value: 'active'
            };
          }
        }),
        normalizeInputItems: (items: any) => items[0],
        extractJsonData: (items: any) => items.map((item: any) => item.json)
      };

      const result = await IfNode.execute.call(context, inputData);

      expect(result).toHaveLength(2);
      expect(result[0].true).toHaveLength(1);
      expect(result[1].false).toHaveLength(0);
      expect(result[0].true[0].json).toEqual({ status: 'active', id: 1 });
    });

    it('should route to false branch when condition is not met', async () => {
      const inputData: NodeInputData = {
        main: [[{ json: { status: 'inactive', id: 2 } }]]
      };

      const context = {
        getNodeParameter: jest.fn((name: string) => {
          if (name === 'condition') {
            return {
              key: 'status',
              expression: 'equal',
              value: 'active'
            };
          }
        }),
        normalizeInputItems: (items: any) => items[0],
        extractJsonData: (items: any) => items.map((item: any) => item.json)
      };

      const result = await IfNode.execute.call(context, inputData);

      expect(result[0].true).toHaveLength(0);
      expect(result[1].false).toHaveLength(1);
      expect(result[1].false[0].json).toEqual({ status: 'inactive', id: 2 });
    });

    it('should handle nested field paths', async () => {
      const inputData: NodeInputData = {
        main: [[{ json: { user: { role: 'admin', id: 1 } } }]]
      };

      const context = {
        getNodeParameter: jest.fn((name: string) => {
          if (name === 'condition') {
            return {
              key: 'user.role',
              expression: 'equal',
              value: 'admin'
            };
          }
        }),
        normalizeInputItems: (items: any) => items[0],
        extractJsonData: (items: any) => items.map((item: any) => item.json)
      };

      const result = await IfNode.execute.call(context, inputData);

      expect(result[0].true).toHaveLength(1);
      expect(result[1].false).toHaveLength(0);
    });

    it('should handle template expressions', async () => {
      const inputData: NodeInputData = {
        main: [[{ json: { status: 'active', priority: 'high' } }]]
      };

      const context = {
        getNodeParameter: jest.fn((name: string) => {
          if (name === 'condition') {
            return {
              key: '{{json.status}}',
              expression: 'equal',
              value: 'active'
            };
          }
        }),
        normalizeInputItems: (items: any) => items[0],
        extractJsonData: (items: any) => items.map((item: any) => item.json)
      };

      const result = await IfNode.execute.call(context, inputData);

      expect(result[0].true).toHaveLength(1);
    });

    it('should handle multiple items', async () => {
      const inputData: NodeInputData = {
        main: [[
          { json: { id: 1, status: 'active' } },
          { json: { id: 2, status: 'inactive' } },
          { json: { id: 3, status: 'active' } }
        ]]
      };

      const context = {
        getNodeParameter: jest.fn((name: string) => {
          if (name === 'condition') {
            return {
              key: 'status',
              expression: 'equal',
              value: 'active'
            };
          }
        }),
        normalizeInputItems: (items: any) => items[0],
        extractJsonData: (items: any) => items.map((item: any) => item.json)
      };

      const result = await IfNode.execute.call(context, inputData);

      // All items go to the same branch based on first item's condition
      expect(result[0].true).toHaveLength(3);
      expect(result[1].false).toHaveLength(0);
    });
  });

  describe('Comparison operations', () => {
    const testCases = [
      { operation: 'notEqual', key: 'status', value: 'inactive', expected: 'true' },
      { operation: 'larger', key: 'age', value: '25', expected: 'true' },
      { operation: 'largerEqual', key: 'age', value: '30', expected: 'true' },
      { operation: 'smaller', key: 'age', value: '35', expected: 'true' },
      { operation: 'smallerEqual', key: 'age', value: '30', expected: 'true' },
      { operation: 'contains', key: 'name', value: 'John', expected: 'true' },
      { operation: 'startsWith', key: 'name', value: 'John', expected: 'true' },
      { operation: 'endsWith', key: 'name', value: 'Doe', expected: 'true' },
    ];

    testCases.forEach(({ operation, key, value, expected }) => {
      it(`should handle ${operation} operation`, async () => {
        const inputData: NodeInputData = {
          main: [[{ json: { status: 'active', age: 30, name: 'John Doe' } }]]
        };

        const context = {
          getNodeParameter: jest.fn((name: string) => {
            if (name === 'condition') {
              return { key, expression: operation, value };
            }
          }),
          normalizeInputItems: (items: any) => items[0],
          extractJsonData: (items: any) => items.map((item: any) => item.json)
        };

        const result = await IfNode.execute.call(context, inputData);

        if (expected === 'true') {
          expect(result[0].true).toHaveLength(1);
          expect(result[1].false).toHaveLength(0);
        } else {
          expect(result[0].true).toHaveLength(0);
          expect(result[1].false).toHaveLength(1);
        }
      });
    });
  });
});

describe('IfElse Node', () => {
  describe('Simple mode', () => {
    it('should route to true branch in simple mode', async () => {
      const inputData: NodeInputData = {
        main: [[{ json: { status: 'active' } }]]
      };

      const context = {
        getNodeParameter: jest.fn((name: string) => {
          if (name === 'mode') return 'simple';
          if (name === 'condition') {
            return {
              key: 'status',
              expression: 'equal',
              value: 'active'
            };
          }
        }),
        normalizeInputItems: (items: any) => items[0],
        extractJsonData: (items: any) => items.map((item: any) => item.json)
      };

      const result = await IfElseNode.execute.call(context, inputData);

      expect(result[0].true).toHaveLength(1);
      expect(result[1].false).toHaveLength(0);
    });
  });

  describe('Combine mode', () => {
    it('should handle AND operation with all conditions true', async () => {
      const inputData: NodeInputData = {
        main: [[{ json: { status: 'active', priority: 'high' } }]]
      };

      const context = {
        getNodeParameter: jest.fn((name: string) => {
          if (name === 'mode') return 'combine';
          if (name === 'combineOperation') return 'AND';
          if (name === 'conditions') {
            return [
              { values: { condition: { key: 'status', expression: 'equal', value: 'active' } } },
              { values: { condition: { key: 'priority', expression: 'equal', value: 'high' } } }
            ];
          }
        }),
        normalizeInputItems: (items: any) => items[0],
        extractJsonData: (items: any) => items.map((item: any) => item.json)
      };

      const result = await IfElseNode.execute.call(context, inputData);

      expect(result[0].true).toHaveLength(1);
      expect(result[1].false).toHaveLength(0);
    });

    it('should handle OR operation with one condition true', async () => {
      const inputData: NodeInputData = {
        main: [[{ json: { status: 'active', priority: 'low' } }]]
      };

      const context = {
        getNodeParameter: jest.fn((name: string) => {
          if (name === 'mode') return 'combine';
          if (name === 'combineOperation') return 'OR';
          if (name === 'conditions') {
            return [
              { values: { condition: { key: 'status', expression: 'equal', value: 'active' } } },
              { values: { condition: { key: 'priority', expression: 'equal', value: 'high' } } }
            ];
          }
        }),
        normalizeInputItems: (items: any) => items[0],
        extractJsonData: (items: any) => items.map((item: any) => item.json)
      };

      const result = await IfElseNode.execute.call(context, inputData);

      expect(result[0].true).toHaveLength(1);
      expect(result[1].false).toHaveLength(0);
    });

    it('should route to false when AND operation has one false condition', async () => {
      const inputData: NodeInputData = {
        main: [[{ json: { status: 'active', priority: 'low' } }]]
      };

      const context = {
        getNodeParameter: jest.fn((name: string) => {
          if (name === 'mode') return 'combine';
          if (name === 'combineOperation') return 'AND';
          if (name === 'conditions') {
            return [
              { values: { condition: { key: 'status', expression: 'equal', value: 'active' } } },
              { values: { condition: { key: 'priority', expression: 'equal', value: 'high' } } }
            ];
          }
        }),
        normalizeInputItems: (items: any) => items[0],
        extractJsonData: (items: any) => items.map((item: any) => item.json)
      };

      const result = await IfElseNode.execute.call(context, inputData);

      expect(result[0].true).toHaveLength(0);
      expect(result[1].false).toHaveLength(1);
    });
  });

  describe('Grouped mode', () => {
    it('should handle nested groups with complex logic', async () => {
      const inputData: NodeInputData = {
        main: [[{ json: { status: 'active', priority: 'high', category: 'urgent' } }]]
      };

      const context = {
        getNodeParameter: jest.fn((name: string) => {
          if (name === 'mode') return 'grouped';
          if (name === 'combineGroups') return 'AND';
          if (name === 'conditionGroups') {
            return [
              {
                values: {
                  groupOperation: 'OR',
                  conditions: [
                    { values: { condition: { key: 'status', expression: 'equal', value: 'active' } } },
                    { values: { condition: { key: 'status', expression: 'equal', value: 'pending' } } }
                  ]
                }
              },
              {
                values: {
                  groupOperation: 'OR',
                  conditions: [
                    { values: { condition: { key: 'priority', expression: 'equal', value: 'high' } } },
                    { values: { condition: { key: 'category', expression: 'equal', value: 'urgent' } } }
                  ]
                }
              }
            ];
          }
        }),
        normalizeInputItems: (items: any) => items[0],
        extractJsonData: (items: any) => items.map((item: any) => item.json)
      };

      const result = await IfElseNode.execute.call(context, inputData);

      expect(result[0].true).toHaveLength(1);
      expect(result[1].false).toHaveLength(0);
    });
  });
});
