import {
    NodeDefinition,
    NodeInputData,
    NodeOutputData,
} from "../../types/node.types";

/**
 * Switch Node - Route data to different outputs based on rules
 * 
 * Similar to n8n's Switch node, this routes incoming data to different outputs
 * based on defined rules. Each rule can have multiple conditions, and data is
 * routed to the first matching rule's output.
 * 
 * Features:
 * - Multiple routing rules with conditions
 * - Support for various comparison operations
 * - Fallback output for unmatched items
 * - Route each item independently or all items together
 * 
 * Example use cases:
 * - Route orders by status (pending, completed, cancelled)
 * - Categorize users by role or subscription level
 * - Filter data into different processing paths
 * - Implement complex business logic routing
 */
export const SwitchNode: NodeDefinition = {
    identifier: "switch",
    displayName: "Switch",
    name: "switch",
    group: ["transform"],
    version: 2,
    description: "Route data to different outputs based on rules",
    ai: {
        description: "Routes data to one of many outputs. Better than multiple IfElse nodes when you have 3+ possible paths.",
        useCases: [
            "Route orders by status (New, Paid, Shipped)",
            "Categorize support tickets by priority",
            "Handle different file types differently"
        ],
        tags: ["logic", "switch", "route", "branch", "multi-path"],
        rules: [
            "Data is routed to the FIRST matching rule's output",
            "Unmatched items are discarded unless a 'fallback' rule is created",
            "Use 'Expression' mode to route dynamically by index number"
        ],
        complexityScore: 3
    },
    icon: "fa:random",
    color: "#506782",
    defaults: {
        mode: "rules",
        outputsCount: 3,
        rules: [
            {
                values: {
                    condition: {
                        key: "",
                        expression: "equal",
                        value: "",
                    },
                },
            },
            {
                values: {
                    condition: {
                        key: "",
                        expression: "equal",
                        value: "",
                    },
                },
            },
        ],
    },
    inputs: ["main"],
    outputs: ["output0", "output1"], // Default: 2 rules = 2 outputs (dynamic based on rules)
    properties: [
        {
            displayName: "Mode",
            name: "mode",
            type: "options",
            required: true,
            default: "rules",
            description: "How to route the data",
            options: [
                {
                    name: "Rules",
                    value: "rules",
                    description: "Define rules with conditions to route data",
                },
                {
                    name: "Expression",
                    value: "expression",
                    description: "Use a single expression to determine output",
                },
            ],
        },
        {
            displayName: "Rules",
            name: "rules",
            type: "collection",
            required: true,
            default: [],
            description: "Each rule routes to its corresponding output (Rule 1 → Output 0, Rule 2 → Output 1, etc.). Items that don't match any rule are discarded.",
            displayOptions: {
                show: {
                    mode: ["rules"],
                },
            },
            typeOptions: {
                multipleValues: true,
                multipleValueButtonText: "Add Routing Rule",
            },
            component: "RepeatingField",
            componentProps: {
                compact: true,
                titleField: "condition.key",
                fields: [
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
                        description: "Define the condition to evaluate",
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
                            keyPlaceholder: "Field or value",
                            valuePlaceholder: "Compare value",
                            expressionPlaceholder: "Select condition",
                        },
                    },
                ],
            },
        },
        {
            displayName: "Number of Outputs",
            name: "outputsCount",
            type: "number",
            required: true,
            default: 3,
            description: "Number of outputs to create (2-10)",
            displayOptions: {
                show: {
                    mode: ["expression"],
                },
            },
        },
        {
            displayName: "Output Expression",
            name: "outputExpression",
            type: "expression",
            required: true,
            default: "0",
            placeholder: "e.g., {{json.priority}} or priority",
            description: "Expression that returns the output index (0 to outputsCount-1)",
            displayOptions: {
                show: {
                    mode: ["expression"],
                },
            },
        },

    ],

    execute: async function (
        inputData: NodeInputData
    ): Promise<NodeOutputData[]> {
        console.log(`[Switch Node] 🔀 Starting execution`, {
            inputData: JSON.stringify(inputData, null, 2),
        });

        // Normalize and extract input items
        const items = this.normalizeInputItems(inputData.main || []);
        const processedItems = this.extractJsonData(items);

        console.log(`[Switch Node] 🔀 Processed items`, {
            itemsCount: items.length,
            processedItemsCount: processedItems.length,
        });

        // Get configuration
        const mode = (await this.getNodeParameter("mode")) as string;
        
        // Calculate number of outputs based on mode
        let outputsCount: number;
        if (mode === "expression") {
            // Expression mode: use configured outputsCount
            outputsCount = Math.max(2, Math.min(10, (await this.getNodeParameter("outputsCount")) as number || 3));
        } else {
            // Rules mode: one output per rule
            const rules = (await this.getNodeParameter("rules")) as any[];
            outputsCount = rules?.length || 0;
        }

        console.log(`[Switch Node] 🔀 Configuration`, {
            mode,
            outputsCount,
        });

        // Initialize output arrays: one per rule
        const outputs: any[][] = Array.from({ length: outputsCount }, () => []);

        if (processedItems.length === 0) {
            // Return empty outputs for all configured outputs
            return outputs.map((_, index) => ({ [`output${index}`]: [] }));
        }

        // Helper function to resolve field value from item
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

        // Evaluate single condition
        const evaluateSingleCondition = (
            value1: any,
            operation: string,
            value2: any
        ): boolean => {
            const val1 = String(value1 ?? "");
            const val2 = String(value2 ?? "");

            switch (operation) {
                case "equal":
                    return val1 === val2;

                case "notEqual":
                    return val1 !== val2;

                case "larger":
                    return Number(value1) > Number(value2);

                case "largerEqual":
                    return Number(value1) >= Number(value2);

                case "smaller":
                    return Number(value1) < Number(value2);

                case "smallerEqual":
                    return Number(value1) <= Number(value2);

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

        if (mode === "rules") {
            // Rules mode: evaluate rules for each item
            const rules = (await this.getNodeParameter("rules")) as any[];
            console.log(`[Switch Node] 🔀 Rules:`, JSON.stringify(rules, null, 2));

            // Process each item
            for (let itemIndex = 0; itemIndex < processedItems.length; itemIndex++) {
                const item = processedItems[itemIndex];
                let matched = false;

                console.log(`[Switch Node] 🔀 Processing item ${itemIndex}:`, JSON.stringify(item, null, 2));

                // Try to match against each rule (rule index = output index)
                for (let ruleIndex = 0; ruleIndex < (rules || []).length; ruleIndex++) {
                    const ruleConfig = rules[ruleIndex];
                    const rule = ruleConfig.values || ruleConfig;
                    const condition = rule.condition;

                    console.log(`[Switch Node] 🔀 Evaluating Rule ${ruleIndex + 1}:`, {
                        condition,
                        hasCondition: !!condition,
                        hasKey: !!condition?.key,
                    });

                    // Skip if no condition defined
                    if (!condition || !condition.key) {
                        console.log(`[Switch Node] ⚠️ Rule ${ruleIndex + 1} skipped: no condition or key`);
                        continue;
                    }

                    // Evaluate the condition
                    const keyValue = resolveValue(item, condition.key);
                    console.log(`[Switch Node] 🔀 Rule ${ruleIndex + 1} evaluation:`, {
                        field: condition.key,
                        fieldValue: keyValue,
                        fieldValueType: typeof keyValue,
                        operation: condition.expression,
                        compareValue: condition.value,
                        compareValueType: typeof condition.value,
                        item: item,
                    });

                    const result = evaluateSingleCondition(
                        keyValue,
                        condition.expression,
                        condition.value
                    );

                    console.log(`[Switch Node] 🔀 Rule ${ruleIndex + 1} result:`, result);

                    // If condition met, route to this output
                    if (result) {
                        outputs[ruleIndex].push(item);
                        matched = true;
                        console.log(`[Switch Node] ✅ Item ${itemIndex} routed to Output ${ruleIndex}`);
                        break; // Stop at first matching rule
                    }
                }

                // If no rule matched, item is not routed anywhere (discarded)
                if (!matched) {
                    console.log(`[Switch Node] ❌ Item ${itemIndex} discarded (no matching rule)`);
                }
            }
        } else {
            // Expression mode: evaluate expression for each item
            const outputExpression = (await this.getNodeParameter("outputExpression")) as string;

            console.log(`[Switch Node] 🔀 Expression mode`, {
                outputExpression,
            });

            for (const item of processedItems) {
                try {
                    let outputIndex: number;

                    // Check if expression contains template syntax {{...}}
                    if (outputExpression.includes('{{') && outputExpression.includes('}}')) {
                        // Extract field-based routing: {{json.fieldName}}
                        const fieldMatch = outputExpression.match(/\{\{json\.([\w.]+)\}\}/);
                        if (fieldMatch) {
                            const fieldPath = fieldMatch[1];
                            const value = resolvePath(item, fieldPath);
                            outputIndex = Number(value) || 0;
                            
                            console.log(`[Switch Node] 🔀 Expression evaluated (field):`, {
                                expression: outputExpression,
                                fieldPath,
                                fieldValue: value,
                                outputIndex,
                            });
                        } else {
                            // Complex expression - try to evaluate
                            // For now, just parse as number
                            outputIndex = Number(outputExpression) || 0;
                            console.warn(`[Switch Node] ⚠️ Complex expressions not yet supported, using default output 0`);
                        }
                    } else {
                        // Direct number or field name
                        const numValue = Number(outputExpression);
                        if (!isNaN(numValue)) {
                            // It's a number
                            outputIndex = numValue;
                        } else {
                            // It's a field name without {{}}
                            const value = resolvePath(item, outputExpression);
                            outputIndex = Number(value) || 0;
                            
                            console.log(`[Switch Node] 🔀 Expression evaluated (direct field):`, {
                                fieldName: outputExpression,
                                fieldValue: value,
                                outputIndex,
                            });
                        }
                    }

                    // Validate and route
                    if (outputIndex >= 0 && outputIndex < outputsCount) {
                        outputs[outputIndex].push(item);
                        console.log(`[Switch Node] ✅ Item routed to Output ${outputIndex} via expression`);
                    } else {
                        console.warn(`[Switch Node] ⚠️ Expression returned invalid output index: ${outputIndex} (valid: 0-${outputsCount - 1})`);
                        // Discard item on invalid index
                    }
                } catch (error) {
                    console.error(`[Switch Node] ❌ Error evaluating expression:`, error);
                    // Discard item on error
                }
            }
        }

        // Wrap items in json format
        const wrappedOutputs = outputs.map((outputItems) =>
            outputItems.map((item) => ({ json: item }))
        );

        // Log output counts
        const outputCounts = wrappedOutputs.reduce((acc, output, index) => {
            acc[`output${index}`] = output.length;
            return acc;
        }, {} as Record<string, number>);

        console.log(`[Switch Node] 🔀 Routing complete`, outputCounts);

        // Return dynamic outputs based on outputsCount
        return wrappedOutputs.map((output, index) => ({
            [`output${index}`]: output,
        }));
    },
};
