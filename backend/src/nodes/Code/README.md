# Code Node

The Code node allows you to execute JavaScript or Python code to process data in your workflow.

## Features

- **JavaScript Execution**: Execute JavaScript code in a secure VM sandbox using vm2
- **Python Execution**: Execute Python code using Python 3
- **Enhanced Code Editor**: Custom code editor with line numbers, syntax-aware indentation, and auto-completion
- **Secure Sandboxing**: JavaScript code runs in an isolated environment with limited access
- **Error Handling**: Configurable error handling with `continueOnFail` option
- **Timeout Control**: Set execution timeout to prevent long-running code

## Code Editor Features

The Code node includes a custom code editor with:
- **Line Numbers**: Easy navigation and reference
- **Auto-Indentation**: Smart indentation based on code structure
- **Bracket Matching**: Auto-completion for brackets in JavaScript
- **Tab Support**: Press Tab to insert proper indentation
- **Language-Specific**: Different indentation rules for Python (4 spaces) and JavaScript (2 spaces)

## Usage

### JavaScript Example

```javascript
// Access input data via 'items' variable
// Each item is available as items[0], items[1], etc.
// Return an array of items to output

// Example: Add a new field to each item
const results = items.map(item => ({
  ...item,
  processedAt: new Date().toISOString(),
  customField: 'Hello from Code node!'
}));

return results;
```

### Python Example

```python
# Access input data via 'items' variable
# Each item is a dictionary with the data
# Return a list of dictionaries to output

import json
from datetime import datetime

results = []
for item in items:
    item['processedAt'] = datetime.now().isoformat()
    item['customField'] = 'Hello from Code node!'
    results.append(item)

# Output must be JSON
print(json.dumps(results))
```

## Available APIs

### JavaScript

The following JavaScript objects are available in the sandbox:

- `items`: Array of input items
- `console.log()`, `console.error()`, `console.warn()`: Logging functions
- `JSON`: JSON parsing and stringifying
- `Date`: Date operations
- `Math`: Mathematical operations
- `Object`, `Array`, `String`, `Number`, `Boolean`, `RegExp`: Standard JavaScript objects

### Python

Standard Python libraries are available. The code must:
1. Access input via the `items` variable
2. Output valid JSON to stdout using `print(json.dumps(results))`

## Configuration Options

- **Language**: Choose between JavaScript and Python
- **Code**: The code to execute
- **Timeout (ms)**: Maximum execution time in milliseconds (default: 30000ms)
- **Continue On Fail**: Whether to continue workflow execution if code fails (default: false)

## Security

### JavaScript
- Runs in an isolated VM using vm2
- No access to Node.js modules, file system, or network
- Limited to safe JavaScript operations

### Python
- Executes in a subprocess with Python 3
- Code should be trusted as it has access to system Python modules
- Consider using environment restrictions in production

## Examples

### Filter Items

```javascript
// JavaScript: Filter items by age > 25
return items.filter(item => item.age > 25);
```

```python
# Python: Filter items by age > 25
import json
results = [item for item in items if item.get('age', 0) > 25]
print(json.dumps(results))
```

### Transform Data

```javascript
// JavaScript: Transform data
return items.map(item => ({
  fullName: `${item.firstName} ${item.lastName}`,
  email: item.email.toLowerCase(),
  timestamp: new Date().toISOString()
}));
```

```python
# Python: Transform data
import json
from datetime import datetime

results = []
for item in items:
    results.append({
        'fullName': f"{item.get('firstName', '')} {item.get('lastName', '')}",
        'email': item.get('email', '').lower(),
        'timestamp': datetime.now().isoformat()
    })
print(json.dumps(results))
```

### Aggregate Data

```javascript
// JavaScript: Calculate sum
const sum = items.reduce((acc, item) => acc + (item.value || 0), 0);
return [{ sum, count: items.length }];
```

```python
# Python: Calculate sum
import json

total = sum(item.get('value', 0) for item in items)
result = [{'sum': total, 'count': len(items)}]
print(json.dumps(result))
```

## Troubleshooting

### JavaScript Errors
- Check for syntax errors in your code
- Ensure you return an array of items
- Verify that all referenced variables exist

### Python Errors
- Ensure Python 3 is installed on the system
- Check that your code outputs valid JSON
- Verify imports are available in the Python environment

### Timeout Issues
- Increase the timeout value for long-running operations
- Optimize your code for better performance
- Consider breaking complex operations into multiple nodes

## Best Practices

1. **Keep code simple**: Simple operations are easier to debug and maintain
2. **Test thoroughly**: Test your code with different input data
3. **Handle errors**: Use try-catch (JavaScript) or try-except (Python) for error handling
4. **Validate input**: Check that required fields exist before using them
5. **Output consistently**: Always return the expected data structure
