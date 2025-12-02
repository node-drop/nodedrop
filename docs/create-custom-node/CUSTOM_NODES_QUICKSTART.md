# Custom Nodes Quick Start Guide

## 🚀 Get Started in 5 Minutes

This guide will help you create your first custom node in just a few minutes.

## Prerequisites

- Node.js 18+ installed
- Basic knowledge of JavaScript/TypeScript
- node drop project running

## Step 1: Create Your First Node

### Option A: Using the Web Interface (Recommended)

1. Start the application:
```bash
npm run dev
```

2. Navigate to `http://localhost:3000/custom-nodes`

3. Click on the **"Create Node"** tab

4. Fill in the form:
   - **Name**: `hello-world`
   - **Display Name**: `Hello World`
   - **Description**: `A simple greeting node`
   - **Type**: `Action`
   - **Author**: Your name
   - ✅ Use TypeScript
   - ✅ Include tests

5. Click **"Generate Package"**

### Option B: Using the CLI

```bash
cd backend
npm run node-cli create \
  --name "hello-world" \
  --display-name "Hello World" \
  --description "A simple greeting node" \
  --type "action" \
  --author "Your Name" \
  --typescript \
  --tests
```

## Step 2: Customize Your Node

Navigate to the generated package and edit the main node file:

```typescript
// nodes/hello-world.node.ts
const HelloWorldNode: NodeDefinition = {
  type: 'hello-world',
  displayName: 'Hello World',
  name: 'helloWorld',
  group: ['transform'],
  version: 1,
  description: 'A simple greeting node',
  icon: 'fa:hand-wave',
  color: '#4CAF50',
  defaults: {
    name: 'Hello World',
    greeting: 'Hello'
  },
  inputs: ['main'],
  outputs: ['main'],
  properties: [
    {
      displayName: 'Greeting',
      name: 'greeting',
      type: 'string',
      required: true,
      default: 'Hello',
      description: 'The greeting to use'
    },
    {
      displayName: 'Name Field',
      name: 'nameField',
      type: 'string',
      required: false,
      default: 'name',
      description: 'Field containing the name to greet'
    }
  ],
  execute: async function(inputData: NodeInputData): Promise<NodeOutputData[]> {
    const greeting = this.getNodeParameter('greeting') as string;
    const nameField = this.getNodeParameter('nameField') as string;
    const items = inputData.main?.[0] || [];

    const outputItems = items.map(item => ({
      json: {
        ...item.json,
        message: `${greeting}, ${item.json[nameField] || 'World'}!`,
        timestamp: new Date().toISOString()
      }
    }));

    return [{ main: outputItems }];
  }
};

export default HelloWorldNode;
```

## Step 3: Test Your Node

### Option A: Using the Web Interface

1. Go to the **"Validate Package"** tab
2. Enter the path to your package
3. Click **"Validate Package"** to check structure
4. Click **"Load Package"** to load it into the system

### Option B: Using the CLI

```bash
# Validate the package
npm run node-cli validate /path/to/hello-world

# Load the package
npm run node-cli install /path/to/hello-world
```

## Step 4: Use Your Node in a Workflow

1. Go to **Workflows** in the main navigation
2. Create a new workflow
3. Add a **Manual Trigger** node
4. Add your **Hello World** node
5. Configure the greeting and name field
6. Add some test data:
```json
{
  "name": "Alice",
  "age": 30
}
```
7. Execute the workflow

Expected output:
```json
{
  "name": "Alice",
  "age": 30,
  "message": "Hello, Alice!",
  "timestamp": "2023-12-07T10:30:00.000Z"
}
```

## Step 5: Add More Features

### Add Input Validation

