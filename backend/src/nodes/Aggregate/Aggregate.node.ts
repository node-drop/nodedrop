import {
    NodeDefinition,
    NodeInputData,
    NodeOutputData,
} from "../../types/node.types";

/**
 * Aggregate Node - Combine multiple items into one
 *
 * This node aggregates multiple input items into a single output item.
 * Essential for workflows where you need to summarize, combine, or reduce data.
 *
 * How it works:
 * - Accepts multiple items from input
 * - Aggregates them based on the selected mode
 * - Outputs a single item (or grouped items)
 *
 * Aggregation Modes:
 * 1. Combine All: Combine all items into a single array
 *    Input: [{a:1}, {a:2}, {a:3}] → Output: {items: [{a:1}, {a:2}, {a:3}], count: 3}
 *
 * 2. Summarize: Calculate statistics on numeric fields
 *    Input: [{value:10}, {value:20}, {value:30}] → Output: {sum: 60, avg: 20, min: 10, max: 30, count: 3}
 *
 * 3. Concatenate: Join text values from a field
 *    Input: [{name:"A"}, {name:"B"}] → Output: {result: "A, B"}
 *
 * 4. Group By: Group items by a field and aggregate each group
 *    Input: [{type:"A", val:1}, {type:"B", val:2}, {type:"A", val:3}]
 *    → Output: [{type:"A", items:[...], count:2}, {type:"B", items:[...], count:1}]
 *
 * 5. First/Last: Keep only the first or last item
 *    Input: [{a:1}, {a:2}, {a:3}] → Output: {a:1} (first) or {a:3} (last)
 *
 * Examples:
 * 1. Digest emails:
 *    Get Emails → Aggregate (Combine All) → Send Summary
 *
 * 2. Calculate totals:
 *    Get Orders → Aggregate (Summarize: amount) → Report Total
 *
 * 3. Group by category:
 *    Get Products → Aggregate (Group By: category) → Process Each Category
 */
