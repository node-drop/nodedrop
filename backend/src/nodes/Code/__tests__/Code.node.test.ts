import { CodeNode } from "../Code.node";
import { NodeInputData } from "../../../types/node.types";

describe("CodeNode", () => {
  describe("Node Definition", () => {
    it("should have correct basic properties", () => {
      expect(CodeNode.type).toBe("code");
      expect(CodeNode.displayName).toBe("Code");
      expect(CodeNode.name).toBe("code");
      expect(CodeNode.version).toBe(1);
      expect(CodeNode.group).toContain("transform");
    });

    it("should have required properties", () => {
      expect(Array.isArray(CodeNode.properties)).toBe(true);
      expect(CodeNode.properties.length).toBeGreaterThan(0);
    });

    it("should have language property with JavaScript and Python options", () => {
      const languageProp = CodeNode.properties.find((p) => p.name === "language");
      expect(languageProp).toBeDefined();
      expect(languageProp?.type).toBe("options");
      expect(languageProp?.options).toHaveLength(2);
      expect(languageProp?.options?.[0].value).toBe("javascript");
      expect(languageProp?.options?.[1].value).toBe("python");
    });

    it("should have code property", () => {
      const codeProp = CodeNode.properties.find((p) => p.name === "code");
      expect(codeProp).toBeDefined();
      expect(codeProp?.type).toBe("string");
      expect(codeProp?.required).toBe(true);
    });
  });

  describe("Execute Function - JavaScript", () => {
    const createMockContext = (parameters: Record<string, any>) => ({
      getNodeParameter: jest.fn(async (paramName: string) => parameters[paramName]),
      getCredentials: jest.fn(),
      getInputData: jest.fn(),
      helpers: {} as any,
      logger: {
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
      },
      resolveValue: jest.fn(),
      resolvePath: jest.fn(),
      extractJsonData: jest.fn(),
      wrapJsonData: jest.fn(),
      normalizeInputItems: jest.fn(),
    });

    it("should execute simple JavaScript code", async () => {
      const mockContext = createMockContext({
        language: "javascript",
        code: "return items.map(item => ({ ...item, processed: true }));",
        timeout: 30000,
        continueOnFail: false,
      });

      const inputData: NodeInputData = {
        main: [[{ json: { name: "test", value: 123 } }]],
      };

      const result = await CodeNode.execute.call(mockContext, inputData);

      expect(result).toHaveLength(1);
      expect(result[0].main).toHaveLength(1);
      expect(result[0].main?.[0].json.name).toBe("test");
      expect(result[0].main?.[0].json.processed).toBe(true);
    });

    it("should handle multiple items in JavaScript", async () => {
      const mockContext = createMockContext({
        language: "javascript",
        code: "return items.map((item, index) => ({ ...item, index }));",
        timeout: 30000,
        continueOnFail: false,
      });

      const inputData: NodeInputData = {
        main: [
          [
            { json: { name: "item1" } },
            { json: { name: "item2" } },
            { json: { name: "item3" } },
          ],
        ],
      };

      const result = await CodeNode.execute.call(mockContext, inputData);

      expect(result[0].main).toHaveLength(3);
      expect(result[0].main?.[0].json.index).toBe(0);
      expect(result[0].main?.[1].json.index).toBe(1);
      expect(result[0].main?.[2].json.index).toBe(2);
    });

    it("should handle JavaScript Date operations", async () => {
      const mockContext = createMockContext({
        language: "javascript",
        code: `
          return items.map(item => ({
            ...item,
            timestamp: new Date().toISOString(),
            year: new Date().getFullYear()
          }));
        `,
        timeout: 30000,
        continueOnFail: false,
      });

      const inputData: NodeInputData = {
        main: [[{ json: { name: "test" } }]],
      };

      const result = await CodeNode.execute.call(mockContext, inputData);

      expect(result[0].main?.[0].json.timestamp).toBeDefined();
      expect(result[0].main?.[0].json.year).toBe(new Date().getFullYear());
    });

    it("should handle JavaScript Math operations", async () => {
      const mockContext = createMockContext({
        language: "javascript",
        code: `
          return items.map(item => ({
            ...item,
            doubled: item.value * 2,
            sqrt: Math.sqrt(item.value),
            rounded: Math.round(item.value)
          }));
        `,
        timeout: 30000,
        continueOnFail: false,
      });

      const inputData: NodeInputData = {
        main: [[{ json: { value: 16 } }]],
      };

      const result = await CodeNode.execute.call(mockContext, inputData);

      expect(result[0].main?.[0].json.doubled).toBe(32);
      expect(result[0].main?.[0].json.sqrt).toBe(4);
      expect(result[0].main?.[0].json.rounded).toBe(16);
    });

    it("should handle errors in JavaScript with continueOnFail", async () => {
      const mockContext = createMockContext({
        language: "javascript",
        code: "throw new Error('Test error');",
        timeout: 30000,
        continueOnFail: true,
      });

      const inputData: NodeInputData = {
        main: [[{ json: { name: "test" } }]],
      };

      const result = await CodeNode.execute.call(mockContext, inputData);

      expect(result[0].main?.[0].json.error).toBe(true);
      expect(result[0].main?.[0].json.message).toContain("Test error");
    });

    it("should throw error without continueOnFail", async () => {
      const mockContext = createMockContext({
        language: "javascript",
        code: "throw new Error('Test error');",
        timeout: 30000,
        continueOnFail: false,
      });

      const inputData: NodeInputData = {
        main: [[{ json: { name: "test" } }]],
      };

      await expect(
        CodeNode.execute.call(mockContext, inputData)
      ).rejects.toThrow();
    });

    it("should handle array filtering in JavaScript", async () => {
      const mockContext = createMockContext({
        language: "javascript",
        code: "return items.filter(item => item.age > 25);",
        timeout: 30000,
        continueOnFail: false,
      });

      const inputData: NodeInputData = {
        main: [
          [
            { json: { name: "John", age: 30 } },
            { json: { name: "Jane", age: 20 } },
            { json: { name: "Bob", age: 35 } },
          ],
        ],
      };

      const result = await CodeNode.execute.call(mockContext, inputData);

      expect(result[0].main).toHaveLength(2);
      expect(result[0].main?.[0].json.name).toBe("John");
      expect(result[0].main?.[1].json.name).toBe("Bob");
    });

    it("should handle JSON operations in JavaScript", async () => {
      const mockContext = createMockContext({
        language: "javascript",
        code: `
          return items.map(item => {
            const jsonStr = JSON.stringify(item);
            const parsed = JSON.parse(jsonStr);
            return { ...parsed, serialized: jsonStr };
          });
        `,
        timeout: 30000,
        continueOnFail: false,
      });

      const inputData: NodeInputData = {
        main: [[{ json: { name: "test", value: 123 } }]],
      };

      const result = await CodeNode.execute.call(mockContext, inputData);

      expect(result[0].main?.[0].json.serialized).toContain("test");
      expect(result[0].main?.[0].json.serialized).toContain("123");
    });
  });

  describe("Execute Function - Python", () => {
    const createMockContext = (parameters: Record<string, any>) => ({
      getNodeParameter: jest.fn(async (paramName: string) => parameters[paramName]),
      getCredentials: jest.fn(),
      getInputData: jest.fn(),
      helpers: {} as any,
      logger: {
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
      },
      resolveValue: jest.fn(),
      resolvePath: jest.fn(),
      extractJsonData: jest.fn(),
      wrapJsonData: jest.fn(),
      normalizeInputItems: jest.fn(),
    });

    // Note: Python tests will only run if Python 3 is installed
    // In CI/CD environments without Python, these tests may be skipped

    it("should execute simple Python code", async () => {
      const mockContext = createMockContext({
        language: "python",
        code: `
import json
results = [{'name': item.get('name'), 'processed': True} for item in items]
print(json.dumps(results))
        `,
        timeout: 30000,
        continueOnFail: false,
      });

      const inputData: NodeInputData = {
        main: [[{ json: { name: "test", value: 123 } }]],
      };

      try {
        const result = await CodeNode.execute.call(mockContext, inputData);
        expect(result).toHaveLength(1);
        expect(result[0].main).toHaveLength(1);
        expect(result[0].main?.[0].json.name).toBe("test");
        expect(result[0].main?.[0].json.processed).toBe(true);
      } catch (error) {
        // Skip test if Python is not available
        if ((error as Error).message.includes("python3")) {
          console.warn("Python 3 not available, skipping Python test");
        } else {
          throw error;
        }
      }
    }, 60000); // Increase timeout for Python execution

    it("should handle multiple items in Python", async () => {
      const mockContext = createMockContext({
        language: "python",
        code: `
import json
results = []
for i, item in enumerate(items):
    item['index'] = i
    results.append(item)
print(json.dumps(results))
        `,
        timeout: 30000,
        continueOnFail: false,
      });

      const inputData: NodeInputData = {
        main: [
          [
            { json: { name: "item1" } },
            { json: { name: "item2" } },
            { json: { name: "item3" } },
          ],
        ],
      };

      try {
        const result = await CodeNode.execute.call(mockContext, inputData);
        expect(result[0].main).toHaveLength(3);
        expect(result[0].main?.[0].json.index).toBe(0);
        expect(result[0].main?.[1].json.index).toBe(1);
        expect(result[0].main?.[2].json.index).toBe(2);
      } catch (error) {
        if ((error as Error).message.includes("python3")) {
          console.warn("Python 3 not available, skipping Python test");
        } else {
          throw error;
        }
      }
    }, 60000);
  });

  describe("Input Data Handling", () => {
    const createMockContext = (parameters: Record<string, any>) => ({
      getNodeParameter: jest.fn(async (paramName: string) => parameters[paramName]),
      getCredentials: jest.fn(),
      getInputData: jest.fn(),
      helpers: {} as any,
      logger: {
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
      },
      resolveValue: jest.fn(),
      resolvePath: jest.fn(),
      extractJsonData: jest.fn(),
      wrapJsonData: jest.fn(),
      normalizeInputItems: jest.fn(),
    });

    it("should handle empty input", async () => {
      const mockContext = createMockContext({
        language: "javascript",
        code: "return items;",
        timeout: 30000,
        continueOnFail: false,
      });

      const inputData: NodeInputData = {
        main: [[]],
      };

      const result = await CodeNode.execute.call(mockContext, inputData);

      expect(result[0].main).toHaveLength(0);
    });

    it("should handle single item without json wrapper", async () => {
      const mockContext = createMockContext({
        language: "javascript",
        code: "return items.map(item => ({ ...item, processed: true }));",
        timeout: 30000,
        continueOnFail: false,
      });

      const inputData: NodeInputData = {
        main: [[{ name: "test", value: 123 }]],
      };

      const result = await CodeNode.execute.call(mockContext, inputData);

      expect(result[0].main).toHaveLength(1);
      expect(result[0].main?.[0].json.name).toBe("test");
    });
  });
});
