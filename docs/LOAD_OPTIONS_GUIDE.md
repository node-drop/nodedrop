# Load Options System Guide

## Overview

The Load Options system enables nodes to dynamically load dropdown options from external sources (APIs, databases, etc.) based on user credentials and other parameters. This is essential for fields like database tables, API endpoints, or any data that cannot be predetermined.

## Table of Contents

- [Architecture](#architecture)
- [How It Works](#how-it-works)
- [Implementation Guide](#implementation-guide)
- [Flow Diagram](#flow-diagram)
- [Example: PostgreSQL Node](#example-postgresql-node)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

---

## Architecture

### Components

1. **Backend**

   - `POST /api/nodes/:type/load-options` - API endpoint
   - `NodeService.loadNodeOptions()` - Orchestrates option loading
   - Node's `loadOptions` object - Contains load methods
   - Credential mapping system - Maps field names to credential types

2. **Frontend**
   - `DynamicAutocomplete` component - Handles dynamic option loading
   - `FieldRenderer` - Detects `loadOptionsMethod` and renders DynamicAutocomplete
   - `FormGenerator` - Passes node context to fields

---

## How It Works

### 1. User Interaction Flow

```
User opens node config
  ↓
User selects credentials
  ↓
Autocomplete field detects loadOptionsMethod
  ↓
Frontend calls API with credentials
  ↓
Backend resolves credentials and executes load method
  ↓
Options populate dropdown
```

### 2. Data Flow

```
Frontend (DynamicAutocomplete)
  ↓ POST /api/nodes/:type/load-options
  ↓ { method, parameters, credentials }
  ↓
Backend (nodes.ts route)
  ↓ calls NodeService.loadNodeOptions()
  ↓
NodeService
  ↓ Maps credential field names to types
  ↓ Creates execution context
  ↓ Provides getCredentials() and getNodeParameter()
  ↓
Node's loadOptions method
  ↓ Fetches data (DB query, API call, etc.)
  ↓ Returns formatted options array
  ↓
Response: [{ name, value, description }]
  ↓
Frontend formats and displays options
```

---

## Implementation Guide

### Step 1: Define Credential Type (if needed)

Create a credential definition in `backend/custom-nodes/[node-name]/credentials/`:

```javascript
// Example: postgresDb.credentials.js
module.exports = {
  name: "postgresDb",
  displayName: "PostgreSQL Database",
  properties: [
    {
      displayName: "Host",
      name: "host",
      type: "string",
      default: "localhost",
      required: true,
    },
    {
      displayName: "Port",
      name: "port",
      type: "number",
      default: 5432,
    },
    {
      displayName: "Database",
      name: "database",
      type: "string",
      required: true,
    },
    {
      displayName: "User",
      name: "user",
      type: "string",
      required: true,
    },
    {
      displayName: "Password",
      name: "password",
      type: "password",
      required: true,
    },
    {
      displayName: "SSL",
      name: "ssl",
      type: "boolean",
      default: false,
    },
  ],
  test: async function (credential) {
    // Test connection logic
    const { Pool } = require("pg");
    const pool = new Pool(credential);
    try {
      await pool.query("SELECT 1");
      return { success: true, message: "Connection successful" };
    } catch (error) {
      return { success: false, message: error.message };
    } finally {
      await pool.end();
    }
  },
};
```

### Step 2: Add Credential Field to Node

```javascript
// In your node definition
properties: [
  {
    displayName: "Authentication",
    name: "authentication",
    type: "credential",
    required: true,
    default: "",
    description: "Select credentials to connect",
    placeholder: "Select credentials...",
    allowedTypes: ["postgresDb"], // Maps to credential type
  },
  // ... other fields
];
```

### Step 3: Add Autocomplete Field with loadOptionsMethod

```javascript
properties: [
  // ... credential field above
  {
    displayName: "Table",
    name: "table",
    type: "autocomplete",
    typeOptions: {
      loadOptionsMethod: "getTables", // Name of the load method
    },
    default: "",
    required: true,
    description: "Select a table from the database",
    placeholder: "Search and select table...",
  },
];
```

### Step 4: Implement loadOptions Method

```javascript
module.exports = {
  // ... node definition

  loadOptions: {
    /**
     * Get list of tables from the database
     */
    async getTables() {
      try {
        // 1. Get credentials
        const credentials = await this.getCredentials("postgresDb");

        if (!credentials || !credentials.host) {
          return [
            {
              name: "No credentials selected",
              value: "",
              description: "Please select credentials first",
            },
          ];
        }

        // 2. Extract connection parameters
        const { host, port, database, user, password, ssl } = credentials;

        // 3. Connect and fetch data
        const { Pool } = require("pg");
        const pool = new Pool({
          host,
          port: port || 5432,
          database,
          user,
          password,
          ssl: ssl ? { rejectUnauthorized: false } : false,
        });

        const result = await pool.query(`
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = 'public' 
          ORDER BY table_name
        `);

        await pool.end();

        // 4. Format results
        return result.rows.map((row) => ({
          name: row.table_name, // Display name
          value: row.table_name, // Actual value
          description: `Table: ${row.table_name}`, // Subtitle
        }));
      } catch (error) {
        this.logger.error("Failed to load tables", { error });

        // Return error as option
        return [
          {
            name: "Error loading tables",
            value: "",
            description: error.message,
          },
        ];
      }
    },

    // Add more load methods as needed
    async getColumns() {
      const tableName = this.getNodeParameter("table");
      // ... implementation
    },
  },
};
```

### Step 5: Use Loaded Value in execute()

```javascript
execute: async function (inputData) {
  const items = inputData.main?.[0] || [];

  // Get credentials
  const credentials = await this.getCredentials('postgresDb');

  // Get the selected table (loaded via loadOptions)
  const table = this.getNodeParameter('table');

  // Use the value
  const query = `SELECT * FROM ${table}`;

  // ... rest of execution logic
}
```

---

## Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Interface                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ 1. User selects credentials
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  FieldRenderer (checks field.typeOptions.loadOptionsMethod)     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ 2. Renders DynamicAutocomplete
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│              DynamicAutocomplete Component                       │
│  - Extracts credentials from form values                        │
│  - Monitors credential changes                                  │
│  - Makes API request on mount/credential change                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ 3. POST /api/nodes/:type/load-options
                              │    { method, parameters, credentials }
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                  Backend API Route                               │
│  Route: /api/nodes/:type/load-options                           │
│  - Authenticates request                                        │
│  - Validates method parameter                                   │
│  - Calls NodeService.loadNodeOptions()                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ 4. NodeService.loadNodeOptions()
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    NodeService                                   │
│  1. Get node definition from registry                           │
│  2. Build credential type mapping:                              │
│     - Iterate through node properties                           │
│     - Map field names to credential types                       │
│     - Example: "authentication" → "postgresDb"                  │
│  3. Create execution context:                                   │
│     - getNodeParameter(name) → returns parameters[name]         │
│     - getCredentials(type) → resolves credential ID             │
│     - logger → provides logging methods                         │
│  4. Call node's loadOptions[method]()                           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ 5. Credential Resolution
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│              getCredentials() Implementation                     │
│  1. Receive credential type (e.g., "postgresDb")                │
│  2. Look up in credentials object:                              │
│     - Try credentials[credentialType] (direct match)            │
│     - If not found, use mapping:                                │
│       * Find field name that maps to type                       │
│       * Example: "authentication" maps to "postgresDb"          │
│       * Get credentials["authentication"]                       │
│  3. Credential ID found → fetch from database                   │
│  4. CredentialService.getCredentialById(id)                     │
│  5. Decrypt credential data                                     │
│  6. Return decrypted credential object                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ 6. Execute loadOptions method
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│              Node's loadOptions.getTables()                      │
│  1. Call this.getCredentials('postgresDb')                      │
│  2. Receive decrypted credentials: { host, port, ... }          │
│  3. Connect to database/API                                     │
│  4. Query for data (tables, columns, endpoints, etc.)           │
│  5. Format results:                                             │
│     [{                                                           │
│       name: 'Display Name',                                     │
│       value: 'actual_value',                                    │
│       description: 'Optional subtitle'                          │
│     }]                                                           │
│  6. Return formatted array                                      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ 7. Response propagation
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                  Response Flow                                   │
│  NodeService validates response:                                │
│    - Checks if array                                            │
│    - Wraps in { success: true, data: [...] }                    │
│  API route sends response to frontend                           │
│  DynamicAutocomplete formats options:                           │
│    - Maps to AutoCompleteOption format                          │
│    - Sets options state                                         │
│  AutoComplete component renders dropdown                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ 8. User selects option
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                  Value Update                                    │
│  - onChange handler fires                                       │
│  - Updates form state with selected value                       │
│  - Value available in execute() via getNodeParameter()          │
└─────────────────────────────────────────────────────────────────┘
```

---

## Example: PostgreSQL Node

Complete implementation showing all components working together:

### Credential Definition

```javascript
// backend/custom-nodes/postgres/credentials/postgresDb.credentials.js
module.exports = {
  name: "postgresDb",
  displayName: "PostgreSQL Database",
  properties: [
    {
      displayName: "Host",
      name: "host",
      type: "string",
      default: "localhost",
      required: true,
    },
    { displayName: "Port", name: "port", type: "number", default: 5432 },
    {
      displayName: "Database",
      name: "database",
      type: "string",
      required: true,
    },
    { displayName: "User", name: "user", type: "string", required: true },
    {
      displayName: "Password",
      name: "password",
      type: "password",
      required: true,
    },
    { displayName: "SSL", name: "ssl", type: "boolean", default: false },
  ],
  test: async function (credential) {
    const { Pool } = require("pg");
    const pool = new Pool(credential);
    try {
      await pool.query("SELECT 1");
      return { success: true };
    } catch (error) {
      return { success: false, message: error.message };
    } finally {
      await pool.end();
    }
  },
};
```

### Node Definition

```javascript
// backend/custom-nodes/postgres/nodes/postgres.node.js
const { Pool } = require("pg");

module.exports = {
  type: "postgres",
  displayName: "PostgreSQL",
  properties: [
    {
      displayName: "Authentication",
      name: "authentication",
      type: "credential",
      required: true,
      allowedTypes: ["postgresDb"],
    },
    {
      displayName: "Table",
      name: "table",
      type: "autocomplete",
      typeOptions: {
        loadOptionsMethod: "getTables",
      },
      required: true,
      description: "Select a table from the database",
    },
  ],

  execute: async function (inputData) {
    const credentials = await this.getCredentials("postgresDb");
    const table = this.getNodeParameter("table");

    const pool = new Pool(credentials);
    const result = await pool.query(`SELECT * FROM ${table}`);
    await pool.end();

    return [{ main: [{ json: { rows: result.rows } }] }];
  },

  loadOptions: {
    async getTables() {
      try {
        const credentials = await this.getCredentials("postgresDb");

        if (!credentials) {
          return [
            {
              name: "No credentials selected",
              value: "",
              description: "Please select credentials first",
            },
          ];
        }

        const pool = new Pool(credentials);
        const result = await pool.query(`
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = 'public' 
          ORDER BY table_name
        `);
        await pool.end();

        return result.rows.map((row) => ({
          name: row.table_name,
          value: row.table_name,
          description: `Table: ${row.table_name}`,
        }));
      } catch (error) {
        this.logger.error("Failed to load tables", { error });
        return [
          {
            name: "Error loading tables",
            value: "",
            description: error.message,
          },
        ];
      }
    },
  },
};
```

---

## Best Practices

### 1. Credential Handling

✅ **DO:**

- Always check if credentials exist before using them
- Provide helpful error messages when credentials are missing
- Use credentials as the single source of truth for connection parameters

❌ **DON'T:**

- Don't duplicate credential fields in node properties
- Don't store sensitive data in node parameters
- Don't skip credential validation

### 2. Error Handling

✅ **DO:**

```javascript
async getTables() {
  try {
    const credentials = await this.getCredentials('postgresDb');

    if (!credentials || !credentials.host) {
      return [
        { name: 'No credentials selected', value: '', description: 'Please select credentials first' }
      ];
    }

    // ... fetch data

  } catch (error) {
    this.logger.error('Failed to load tables', { error });
    return [
      { name: 'Error loading tables', value: '', description: error.message }
    ];
  }
}
```

❌ **DON'T:**

```javascript
// Don't let errors crash the UI
async getTables() {
  const credentials = await this.getCredentials('postgresDb');
  const result = await someApiCall(credentials); // May throw!
  return result; // Wrong format!
}
```

### 3. Response Format

Always return an array of objects with this structure:

```javascript
[
  {
    name: "Display Name", // Required: shown to user
    value: "actual_value", // Required: stored in form
    description: "Optional info", // Optional: shown as subtitle
  },
];
```

### 4. Performance

✅ **DO:**

- Cache results when appropriate
- Limit query results (use LIMIT, pagination)
- Close connections properly (use try/finally)
- Use connection pooling

❌ **DON'T:**

- Don't fetch large datasets without pagination
- Don't leave connections open
- Don't make unnecessary API calls

### 5. User Experience

✅ **DO:**

- Provide clear error messages
- Show loading states (handled by DynamicAutocomplete)
- Use descriptive option names and descriptions
- Sort options alphabetically or by relevance

❌ **DON'T:**

- Don't show technical error details to users
- Don't return empty arrays without context
- Don't use cryptic option names

---

## Troubleshooting

### Issue: "No credentials selected"

**Cause:** Credentials not passed correctly from frontend

**Solution:**

1. Verify credential field has `type: 'credential'`
2. Check `allowedTypes` matches credential type name
3. Ensure user has selected credentials in the UI

### Issue: "Failed to load options"

**Cause:** API call failing or response format incorrect

**Debug Steps:**

1. Check browser console for detailed error
2. Check Network tab for API response
3. Verify backend logs for errors
4. Test credential connection manually

### Issue: Options not refreshing when credentials change

**Cause:** Frontend not detecting credential changes

**Solution:**

1. Verify DynamicAutocomplete is monitoring credentials
2. Check if `credentialsKey` memoization is working
3. Ensure `hasLoadedRef` resets on credential change

### Issue: "Credential service not initialized"

**Cause:** Backend credential service not set up

**Solution:**

1. Check `global.credentialService` is set in server.ts
2. Verify CredentialService is imported and instantiated
3. Restart backend server

### Issue: Empty dropdown even though API returns data

**Cause:** Response format mismatch

**Solution:**

1. Verify API returns `{ success: true, data: [...] }`
2. Check DynamicAutocomplete handles both wrapped and direct array responses
3. Inspect console logs for formatting errors

---

## API Reference

### Backend API Endpoint

**Endpoint:** `POST /api/nodes/:type/load-options`

**Request Body:**

```json
{
  "method": "getTables",
  "parameters": {
    "operation": "select",
    "limit": 50
    // ... other node parameters
  },
  "credentials": {
    "authentication": "credential_id_here"
  }
}
```

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "name": "users",
      "value": "users",
      "description": "Table: users"
    }
  ]
}
```

### Execution Context Methods

Available in `loadOptions` methods:

#### `this.getCredentials(credentialType)`

Returns decrypted credential data.

```javascript
const credentials = await this.getCredentials("postgresDb");
// Returns: { host: 'localhost', port: 5432, database: 'mydb', ... }
```

#### `this.getNodeParameter(parameterName)`

Returns the value of a node parameter.

```javascript
const table = this.getNodeParameter("table");
const operation = this.getNodeParameter("operation");
```

#### `this.logger`

Logging methods.

```javascript
this.logger.info("Loading tables");
this.logger.error("Failed to connect", { error });
this.logger.warn("Slow query detected");
this.logger.debug("Debug info", { data });
```

---

## Summary

The Load Options system provides a powerful way to create dynamic, context-aware dropdowns in your nodes:

1. **Define credentials** - Centralize connection parameters
2. **Add autocomplete field** - Use `type: 'autocomplete'` with `loadOptionsMethod`
3. **Implement loadOptions method** - Fetch and format data
4. **Handle errors gracefully** - Provide helpful feedback to users
5. **Use loaded values** - Access via `getNodeParameter()` in `execute()`

This system ensures credentials are secure, code is DRY, and users get a smooth experience with auto-populated dropdowns.
