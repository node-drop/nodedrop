import {
  BuiltInNodeTypes,
  NodeDefinition,
  NodeInputData,
  NodeOutputData,
} from "../../types/node.types";

export const IfNode: NodeDefinition = {
  identifier: BuiltInNodeTypes.IF,
  displayName: "IF",
  name: "if",
  group: ["transform"],
  version: 2,
  description: "Route data based on conditional logic",
  icon: "fa:code-branch",
  color: "#f0752eff",
  defaults: {
    condition: {
      key: "",
      expression: "equal",
      value: "",
    },
  },
  inputs: ["main"],
  outputs: ["true", "false"],
  properties: [
    {
      displayName: "Condition",
      name: "condition",
      type: "conditionRow",
      required: true,
      default: {
        key: "",
        expression: "equal",
        value: "",
      },
      description: "Define the condition to evaluate.",
      options: [
        { name: "Equal", value: "equal" },
        { name: "Not Equal", value: "notEqual" },
        { name: "Larger", value: "larger" },
        { name: "Larger Equal", value: "largerEqual" },
        { name: "Smaller", value: "smaller" },
        { name: "Smaller Equal", value: "smallerEqual" },
        { name: "Contains", value: "contains" },
        { name: "Not Contains", value: "notContains" },
        { name: "Starts With", value: "startsWith" },
        { name: "Ends With", value: "endsWith" },
        { name: "Is Empty", value: "isEmpty" },
        { name: "Is Not Empty", value: "isNotEmpty" },
        { name: "Regex", value: "regex" },
      ],
      componentProps: {
        keyPlaceholder: "Key",
        valuePlaceholder: "Value",
        expressionPlaceholder: "Select condition",
      },
    },
  ],
  execute: async function (
    inputData: NodeInputData
  ): Promise<NodeOutputData[]> {
    console.log(`[If Node] 🔍 Starting execution`, {
      inputData: JSON.stringify(inputData, null, 2),
    });

    // Normalize and extract input items first
    const items = this.normalizeInputItems(inputData.main || []);
    const processedItems = this.extractJsonData(items);

    console.log(`[If Node] 🔍 Processed items`, {
      itemsCount: items.length,
      processedItemsCount: processedItems.length,
      processedItems: JSON.stringify(processedItems, null, 2),
    });

    const evaluateCondition = (
      value1: any,
      operation: string,
      value2: any
    ): boolean => {
      const val1 = String(value1);
      const val2 = String(value2);

      switch (operation) {
        case "equal":
          return val1 === val2;

        case "notEqual":
          return val1 !== val2;

        case "larger":
          return Number(val1) > Number(val2);

        case "largerEqual":
          return Number(val1) >= Number(val2);

        case "smaller":
          return Number(val1) < Number(val2);

        case "smallerEqual":
          return Number(val1) <= Number(val2);

        case "contains":
          return val1.includes(val2);

        case "notContains":
          return !val1.includes(val2);

        case "startsWith":
          return val1.startsWith(val2);

        case "endsWith":
          return val1.endsWith(val2);

        case "isEmpty":
          return !val1 || val1.trim() === "";

        case "isNotEmpty":
          return !!(val1 && val1.trim() !== "");

        case "regex":
          try {
            const regex = new RegExp(val2);
            return regex.test(val1);
          } catch (error) {
            throw new Error(`Invalid regex pattern: ${val2}`);
          }

        default:
          throw new Error(`Unknown operation: ${operation}`);
      }
    };

    // Get condition parameter
    const condition = (await this.getNodeParameter("condition", 0)) as {
      key: string;
      expression: string;
      value: string;
    };

    console.log(`[If Node] 🔍 Condition parameter`, {
      condition,
    });

    // Helper function to resolve field value from item or use direct value
    const resolveValue = (item: any, fieldExpression: string): any => {
      // If it's a template expression like {{json.id}}, extract the field path
      const templateMatch = fieldExpression.match(
        /\{\{json(?:\[\d+\])?\.([\w.[\]]+)\}\}/
      );
      if (templateMatch) {
        const fieldPath = templateMatch[1];
        return resolvePath(item, fieldPath);
      }

      // Try to resolve as field path first
      const resolved = resolvePath(item, fieldExpression);

      // If resolution returns undefined and the expression doesn't look like a path,
      // treat it as a literal value
      if (resolved === undefined && !fieldExpression.includes('.')) {
        return fieldExpression;
      }

      return resolved;
    };

    // Helper to resolve nested paths including array access
    const resolvePath = (obj: any, path: string): any => {
      if (!path) return undefined;

      // Handle array notation: items[0].name -> items.0.name
      const normalizedPath = path.replace(/\[(\d+)\]/g, ".$1");

      return normalizedPath.split(".").reduce((current, key) => {
        if (current === null || current === undefined) {
          return undefined;
        }
        return current[key];
      }, obj);
    };

    // Resolve the key value from first item or use as literal
    const keyValue = processedItems.length > 0
      ? resolveValue(processedItems[0], condition.key)
      : condition.key;

    console.log(`[If Node] 🔍 Resolved key value`, {
      keyValue,
      firstItem: processedItems[0],
      conditionKey: condition.key,
    });

    const conditionResult = evaluateCondition(
      keyValue,
      condition.expression,
      condition.value
    );

    console.log(`[If Node] 🔍 Condition evaluation result`, {
      conditionResult,
      keyValue,
      expression: condition.expression,
      compareValue: condition.value,
    });

    // Route all items to either true or false output based on single condition evaluation
    const wrappedItems = processedItems.map((item) => ({ json: item }));

    const result = conditionResult
      ? [{ true: wrappedItems }, { false: [] }]
      : [{ true: [] }, { false: wrappedItems }];

    console.log(`[If Node] ✅ Final output`, {
      result: JSON.stringify(result, null, 2),
      trueCount: result[0]?.true?.length || 0,
      falseCount: result[1]?.false?.length || 0,
    });

    return result;
  },
};
