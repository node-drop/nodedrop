# Nodes Directory

This directory contains all the individual node implementations for the node-drop project. Each node is organized in its own folder with a consistent structure.

## Structure

Each node folder must contain:

- `index.ts` - Exports the node definition
- `[NodeName].node.ts` - Contains the node implementation

```
nodes/
├── HttpRequest/
│   ├── index.ts
│   └── HttpRequest.node.ts
├── If/
│   ├── index.ts
│   └── If.node.ts
├── Json/
│   ├── index.ts
│   └── Json.node.ts
└── ... (other nodes)
```

## Available Nodes

### Core Nodes

- **HttpRequest** - Make HTTP requests to any URL
- **If** - Route data based on conditional logic
- **Json** - Compose a JSON object
- **Set** - Set values on the data
- **Switch** - Route data to different outputs based on conditions

### Trigger Nodes

- **WebhookTrigger** - Triggers workflow execution when a webhook is called
- **ScheduleTrigger** - Triggers workflow execution on a schedule using cron expressions
- **ManualTrigger** - Triggers workflow execution manually when requested by the user

### Example Nodes

- **CustomTemplate** - Example node showing how to use custom templates in form configuration
- **DynamicProperties** - Example node showing how properties can be defined as a function for dynamic generation

## CLI Commands

### List all nodes

```bash
npm run nodes:list
```

### Create a new node

```bash
npm run nodes:create <NodeName>
```

### Discover and validate nodes

```bash
npm run nodes:discover
npm run nodes:validate
```

### Register all nodes

```bash
npm run nodes:register
```

## Creating a New Node

### Option 1: Using CLI (Recommended)

```bash
npm run nodes:create MyNewNode
```

This automatically creates:

- `MyNewNode/` directory
- `MyNewNode.node.ts` with boilerplate code
- `index.ts` with proper export

### Option 2: Manual Creation

1. Create a new directory: `nodes/MyNewNode/`

2. Create `MyNewNode.node.ts`:

```typescript
import {
  BuiltInNodeTypes,
  NodeDefinition,
  NodeInputData,
  NodeOutputData,
} from "../../types/node.types";

export const MyNewNodeNode: NodeDefinition = {
  type: "MY_NEW_NODE" as BuiltInNodeTypes,
  displayName: "My New Node",
  name: "myNewNode",
  group: ["transform"],
  version: 1,
  description: "Description of what this node does",
  icon: "fa:gear",
  color: "#2196F3",
  defaults: {},
  inputs: ["main"],
  outputs: ["main"],
  properties: [
    {
      displayName: "Option",
      name: "option",
      type: "string",
      required: false,
      default: "",
      description: "Configuration option for this node",
    },
  ],
  execute: async (
    inputData: NodeInputData,
    properties: Record<string, any>
  ): Promise<NodeOutputData> => {
    // Implement your node logic here
    return {
      success: true,
      data: inputData,
    };
  },
};
```

3. Create `index.ts`:

```typescript
export { MyNewNodeNode } from "./MyNewNode.node";
```

4. Register the node:

```bash
npm run nodes:register
```

## Auto-Discovery System

The nodes are automatically discovered and loaded using the `NodeDiscovery` utility. This means:

- ✅ **No manual configuration** - Just add a folder with the correct structure
- ✅ **Automatic registration** - New nodes are automatically included
- ✅ **Validation** - Structure is validated automatically
- ✅ **Hot reloading** - Changes are picked up on restart

## Node Definition Interface

Each node must export a `NodeDefinition` object with these required properties:

```typescript
interface NodeDefinition {
  type: string; // Unique identifier for the node type
  displayName: string; // Human-readable name shown in UI
  name: string; // Internal name (camelCase)
  group: string[]; // Categories for grouping nodes
  version: number; // Node version for compatibility
  description: string; // Description shown in UI
  icon: string; // Icon identifier (e.g., "fa:gear")
  color: string; // Hex color for the node
  defaults: object; // Default values for properties
  inputs: string[]; // Input connection types
  outputs: string[]; // Output connection types
  properties: PropertyDefinition[]; // Configuration properties
  execute: Function; // Main execution function
}
```

## Best Practices

1. **Naming**: Use PascalCase for folder and file names
2. **Exports**: Always export through `index.ts`
3. **Documentation**: Include clear descriptions and comments
4. **Validation**: Run `npm run nodes:validate` before committing
5. **Testing**: Test your node with `npm run nodes:register`

## Troubleshooting

### Node not discovered

- Check folder contains both `index.ts` and `.node.ts` file
- Verify exports in `index.ts` are correct
- Run `npm run nodes:validate` to check structure

### Registration fails

- Ensure node definition follows the correct interface
- Check all required properties are present
- Review console output for specific error messages

### Import errors

- Verify file paths in imports are correct
- Check TypeScript compilation succeeds
- Look for circular dependencies

## File Structure Requirements

✅ **Valid structure:**

```
MyNode/
├── index.ts              # Required: exports the node
└── MyNode.node.ts        # Required: contains implementation
```

❌ **Invalid structures:**

```
MyNode/
└── MyNode.node.ts        # Missing index.ts

MyNode/
└── index.ts              # Missing .node.ts file

MyNode.node.ts            # Not in a folder
```

For more detailed information, see the main project documentation.
