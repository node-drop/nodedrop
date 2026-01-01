import {
  NodeDefinition,
  NodeInputData,
  NodeOutputData
} from "../../types/node.types";

/**
 * Set Node - Add or update fields on data items
 *
 * This node allows you to set key-value pairs on incoming data items.
 * You can add new fields or overwrite existing ones.
 *
 * How it works:
 * - If there are input items, it applies the set values to each item
 * - If there are no input items, it creates a new item with the set values
 * - Both keys and values support expressions (e.g., {{$json.fieldName}})
 * - Supports nested paths (e.g., "user.address.city" or "items[0].name")
 *
 * Examples:
 * 1. Simple fields:
 *    Input: { "name": "John", "age": 30 }
 *    Set: status = "active", role = "admin"
 *    Output: { "name": "John", "age": 30, "status": "active", "role": "admin" }
 *
 * 2. Nested paths:
 *    Input: { "name": "John" }
 *    Set: user.address.city = "New York", user.age = 30
 *    Output: { "name": "John", "user": { "address": { "city": "New York" }, "age": 30 } }
 */
export const SetNode: NodeDefinition = {
  displayName: "Set",
  name: "set",
  group: ["transform"],
  version: 2,
  description: "Set values on the data",
  ai: {
    description: "Modifies existing data items by adding or updating fields. Use this to prepare data for the next node.",
    useCases: [
      "Rename fields (e.g. set 'newKey' = '{{json.oldKey}}')",
      "Add timestamp or static values",
      "Calculate simple values"
    ],
    tags: ["set", "update", "modify", "add field", "transform"],
    rules: [
      "Can use dot notation for nested fields (e.g. 'user.address.city')",
      "Overwrites the field if it already exists",
      "Each value entry MUST have a 'keyValue' object with 'key' and 'value' properties"
    ],
    complexityScore: 2,
    parameterExamples: {
      values: [
        {
          description: "Set a single field",
          value: [{ keyValue: { key: "status", value: "active" } }]
        },
        {
          description: "Set multiple fields",
          value: [
            { keyValue: { key: "status", value: "active" } },
            { keyValue: { key: "role", value: "admin" } }
          ]
        },
        {
          description: "Set nested field using dot notation",
          value: [{ keyValue: { key: "user.address.city", value: "New York" } }]
        }
      ]
    },
    jsonExample: '{"includeInputData": true, "values": [{"keyValue": {"key": "fieldName", "value": "fieldValue"}}]}'
  },
  icon: "S",
  color: "#4CAF50",
  defaults: {
    values: [],
    includeInputData: true,
  },
  inputs: ["main"],
  outputs: ["main"],
  properties: [
    {
      displayName: "Include Input Data",
      name: "includeInputData",
      type: "boolean",
      required: false,
      default: true,
      description: "When enabled, extends input data with set values. When disabled, outputs only the set values.",
    },
    {
      displayName: "Values",
      name: "values",
      type: "collection",
      required: false,
      default: [],
      description: "The values to set",
      typeOptions: {
        multipleValues: true,
        multipleValueButtonText: "Add Value",
      },
      component: "RepeatingField",
      componentProps: {
        compact: true,
        titleField: "keyValue.key",
        fields: [
          {
            displayName: "Key Value",
            name: "keyValue",
            type: "keyValueRow",
            required: true,
            default: {
              key: "",
              value: "",
            },
            componentProps: {
              keyPlaceholder: "Field name (e.g., status or user.address.city)",
              valuePlaceholder: "Value to set",
            },
          },
        ],
      },
    },
  ],
  execute: async function (
    inputData: NodeInputData
  ): Promise<NodeOutputData[]> {
    const values = (await this.getNodeParameter("values")) as Array<{
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
    const includeInputData = (await this.getNodeParameter("includeInputData")) as boolean;

    // Get items to process - normalize input structure
    let items = inputData.main || [];

    // Flatten nested arrays
    if (items.length === 1 && items[0] && Array.isArray(items[0])) {
      items = items[0];
    }

    // Process items - extract json data properly
    const processedItems = items.map((item: any) => {
      if (!item || typeof item !== "object") {
        return {};
      }
      // If item has json property, use that
      if ("json" in item) {
        return item.json;
      }
      // If item has numeric keys with json inside (weird structure), extract first json
      const keys = Object.keys(item);
      if (keys.length > 0 && keys.some(k => /^\d+$/.test(k))) {
        const firstNumericKey = keys.find(k => /^\d+$/.test(k));
        if (firstNumericKey && item[firstNumericKey]?.json) {
          return item[firstNumericKey].json;
        }
      }
      return item;
    });

    // Determine base items
    let itemsToProcess: any[];
    if (includeInputData) {
      // Include input data - use existing items or empty object
      const hasData = processedItems.some((item: any) => 
        item && typeof item === "object" && Object.keys(item).length > 0
      );
      itemsToProcess = hasData ? processedItems : [{}];
    } else {
      // Don't include input data - always start fresh
      // Create one item per input item, or one if no input
      itemsToProcess = processedItems.length > 0 
        ? processedItems.map(() => ({})) 
        : [{}];
    }

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

    // Apply the set values to each item
    const outputItems = itemsToProcess.map((item: any) => {
      const newItem = includeInputData ? { ...item } : {};

      values.forEach((valueConfig) => {
        // Handle both nested and flat structure
        const keyValue = valueConfig.values?.keyValue || valueConfig.keyValue;

        if (keyValue && keyValue.key) {
          // Support nested paths like "user.address.city" or "items[0].name"
          setNestedValue(newItem, keyValue.key, keyValue.value);
        }
      });

      return { json: newItem };
    });

    return [{ main: outputItems }];
  },
};
