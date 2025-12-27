import {
    BuiltInNodeTypes,
    NodeDefinition,
    NodeInputData,
    NodeOutputData,
} from "../../types/node.types";

export const JsonNode: NodeDefinition = {
  identifier: BuiltInNodeTypes.JSON,
  displayName: "JSON",
  name: "json",
  group: ["transform"],
  version: 2,
  description: "Compose a JSON object",
  ai: {
    description: "Creates raw JSON data. Useful for seeding a workflow with initial data or creating mock data for testing.",
    useCases: [
      "Create hardcoded data",
      "Seed test values",
      "Mock API responses"
    ],
    tags: ["json", "data", "create", "mock", "seed"],
    rules: [
      "Use 'Key-Value Pairs' mode for simple objects",
      "Use 'JSON' mode for complex nested structures"
    ],
    complexityScore: 2
  },
  icon: "fa:code",
  color: "#FF9800",
  defaults: {
    mode: "json",
    jsonData: "{}",
    keyValuePairs: [],
  },
  inputs: ["main"],
  outputs: ["main"],
  properties: [
    {
      displayName: "Mode",
      name: "mode",
      type: "options",
      required: true,
      default: "json",
      description: "Choose how to define the JSON data",
      options: [
        {
          name: "JSON",
          value: "json",
          description: "Write JSON directly",
        },
        {
          name: "Key-Value Pairs",
          value: "keyValue",
          description: "Define JSON using key-value pairs",
        },
      ],
    },
    {
      displayName: "JSON Data",
      name: "jsonData",
      type: "json",
      required: true,
      default: "{}",
      description: "The JSON data to output",
      displayOptions: {
        show: {
          mode: ["json"],
        },
      },
    },
    {
      displayName: "Key-Value Pairs",
      name: "keyValuePairs",
      type: "collection",
      required: false,
      default: [],
      description: "Define JSON using key-value pairs",
      displayOptions: {
        show: {
          mode: ["keyValue"],
        },
      },
      typeOptions: {
        multipleValues: true,
        multipleValueButtonText: "Add Field",
      },
      component: "RepeatingField",
      componentProps: {
        compact: true,
        titleField: "keyValue.key",
        fields: [
          {
            displayName: "",
            name: "keyValue",
            type: "keyValueRow",
            required: false,
            default: {
              key: "",
              value: "",
            },
            componentProps: {
              keyPlaceholder: "Field name (e.g., name or user.email)",
              valuePlaceholder: "Value",
            },
          },
        ],
      },
    },
  ],
  execute: async function (
    inputData: NodeInputData
  ): Promise<NodeOutputData[]> {
    const mode = (await this.getNodeParameter("mode")) as string;

    let resultData: any;

    if (mode === "keyValue") {
      // Key-Value mode
      const keyValuePairs = (await this.getNodeParameter(
        "keyValuePairs"
      )) as Array<{
        values?: {
          keyValue: {
            key: string;
            value: any;
          };
        };
        keyValue?: {
          key: string;
          value: any;
        };
      }>;

      // Helper function to set nested values
      const setNestedValue = (obj: any, path: string, value: any) => {
        // Handle array notation: items[0].name -> items.0.name
        const normalizedPath = path.replace(/\[(\d+)\]/g, ".$1");
        const keys = normalizedPath.split(".");

        let current = obj;
        for (let i = 0; i < keys.length - 1; i++) {
          const key = keys[i];
          if (!(key in current) || typeof current[key] !== "object") {
            // Create nested object or array based on next key
            const nextKey = keys[i + 1];
            current[key] = /^\d+$/.test(nextKey) ? [] : {};
          }
          current = current[key];
        }

        current[keys[keys.length - 1]] = value;
      };

      // Build JSON object from key-value pairs
      resultData = {};
      keyValuePairs.forEach((pairConfig) => {
        // Handle both nested and flat structure
        const keyValue = pairConfig.values?.keyValue || pairConfig.keyValue;

        if (keyValue && keyValue.key) {
          let processedKey = keyValue.key;
          let processedValue = keyValue.value;

          // Check if key starts with = (expression mode)
          if (typeof processedKey === "string" && processedKey.startsWith("=")) {
            // Strip the = and evaluate as expression
            processedKey = processedKey.substring(1);
            // In a real implementation, you'd evaluate the expression here
            // For now, we'll use it as-is after stripping =
          }

          // Check if value starts with = (expression mode)
          if (typeof processedValue === "string" && processedValue.startsWith("=")) {
            // Strip the = and evaluate as expression
            processedValue = processedValue.substring(1);
            // In a real implementation, you'd evaluate the expression here
            // For now, we'll use it as-is after stripping =
          }

          // Support nested paths like "user.email" or "items[0].name"
          setNestedValue(resultData, processedKey, processedValue);
        }
      });
    } else {
      // JSON mode
      const jsonData = (await this.getNodeParameter("jsonData")) as string;

      try {
        resultData =
          typeof jsonData === "string" ? JSON.parse(jsonData) : jsonData;
      } catch (error) {
        throw new Error(
          `Invalid JSON data: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
      }
    }

    // If parsed data is an array, create separate items for each element
    if (Array.isArray(resultData)) {
      const items = resultData.map((item) => ({ json: item }));
      return [{ main: items }];
    }

    // Otherwise, wrap single object in an item
    return [{ main: [{ json: resultData }] }];
  },
};
