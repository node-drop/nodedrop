import { exec } from "child_process";
import { promises as fsPromises } from "fs";
import * as os from "os";
import * as path from "path";
import { promisify } from "util";
// Using BunVMService for secure JavaScript execution (Bun-compatible)
import {
    NodeDefinition,
    NodeInputData,
    NodeOutputData,
} from "../../types/node.types";

const execAsync = promisify(exec);

export const CodeNode: NodeDefinition = {
  identifier: "code",
  displayName: "Code",
  name: "code",
  group: ["transform"],
  version: 2,
  description: "Execute JavaScript or Python code to process data",
  ai: {
    description: "The most powerful node. Executes custom JavaScript or Python code. Use this ONLY when other nodes cannot achieve the desired transformation.",
    useCases: [
      "Complex data transformation",
      "Math calculations",
      "Custom logic not available in other nodes"
    ],
    tags: ["code", "script", "javascript", "python", "custom"],
    rules: [
      "Use 'items' variable to access input data",
      "Must return an array of objects",
      "Avoid using external libraries unless they are built-in"
    ],
    complexityScore: 8
  },
  icon: "lucide:code",
  color: "#FF6B6B",
  defaults: {
    language: "javascript",
    code: "",
  },
  inputs: ["main"],
  outputs: ["main"],
  properties: [
    {
      displayName: "Language",
      name: "language",
      type: "options",
      required: true,
      default: "javascript",
      options: [
        {
          name: "JavaScript",
          value: "javascript",
          description: "Execute JavaScript code",
        },
        {
          name: "Python",
          value: "python",
          description: "Execute Python code",
        },
      ],
      description: "Choose the programming language to execute",
    },
    {
      displayName: "Code",
      name: "code",
      type: "custom",
      required: true,
      default: `// Access input data via 'items' variable
// Each item is available as items[0], items[1], etc.
// Return an array of items to output

// Example: Add a new field to each item
const results = items.map(item => ({
  ...item.json,
  processedAt: new Date().toISOString(),
  customField: 'Hello from Code node!'
}));

return results;`,
      description:
        "The code to execute. Access input items via 'items' variable and return the results.",
      component: "CodeEditor",
      componentProps: {
        language: "javascript",
      },
      displayOptions: {
        show: {
          language: ["javascript"],
        },
      },
    },
    {
      displayName: "Code",
      name: "code",
      type: "custom",
      required: true,
      default: `# Access input data via 'items' variable
# Each item is a dictionary with the data
# Return a list of dictionaries to output

# Example: Add a new field to each item
import json
from datetime import datetime

results = []
for item in items:
    item['processedAt'] = datetime.now().isoformat()
    item['customField'] = 'Hello from Code node!'
    results.append(item)

# Output must be JSON
print(json.dumps(results))`,
      description:
        "The Python code to execute. Access input items via 'items' variable and print JSON results.",
      component: "CodeEditor",
      componentProps: {
        language: "python",
      },
      displayOptions: {
        show: {
          language: ["python"],
        },
      },
    },
    {
      displayName: "Timeout (ms)",
      name: "timeout",
      type: "number",
      default: 30000,
      description: "Maximum time in milliseconds for code execution",
    },
    {
      displayName: "Continue On Fail",
      name: "continueOnFail",
      type: "boolean",
      default: false,
      description: "Continue workflow execution even if code execution fails",
    },
  ],
  execute: async function (
    inputData: NodeInputData
  ): Promise<NodeOutputData[]> {
    const language = (await this.getNodeParameter("language")) as string;
    const code = (await this.getNodeParameter("code")) as string;
    const timeout = (await this.getNodeParameter("timeout")) as number;
    const continueOnFail = (await this.getNodeParameter(
      "continueOnFail"
    )) as boolean;

    // Get and normalize input items
    let items = inputData.main || [];
    if (items.length === 1 && items[0] && Array.isArray(items[0])) {
      items = items[0];
    }

    // Extract JSON data from items
    const processedItems = items.map((item: any) => {
      if (item && typeof item === "object" && "json" in item) {
        return item.json;
      }
      return item;
    });

    try {
      let results: any[];

      if (language === "javascript") {
        results = await executeJavaScript(code, processedItems, timeout);
      } else if (language === "python") {
        results = await executePython(code, processedItems, timeout);
      } else {
        throw new Error(`Unsupported language: ${language}`);
      }

      // Ensure results is an array
      if (!Array.isArray(results)) {
        results = [results];
      }

      // Wrap results in the expected format
      const outputItems = results.map((item) => ({ json: item }));

      return [{ main: outputItems }];
    } catch (error) {
      if (continueOnFail) {
        this.logger?.error("Code execution failed", error);
        return [
          {
            main: [
              {
                json: {
                  error: true,
                  message:
                    error instanceof Error ? error.message : "Unknown error",
                },
              },
            ],
          },
        ];
      }
      throw error;
    }
  },
};