```typescript
execute: async function(inputData: NodeInputData): Promise<NodeOutputData[]> {
  const greeting = this.getNodeParameter('greeting') as string;
  const nameField = this.getNodeParameter('nameField') as string;
  const items = inputData.main?.[0] || [];

  if (!greeting) {
    throw new Error('Greeting parameter is required');
  }

  const outputItems = items.map(item => {
    const name = item.json[nameField];
    if (!name) {
      this.logger.warn(`No name found in field '${nameField}' for item`, item);
    }

    return {
      json: {
        ...item.json,
        message: `${greeting}, ${name || 'World'}!`,
        timestamp: new Date().toISOString(),
        processed: true
      }
    };
  });

  return [{ main: outputItems }];
}
```

### Add Error Handling

```typescript
execute: async function(inputData: NodeInputData): Promise<NodeOutputData[]> {
  try {
    const greeting = this.getNodeParameter('greeting') as string;
    const nameField = this.getNodeParameter('nameField') as string;
    const items = inputData.main?.[0] || [];

    // Your node logic here...

    return [{ main: outputItems }];
  } catch (error) {
    this.logger.error('Hello World node execution failed', { error });
    throw new Error(`Hello World node failed: ${error.message}`);
  }
}
```

## Step 6: Development Tips

### Hot Reload Development

```bash
# Start development mode with hot reload
npm run node-cli dev /path/to/hello-world
```

Now any changes to your node files will automatically reload the package.

### Testing Your Node

Create a test file:

```typescript
// __tests__/hello-world.test.ts
import HelloWorldNode from '../nodes/hello-world.node';

describe('HelloWorldNode', () => {
  let mockContext: any;

  beforeEach(() => {
    mockContext = {
      getNodeParameter: jest.fn(),
      logger: {
        warn: jest.fn(),
        error: jest.fn()
      }
    };
  });

  it('should greet with default message', async () => {
    mockContext.getNodeParameter.mockImplementation((param: string) => {
      if (param === 'greeting') return 'Hello';
      if (param === 'nameField') return 'name';
    });

    const inputData = {
      main: [[
        { json: { name: 'Alice', age: 30 } }
      ]]
    };

    const result = await HelloWorldNode.execute.call(mockContext, inputData);

    expect(result[0].main[0].json.message).toBe('Hello, Alice!');
    expect(result[0].main[0].json.processed).toBe(true);
  });
});
```

Run tests:
```bash
npm run node-cli test /path/to/hello-world
```

## Common Node Types

### Action Node (Data Processing)
```typescript
// Processes input data and returns modified output
execute: async function(inputData) {
  const items = inputData.main?.[0] || [];
  const processedItems = items.map(item => ({
    json: { ...item.json, processed: true }
  }));
  return [{ main: processedItems }];
}
```

### Trigger Node (Workflow Starter)
```typescript
// Starts workflows based on events or schedules
// Usually has no inputs, only outputs
inputs: [],
outputs: ['main'],
execute: async function() {
  const triggerData = {
    timestamp: new Date().toISOString(),
    event: 'manual_trigger'
  };
  return [{ main: [{ json: triggerData }] }];
}
```

### Transform Node (Data Transformation)
```typescript
// Transforms data from one format to another
execute: async function(inputData) {
  const items = inputData.main?.[0] || [];
  const transformedItems = items.map(item => ({
    json: {
      id: item.json.id,
      fullName: `${item.json.firstName} ${item.json.lastName}`,
      email: item.json.email.toLowerCase()
    }
  }));
  return [{ main: transformedItems }];
}
```

## Next Steps

1. **Explore the Marketplace**: Check out existing nodes for inspiration
2. **Add Credentials**: Learn how to handle API keys and authentication
3. **Advanced Features**: Implement webhooks, file handling, or database connections
4. **Share Your Node**: Publish to the marketplace for others to use
5. **Read the Full Documentation**: Check `CUSTOM_NODES.md` for comprehensive details

## Need Help?

- 📖 Read the full documentation: `CUSTOM_NODES.md`
- 🐛 Check the troubleshooting section
- 💬 Ask questions in the community
- 🔍 Look at existing node examples in the codebase

Happy coding! 🎉