export const AggregateNode: NodeDefinition = {
    identifier: "aggregate",
    displayName: "Aggregate",
    name: "aggregate",
    group: ["transform"],
    version: 1,
    description: "Combine multiple items into one (sum, count, group, etc.)",
    ai: {
        description: "Combines multiple input items into a single output. Use this to summarize data, calculate totals, or group items together. Similar to SQL GROUP BY or array reduce operations.",
        useCases: [
            "Calculate sum/average of numeric values",
            "Count total items",
            "Combine all items into a single array for batch processing",
            "Group items by category and count each group",
            "Concatenate text values with a separator"
        ],
        tags: ["aggregate", "sum", "count", "group", "combine", "reduce", "digest", "summarize", "total"],
        rules: [
            "Use 'Combine All' mode to collect all items into a single array",
            "Use 'Summarize' mode for numeric calculations (sum, avg, min, max)",
            "Use 'Group By' mode to group items by a field value",
            "The 'aggregateField' is required for Summarize and Concatenate modes",
            "Output is always a single item (or one item per group in Group By mode)"
        ],
        complexityScore: 3,
        jsonExample: `{
  "mode": "summarize",
  "aggregateField": "amount",
  "outputFieldName": "total"
}`
    },
    icon: "lucide:layers",
    color: "#607D8B",
    defaults: {
        mode: "combineAll",
        aggregateField: "",
        outputFieldName: "result",
        separator: ", ",
        groupByField: "",
        includeItems: true,
    },
    inputs: ["main"],
    outputs: ["main"],
    properties: [
        {
            displayName: "Mode",
            name: "mode",
            type: "options",
            required: true,
            default: "combineAll",
            description: "How to aggregate the input items",
            options: [
                {
                    name: "Combine All",
                    value: "combineAll",
                    description: "Combine all items into a single array",
                },
                {
                    name: "Summarize (Numeric)",
                    value: "summarize",
                    description: "Calculate sum, average, min, max of a numeric field",
                },
                {
                    name: "Concatenate (Text)",
                    value: "concatenate",
                    description: "Join text values from a field with a separator",
                },
                {
                    name: "Group By",
                    value: "groupBy",
                    description: "Group items by a field value and aggregate each group",
                },
                {
                    name: "First Item",
                    value: "first",
                    description: "Keep only the first item",
                },
                {
                    name: "Last Item",
                    value: "last",
                    description: "Keep only the last item",
                },
            ],
        },
        {
            displayName: "Field to Aggregate",
            name: "aggregateField",
            type: "string",
            required: true,
            default: "",
            placeholder: "e.g., amount or price",
            description: "The field name to aggregate (supports dot notation for nested fields)",
            displayOptions: {
                show: {
                    mode: ["summarize", "concatenate"],
                },
            },
        },
        {
            displayName: "Output Field Name",
            name: "outputFieldName",
            type: "string",
            required: false,
            default: "result",
            placeholder: "e.g., total or summary",
            description: "Name of the output field for the aggregated result",
            displayOptions: {
                show: {
                    mode: ["summarize", "concatenate"],
                },
            },
        },
        {
            displayName: "Separator",
            name: "separator",
            type: "string",
            required: false,
            default: ", ",
            placeholder: "e.g., , or |",
            description: "Separator to use when joining text values",
            displayOptions: {
                show: {
                    mode: ["concatenate"],
                },
            },
        },
        {
            displayName: "Group By Field",
            name: "groupByField",
            type: "string",
            required: true,
            default: "",
            placeholder: "e.g., category or status",
            description: "The field to group items by",
            displayOptions: {
                show: {
                    mode: ["groupBy"],
                },
            },
        },
        {
            displayName: "Include Original Items",
            name: "includeItems",
            type: "boolean",
            required: false,
            default: true,
            description: "Include the original items array in the output",
            displayOptions: {
                show: {
                    mode: ["combineAll", "groupBy"],
                },
            },
        },
    ],
    execute: async function (
        inputData: NodeInputData
    ): Promise<NodeOutputData[]> {
        const mode = (await this.getNodeParameter("mode")) as string;

        // Get input items
        const items = this.normalizeInputItems(inputData.main || []);
        const processedItems = this.extractJsonData(items);

        if (processedItems.length === 0) {
            // Return empty result based on mode
            return [{ main: [{ json: { items: [], count: 0 } }] }];
        }

        let result: any;

        switch (mode) {
            case "combineAll": {
                // Combine all items into a single array
                const includeItems = (await this.getNodeParameter("includeItems")) as boolean;

                result = {
                    count: processedItems.length,
                };

                if (includeItems) {
                    result.items = processedItems;
                }
                break;
            }

            case "summarize": {
                // Calculate statistics on a numeric field
                const aggregateField = (await this.getNodeParameter("aggregateField")) as string;
                const outputFieldName = (await this.getNodeParameter("outputFieldName")) as string || "result";

                if (!aggregateField) {
                    throw new Error("Field to aggregate is required for Summarize mode");
                }

                // Extract numeric values from the field
                const values: number[] = [];
                for (const item of processedItems) {
                    const value = this.resolvePath(item, aggregateField);
                    if (value !== undefined && value !== null) {
                        const numValue = Number(value);
                        if (!isNaN(numValue)) {
                            values.push(numValue);
                        }
                    }
                }

                if (values.length === 0) {
                    result = {
                        [outputFieldName]: {
                            sum: 0,
                            avg: 0,
                            min: 0,
                            max: 0,
                            count: 0,
                        },
                        field: aggregateField,
                        totalItems: processedItems.length,
                        validValues: 0,
                    };
                } else {
                    const sum = values.reduce((a, b) => a + b, 0);
                    const avg = sum / values.length;
                    const min = Math.min(...values);
                    const max = Math.max(...values);

                    result = {
                        [outputFieldName]: {
                            sum,
                            avg,
                            min,
                            max,
                            count: values.length,
                        },
                        field: aggregateField,
                        totalItems: processedItems.length,
                        validValues: values.length,
                    };
                }
                break;
            }

            case "concatenate": {
                // Join text values from a field
                const aggregateField = (await this.getNodeParameter("aggregateField")) as string;
                const outputFieldName = (await this.getNodeParameter("outputFieldName")) as string || "result";
                const separator = (await this.getNodeParameter("separator")) as string || ", ";

                if (!aggregateField) {
                    throw new Error("Field to aggregate is required for Concatenate mode");
                }

                // Extract text values from the field
                const values: string[] = [];
                for (const item of processedItems) {
                    const value = this.resolvePath(item, aggregateField);
                    if (value !== undefined && value !== null) {
                        values.push(String(value));
                    }
                }

                result = {
                    [outputFieldName]: values.join(separator),
                    field: aggregateField,
                    count: values.length,
                };
                break;
            }

            case "groupBy": {
                // Group items by a field value
                const groupByField = (await this.getNodeParameter("groupByField")) as string;
                const includeItems = (await this.getNodeParameter("includeItems")) as boolean;

                if (!groupByField) {
                    throw new Error("Group By field is required for Group By mode");
                }

                // Group items by field value
                const groups = new Map<string, any[]>();

                for (const item of processedItems) {
                    const groupValue = this.resolvePath(item, groupByField);
                    const key = groupValue !== undefined && groupValue !== null
                        ? String(groupValue)
                        : "_undefined_";

                    if (!groups.has(key)) {
                        groups.set(key, []);
                    }
                    groups.get(key)!.push(item);
                }

                // Convert groups to output format
                const groupedResults: any[] = [];
                for (const [key, groupItems] of groups) {
                    const groupResult: any = {
                        [groupByField]: key === "_undefined_" ? null : key,
                        count: groupItems.length,
                    };

                    if (includeItems) {
                        groupResult.items = groupItems;
                    }

                    groupedResults.push(groupResult);
                }

                // Return multiple items (one per group)
                return [{ main: groupedResults.map(item => ({ json: item })) }];
            }

            case "first": {
                // Keep only the first item
                result = processedItems[0];
                break;
            }

            case "last": {
                // Keep only the last item
                result = processedItems[processedItems.length - 1];
                break;
            }

            default:
                throw new Error(`Unknown aggregation mode: ${mode}`);
        }

        return [{ main: [{ json: result }] }];
    },
};