/**
 * Execute JavaScript code using Bun VM
 */
async function executeJavaScript(
  code: string,
  items: any[],
  timeout: number
): Promise<any[]> {
  try {
    // Import BunVMService
    const { getBunVMService } = await import("../../services/execution/BunVMService");
    const vmService = getBunVMService();

    // Validate user code first (before wrapping)
    vmService.validateCode(code);

    // Create safe context
    const context = vmService.createSafeContext({
      items: items,
    });

    // User code will be wrapped by BunVMService in an async function
    // Just pass it through directly
    const wrappedCode = code;

    // Execute the code (skip validation since we already validated)
    const result = await vmService.execute(wrappedCode, {
      timeout,
      context,
      skipValidation: true, // Already validated the user code
    });

    if (!result.success) {
      throw new Error(result.error || 'Execution failed');
    }

    // Log the result for debugging
    console.log('[Code Node] Execution result:', result.result);

    return result.result;
  } catch (error) {
    throw new Error(
      `JavaScript execution failed: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

/**
 * Execute Python code using child process
 */
async function executePython(
  code: string,
  items: any[],
  timeout: number
): Promise<any[]> {
  let tempFile: string | null = null;

  try {
    // Create a temporary file for the Python script
    const tempDir = os.tmpdir();
    tempFile = path.join(
      tempDir,
      `code_node_${Date.now()}_${Math.random().toString(36).slice(2)}.py`
    );

    // Prepare the items as JSON string
    const itemsJson = JSON.stringify(items);

    // Wrap the user code with items input
    const wrappedCode = `
import json
import sys

# Parse input items
items_json = '''${itemsJson.replace(/'/g, "\\'")}'''
items = json.loads(items_json)

# User code
${code}
`;

    // Write the code to the temporary file
    await fsPromises.writeFile(tempFile, wrappedCode, "utf8");

    // Execute the Python script
    const { stdout, stderr } = await execAsync(`python3 "${tempFile}"`, {
      timeout: timeout,
      maxBuffer: 10 * 1024 * 1024, // 10MB max buffer
    });

    // Log any stderr output
    if (stderr) {
      console.warn("[Code Node Python stderr]", stderr);
    }

    // Parse the output as JSON
    let results: any[];
    try {
      // Try to parse the entire output as JSON
      results = JSON.parse(stdout.trim());
    } catch (parseError) {
      // If parsing fails, try to find JSON in the output
      const jsonMatch = stdout.match(/\[[\s\S]*\]|\{[\s\S]*\}/);
      if (jsonMatch) {
        results = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error(
          `Python code must output valid JSON. Got: ${stdout.substring(0, 200)}`
        );
      }
    }

    return results;
  } catch (error) {
    if ((error as any).killed) {
      throw new Error(`Python execution timed out after ${timeout}ms`);
    }
    throw new Error(
      `Python execution failed: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  } finally {
    // Clean up the temporary file
    if (tempFile) {
      try {
        await fsPromises.unlink(tempFile);
      } catch (cleanupError) {
        console.warn("[Code Node] Failed to clean up temp file:", cleanupError);
      }
    }
  }
}
