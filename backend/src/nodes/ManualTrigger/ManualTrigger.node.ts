import {
  NodeDefinition,
  NodeInputData,
  NodeOutputData,
} from "../../types/node.types";

export const ManualTriggerNode: NodeDefinition = {
  identifier: "manual-trigger",
  displayName: "Manual Trigger",
  name: "manualTrigger",
  group: ["trigger"],
  nodeCategory: "trigger",
  triggerType: "manual",
  version: 2,
  description:
    "Triggers workflow execution manually when requested by the user",
  ai: {
    description: "Use this trigger to start a workflow manually. Essential for testing, debugging, or on-demand execution.",
    useCases: [
      "Testing workflows during development",
      "Debugging specific paths or nodes",
      "Manually triggering reports or actions"
    ],
    tags: ["test", "debug", "manual", "trigger", "start"],
    rules: [
      "No configuration required, just click 'Execute'",
      "Use mock data feature to test with custom input"
    ],
    complexityScore: 1
  },
  icon: "lucide:mouse-pointer-click",
  color: "#4CAF50",
  defaults: {},
  inputs: [],
  outputs: ["main"],
  properties: [],
  execute: async function (
    _inputData: NodeInputData
  ): Promise<NodeOutputData[]> {
    this.logger.info("Manual trigger executed");

    return [
      {
        main: [
          {
            json: {},
          },
        ],
      },
    ];
  },
};
